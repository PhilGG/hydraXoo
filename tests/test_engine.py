"""Tests of the watering engine: schedule, manual runs, safety cut-off."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import device_registry as dr
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import (
    async_capture_events,
    async_fire_time_changed,
    setup_test_component_platform,
)

from custom_components.hydraxoo.const import (
    DOMAIN,
    EVENT_CYCLE_FINISHED,
    EVENT_CYCLE_STARTED,
)

from .conftest import VALVE, ZONE_ID, MockValve, setup_entry, store_zones, zone_data

PARIS = ZoneInfo("Europe/Paris")
WATERING = "binary_sensor.lawn_watering"
ENABLED = "switch.lawn_zone_enabled"
NEXT_RUN = "sensor.lawn_next_watering"
REMAINING = "sensor.lawn_time_remaining"

# 23 November 2026 is a Monday.
MONDAY_0559 = datetime(2026, 11, 23, 5, 59, 30, tzinfo=PARIS)
MONDAY_0600 = datetime(2026, 11, 23, 6, 0, 0, tzinfo=PARIS)
TUESDAY_0600 = datetime(2026, 11, 24, 6, 0, 0, tzinfo=PARIS)


async def _go_to(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, when: datetime
) -> None:
    freezer.move_to(when)
    async_fire_time_changed(hass, when)
    await hass.async_block_till_done()


def _zone_device(hass: HomeAssistant) -> str:
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    device = dr.async_get(hass).async_get_device_by_identifier(
        (DOMAIN, ZONE_ID), entry.entry_id
    )
    assert device is not None
    return device.id


@pytest.fixture
async def started(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    valve: MockValve,
) -> MockValve:
    """One zone loaded, clock on Monday 05:59:30."""
    freezer.move_to(MONDAY_0559)
    store_zones(hass_storage, [zone_data()])
    await setup_entry(hass)
    return valve


# --------------------------------------------------------------- schedule


async def test_cycle_starts_and_stops_on_schedule(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, started: MockValve
) -> None:
    """A Monday 06:00 cycle of 10 min opens then closes the valve."""
    events_start = async_capture_events(hass, EVENT_CYCLE_STARTED)
    events_end = async_capture_events(hass, EVENT_CYCLE_FINISHED)

    await _go_to(hass, freezer, MONDAY_0600)
    assert hass.states.get(VALVE).state == STATE_ON
    assert hass.states.get(WATERING).state == STATE_ON
    assert int(hass.states.get(REMAINING).state) == 600
    assert events_start[0].data["source"] == "schedule"
    assert events_start[0].data["duration_min"] == 10

    await _go_to(hass, freezer, MONDAY_0600 + timedelta(minutes=4))
    assert int(hass.states.get(REMAINING).state) == 360

    await _go_to(hass, freezer, MONDAY_0600 + timedelta(minutes=10))
    assert hass.states.get(VALVE).state == STATE_OFF
    assert hass.states.get(WATERING).state == STATE_OFF
    assert hass.states.get(REMAINING).state == "0"
    assert events_end[0].data["reason"] == "completed"


async def test_next_run_sensor(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, started: MockValve
) -> None:
    """Next run is today 06:00, then Thursday 06:00 once passed."""
    state = hass.states.get(NEXT_RUN)
    assert datetime.fromisoformat(state.state) == MONDAY_0600
    assert state.attributes["duration_min"] == 10

    await _go_to(hass, freezer, MONDAY_0600)
    thursday = datetime(2026, 11, 26, 6, 0, tzinfo=PARIS)
    assert datetime.fromisoformat(hass.states.get(NEXT_RUN).state) == thursday


async def test_no_start_on_unchecked_day(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    valve: MockValve,
) -> None:
    """Tuesday is not checked: nothing happens."""
    freezer.move_to(TUESDAY_0600 - timedelta(seconds=30))
    store_zones(hass_storage, [zone_data()])
    await setup_entry(hass)
    await _go_to(hass, freezer, TUESDAY_0600)
    assert valve.calls == []


async def test_no_start_when_cycle_disabled(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    valve: MockValve,
) -> None:
    """A disabled cycle never starts and has no next run."""
    freezer.move_to(MONDAY_0559)
    store_zones(hass_storage, [zone_data(cycle={"enabled": False})])
    await setup_entry(hass)
    assert hass.states.get(NEXT_RUN).state == "unknown"
    await _go_to(hass, freezer, MONDAY_0600)
    assert valve.calls == []


async def test_no_start_when_zone_disabled(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    started: MockValve,
) -> None:
    """Turning the zone switch off blocks cycles, and is saved."""
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": ENABLED}, blocking=True
    )
    assert hass.states.get(ENABLED).state == STATE_OFF
    assert hass.states.get(NEXT_RUN).state == "unknown"
    assert hass_storage["hydraxoo.zones"]["data"]["zones"][0]["enabled"] is False

    await _go_to(hass, freezer, MONDAY_0600)
    assert started.calls == []


async def test_scheduled_cycle_waits_for_manual_run(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, started: MockValve
) -> None:
    """A cycle due while the zone is watering manually starts right after."""
    await hass.services.async_call(
        DOMAIN,
        "run_zone",
        {"zone": _zone_device(hass), "duration": 20},
        blocking=True,
    )
    await _go_to(hass, freezer, MONDAY_0600)
    state = hass.states.get(WATERING)
    assert state.attributes["source"] == "manual"
    assert state.attributes["duration_min"] == 20

    # Manual run ends at 06:19:30, then the cycle starts for its 10 minutes.
    await _go_to(hass, freezer, MONDAY_0559 + timedelta(minutes=20))
    state = hass.states.get(WATERING)
    assert state.state == STATE_ON
    assert state.attributes["source"] == "schedule"
    assert state.attributes["duration_min"] == 10


# ------------------------------------------------------------- manual runs


async def test_manual_run_with_duration_then_stop(
    hass: HomeAssistant, started: MockValve
) -> None:
    """Water now for 3 minutes, then stop."""
    events_end = async_capture_events(hass, EVENT_CYCLE_FINISHED)
    device_id = _zone_device(hass)
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": device_id, "duration": 3}, blocking=True
    )
    assert hass.states.get(VALVE).state == STATE_ON
    assert hass.states.get(WATERING).attributes["duration_min"] == 3

    await hass.services.async_call(
        DOMAIN, "stop_zone", {"zone": device_id}, blocking=True
    )
    assert hass.states.get(VALVE).state == STATE_OFF
    assert hass.states.get(WATERING).state == STATE_OFF
    assert events_end[0].data["reason"] == "manual_stop"


async def test_manual_run_default_duration(
    hass: HomeAssistant, started: MockValve
) -> None:
    """Without a duration, the base duration of the cycle is used."""
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": _zone_device(hass)}, blocking=True
    )
    assert hass.states.get(WATERING).attributes["duration_min"] == 10


async def test_stop_all(hass: HomeAssistant, started: MockValve) -> None:
    """Stop all closes the valve."""
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": _zone_device(hass)}, blocking=True
    )
    await hass.services.async_call(DOMAIN, "stop_all", {}, blocking=True)
    assert hass.states.get(VALVE).state == STATE_OFF


async def test_unknown_zone_rejected(hass: HomeAssistant, started: MockValve) -> None:
    """A device that is not a zone gives a clear error."""
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "run_zone", {"zone": "not-a-device"}, blocking=True
        )


# ----------------------------------------------------------------- safety


async def test_duration_capped_by_max_runtime(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, started: MockValve
) -> None:
    """Asking for 60 min on a 30 min cut-off waters 30 min."""
    events_end = async_capture_events(hass, EVENT_CYCLE_FINISHED)
    await hass.services.async_call(
        DOMAIN,
        "run_zone",
        {"zone": _zone_device(hass), "duration": 60},
        blocking=True,
    )
    assert hass.states.get(WATERING).attributes["duration_min"] == 30
    await _go_to(hass, freezer, MONDAY_0559 + timedelta(minutes=30, seconds=1))
    assert hass.states.get(VALVE).state == STATE_OFF
    assert events_end[0].data["reason"] == "max_runtime"


async def test_valve_opened_elsewhere_is_cut_off(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, started: MockValve
) -> None:
    """Valve switched on by hand: closed after max_runtime anyway."""
    await hass.services.async_call(
        "switch", "turn_on", {"entity_id": VALVE}, blocking=True
    )
    assert hass.states.get(WATERING).state == STATE_OFF  # not ours

    await _go_to(hass, freezer, MONDAY_0559 + timedelta(minutes=29))
    assert hass.states.get(VALVE).state == STATE_ON
    await _go_to(hass, freezer, MONDAY_0559 + timedelta(minutes=30, seconds=1))
    assert hass.states.get(VALVE).state == STATE_OFF


async def test_valve_closed_elsewhere_ends_run(
    hass: HomeAssistant, started: MockValve
) -> None:
    """Valve switched off by hand during a run: the run ends."""
    events_end = async_capture_events(hass, EVENT_CYCLE_FINISHED)
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": _zone_device(hass)}, blocking=True
    )
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": VALVE}, blocking=True
    )
    await hass.async_block_till_done()
    assert hass.states.get(WATERING).state == STATE_OFF
    assert events_end[0].data["reason"] == "external"


async def test_open_valve_closed_at_startup(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
) -> None:
    """A valve found open when hydraXoo starts is closed and reported."""
    freezer.move_to(MONDAY_0559)
    open_valve = MockValve("Valve", is_on=True)
    setup_test_component_platform(hass, "switch", [open_valve])
    assert await async_setup_component(hass, "switch", {"switch": {"platform": "test"}})
    await hass.async_block_till_done()
    events_end = async_capture_events(hass, EVENT_CYCLE_FINISHED)

    store_zones(hass_storage, [zone_data()])
    await setup_entry(hass)

    assert hass.states.get(VALVE).state == STATE_OFF
    assert events_end[0].data["reason"] == "restart"


async def test_valve_reappearing_open_is_closed(
    hass: HomeAssistant, started: MockValve
) -> None:
    """A plug coming back online with the valve open is closed at once."""
    events_end = async_capture_events(hass, EVENT_CYCLE_FINISHED)
    hass.states.async_set(VALVE, STATE_UNAVAILABLE)
    await hass.async_block_till_done()
    started._attr_is_on = True
    started.async_write_ha_state()
    await hass.async_block_till_done()

    assert hass.states.get(VALVE).state == STATE_OFF
    assert events_end[0].data["reason"] == "restart"


async def test_unload_closes_valve(hass: HomeAssistant, started: MockValve) -> None:
    """Unloading the integration closes a valve it opened."""
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": _zone_device(hass)}, blocking=True
    )
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(VALVE).state == STATE_OFF
