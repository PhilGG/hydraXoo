"""Tests of the valve-closing check based on power consumption."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any
from unittest.mock import patch
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
    async_mock_service,
    setup_test_component_platform,
)

from custom_components.hydraxoo.const import (
    DOMAIN,
    EVENT_CYCLE_SKIPPED,
    EVENT_SAFETY_FAILED,
    EVENT_SAFETY_RETRY,
)

from .conftest import MockValve, setup_entry, store_zones, zone_data

PARIS = ZoneInfo("Europe/Paris")
MONDAY_0559 = datetime(2026, 11, 23, 5, 59, 30, tzinfo=PARIS)
MONDAY_0600 = datetime(2026, 11, 23, 6, 0, 0, tzinfo=PARIS)

VALVE = "switch.valve"
POWER = "sensor.valve_power"
FAULT = "binary_sensor.lawn_closing_fault"
NOTIFY = "custom_components.hydraxoo.engine.persistent_notification"


class Clock:
    """Move Home Assistant's time forward second by second."""

    def __init__(self, hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
        """Initialize at Monday 05:59:30."""
        self.hass = hass
        self.freezer = freezer
        self.now = MONDAY_0559
        freezer.move_to(self.now)

    async def advance(self, seconds: int) -> None:
        """Advance, letting every timer and background task run."""
        for _ in range(seconds):
            self.now += timedelta(seconds=1)
            self.freezer.move_to(self.now)
            async_fire_time_changed(self.hass, self.now)
            for _ in range(5):
                await asyncio.sleep(0)
            await self.hass.async_block_till_done()


async def _setup_valve(hass: HomeAssistant, is_on: bool = False) -> MockValve:
    valve = MockValve("Valve", is_on=is_on)
    valve.power_entity = POWER
    setup_test_component_platform(hass, "switch", [valve])
    assert await async_setup_component(hass, "switch", {"switch": {"platform": "test"}})
    await hass.async_block_till_done()
    return valve


async def _setup(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    valve_on: bool = False,
    power_w: float = 0.0,
    options: dict[str, Any] | None = None,
    **zone: Any,
) -> MockValve:
    valve = await _setup_valve(hass, valve_on)
    hass.states.async_set(POWER, str(power_w), {"unit_of_measurement": "W"})
    # Cycle on Sundays only, so that it does not start during the tests.
    zone.setdefault("cycle", {"weekdays": [6]})
    store_zones(hass_storage, [zone_data(power_entity=POWER, **zone)])
    await setup_entry(hass, options)
    return valve


def _device(hass: HomeAssistant) -> str:
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    device = dr.async_get(hass).async_get_device_by_identifier(
        (DOMAIN, "zone1"), entry.entry_id
    )
    assert device is not None
    return device.id


async def _water_one_minute(hass: HomeAssistant, clock: Clock) -> None:
    """Manual run of 1 minute, until the valve is switched off."""
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": _device(hass), "duration": 1}, blocking=True
    )
    await clock.advance(60)
    assert hass.states.get(VALVE).state == STATE_OFF


@pytest.fixture
def clock(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> Clock:
    """A controllable clock starting Monday 05:59:30."""
    return Clock(hass, freezer)


# ---------------------------------------------------------- required tests


async def test_closed_at_once(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """Power drops after closing: confirmed, no retry."""
    valve = await _setup(hass, hass_storage)
    retries = async_capture_events(hass, EVENT_SAFETY_RETRY)
    await _water_one_minute(hass, clock)
    assert hass.states.get(FAULT).attributes["checking"] is True

    await clock.advance(10)
    attrs = hass.states.get(FAULT).attributes
    assert attrs["checking"] is False
    assert attrs["last_check"] == "confirmed"
    assert attrs["last_check_retries"] == 0
    assert retries == []
    assert valve.calls == ["on", "off"]


@pytest.mark.parametrize("stuck", [1, 3])
async def test_closed_after_retries(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock, stuck: int
) -> None:
    """The valve stays open 1 or 3 times, then closes after as many retries."""
    valve = await _setup(hass, hass_storage)
    retries = async_capture_events(hass, EVENT_SAFETY_RETRY)
    valve.stuck_closings = stuck
    await _water_one_minute(hass, clock)

    # Each retry: 10 s check delay + 5 s switched on; then a last 10 s check.
    await clock.advance(stuck * 15 + 10)
    attrs = hass.states.get(FAULT).attributes
    assert attrs["last_check"] == "confirmed"
    assert attrs["last_check_retries"] == stuck
    assert [e.data["attempt"] for e in retries] == list(range(1, stuck + 1))
    assert retries[0].data["power_w"] == 6.0
    assert hass.states.get(FAULT).state == STATE_OFF
    assert valve.calls == ["on", "off"] + ["on", "off"] * stuck


async def test_fault_after_max_retries(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """Still open after 5 retries: fault, notification, zone blocked."""
    valve = await _setup(hass, hass_storage)
    failed = async_capture_events(hass, EVENT_SAFETY_FAILED)
    skipped = async_capture_events(hass, EVENT_CYCLE_SKIPPED)
    valve.stuck_closings = 99

    with patch(f"{NOTIFY}.async_create") as notify:
        await _water_one_minute(hass, clock)
        await clock.advance(5 * 15 + 10)

    assert hass.states.get(FAULT).state == STATE_ON
    assert hass.states.get(FAULT).attributes["last_check"] == "failed"
    assert failed[0].data["attempts"] == 5
    assert failed[0].data["power_w"] == 6.0
    notify.assert_called_once()
    assert "Lawn" in notify.call_args.args[1]
    assert hass_storage["hydraxoo.zones"]["data"]["zones"][0]["fault"] is True

    # No retry beyond the maximum
    assert valve.calls.count("on") == 1 + 5

    # Manual watering refused, scheduled cycle skipped (next Sunday 06:00)
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "run_zone", {"zone": _device(hass)}, blocking=True
        )
    sunday = datetime(2026, 11, 29, 6, 0, tzinfo=PARIS)
    clock.freezer.move_to(sunday)
    async_fire_time_changed(hass, sunday)
    await hass.async_block_till_done()
    assert skipped[-1].data["reason"] == "fault"

    # Acknowledging clears the fault and the notification
    with patch(f"{NOTIFY}.async_dismiss") as dismiss:
        await hass.services.async_call(
            DOMAIN, "acknowledge_fault", {"zone": _device(hass)}, blocking=True
        )
    dismiss.assert_called_once()
    assert hass.states.get(FAULT).state == STATE_OFF
    assert hass_storage["hydraxoo.zones"]["data"]["zones"][0]["fault"] is False


async def test_sensor_unavailable_no_retry(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """Without a reading there is no retry, only a warning."""
    valve = await _setup(hass, hass_storage)
    valve.report_power = False
    hass.states.async_set(POWER, STATE_UNAVAILABLE)
    await _water_one_minute(hass, clock)
    await clock.advance(10)

    assert hass.states.get(FAULT).attributes["last_check"] == "sensor_unavailable"
    assert hass.states.get(FAULT).state == STATE_OFF
    assert valve.calls == ["on", "off"]


async def test_restart_during_retry(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """Home Assistant restarted mid-retry: the stuck valve is retried at startup."""
    valve = await _setup(hass, hass_storage, valve_on=False, power_w=6.0)
    assert hass.states.get(FAULT).attributes["checking"] is True

    await clock.advance(10 + 5 + 10)
    attrs = hass.states.get(FAULT).attributes
    assert attrs["last_check"] == "confirmed"
    assert attrs["last_check_retries"] == 1
    assert valve.calls == ["on", "off"]


async def test_restart_with_valve_open(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """A valve found open at startup is closed, then checked."""
    valve = await _setup(hass, hass_storage, valve_on=True, power_w=6.0)
    assert hass.states.get(VALVE).state == STATE_OFF
    await clock.advance(10)
    assert hass.states.get(FAULT).attributes["last_check"] == "confirmed"
    assert valve.calls == ["off"]


# ------------------------------------------------------------- other cases


async def test_waits_for_late_power_report(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """A plug that reports late: the old high reading is not trusted."""
    valve = await _setup(hass, hass_storage)
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": _device(hass), "duration": 1}, blocking=True
    )
    valve.report_power = False  # the 0 W after closing comes later
    await clock.advance(60)
    await clock.advance(10)
    assert hass.states.get(FAULT).attributes["checking"] is True  # waiting

    hass.states.async_set(POWER, "0.0", {"unit_of_measurement": "W"})
    await clock.advance(1)
    attrs = hass.states.get(FAULT).attributes
    assert attrs["last_check"] == "confirmed"
    assert attrs["last_check_retries"] == 0
    assert valve.calls == ["on", "off"]


async def test_check_after_manual_stop(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """The check also runs after the Stop button."""
    valve = await _setup(hass, hass_storage)
    valve.stuck_closings = 1
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": _device(hass)}, blocking=True
    )
    await hass.services.async_call(
        DOMAIN, "stop_zone", {"zone": _device(hass)}, blocking=True
    )
    await clock.advance(25)
    assert hass.states.get(FAULT).attributes["last_check_retries"] == 1


async def test_no_check_without_power_sensor(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """Zones without a power sensor are not checked."""
    valve = await _setup_valve(hass)
    store_zones(hass_storage, [zone_data(cycle={"weekdays": [6]})])
    await setup_entry(hass)
    await _water_one_minute(hass, clock)
    attrs = hass.states.get(FAULT).attributes
    assert attrs == attrs | {"check_enabled": False, "checking": False}
    assert valve.calls == ["on", "off"]


async def test_queue_waits_for_check(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """One zone at a time: the next zone starts once the check is done."""
    first, second = MockValve("Valve"), MockValve("Valve 2")
    first.power_entity = POWER
    setup_test_component_platform(hass, "switch", [first, second])
    assert await async_setup_component(hass, "switch", {"switch": {"platform": "test"}})
    hass.states.async_set(POWER, "0.0", {"unit_of_measurement": "W"})
    store_zones(
        hass_storage,
        [
            zone_data(power_entity=POWER),
            zone_data(id="zone2", name="Flowers", switch_entity="switch.valve_2"),
        ],
    )
    await setup_entry(hass)

    await clock.advance(30)  # 06:00:00, both zones due
    assert hass.states.get("switch.valve").state == STATE_ON
    await clock.advance(600)  # zone 1 closes at 06:10
    assert hass.states.get("switch.valve").state == STATE_OFF
    assert hass.states.get("switch.valve_2").state == STATE_OFF
    await clock.advance(10)  # check confirmed
    assert hass.states.get("switch.valve_2").state == STATE_ON


async def test_unload_during_retry_closes_valve(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """Reloading while a retry has the valve on switches it off."""
    valve = await _setup(hass, hass_storage)
    valve.stuck_closings = 99
    await _water_one_minute(hass, clock)
    await clock.advance(12)  # retry pulse in progress: valve on
    assert hass.states.get(VALVE).state == STATE_ON

    entry = hass.config_entries.async_entries(DOMAIN)[0]
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(VALVE).state == STATE_OFF


# --------------------------------------------------- continuous monitoring


async def test_unexpected_consumption_while_idle(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """No watering, switch off, power suddenly rises: the valve is retried."""
    valve = await _setup(hass, hass_storage)
    retries = async_capture_events(hass, EVENT_SAFETY_RETRY)
    hass.states.async_set(POWER, "6.0", {"unit_of_measurement": "W"})
    await hass.async_block_till_done()
    assert hass.states.get(FAULT).attributes["checking"] is True

    await clock.advance(10 + 5 + 10)
    attrs = hass.states.get(FAULT).attributes
    assert attrs["last_check"] == "confirmed"
    assert attrs["last_check_retries"] == 1
    assert len(retries) == 1
    assert valve.calls == ["on", "off"]  # the retry pulse only


async def test_no_check_when_switched_on_on_purpose(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """'Allow' mode: a valve switched on by hand is left alone (cut-off later)."""
    valve = await _setup(hass, hass_storage, options={"external_open": "allow"})
    await hass.services.async_call(
        "switch", "turn_on", {"entity_id": VALVE}, blocking=True
    )
    await clock.advance(30)
    assert hass.states.get(FAULT).attributes["checking"] is False
    assert "last_check" not in hass.states.get(FAULT).attributes
    assert valve.calls == ["on"]


async def test_no_check_during_watering(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """Consumption while hydraXoo waters is normal."""
    await _setup(hass, hass_storage)
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone": _device(hass), "duration": 5}, blocking=True
    )
    hass.states.async_set(POWER, "6.5", {"unit_of_measurement": "W"})
    await clock.advance(30)
    assert hass.states.get(FAULT).attributes["checking"] is False
    assert hass.states.get(VALVE).state == STATE_ON


async def test_no_endless_retries_once_in_fault(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """A zone already in fault is not retried again at every reading."""
    valve = await _setup(hass, hass_storage, fault=True)
    hass.states.async_set(POWER, "6.0", {"unit_of_measurement": "W"})
    await clock.advance(30)
    assert hass.states.get(FAULT).attributes["checking"] is False
    assert valve.calls == []


async def test_sensor_available_late_after_restart(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """Z-Wave not ready at startup: the first reading, high, starts the check."""
    valve = await _setup(hass, hass_storage)
    hass.states.async_set(POWER, STATE_UNAVAILABLE)
    await hass.async_block_till_done()
    assert hass.states.get(FAULT).attributes["checking"] is False

    hass.states.async_set(POWER, "5.0", {"unit_of_measurement": "W"})
    await hass.async_block_till_done()
    assert hass.states.get(FAULT).attributes["checking"] is True
    await clock.advance(25)
    assert hass.states.get(FAULT).attributes["last_check"] == "confirmed"
    assert valve.calls == ["on", "off"]


async def test_small_threshold(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """A 0.2 W threshold: 0.5 W counts as open."""
    await _setup(hass, hass_storage, safety={"threshold_w": 0.2})
    hass.states.async_set(POWER, "0.5", {"unit_of_measurement": "W"})
    await hass.async_block_till_done()
    assert hass.states.get(FAULT).attributes["checking"] is True


async def test_phone_alert_on_fault_and_cleared_on_acknowledge(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """A valve that cannot be closed alerts the chosen phones, high priority."""
    phone = async_mock_service(hass, "notify", "mobile_app_pixel")
    valve = await _setup(
        hass, hass_storage, options={"notify_services": ["mobile_app_pixel"]}
    )
    valve.stuck_closings = 99
    with patch(f"{NOTIFY}.async_create"):
        await _water_one_minute(hass, clock)
        await clock.advance(5 * 15 + 10)

    assert len(phone) == 1
    alert = phone[0].data
    assert "Lawn" in alert["title"]
    assert "6.0 W" in alert["message"]
    assert alert["data"]["priority"] == "high"
    assert alert["data"]["push"]["interruption-level"] == "time-sensitive"
    tag = alert["data"]["tag"]

    with patch(f"{NOTIFY}.async_dismiss"):
        await hass.services.async_call(
            DOMAIN, "acknowledge_fault", {"zone": _device(hass)}, blocking=True
        )
    assert phone[1].data == {"message": "clear_notification", "data": {"tag": tag}}


async def test_no_phone_alert_when_closed_after_retries(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """Retries that work do not wake anybody up."""
    phone = async_mock_service(hass, "notify", "mobile_app_pixel")
    valve = await _setup(
        hass, hass_storage, options={"notify_services": ["mobile_app_pixel"]}
    )
    valve.stuck_closings = 2
    await _water_one_minute(hass, clock)
    await clock.advance(2 * 15 + 10)
    assert hass.states.get(FAULT).attributes["last_check"] == "confirmed"
    assert phone == []


async def test_missing_phone_does_not_block_safety(
    hass: HomeAssistant, hass_storage: dict[str, Any], clock: Clock
) -> None:
    """A phone removed from Home Assistant: the fault is still recorded."""
    valve = await _setup(
        hass, hass_storage, options={"notify_services": ["mobile_app_gone"]}
    )
    valve.stuck_closings = 99
    with patch(f"{NOTIFY}.async_create"):
        await _water_one_minute(hass, clock)
        await clock.advance(5 * 15 + 10)
    assert hass.states.get(FAULT).state == STATE_ON
