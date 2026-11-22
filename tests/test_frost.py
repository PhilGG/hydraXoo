"""Tests of the frost-warning episode logic (pure function)."""

from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from homeassistant.core import HomeAssistant

from custom_components.hydraxoo.frost import (
    ALERT,
    REMINDER,
    THAW,
    FrostSettings,
    FrostState,
    evaluate,
)

PARIS = ZoneInfo("Europe/Paris")
SETTINGS = FrostSettings(enabled=True, threshold_c=2.0, thaw_notice=True)


@pytest.fixture(autouse=True)
async def paris(hass: HomeAssistant) -> None:
    """Quiet hours are computed in local time."""
    await hass.config.async_set_time_zone("Europe/Paris")


def at(day: int, hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 12, day, hour, minute, tzinfo=PARIS)


def run(state, now, min_c, frost_at, relevant=True, settings=SETTINGS):
    return evaluate(state, settings, now, (min_c, frost_at), relevant)


def test_alert_then_one_reminder_then_silence() -> None:
    """Alert at detection, reminder 3 h before frost, nothing else."""
    state = FrostState()
    frost = at(2, 5)
    assert run(state, at(1, 15), -1.0, frost) == [ALERT]
    # Every 30 minutes until the frost: only the reminder at 02:00
    sent = []
    now = at(1, 15, 30)
    while now <= at(2, 8):
        sent += [(now, a) for a in run(state, now, -1.0, frost)]
        now += timedelta(minutes=30)
    assert sent == [(at(2, 2), REMINDER)]


def test_acknowledged_means_no_reminder() -> None:
    state = FrostState()
    run(state, at(1, 15), -1.0, at(2, 5))
    state.acknowledged = True
    assert run(state, at(2, 2), -1.0, at(2, 5)) == []


def test_paused_or_no_cycle_counts_as_confirmed() -> None:
    """Watering paused (or no cycle in alerted zones): nothing to do."""
    state = FrostState()
    run(state, at(1, 15), -1.0, at(2, 5))
    assert run(state, at(2, 2), -1.0, at(2, 5), relevant=False) == []
    assert state.acknowledged is True
    # And no episode starts at all when nothing is scheduled
    other = FrostState()
    assert run(other, at(1, 15), -1.0, at(2, 5), relevant=False) == []
    assert other.active is False


def test_night_alert_deferred_to_morning() -> None:
    """Detected at 23:00 for frost the next night: alert at 7:00."""
    state = FrostState()
    frost = at(3, 4)
    assert run(state, at(1, 23), -2.0, frost) == []
    assert run(state, at(2, 6, 30), -2.0, frost) == []
    assert run(state, at(2, 7), -2.0, frost) == [ALERT]


def test_night_alert_sent_at_once_if_frost_is_close() -> None:
    """Detected at 23:00 for frost at 3:00: last chance, alert now, no reminder."""
    state = FrostState()
    assert run(state, at(1, 23), -2.0, at(2, 3)) == [ALERT]
    assert run(state, at(2, 0, 30), -2.0, at(2, 3)) == []


def test_hovering_forecast_does_not_retrigger() -> None:
    """1.8 / 2.4 / 1.9 °C: one episode, one alert."""
    state = FrostState()
    assert run(state, at(1, 12), 1.8, at(2, 5)) == [ALERT]
    assert run(state, at(1, 12, 30), 2.4, None) == []
    assert run(state, at(1, 13), 1.9, at(2, 5)) == []
    assert state.active


def test_thaw_ends_episode_and_new_frost_alerts_again() -> None:
    state = FrostState()
    run(state, at(1, 12), -1.0, at(2, 5))
    assert run(state, at(3, 12), 4.5, None) == [THAW]
    assert state.active is False
    assert run(state, at(10, 12), 0.0, at(11, 5)) == [ALERT]


def test_disabled_does_nothing() -> None:
    state = FrostState()
    off = FrostSettings(enabled=False)
    assert evaluate(state, off, at(1, 12), (-5.0, at(2, 5)), True) == []


def test_state_survives_storage() -> None:
    state = FrostState()
    run(state, at(1, 15), -1.0, at(2, 5))
    copy = FrostState.from_dict(state.to_dict())
    assert copy.alerted and copy.active
    assert run(copy, at(1, 16), -1.0, at(2, 5)) == []


# ------------------------------------------------------- with the engine

from typing import Any  # noqa: E402

from freezegun.api import FrozenDateTimeFactory  # noqa: E402
from pytest_homeassistant_custom_component.common import (  # noqa: E402
    async_capture_events,
    async_fire_time_changed,
    async_mock_service,
)

from .conftest import MockValve, setup_entry, store_zones, zone_data  # noqa: E402
from .test_weather import FakeProvider, hours  # noqa: E402

TUESDAY_1500 = datetime(2026, 12, 1, 15, 0, tzinfo=PARIS)


async def _frosty(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    zones: list[dict[str, Any]] | None = None,
    options: dict[str, Any] | None = None,
):
    """Frost (-1 °C) forecast for 05:00 next morning; a phone to alert."""
    freezer.move_to(TUESDAY_1500)
    provider = FakeProvider(hass)
    temps = [5.0] * 14 + [-1.0] * 4 + [3.0] * 6  # 15:00 + 14 h = 05:00
    provider.hourly = [
        item | {"temperature": t}
        for item, t in zip(hours(TUESDAY_1500, [0.0] * 24), temps, strict=True)
    ]
    phone = async_mock_service(hass, "notify", "mobile_app_pixel")
    store_zones(hass_storage, zones if zones is not None else [zone_data()])
    entry = await setup_entry(
        hass,
        {"weather_entity": "weather.home", "notify_services": ["mobile_app_pixel"]}
        | (options or {}),
    )
    await hass.async_block_till_done()
    return entry, phone


async def test_frost_alert_sent_with_buttons(
    hass: HomeAssistant, hass_storage: dict[str, Any], freezer, valve: MockValve
) -> None:
    events = async_capture_events(hass, "hydraxoo_frost_warning")
    entry, phone = await _frosty(hass, hass_storage, freezer)
    assert len(phone) == 1
    alert = phone[0].data
    assert alert["title"] == "hydraXoo: frost forecast"
    assert "-1 °C around 05:00" in alert["message"]
    assert [a["action"] for a in alert["data"]["actions"]] == [
        "HYDRAXOO_FROST_DONE",
        "HYDRAXOO_FROST_PAUSE",
    ]
    assert alert["data"]["priority"] == "high"
    assert events[0].data["kind"] == "alert"
    assert entry.runtime_data.frost.active


async def test_done_button_stops_reminders(
    hass: HomeAssistant, hass_storage: dict[str, Any], freezer, valve: MockValve
) -> None:
    entry, phone = await _frosty(hass, hass_storage, freezer)
    hass.bus.async_fire(
        "mobile_app_notification_action", {"action": "HYDRAXOO_FROST_DONE"}
    )
    await hass.async_block_till_done()
    assert entry.runtime_data.frost.acknowledged
    assert phone[1].data == {
        "message": "clear_notification",
        "data": {"tag": "hydraxoo_frost"},
    }
    # 02:00, three hours before the frost: no reminder
    two_am = datetime(2026, 12, 2, 2, 0, tzinfo=PARIS)
    freezer.move_to(two_am)
    async_fire_time_changed(hass, two_am)
    await hass.async_block_till_done()
    assert len(phone) == 2


async def test_reminder_when_nobody_confirms(
    hass: HomeAssistant, hass_storage: dict[str, Any], freezer, valve: MockValve
) -> None:
    _, phone = await _frosty(hass, hass_storage, freezer)
    two_am = datetime(2026, 12, 2, 2, 0, tzinfo=PARIS)
    freezer.move_to(two_am)
    async_fire_time_changed(hass, two_am)
    await hass.async_block_till_done()
    assert len(phone) == 2
    assert phone[1].data["message"].startswith("Reminder")


async def test_pause_button_pauses_and_confirms(
    hass: HomeAssistant, hass_storage: dict[str, Any], freezer, valve: MockValve
) -> None:
    entry, _ = await _frosty(hass, hass_storage, freezer)
    hass.bus.async_fire(
        "mobile_app_notification_action", {"action": "HYDRAXOO_FROST_PAUSE"}
    )
    await hass.async_block_till_done()
    assert entry.runtime_data.paused
    assert entry.runtime_data.frost.acknowledged


async def test_heated_greenhouse_does_not_alert(
    hass: HomeAssistant, hass_storage: dict[str, Any], freezer, valve: MockValve
) -> None:
    _, phone = await _frosty(
        hass, hass_storage, freezer, zones=[zone_data(frost_alert=False)]
    )
    assert phone == []


async def test_no_alert_when_disabled(
    hass: HomeAssistant, hass_storage: dict[str, Any], freezer, valve: MockValve
) -> None:
    _, phone = await _frosty(
        hass, hass_storage, freezer, options={"frost_alert": False}
    )
    assert phone == []


async def test_restart_does_not_alert_again(
    hass: HomeAssistant, hass_storage: dict[str, Any], freezer, valve: MockValve
) -> None:
    entry, phone = await _frosty(hass, hass_storage, freezer)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert len(phone) == 1
    assert hass_storage["hydraxoo.zones"]["data"]["frost"]["alerted"] is True


async def test_fahrenheit(
    hass: HomeAssistant, hass_storage: dict[str, Any], freezer, valve: MockValve
) -> None:
    from homeassistant.util.unit_system import US_CUSTOMARY_SYSTEM

    hass.config.units = US_CUSTOMARY_SYSTEM
    _, phone = await _frosty(hass, hass_storage, freezer)
    assert "30 °F" in phone[0].data["message"]


async def test_one_notification_for_several_zones(
    hass: HomeAssistant, hass_storage: dict[str, Any], freezer, two_valves
) -> None:
    """Three zones concerned: still a single alert, then a single reminder."""
    zones = [
        zone_data(),
        zone_data(id="zone2", name="Flowers", switch_entity="switch.valve_2"),
        zone_data(id="zone3", name="Hedge", switch_entity="switch.valve_2"),
    ]
    _, phone = await _frosty(hass, hass_storage, freezer, zones=zones)
    assert len(phone) == 1
    two_am = datetime(2026, 12, 2, 2, 0, tzinfo=PARIS)
    freezer.move_to(two_am)
    async_fire_time_changed(hass, two_am)
    await hass.async_block_till_done()
    assert len(phone) == 2
