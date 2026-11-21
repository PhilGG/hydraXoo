"""Tests of multiple zones and cycles, the queue and the pause."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from freezegun.api import FrozenDateTimeFactory
from homeassistant.const import STATE_OFF, STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import (
    async_capture_events,
    async_fire_time_changed,
)

from custom_components.hydraxoo.const import (
    DOMAIN,
    EVENT_CYCLE_SKIPPED,
    EVENT_CYCLE_STARTED,
)

from .conftest import MockValve, setup_entry, store_zones, zone_data

PARIS = ZoneInfo("Europe/Paris")
MONDAY_0559 = datetime(2026, 11, 23, 5, 59, 30, tzinfo=PARIS)
MONDAY_0600 = datetime(2026, 11, 23, 6, 0, 0, tzinfo=PARIS)

LAWN = "binary_sensor.lawn_watering"
FLOWERS = "binary_sensor.flowers_watering"
VALVE_1 = "switch.valve"
VALVE_2 = "switch.valve_2"
QUEUE = "sensor.hydraxoo_queue"
PAUSE = "switch.hydraxoo_watering_paused"
LAWN_NEXT = "sensor.lawn_next_watering"

FLOWERS_ZONE = zone_data(
    id="zone2",
    name="Flowers",
    switch_entity=VALVE_2,
    cycle={"id": "cycle2", "duration_min": 5},
)


async def _go_to(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, when: datetime
) -> None:
    freezer.move_to(when)
    async_fire_time_changed(hass, when)
    await hass.async_block_till_done()


def _device(hass: HomeAssistant, zone_id: str) -> str:
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    device = dr.async_get(hass).async_get_device_by_identifier(
        (DOMAIN, zone_id), entry.entry_id
    )
    assert device is not None
    return device.id


async def _setup(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    zones: list[dict[str, Any]],
    options: dict[str, Any] | None = None,
) -> None:
    freezer.move_to(MONDAY_0559)
    store_zones(hass_storage, zones)
    await setup_entry(hass, options)


# ------------------------------------------------------------------ queue


async def test_two_zones_same_time_one_at_a_time(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """Both zones due at 06:00: the second waits, then runs."""
    await _setup(hass, hass_storage, freezer, [zone_data(), FLOWERS_ZONE])

    await _go_to(hass, freezer, MONDAY_0600)
    assert hass.states.get(VALVE_1).state == STATE_ON
    assert hass.states.get(VALVE_2).state == STATE_OFF
    queue = hass.states.get(QUEUE)
    assert queue.state == "1"
    assert queue.attributes["items"][0]["zone_name"] == "Flowers"

    await _go_to(hass, freezer, MONDAY_0600 + timedelta(minutes=10))
    assert hass.states.get(VALVE_1).state == STATE_OFF
    assert hass.states.get(VALVE_2).state == STATE_ON
    assert hass.states.get(QUEUE).state == "0"

    await _go_to(hass, freezer, MONDAY_0600 + timedelta(minutes=15))
    assert hass.states.get(VALVE_2).state == STATE_OFF


async def test_two_zones_in_parallel(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """In parallel mode both zones start at 06:00."""
    await _setup(
        hass,
        hass_storage,
        freezer,
        [zone_data(), FLOWERS_ZONE],
        {"sequence_mode": "parallel"},
    )
    await _go_to(hass, freezer, MONDAY_0600)
    assert hass.states.get(VALVE_1).state == STATE_ON
    assert hass.states.get(VALVE_2).state == STATE_ON
    assert hass.states.get(QUEUE).state == "0"


async def test_manual_run_waits_its_turn(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """'Water now' on a second zone waits while the first one waters."""
    await _setup(hass, hass_storage, freezer, [zone_data(), FLOWERS_ZONE])
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": _device(hass, "zone1"), "duration": 2}, True
    )
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": _device(hass, "zone2"), "duration": 3}, True
    )
    assert hass.states.get(VALVE_2).state == STATE_OFF
    assert hass.states.get(QUEUE).attributes["items"][0]["source"] == "manual"

    await _go_to(hass, freezer, MONDAY_0559 + timedelta(minutes=2))
    assert hass.states.get(VALVE_1).state == STATE_OFF
    assert hass.states.get(VALVE_2).state == STATE_ON
    assert hass.states.get(FLOWERS).attributes["duration_min"] == 3


async def test_stopping_a_zone_starts_the_next(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """Stopping the zone in progress lets the queued one start at once."""
    await _setup(hass, hass_storage, freezer, [zone_data(), FLOWERS_ZONE])
    await _go_to(hass, freezer, MONDAY_0600)
    await hass.services.async_call(
        DOMAIN, "stop_zone", {"zone": _device(hass, "zone1")}, True
    )
    assert hass.states.get(VALVE_1).state == STATE_OFF
    assert hass.states.get(VALVE_2).state == STATE_ON


async def test_valve_closed_by_hand_starts_the_next(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """A valve switched off by hand also frees the turn."""
    await _setup(hass, hass_storage, freezer, [zone_data(), FLOWERS_ZONE])
    await _go_to(hass, freezer, MONDAY_0600)
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": VALVE_1}, blocking=True
    )
    await hass.async_block_till_done()
    assert hass.states.get(VALVE_2).state == STATE_ON


async def test_stop_all_empties_the_queue(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """Stop all closes everything and drops what was waiting."""
    skipped = async_capture_events(hass, EVENT_CYCLE_SKIPPED)
    await _setup(hass, hass_storage, freezer, [zone_data(), FLOWERS_ZONE])
    await _go_to(hass, freezer, MONDAY_0600)
    await hass.services.async_call(DOMAIN, "stop_all", {}, blocking=True)

    assert hass.states.get(VALVE_1).state == STATE_OFF
    assert hass.states.get(VALVE_2).state == STATE_OFF
    assert hass.states.get(QUEUE).state == "0"
    assert skipped[0].data | {"zone_id": None} == {
        "zone_id": None,
        "zone_name": "Flowers",
        "cycle_id": "cycle2",
        "reason": "stopped",
    }
    await _go_to(hass, freezer, MONDAY_0600 + timedelta(minutes=20))
    assert two_valves[1].calls == []  # never opened


async def test_overlapping_cycles_of_one_zone(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """06:00 for 10 min and 06:05 for 5 min: the second runs at 06:10."""
    zone = zone_data()
    zone["cycles"].append(
        {
            "id": "cycle1b",
            "enabled": True,
            "start_time": "06:05",
            "duration_min": 5,
            "weekdays": [0],
        }
    )
    await _setup(hass, hass_storage, freezer, [zone])
    started = async_capture_events(hass, EVENT_CYCLE_STARTED)

    await _go_to(hass, freezer, MONDAY_0600)
    await _go_to(hass, freezer, MONDAY_0600 + timedelta(minutes=5))
    assert hass.states.get(QUEUE).state == "1"
    await _go_to(hass, freezer, MONDAY_0600 + timedelta(minutes=10))
    assert [e.data["cycle_id"] for e in started] == ["cycle1", "cycle1b"]
    assert hass.states.get(LAWN).attributes["duration_min"] == 5


async def test_several_cycles_with_their_own_days(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """A Monday evening cycle runs; a disabled one and a Sunday one do not."""
    zone = zone_data()
    zone["cycles"] += [
        {
            "id": "evening",
            "enabled": True,
            "start_time": "20:00",
            "duration_min": 5,
            "weekdays": [0],
        },
        {
            "id": "off",
            "enabled": False,
            "start_time": "21:00",
            "duration_min": 5,
            "weekdays": [0],
        },
        {
            "id": "sunday",
            "enabled": True,
            "start_time": "22:00",
            "duration_min": 5,
            "weekdays": [6],
        },
    ]
    await _setup(hass, hass_storage, freezer, [zone])
    started = async_capture_events(hass, EVENT_CYCLE_STARTED)
    for hour in (6, 20, 21, 22):
        await _go_to(hass, freezer, MONDAY_0600.replace(hour=hour))
        await _go_to(hass, freezer, MONDAY_0600.replace(hour=hour, minute=30))
    assert [e.data["cycle_id"] for e in started] == ["cycle1", "evening"]


# ------------------------------------------------------------------ pause


async def test_pause_switch_skips_cycles(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """While paused, cycles are skipped and reported."""
    skipped = async_capture_events(hass, EVENT_CYCLE_SKIPPED)
    await _setup(hass, hass_storage, freezer, [zone_data()])
    await hass.services.async_call(
        "switch", "turn_on", {"entity_id": PAUSE}, blocking=True
    )
    assert hass.states.get(PAUSE).state == STATE_ON
    assert hass.states.get(PAUSE).attributes["until"] is None
    assert hass.states.get(LAWN_NEXT).state == "unknown"

    await _go_to(hass, freezer, MONDAY_0600)
    assert hass.states.get(VALVE_1).state == STATE_OFF
    assert skipped[0].data["reason"] == "paused"

    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": PAUSE}, blocking=True
    )
    assert hass.states.get(LAWN_NEXT).state != "unknown"


async def test_manual_run_works_during_pause(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """The pause only concerns cycles."""
    await _setup(hass, hass_storage, freezer, [zone_data()])
    await hass.services.async_call(DOMAIN, "pause", {}, blocking=True)
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": _device(hass, "zone1")}, blocking=True
    )
    assert hass.states.get(VALVE_1).state == STATE_ON


async def test_pause_for_days_then_auto_resume(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """Pause 2 days from Monday: next watering is Thursday; resumes alone."""
    await _setup(hass, hass_storage, freezer, [zone_data()])
    await hass.services.async_call(DOMAIN, "pause", {"days": 2}, blocking=True)

    until = datetime.fromisoformat(hass.states.get(PAUSE).attributes["until"])
    assert until == MONDAY_0559 + timedelta(days=2)
    thursday = datetime(2026, 11, 26, 6, 0, tzinfo=PARIS)
    assert datetime.fromisoformat(hass.states.get(LAWN_NEXT).state) == thursday

    await _go_to(hass, freezer, MONDAY_0559 + timedelta(days=2, seconds=1))
    assert hass.states.get(PAUSE).state == STATE_OFF
    assert hass_storage["hydraxoo.zones"]["data"]["paused"] is False


async def test_pause_survives_restart(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """The pause is saved and restored when the integration reloads."""
    await _setup(hass, hass_storage, freezer, [zone_data()])
    await hass.services.async_call(DOMAIN, "pause", {"days": 3}, blocking=True)
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    assert hass.states.get(PAUSE).state == STATE_ON
    assert hass.states.get(PAUSE).attributes["until"] is not None


async def test_expired_pause_lifted_at_startup(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """A pause that ended while Home Assistant was off is lifted."""
    freezer.move_to(MONDAY_0559)
    store_zones(hass_storage, [zone_data()])
    hass_storage["hydraxoo.zones"]["data"] |= {
        "paused": True,
        "pause_until": (MONDAY_0559 - timedelta(hours=1)).isoformat(),
    }
    await setup_entry(hass)
    assert hass.states.get(PAUSE).state == STATE_OFF


async def test_disabled_zone_cycle_reported_as_skipped(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    two_valves: tuple[MockValve, MockValve],
) -> None:
    """A cycle of a disabled zone is skipped with its reason."""
    skipped = async_capture_events(hass, EVENT_CYCLE_SKIPPED)
    await _setup(hass, hass_storage, freezer, [zone_data(enabled=False)])
    await _go_to(hass, freezer, MONDAY_0600)
    assert skipped[0].data["reason"] == "zone_disabled"
