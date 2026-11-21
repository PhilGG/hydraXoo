"""Tests of the setup and zone management screens."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.hydraxoo.const import DOMAIN

from .conftest import VALVE, ZONE_ID, MockValve, setup_entry, store_zones, zone_data

ZONE_FORM = {
    "name": "Vegetable garden",
    "icon": "mdi:sprout",
    "switch_entity": VALVE,
    "max_runtime_min": 30,
    "cycle_enabled": True,
    "start_time": "07:30:00",
    "duration_min": 15,
    "weekdays": ["1", "4"],
    "safety": {
        "threshold_w": 1.0,
        "check_delay_s": 10,
        "retry_pulse_s": 5,
        "max_attempts": 5,
    },
}


async def test_user_step_creates_entry(hass: HomeAssistant) -> None:
    """Installing asks for an optional weather entity."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "hydraXoo"
    await hass.async_block_till_done()


async def test_single_instance(hass: HomeAssistant) -> None:
    """Only one installation is allowed."""
    MockConfigEntry(domain=DOMAIN).add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"


async def _open_menu(hass: HomeAssistant, entry_id: str, choice: str) -> dict:
    result = await hass.config_entries.options.async_init(entry_id)
    assert result["type"] is FlowResultType.MENU
    return await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": choice}
    )


async def test_add_zone(
    hass: HomeAssistant, hass_storage: dict[str, Any], valve: MockValve
) -> None:
    """Adding a zone stores it and creates its entities."""
    entry = await setup_entry(hass)
    result = await _open_menu(hass, entry.entry_id, "add_zone")
    assert result["type"] is FlowResultType.FORM

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], ZONE_FORM
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    zones = hass_storage["hydraxoo.zones"]["data"]["zones"]
    assert len(zones) == 1
    assert zones[0]["name"] == "Vegetable garden"
    assert zones[0]["cycles"][0] | {"id": None} == {
        "id": None,
        "enabled": True,
        "start_time": "07:30",
        "duration_min": 15,
        "weekdays": [1, 4],
    }
    assert hass.states.get("binary_sensor.vegetable_garden_watering") is not None


async def test_add_zone_errors(hass: HomeAssistant, valve: MockValve) -> None:
    """No day checked, or duration above the cut-off, are refused."""
    entry = await setup_entry(hass)
    result = await _open_menu(hass, entry.entry_id, "add_zone")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        ZONE_FORM | {"weekdays": [], "duration_min": 45},
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {
        "weekdays": "no_weekday",
        "duration_min": "duration_exceeds_max",
    }


ZONE_ONLY = {
    k: ZONE_FORM[k]
    for k in ("name", "icon", "switch_entity", "max_runtime_min", "safety")
}
CYCLE_FORM = {
    "cycle_enabled": True,
    "start_time": "20:00:00",
    "duration_min": 5,
    "weekdays": ["5", "6"],
}


async def _zone_menu(hass: HomeAssistant, entry_id: str, choice: str) -> dict:
    """Open the options, pick the zone, then a zone menu entry."""
    result = await _open_menu(hass, entry_id, "pick_zone")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"zone": ZONE_ID}
    )
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "zone_menu"
    return await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": choice}
    )


async def test_edit_zone(
    hass: HomeAssistant, hass_storage: dict[str, Any], valve: MockValve
) -> None:
    """Editing a zone keeps its id and its cycles."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)

    result = await _zone_menu(hass, entry.entry_id, "edit_zone")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], ZONE_ONLY | {"name": "Front lawn", "max_runtime_min": 45}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    zone = hass_storage["hydraxoo.zones"]["data"]["zones"][0]
    assert zone["id"] == ZONE_ID
    assert zone["name"] == "Front lawn"
    assert zone["max_runtime_min"] == 45
    assert zone["cycles"][0]["id"] == "cycle1"


async def test_add_edit_remove_cycle(
    hass: HomeAssistant, hass_storage: dict[str, Any], valve: MockValve
) -> None:
    """A zone can hold several cycles, each with its own days."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)

    engine = entry.runtime_data

    # Add a weekend evening cycle: back to the zone menu, no reload
    result = await _zone_menu(hass, entry.entry_id, "add_cycle")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], CYCLE_FORM
    )
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "zone_menu"
    await hass.async_block_till_done()
    assert entry.runtime_data is engine
    cycles = hass_storage["hydraxoo.zones"]["data"]["zones"][0]["cycles"]
    assert len(cycles) == 2
    new_id = cycles[1]["id"]
    assert cycles[1] | {"id": None} == {
        "id": None,
        "enabled": True,
        "start_time": "20:00",
        "duration_min": 5,
        "weekdays": [5, 6],
    }

    # Disable it, in the same session
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "pick_cycle"}
    )
    labels = [
        o["label"] for o in result["data_schema"].schema["cycle"].config["options"]
    ]
    assert labels == ["06:00 · 10 min · Mo Th", "20:00 · 5 min · Sa Su"]
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"cycle": new_id}
    )
    assert result["step_id"] == "edit_cycle"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], CYCLE_FORM | {"cycle_enabled": False}
    )
    assert result["step_id"] == "zone_menu"
    cycles = hass_storage["hydraxoo.zones"]["data"]["zones"][0]["cycles"]
    assert cycles[1]["enabled"] is False

    # Remove the first one, then finish
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "remove_cycle"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"cycle": "cycle1"}
    )
    assert result["step_id"] == "zone_menu"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "finish"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    cycles = hass_storage["hydraxoo.zones"]["data"]["zones"][0]["cycles"]
    assert [c["id"] for c in cycles] == [new_id]
    assert entry.runtime_data is engine
    # The only cycle left is disabled: nothing scheduled any more.
    assert hass.states.get("sensor.lawn_next_watering").state == "unknown"


async def test_zone_menu_back_to_main_menu(
    hass: HomeAssistant, hass_storage: dict[str, Any], valve: MockValve
) -> None:
    """The zone menu leads back to the main menu."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)
    result = await _zone_menu(hass, entry.entry_id, "init")
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "init"


async def test_zone_power_sensor_and_safety_settings(
    hass: HomeAssistant, hass_storage: dict[str, Any], valve: MockValve
) -> None:
    """The power sensor and the closing-check settings are saved."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)
    result = await _zone_menu(hass, entry.entry_id, "edit_zone")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        ZONE_ONLY
        | {
            "name": "Lawn",
            "power_entity": "sensor.valve_power",
            "safety": {
                "threshold_w": 2.5,
                "check_delay_s": 30,
                "retry_pulse_s": 3,
                "max_attempts": 4,
            },
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    zone = hass_storage["hydraxoo.zones"]["data"]["zones"][0]
    assert zone["power_entity"] == "sensor.valve_power"
    assert zone["safety"] == {
        "threshold_w": 2.5,
        "check_delay_s": 30,
        "retry_pulse_s": 3,
        "max_attempts": 4,
    }


async def test_cycle_longer_than_cutoff_refused(
    hass: HomeAssistant, hass_storage: dict[str, Any], valve: MockValve
) -> None:
    """A cycle cannot last longer than the zone's safety cut-off."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)
    result = await _zone_menu(hass, entry.entry_id, "add_cycle")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], CYCLE_FORM | {"duration_min": 31}
    )
    assert result["errors"] == {"duration_min": "duration_exceeds_max"}


async def test_remove_zone(
    hass: HomeAssistant, hass_storage: dict[str, Any], valve: MockValve
) -> None:
    """Removing a zone deletes it and its device."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)
    registry = dr.async_get(hass)
    assert (
        registry.async_get_device_by_identifier((DOMAIN, ZONE_ID), entry.entry_id)
        is not None
    )

    result = await _open_menu(hass, entry.entry_id, "remove_zone")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"zone": ZONE_ID}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    assert hass_storage["hydraxoo.zones"]["data"]["zones"] == []
    assert (
        registry.async_get_device_by_identifier((DOMAIN, ZONE_ID), entry.entry_id)
        is None
    )
    assert hass.states.get("binary_sensor.lawn_watering") is None


async def test_settings(hass: HomeAssistant) -> None:
    """General settings save the weather entity and the watering order."""
    entry = await setup_entry(hass)
    result = await _open_menu(hass, entry.entry_id, "settings")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {"weather_entity": "weather.home", "sequence_mode": "parallel"},
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert entry.options == {
        "weather_entity": "weather.home",
        "sequence_mode": "parallel",
    }
    assert entry.runtime_data.sequential is False
