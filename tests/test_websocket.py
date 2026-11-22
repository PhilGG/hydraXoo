"""Tests of the WebSocket API used by the card."""

from __future__ import annotations

from typing import Any

from homeassistant.const import STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_mock_service,
)

from custom_components.hydraxoo.const import DOMAIN

from .conftest import ZONE_ID, MockValve, setup_entry, store_zones, zone_data

NEW_ZONE = {
    "name": "Roses",
    "icon": "mdi:flower",
    "switch_entity": "switch.valve_2",
    "max_runtime_min": 20,
    "receives_rain": False,
    "cycles": [
        {"start_time": "07:15", "duration_min": 8, "weekdays": [1, 3, 5]},
    ],
}


async def _client(hass, hass_ws_client):
    client = await hass_ws_client(hass)
    msg_id = 0

    async def call(type_: str, **data: Any) -> dict:
        nonlocal msg_id
        msg_id += 1
        await client.send_json({"id": msg_id, "type": f"{DOMAIN}/{type_}", **data})
        return await client.receive_json()

    return client, call


async def test_subscribe_sends_state_and_updates(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client,
    valve: MockValve,
) -> None:
    """The card gets the full state, then a new one after each change."""
    store_zones(hass_storage, [zone_data()])
    await setup_entry(hass)
    client, call = await _client(hass, hass_ws_client)

    result = await call("subscribe")
    assert result["success"]
    event = (await client.receive_json())["event"]
    zone = event["zones"][0]
    assert zone["name"] == "Lawn"
    assert zone["running"] is False
    assert zone["switch"]["entity_id"] == "switch.valve"
    assert zone["next_run"]["duration_min"] == 10
    assert zone["weather"]["reason"] == "no_weather_entity"
    assert event["settings"]["sequential"] is True

    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": "switch.lawn_zone_enabled"}, blocking=True
    )
    event = (await client.receive_json())["event"]
    assert event["zones"][0]["enabled"] is False


async def test_create_update_delete_zone(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """Zones are created, edited and deleted live, entities follow."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)
    engine = entry.runtime_data
    _, call = await _client(hass, hass_ws_client)

    result = await call("zone/save", zone=NEW_ZONE)
    assert result["success"], result
    new_id = result["result"]["id"]
    await hass.async_block_till_done()
    assert entry.runtime_data is engine  # no reload
    assert hass.states.get("binary_sensor.roses_watering") is not None
    stored = hass_storage["hydraxoo.zones"]["data"]["zones"][1]
    assert stored["receives_rain"] is False
    assert stored["cycles"][0]["start_time"] == "07:15"
    assert stored["cycles"][0]["id"]

    # Rename and change the cycle
    zone = stored | {"name": "Rose bed"}
    zone["cycles"][0]["duration_min"] = 12
    result = await call("zone/save", zone=zone)
    assert result["success"], result
    await hass.async_block_till_done()
    device = dr.async_get(hass).async_get_device_by_identifier(
        (DOMAIN, new_id), entry.entry_id
    )
    assert device.name == "Rose bed"
    assert engine.zones[new_id].cycles[0].duration_min == 12

    result = await call("zone/delete", zone_id=new_id)
    assert result["success"]
    await hass.async_block_till_done()
    assert new_id not in engine.zones
    assert (
        dr.async_get(hass).async_get_device_by_identifier(
            (DOMAIN, new_id), entry.entry_id
        )
        is None
    )
    assert hass.states.get("binary_sensor.roses_watering") is None


async def test_invalid_zone_refused(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client,
    valve: MockValve,
) -> None:
    """Bad input gets a clear error code."""
    await setup_entry(hass)
    _, call = await _client(hass, hass_ws_client)

    result = await call("zone/save", zone=NEW_ZONE | {"switch_entity": "light.x"})
    assert result["error"]["code"] == "invalid_format"

    too_long = NEW_ZONE | {
        "cycles": [{"start_time": "07:15", "duration_min": 25, "weekdays": [1]}]
    }
    result = await call("zone/save", zone=too_long)
    assert result["error"]["code"] == "duration_exceeds_max"

    no_day = NEW_ZONE | {
        "cycles": [{"start_time": "07:15", "duration_min": 5, "weekdays": []}]
    }
    result = await call("zone/save", zone=no_day)
    assert result["error"]["code"] == "invalid_format"


async def test_actions(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client,
    valve: MockValve,
) -> None:
    """Run, stop, enable, pause and resume from the card."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)
    engine = entry.runtime_data
    _, call = await _client(hass, hass_ws_client)

    assert (await call("zone/run", zone_id=ZONE_ID, duration=3))["success"]
    assert hass.states.get("switch.valve").state == STATE_ON
    assert engine.runs[ZONE_ID].duration_min == 3
    assert (await call("zone/stop", zone_id=ZONE_ID))["success"]
    assert ZONE_ID not in engine.runs

    assert (await call("zone/enable", zone_id=ZONE_ID, enabled=False))["success"]
    assert engine.zones[ZONE_ID].enabled is False

    assert (await call("pause", days=2))["success"]
    assert engine.paused is True
    assert (await call("resume"))["success"]
    assert engine.paused is False

    engine.zones[ZONE_ID].fault = True
    result = await call("zone/run", zone_id=ZONE_ID)
    assert result["error"]["code"] == "zone_in_fault"
    assert (await call("zone/acknowledge", zone_id=ZONE_ID))["success"]
    assert engine.zones[ZONE_ID].fault is False

    result = await call("zone/run", zone_id="nope")
    assert result["error"]["code"] == "not_found"


async def test_reload_tells_card_to_resubscribe(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client,
    valve: MockValve,
) -> None:
    """When the integration reloads, the card is told to subscribe again."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)
    client, call = await _client(hass, hass_ws_client)
    await call("subscribe")
    await client.receive_json()  # initial state

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    messages = []
    while True:
        msg = await client.receive_json()
        messages.append(msg["event"])
        if msg["event"].get("reload"):
            break
    assert messages[-1] == {"reload": True}


async def test_history_records_runs(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client,
    valve: MockValve,
) -> None:
    """Finished waterings appear in the history sent to the card."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)
    _, call = await _client(hass, hass_ws_client)
    await call("zone/run", zone_id=ZONE_ID, duration=2)
    await call("zone/stop", zone_id=ZONE_ID)
    history = entry.runtime_data.history
    assert history[-1]["kind"] == "run"
    assert history[-1]["reason"] == "manual_stop"
    assert history[-1]["zone_id"] == ZONE_ID


async def test_history_survives_restart(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client,
    valve: MockValve,
) -> None:
    """Done and skipped cycles are kept when Home Assistant restarts."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)
    _, call = await _client(hass, hass_ws_client)
    await call("zone/run", zone_id=ZONE_ID, duration=2)
    await call("zone/stop", zone_id=ZONE_ID)
    await hass.async_block_till_done()
    assert hass_storage["hydraxoo.zones"]["data"]["history"][-1]["kind"] == "run"

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    history = entry.runtime_data.history
    assert history[-1]["kind"] == "run"
    assert history[-1]["zone_id"] == ZONE_ID


async def test_save_settings_live_without_reload(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client,
    valve: MockValve,
) -> None:
    """General settings from the card apply at once; watering goes on."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)
    engine = entry.runtime_data
    _, call = await _client(hass, hass_ws_client)
    await call("zone/run", zone_id=ZONE_ID, duration=5)

    result = await call(
        "settings/save",
        weather_entity="weather.home",
        sequential=False,
        notify_services=["mobile_app_pixel"],
    )
    assert result["success"], result
    await hass.async_block_till_done()
    assert entry.runtime_data is engine  # not reloaded
    assert ZONE_ID in engine.runs  # watering not interrupted
    assert engine.sequential is False
    assert engine.weather.weather_entity == "weather.home"
    assert engine.notify_services == ["mobile_app_pixel"]
    assert entry.options == {
        "weather_entity": "weather.home",
        "sequence_mode": "parallel",
        "notify_services": ["mobile_app_pixel"],
    }

    # Clearing the weather entity removes it from the options
    result = await call("settings/save", weather_entity=None)
    assert result["success"]
    assert "weather_entity" not in entry.options
    assert engine.weather.weather_entity is None


async def test_settings_from_ha_screens_still_reload(
    hass: HomeAssistant, hass_storage: dict[str, Any], valve: MockValve
) -> None:
    """Options changed elsewhere (not applied live) still reload."""
    entry = await setup_entry(hass)
    engine = entry.runtime_data
    hass.config_entries.async_update_entry(entry, options={"sequence_mode": "parallel"})
    await hass.async_block_till_done()
    assert entry.runtime_data is not engine
    assert entry.runtime_data.sequential is False


async def test_test_notification(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client,
    valve: MockValve,
) -> None:
    """The test button sends a translated, high-priority alert."""
    phone = async_mock_service(hass, "notify", "mobile_app_pixel")
    await setup_entry(hass)
    _, call = await _client(hass, hass_ws_client)
    result = await call("notify/test", services=["mobile_app_pixel", "mobile_app_gone"])
    assert result["result"] == {
        "sent": ["mobile_app_pixel"],
        "failed": ["mobile_app_gone"],
    }
    assert phone[0].data["title"] == "hydraXoo: test notification"
    assert phone[0].data["data"]["priority"] == "high"


async def test_state_lists_phones_by_name(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client,
    valve: MockValve,
) -> None:
    """The card gets the phones with their names."""
    MockConfigEntry(
        domain="mobile_app",
        title="iPhone de Phil",
        data={"device_name": "iPhone de Phil"},
    ).add_to_hass(hass)
    hass.services.async_register("notify", "mobile_app_iphone_de_phil", lambda c: None)
    await setup_entry(hass, {"notify_services": ["mobile_app_iphone_de_phil"]})
    client, call = await _client(hass, hass_ws_client)
    await call("subscribe")
    settings = (await client.receive_json())["event"]["settings"]
    assert settings["notify_options"] == [
        {"value": "mobile_app_iphone_de_phil", "label": "iPhone de Phil"}
    ]
    assert settings["notify_services"] == ["mobile_app_iphone_de_phil"]
