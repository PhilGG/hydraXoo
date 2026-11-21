"""Valve-closing check based on power consumption.

An open solenoid valve draws power. After each closing order we check that
the power has dropped; if not, we briefly switch the valve on and off again,
up to a maximum number of attempts.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import datetime

from homeassistant.const import (
    SERVICE_TURN_OFF,
    SERVICE_TURN_ON,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers.event import (
    async_call_later,
    async_track_state_change_event,
)
from homeassistant.util import dt as dt_util

from .const import (
    CHECK_CONFIRMED,
    CHECK_FAILED,
    CHECK_SENSOR_UNAVAILABLE,
    SENSOR_WAIT_MAX_S,
)
from .models import Zone

_LOGGER = logging.getLogger(__name__)


@dataclass
class CheckResult:
    """Outcome of a closing check."""

    result: str  # CHECK_CONFIRMED, CHECK_FAILED or CHECK_SENSOR_UNAVAILABLE
    retries: int
    power_w: float | None
    finished: datetime


class ClosingCheck:
    """Run the closing check for one zone."""

    def __init__(
        self,
        hass: HomeAssistant,
        zone: Zone,
        switch: Callable[[str, str], Awaitable[None]],
        on_retry: Callable[[int, float], None],
    ) -> None:
        """Initialize with a function to switch the valve and a retry callback."""
        self.hass = hass
        self.zone = zone
        self._switch = switch
        self._on_retry = on_retry
        assert zone.power_entity is not None
        self._power_entity: str = zone.power_entity

    async def async_run(self) -> CheckResult:
        """Check, retry if needed, and return the outcome.

        1. wait `check_delay_s` after the closing order, read the power;
        2. at or below the threshold: closed, done;
        3. above: switch on for `retry_pulse_s`, switch off, back to 1;
        4. after `max_attempts` retries still above: failed.
        """
        settings = self.zone.safety
        retries = 0
        since = dt_util.utcnow()
        while True:
            await self._async_sleep(settings.check_delay_s)
            power = await self._async_read_fresh(since)
            if power is None:
                return self._result(CHECK_SENSOR_UNAVAILABLE, retries, None)
            if power <= settings.threshold_w:
                return self._result(CHECK_CONFIRMED, retries, power)
            if retries >= settings.max_attempts:
                return self._result(CHECK_FAILED, retries, power)
            retries += 1
            _LOGGER.warning(
                "Zone %s still draws %.1f W after closing, retry %s/%s",
                self.zone.name,
                power,
                retries,
                settings.max_attempts,
            )
            self._on_retry(retries, power)
            await self._switch(self.zone.switch_entity, SERVICE_TURN_ON)
            await self._async_sleep(settings.retry_pulse_s)
            await self._switch(self.zone.switch_entity, SERVICE_TURN_OFF)
            since = dt_util.utcnow()

    @staticmethod
    def _result(result: str, retries: int, power: float | None) -> CheckResult:
        return CheckResult(result, retries, power, dt_util.utcnow())

    def _read(self) -> tuple[float | None, datetime | None]:
        """Current power in W and when it was last reported."""
        state = self.hass.states.get(self._power_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None, None
        try:
            value = float(state.state)
        except ValueError:
            return None, None
        if state.attributes.get("unit_of_measurement") == "kW":
            value *= 1000
        reported = getattr(state, "last_reported", None) or state.last_updated
        return value, max(reported, state.last_updated)

    async def _async_read_fresh(self, since: datetime) -> float | None:
        """Read the power; if a high reading predates `since`, wait for news.

        Some plugs only report periodically or after a minimum change, so a
        reading taken before the closing order says nothing about the valve.
        """
        value, reported = self._read()
        if value is None or reported is None:
            return None
        if value <= self.zone.safety.threshold_w or reported >= since:
            return value

        future = self.hass.loop.create_future()

        @callback
        def _done(*_args: object) -> None:
            if not future.done():
                future.set_result(None)

        @callback
        def _changed(_event: Event[EventStateChangedData]) -> None:
            _done()

        unsub_state = async_track_state_change_event(
            self.hass, [self._power_entity], _changed
        )
        unsub_timer = async_call_later(self.hass, SENSOR_WAIT_MAX_S, _done)
        try:
            await future
        finally:
            unsub_state()
            unsub_timer()
        return self._read()[0]

    async def _async_sleep(self, seconds: float) -> None:
        """Sleep using Home Assistant's clock (so tests can move time)."""
        future = self.hass.loop.create_future()

        @callback
        def _done(_now: datetime) -> None:
            if not future.done():
                future.set_result(None)

        cancel = async_call_later(self.hass, seconds, _done)
        try:
            await future
        finally:
            cancel()
