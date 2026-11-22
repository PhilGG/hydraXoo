"""Watering engine: schedules cycles, opens and closes valves."""

from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from homeassistant.components import persistent_notification
from homeassistant.const import (
    ATTR_ENTITY_ID,
    EVENT_HOMEASSISTANT_STARTED,
    EVENT_HOMEASSISTANT_STOP,
    SERVICE_TURN_OFF,
    SERVICE_TURN_ON,
    STATE_OFF,
    STATE_ON,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import (
    CALLBACK_TYPE,
    Event,
    EventStateChangedData,
    HomeAssistant,
    callback,
)
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.event import (
    async_call_later,
    async_track_point_in_utc_time,
    async_track_state_change_event,
    async_track_time_change,
    async_track_time_interval,
)
from homeassistant.helpers.translation import async_get_translations
from homeassistant.util import dt as dt_util

from .const import (
    CHECK_CONFIRMED,
    CHECK_FAILED,
    CHECK_SENSOR_UNAVAILABLE,
    DEFAULT_DURATION,
    DOMAIN,
    END_COMPLETED,
    END_EXTERNAL,
    END_MANUAL_STOP,
    END_MAX_RUNTIME,
    END_RESTART,
    END_UNLOAD,
    EVENT_CYCLE_FINISHED,
    EVENT_CYCLE_SKIPPED,
    EVENT_CYCLE_STARTED,
    EVENT_SAFETY_FAILED,
    EVENT_SAFETY_RETRY,
    REMAINING_REFRESH_SECONDS,
    SKIP_FAULT,
    SKIP_PAUSED,
    SKIP_STOPPED,
    SKIP_WEATHER,
    SKIP_ZONE_DISABLED,
    SOURCE_MANUAL,
    SOURCE_SCHEDULE,
)
from .models import Cycle, WeatherRules, Zone
from .safety import CheckResult, ClosingCheck
from .store import StoredData, ZoneStore
from .weather import WeatherResult, WeatherService

_LOGGER = logging.getLogger(__name__)

SWITCH_DOMAIN = "switch"


@dataclass
class ZoneRun:
    """A watering in progress, started by hydraXoo."""

    source: str
    started: datetime
    ends: datetime
    duration_min: int
    capped: bool  # True if the duration was cut down to max_runtime_min
    cycle_id: str | None = None
    weather: dict[str, Any] | None = None  # base duration and coefficient
    unsubs: list[CALLBACK_TYPE] = field(default_factory=list)

    def cancel_timers(self) -> None:
        """Cancel the end and refresh timers."""
        while self.unsubs:
            self.unsubs.pop()()


@dataclass
class QueuedRun:
    """A watering waiting for its turn."""

    zone_id: str
    duration_min: int
    source: str
    cycle_id: str | None
    queued_at: datetime
    weather: dict[str, Any] | None = None


class HydraxooEngine:
    """Owns the zones and everything that happens to them at run time."""

    def __init__(
        self,
        hass: HomeAssistant,
        store: ZoneStore,
        data: StoredData,
        sequential: bool = True,
        weather_entity: str | None = None,
        rain_sensor: str | None = None,
        notify_services: list[str] | None = None,
    ) -> None:
        """Initialize the engine."""
        self.hass = hass
        self._store = store
        self.zones: dict[str, Zone] = {z.id: z for z in data.zones}
        self.paused = data.paused
        self.pause_until = data.pause_until
        # True: one zone at a time, others wait in the queue
        self.sequential = sequential
        self.runs: dict[str, ZoneRun] = {}
        self.queue: list[QueuedRun] = []
        # Closing checks in progress, and the last outcome per zone
        self.checking: dict[str, asyncio.Task] = {}
        self.last_check: dict[str, CheckResult] = {}
        # Weather coefficient per zone, refreshed every 30 min and before starts
        self.weather = WeatherService(
            hass, weather_entity, rain_sensor, data.rain_history, data.rain_total
        )
        self.weather_results: dict[str, WeatherResult] = {}
        # Phones (notify services) alerted when a valve cannot be closed
        self.notify_services: list[str] = list(notify_services or [])
        self._pause_timer: CALLBACK_TYPE | None = None
        # Safety cut-off for valves switched on outside hydraXoo
        self._external_cutoff: dict[str, CALLBACK_TYPE] = {}
        self._listeners: list[Callable[[], None]] = []
        # Platforms register here to create the entities of new zones
        self._zone_added: list[Callable[[Zone], None]] = []
        self._entity_unsubs: list[CALLBACK_TYPE] = []
        # Recent waterings and skipped cycles (today and yesterday), for the card
        self.history: list[dict[str, Any]] = list(data.history)
        self.entry_id: str | None = None
        self._shutdown_callbacks: list[Callable[[], None]] = []
        self._unsubs: list[CALLBACK_TYPE] = []

    # ------------------------------------------------------------------ setup

    async def async_start(self) -> None:
        """Start listening to the clock and to the valves."""
        if self.paused and self.pause_until is not None:
            if self.pause_until <= dt_util.utcnow():
                await self.async_resume()
            else:
                self._schedule_auto_resume()
        self._unsubs.append(
            async_track_time_change(self.hass, self._async_tick, second=0)
        )
        self._subscribe_switches()
        self._unsubs.append(
            self.hass.bus.async_listen_once(
                EVENT_HOMEASSISTANT_STOP, self._async_on_ha_stop
            )
        )
        if self.hass.is_running:
            await self._async_close_open_valves()
            await self.async_update_weather()
        else:
            self._unsubs.append(
                self.hass.bus.async_listen_once(
                    EVENT_HOMEASSISTANT_STARTED, self._async_on_ha_started
                )
            )

    async def async_shutdown(self) -> None:
        """Stop everything (integration unloaded or reloaded)."""
        for notify_shutdown in list(self._shutdown_callbacks):
            notify_shutdown()
        self.queue.clear()
        while self._entity_unsubs:
            self._entity_unsubs.pop()()
        self._cancel_pause_timer()
        while self._unsubs:
            unsub = self._unsubs.pop()
            # A listen_once that already fired cannot be removed twice.
            with contextlib.suppress(ValueError):
                unsub()
        for cancel in self._external_cutoff.values():
            cancel()
        self._external_cutoff.clear()
        for zone_id in list(self.runs):
            await self._async_close_zone(zone_id, END_UNLOAD, check=False)
        interrupted = list(self.checking)
        tasks = list(self.checking.values())
        for task in tasks:
            task.cancel()
        for task in tasks:
            with contextlib.suppress(asyncio.CancelledError):
                await task
        self.checking.clear()
        # A check interrupted during a retry may have left the valve on.
        for zone_id in interrupted:
            zone = self.zones.get(zone_id)
            state = self.hass.states.get(zone.switch_entity) if zone else None
            if zone and state is not None and state.state == STATE_ON:
                await self._async_switch(zone.switch_entity, SERVICE_TURN_OFF)

    async def _async_on_ha_started(self, _event: Event) -> None:
        await self._async_close_open_valves()
        await self.async_update_weather()

    async def _async_on_ha_stop(self, _event: Event) -> None:
        """Close valves we opened before Home Assistant stops."""
        self.queue.clear()
        for zone_id in list(self.runs):
            await self._async_close_zone(zone_id, END_UNLOAD, check=False)

    async def _async_close_open_valves(self) -> None:
        """At startup, any valve found open is closed: it was interrupted.

        Zones with a power sensor are also checked when their switch is off
        but the valve still draws power (e.g. restart during a retry).
        """
        for zone in self.zones.values():
            state = self.hass.states.get(zone.switch_entity)
            if state is not None and state.state == STATE_ON:
                await self._async_close_interrupted(zone)
            elif self._draws_power(zone):
                self._start_check(zone)

    async def _async_close_interrupted(self, zone: Zone) -> None:
        _LOGGER.warning(
            "Valve %s of zone %s was found open, closing it",
            zone.switch_entity,
            zone.name,
        )
        await self._async_switch(zone.switch_entity, SERVICE_TURN_OFF)
        self._fire(EVENT_CYCLE_FINISHED, zone, reason=END_RESTART)
        self._start_check(zone)

    # -------------------------------------------------------------- listeners

    @callback
    def async_add_listener(self, update: Callable[[], None]) -> CALLBACK_TYPE:
        """Register a callback run whenever the state changes."""
        self._listeners.append(update)

        @callback
        def remove() -> None:
            self._listeners.remove(update)

        return remove

    @callback
    def _notify(self) -> None:
        for update in list(self._listeners):
            update()

    # --------------------------------------------------------------- queries

    def is_busy(self, zone_id: str) -> bool:
        """Watering or being checked after closing."""
        return zone_id in self.runs or zone_id in self.checking

    def is_running(self, zone_id: str) -> bool:
        """Return True if hydraXoo is currently watering this zone."""
        return zone_id in self.runs

    def remaining_seconds(self, zone_id: str) -> int:
        """Seconds left in the current watering (0 when idle)."""
        run = self.runs.get(zone_id)
        if run is None:
            return 0
        return max(0, round((run.ends - dt_util.utcnow()).total_seconds()))

    def next_run(self, zone_id: str) -> tuple[datetime, Cycle] | None:
        """Next scheduled start of a zone, taking the pause into account."""
        after = dt_util.now()
        if self.paused:
            if self.pause_until is None:
                return None
            after = max(after, dt_util.as_local(self.pause_until))
        return self.zones[zone_id].next_run(after)

    @staticmethod
    def base_duration(zone: Zone) -> int:
        """Duration used by 'water now' when none is given."""
        for cycle in zone.cycles:
            if cycle.enabled:
                return cycle.duration_min
        return zone.cycles[0].duration_min if zone.cycles else DEFAULT_DURATION

    # -------------------------------------------------------------- commands

    async def async_save(self) -> None:
        """Persist zones and pause state."""
        await self._store.async_save(
            StoredData(
                zones=list(self.zones.values()),
                paused=self.paused,
                pause_until=self.pause_until,
                rain_history=self.weather.history,
                rain_total=self.weather.rain_total,
                history=self.history,
            )
        )

    async def async_pause(self, days: int | None = None) -> None:
        """Stop starting cycles, for a number of days or until resumed.

        A watering in progress is not interrupted; queued cycles are dropped.
        """
        self.paused = True
        self.pause_until = (
            dt_util.utcnow() + timedelta(days=days) if days is not None else None
        )
        self._cancel_pause_timer()
        if self.pause_until is not None:
            self._schedule_auto_resume()
        for item in self.queue:
            if item.source == SOURCE_SCHEDULE:
                self._fire_skipped(item.zone_id, item.cycle_id, SKIP_PAUSED)
        self.queue = [i for i in self.queue if i.source != SOURCE_SCHEDULE]
        await self.async_save()
        self._notify()

    async def async_resume(self) -> None:
        """End the pause."""
        self.paused = False
        self.pause_until = None
        self._cancel_pause_timer()
        await self.async_save()
        self._notify()

    def _schedule_auto_resume(self) -> None:
        assert self.pause_until is not None

        async def _async_auto_resume(_now: datetime) -> None:
            self._pause_timer = None
            await self.async_resume()

        self._pause_timer = async_track_point_in_utc_time(
            self.hass, _async_auto_resume, self.pause_until
        )

    def _cancel_pause_timer(self) -> None:
        if self._pause_timer is not None:
            self._pause_timer()
            self._pause_timer = None

    async def async_request_zone(
        self,
        zone_id: str,
        duration_min: int | None = None,
        source: str = SOURCE_MANUAL,
        cycle_id: str | None = None,
        weather: dict[str, Any] | None = None,
    ) -> None:
        """Water a zone now, or queue it if it has to wait its turn.

        - The zone is already watering: a manual request replaces the current
          run; a scheduled cycle waits for the end of the current run.
        - One zone at a time and another zone is watering: wait in the queue.
        """
        zone = self.zones[zone_id]
        if zone.fault:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="zone_in_fault",
                translation_placeholders={"zone": zone.name},
            )
        duration = (
            duration_min if duration_min is not None else self.base_duration(zone)
        )
        if zone_id in self.runs:
            must_wait = source == SOURCE_SCHEDULE
        elif zone_id in self.checking:
            must_wait = True
        else:
            must_wait = self.sequential and (bool(self.runs) or bool(self.checking))
        if not must_wait:
            await self.async_start_zone(zone_id, duration, source, cycle_id, weather)
            return
        self.queue.append(
            QueuedRun(zone_id, duration, source, cycle_id, dt_util.utcnow(), weather)
        )
        _LOGGER.info("Zone %s queued (%s min)", zone.name, duration)
        self._notify()

    async def _async_process_queue(self) -> None:
        """Start the queued runs that may start now."""
        index = 0
        while index < len(self.queue):
            item = self.queue[index]
            zone = self.zones.get(item.zone_id)
            if zone is None:
                self.queue.pop(index)
                continue
            if self.sequential and (self.runs or self.checking):
                return
            if self.is_busy(item.zone_id):
                index += 1
                continue
            self.queue.pop(index)
            if zone.fault:
                self._fire_skipped(zone.id, item.cycle_id, SKIP_FAULT)
                continue
            if item.source == SOURCE_SCHEDULE and not zone.enabled:
                self._fire_skipped(zone.id, item.cycle_id, SKIP_ZONE_DISABLED)
                continue
            try:
                await self.async_start_zone(
                    zone.id, item.duration_min, item.source, item.cycle_id, item.weather
                )
            except Exception:
                _LOGGER.exception("Could not start zone %s", zone.name)

    async def async_set_zone_enabled(self, zone_id: str, enabled: bool) -> None:
        """Enable or disable scheduled watering for a zone."""
        self.zones[zone_id].enabled = enabled
        await self.async_save()
        self._notify()

    async def async_start_zone(
        self,
        zone_id: str,
        duration_min: int | None = None,
        source: str = SOURCE_MANUAL,
        cycle_id: str | None = None,
        weather: dict[str, Any] | None = None,
    ) -> None:
        """Open a zone's valve for a number of minutes."""
        zone = self.zones[zone_id]
        wanted = duration_min if duration_min is not None else self.base_duration(zone)
        duration = min(wanted, zone.max_runtime_min)

        previous = self.runs.pop(zone_id, None)
        if previous is not None:
            previous.cancel_timers()

        now = dt_util.utcnow()
        run = ZoneRun(
            source=source,
            started=now,
            ends=now + timedelta(minutes=duration),
            duration_min=duration,
            capped=duration < wanted,
            cycle_id=cycle_id,
            weather=weather,
        )
        # Register the run before switching on, so the resulting state
        # change is not mistaken for someone else opening the valve.
        self.runs[zone_id] = run
        self._cancel_external_cutoff(zone_id)

        try:
            await self._async_switch(zone.switch_entity, SERVICE_TURN_ON)
        except Exception:
            self.runs.pop(zone_id, None)
            raise

        run.unsubs.append(
            async_track_point_in_utc_time(
                self.hass, self._make_end_callback(zone_id, run), run.ends
            )
        )
        run.unsubs.append(
            async_track_time_interval(
                self.hass,
                self._async_refresh,
                timedelta(seconds=REMAINING_REFRESH_SECONDS),
            )
        )
        self._fire(
            EVENT_CYCLE_STARTED,
            zone,
            source=source,
            duration_min=duration,
            cycle_id=cycle_id,
            **(weather or {}),
        )
        self._notify()

    async def async_stop_zone(
        self, zone_id: str, reason: str = END_MANUAL_STOP
    ) -> None:
        """Close a zone's valve and drop its queued runs (stop command)."""
        if reason == END_MANUAL_STOP:
            self._drop_queued(lambda item: item.zone_id == zone_id)
        await self._async_close_zone(zone_id, reason)
        await self._async_process_queue()

    async def _async_close_zone(
        self, zone_id: str, reason: str, check: bool = True
    ) -> None:
        """Close a zone's valve, end its run, then check the closing."""
        zone = self.zones.get(zone_id)
        if zone is None:
            return
        run = self.runs.pop(zone_id, None)
        if run is not None:
            run.cancel_timers()
        self._cancel_external_cutoff(zone_id)

        state = self.hass.states.get(zone.switch_entity)
        closed = run is not None or (state is not None and state.state != STATE_OFF)
        if closed:
            await self._async_switch(zone.switch_entity, SERVICE_TURN_OFF)
        if run is not None:
            self._fire_finished(zone, run, reason)
        if closed and check:
            self._start_check(zone)
        self._notify()

    async def async_stop_all(self) -> None:
        """Close every zone and empty the queue."""
        self._drop_queued(lambda item: True)
        for zone_id in list(self.zones):
            await self._async_close_zone(zone_id, END_MANUAL_STOP)
        self._notify()

    def _drop_queued(
        self, predicate: Callable[[QueuedRun], bool], reason: str = SKIP_STOPPED
    ) -> None:
        kept: list[QueuedRun] = []
        for item in self.queue:
            if predicate(item):
                self._fire_skipped(item.zone_id, item.cycle_id, reason)
            else:
                kept.append(item)
        self.queue = kept

    # --------------------------------------------------------------- internals

    def _make_end_callback(
        self, zone_id: str, run: ZoneRun
    ) -> Callable[[datetime], Any]:
        async def _async_end(_now: datetime) -> None:
            if self.runs.get(zone_id) is not run:
                return
            reason = END_MAX_RUNTIME if run.capped else END_COMPLETED
            await self.async_stop_zone(zone_id, reason)

        return _async_end

    @callback
    def _async_refresh(self, _now: datetime) -> None:
        self._notify()

    async def _async_tick(self, now: datetime) -> None:
        """Every minute: start (or queue) the cycles due now."""
        local = dt_util.as_local(now).replace(second=0, microsecond=0)
        due = [
            (zone, cycle)
            for zone in list(self.zones.values())
            for cycle in zone.cycles
            if cycle.enabled
            and local.weekday() in cycle.weekdays
            and cycle.start == local.time()
        ]
        if local.minute == 0:
            await self.weather.async_refresh()
            if self.weather.record_hour(now):
                await self.async_save()
        if due:
            # Coefficient recalculated right before the start
            await self.async_update_weather(force=True)
        elif local.minute in (0, 30):
            await self.async_update_weather()
        for zone, cycle in due:
            if self.paused:
                self._fire_skipped(zone.id, cycle.id, SKIP_PAUSED)
                continue
            if not zone.enabled:
                self._fire_skipped(zone.id, cycle.id, SKIP_ZONE_DISABLED)
                continue
            if zone.fault:
                self._fire_skipped(zone.id, cycle.id, SKIP_FAULT)
                continue
            result = self.weather_results.get(zone.id) or self.weather.compute(zone)
            duration = result.adjust(cycle.duration_min)
            if duration < 1:
                self._fire_skipped(
                    zone.id, cycle.id, SKIP_WEATHER, weather=result.as_dict()
                )
                continue
            weather = {
                "base_duration_min": cycle.duration_min,
                "coefficient_pct": result.percent,
            }
            try:
                await self.async_request_zone(
                    zone.id, duration, SOURCE_SCHEDULE, cycle.id, weather
                )
            except Exception:
                _LOGGER.exception("Could not start zone %s", zone.name)
        self._notify()

    async def _async_switch_changed(self, event: Event[EventStateChangedData]) -> None:
        """React to a valve being switched outside hydraXoo."""
        entity_id = event.data["entity_id"]
        old = event.data["old_state"]
        new = event.data["new_state"]
        old_value = old.state if old else None
        new_value = new.state if new else None
        for zone in [z for z in self.zones.values() if z.switch_entity == entity_id]:
            if zone.id in self.checking:
                continue  # the closing check is switching the valve itself
            if new_value == STATE_ON and zone.id not in self.runs:
                if old_value in (None, STATE_UNAVAILABLE, STATE_UNKNOWN):
                    # The device just came back and reports an open valve:
                    # same situation as finding it open at startup.
                    await self._async_close_interrupted(zone)
                else:
                    self._start_external_cutoff(zone)
            elif new_value == STATE_OFF:
                self._cancel_external_cutoff(zone.id)
                run = self.runs.pop(zone.id, None)
                if run is not None:
                    run.cancel_timers()
                    self._fire_finished(zone, run, END_EXTERNAL)
                    self._start_check(zone)
                    self._notify()
                    await self._async_process_queue()

    def _start_external_cutoff(self, zone: Zone) -> None:
        """Valve opened by someone else: still close it after max_runtime."""
        if zone.id in self._external_cutoff:
            return

        async def _async_cutoff(_now: datetime) -> None:
            self._external_cutoff.pop(zone.id, None)
            _LOGGER.warning(
                "Valve %s of zone %s open for %s min, closing it",
                zone.switch_entity,
                zone.name,
                zone.max_runtime_min,
            )
            await self._async_switch(zone.switch_entity, SERVICE_TURN_OFF)
            self._fire(EVENT_CYCLE_FINISHED, zone, reason=END_MAX_RUNTIME)
            self._start_check(zone)

        self._external_cutoff[zone.id] = async_call_later(
            self.hass, zone.max_runtime_min * 60, _async_cutoff
        )

    def _cancel_external_cutoff(self, zone_id: str) -> None:
        cancel = self._external_cutoff.pop(zone_id, None)
        if cancel is not None:
            cancel()

    async def _async_switch(self, entity_id: str, service: str) -> None:
        await self.hass.services.async_call(
            SWITCH_DOMAIN, service, {ATTR_ENTITY_ID: entity_id}, blocking=True
        )

    def _fire_finished(self, zone: Zone, run: ZoneRun, reason: str) -> None:
        elapsed = (dt_util.utcnow() - run.started).total_seconds()
        self._record(
            zone.id,
            kind="run",
            cycle_id=run.cycle_id,
            source=run.source,
            started=run.started.isoformat(),
            duration_min=run.duration_min,
            elapsed_min=round(elapsed / 60, 1),
            reason=reason,
            **(run.weather or {}),
        )
        self._fire(
            EVENT_CYCLE_FINISHED,
            zone,
            reason=reason,
            source=run.source,
            cycle_id=run.cycle_id,
            duration_min=run.duration_min,
            elapsed_min=round(elapsed / 60, 1),
        )

    # ----------------------------------------------------------- safety check

    @callback
    def _async_power_changed(self, event: Event[EventStateChangedData]) -> None:
        """Consumption watched at all times, not only after a watering.

        Power above the threshold while hydraXoo is not watering the zone and
        its switch is off means the valve is stuck open (or the plug came back
        online drawing power, e.g. after a restart): run the closing check.
        """
        entity_id = event.data["entity_id"]
        for zone in self.zones.values():
            if zone.power_entity != entity_id or not self._draws_power(zone):
                continue
            if zone.id in self.runs or zone.id in self.checking or zone.fault:
                continue
            switch = self.hass.states.get(zone.switch_entity)
            if switch is not None and switch.state == STATE_ON:
                continue  # switched on on purpose; the safety cut-off applies
            _LOGGER.warning(
                "Zone %s draws power while closed, checking the valve", zone.name
            )
            self._start_check(zone)

    def _draws_power(self, zone: Zone) -> bool:
        if zone.power_entity is None:
            return False
        state = self.hass.states.get(zone.power_entity)
        if state is None:
            return False
        try:
            value = float(state.state)
        except ValueError:
            return False
        if state.attributes.get("unit_of_measurement") == "kW":
            value *= 1000
        return value > zone.safety.threshold_w

    def _start_check(self, zone: Zone) -> None:
        """Start the closing check in the background (zones with a sensor)."""
        if zone.power_entity is None or zone.id in self.checking:
            return
        self.checking[zone.id] = self.hass.async_create_background_task(
            self._async_check(zone), f"{DOMAIN} closing check {zone.name}"
        )
        self._notify()

    async def _async_check(self, zone: Zone) -> None:
        def on_retry(attempt: int, power: float) -> None:
            self._fire(
                EVENT_SAFETY_RETRY,
                zone,
                attempt=attempt,
                max_attempts=zone.safety.max_attempts,
                power_w=power,
            )

        result: CheckResult | None = None
        try:
            result = await ClosingCheck(
                self.hass, zone, self._async_switch, on_retry
            ).async_run()
        except asyncio.CancelledError:
            self.checking.pop(zone.id, None)
            raise
        except Exception:
            _LOGGER.exception("Closing check of zone %s failed", zone.name)
        self.checking.pop(zone.id, None)

        if result is not None:
            self.last_check[zone.id] = result
            await self._async_handle_check_result(zone, result)
        self._notify()
        await self._async_process_queue()

    async def _async_handle_check_result(self, zone: Zone, result: CheckResult) -> None:
        if result.result == CHECK_CONFIRMED and result.retries:
            _LOGGER.warning(
                "Zone %s closed after %s retries", zone.name, result.retries
            )
        elif result.result == CHECK_SENSOR_UNAVAILABLE:
            _LOGGER.warning(
                "Power sensor %s of zone %s unavailable, closing not checked",
                zone.power_entity,
                zone.name,
            )
        elif result.result == CHECK_FAILED:
            _LOGGER.error(
                "Zone %s still draws %.1f W after %s retries: fault",
                zone.name,
                result.power_w,
                result.retries,
            )
            zone.fault = True
            self._drop_queued(lambda item: item.zone_id == zone.id, SKIP_FAULT)
            await self.async_save()
            self._fire(
                EVENT_SAFETY_FAILED,
                zone,
                attempts=result.retries,
                power_w=result.power_w,
            )
            await self._async_notify_fault(zone, result)

    async def _async_notify_fault(self, zone: Zone, result: CheckResult) -> None:
        """Persistent notification, in the user's language."""
        texts = await async_get_translations(
            self.hass, self.hass.config.language, "exceptions", [DOMAIN]
        )
        prefix = f"component.{DOMAIN}.exceptions"
        title = texts.get(f"{prefix}.safety_failed_title.message", "hydraXoo")
        message = texts.get(
            f"{prefix}.safety_failed.message",
            "Zone {zone}: the valve still draws {power} W after {attempts} retries.",
        )
        persistent_notification.async_create(
            self.hass,
            message.format(
                zone=zone.name,
                power=f"{result.power_w:.1f}",
                attempts=result.retries,
            ),
            title=title.format(zone=zone.name),
            notification_id=f"{DOMAIN}_fault_{zone.id}",
        )
        await self._async_notify_phones(
            {
                "title": title.format(zone=zone.name),
                "message": message.format(
                    zone=zone.name,
                    power=f"{result.power_w:.1f}",
                    attempts=result.retries,
                ),
                "data": {
                    "tag": f"{DOMAIN}_fault_{zone.id}",
                    # Android: shown at once; iOS: breaks through focus modes
                    "priority": "high",
                    "ttl": 0,
                    "channel": "hydraXoo",
                    "push": {"interruption-level": "time-sensitive"},
                },
            }
        )

    async def _async_notify_phones(
        self, payload: dict[str, Any], mobile_only: bool = False
    ) -> None:
        """Send to every chosen notify service; a failure never blocks safety."""
        for service in self.notify_services:
            if mobile_only and not service.startswith("mobile_app_"):
                continue
            try:
                await self.hass.services.async_call(
                    "notify", service, payload, blocking=True
                )
            except Exception:
                _LOGGER.exception("Could not send the alert to notify.%s", service)

    async def async_acknowledge_fault(self, zone_id: str) -> None:
        """Clear a zone's fault so it can water again."""
        zone = self.zones[zone_id]
        zone.fault = False
        await self.async_save()
        persistent_notification.async_dismiss(self.hass, f"{DOMAIN}_fault_{zone.id}")
        # Remove the alert from the phones (companion app only).
        await self._async_notify_phones(
            {
                "message": "clear_notification",
                "data": {"tag": f"{DOMAIN}_fault_{zone.id}"},
            },
            mobile_only=True,
        )
        self._notify()

    async def async_zones_changed(self) -> None:
        """Save and refresh after zones or cycles were edited in place."""
        await self.async_save()
        self._notify()

    async def async_update_weather(self, force: bool = False) -> None:
        """Refresh forecasts and every zone's coefficient."""
        try:
            await self.weather.async_refresh(force)
        except Exception:
            _LOGGER.exception("Could not read the weather")
        self.weather_results = {
            zone.id: self.weather.compute(zone) for zone in self.zones.values()
        }
        self._notify()

    def weather_result(self, zone_id: str) -> WeatherResult:
        """Last coefficient of a zone (computed now if never computed)."""
        result = self.weather_results.get(zone_id)
        if result is None:
            result = self.weather.compute(self.zones[zone_id])
        return result

    # ------------------------------------------------------ zone management

    def _subscribe_switches(self) -> None:
        """(Re)listen to the valves and power sensors of all zones."""
        while self._entity_unsubs:
            self._entity_unsubs.pop()()
        switches = sorted({z.switch_entity for z in self.zones.values()})
        if switches:
            self._entity_unsubs.append(
                async_track_state_change_event(
                    self.hass, switches, self._async_switch_changed
                )
            )
        sensors = sorted(
            {z.power_entity for z in self.zones.values() if z.power_entity}
        )
        if sensors:
            self._entity_unsubs.append(
                async_track_state_change_event(
                    self.hass, sensors, self._async_power_changed
                )
            )

    @callback
    def async_on_shutdown(self, notify: Callable[[], None]) -> CALLBACK_TYPE:
        """Register a callback run when the engine stops (e.g. reload)."""
        self._shutdown_callbacks.append(notify)

        @callback
        def remove() -> None:
            if notify in self._shutdown_callbacks:
                self._shutdown_callbacks.remove(notify)

        return remove

    @callback
    def async_on_zone_added(self, add: Callable[[Zone], None]) -> CALLBACK_TYPE:
        """Register a platform callback creating the entities of a new zone."""
        self._zone_added.append(add)

        @callback
        def remove() -> None:
            self._zone_added.remove(add)

        return remove

    async def async_save_zone(self, data: dict[str, Any]) -> Zone:
        """Create or update a zone from the card, without reloading.

        Existing objects are updated in place so entities keep their zone.
        """
        zone_id = data.get("id")
        incoming = Zone.from_dict(
            {"id": zone_id or "", "name": "", "switch_entity": ""} | data
        )
        zone = self.zones.get(zone_id) if zone_id else None
        if zone is None:
            if not zone_id:
                incoming.id = Zone(name="", switch_entity="").id
            zone = incoming
            self.zones[zone.id] = zone
            await self.async_save()
            for add in list(self._zone_added):
                add(zone)
        else:
            old_switch = zone.switch_entity
            if old_switch != incoming.switch_entity and zone.id in self.runs:
                await self._async_close_zone(zone.id, END_MANUAL_STOP)
            for attr in (
                "name",
                "icon",
                "enabled",
                "switch_entity",
                "max_runtime_min",
                "power_entity",
                "safety",
                "receives_rain",
                "weather_rules",
                "cycles",
            ):
                setattr(zone, attr, getattr(incoming, attr))
            await self.async_save()
            self._rename_device(zone)
        self._subscribe_switches()
        self.weather_results[zone.id] = self.weather.compute(zone)
        self._notify()
        return zone

    async def async_delete_zone(self, zone_id: str) -> None:
        """Delete a zone, its device and its entities."""
        if zone_id not in self.zones:
            return
        self._drop_queued(lambda item: item.zone_id == zone_id)
        await self._async_close_zone(zone_id, END_MANUAL_STOP, check=False)
        task = self.checking.pop(zone_id, None)
        if task is not None:
            task.cancel()
        self.zones.pop(zone_id)
        self.weather_results.pop(zone_id, None)
        self.last_check.pop(zone_id, None)
        await self.async_save()
        registry = dr.async_get(self.hass)
        device = self._zone_device(zone_id)
        if device is not None:
            registry.async_remove_device(device.id)
        self._subscribe_switches()
        self._notify()
        await self._async_process_queue()

    def _zone_device(self, zone_id: str) -> dr.DeviceEntry | None:
        """The zone's device (works before and after HA 2026.10)."""
        if self.entry_id is None:
            return None
        registry = dr.async_get(self.hass)
        if hasattr(registry, "async_get_device_by_identifier"):
            return registry.async_get_device_by_identifier(
                (DOMAIN, zone_id), self.entry_id
            )
        return registry.async_get_device(identifiers={(DOMAIN, zone_id)})

    def _rename_device(self, zone: Zone) -> None:
        device = self._zone_device(zone.id)
        if device is not None and device.name != zone.name:
            dr.async_get(self.hass).async_update_device(device.id, name=zone.name)

    def global_weather(self) -> WeatherResult:
        """Coefficient with the default rule, for the card's weather banner."""
        return self.weather.compute(
            Zone(name="", switch_entity="", weather_rules=WeatherRules())
        )

    def _record(self, zone_id: str, **data: Any) -> None:
        """Keep today's and yesterday's waterings and skipped cycles."""
        self.history.append({"zone_id": zone_id, **data})
        limit = dt_util.utcnow() - timedelta(hours=48)
        self.history = [
            h
            for h in self.history
            if (t := dt_util.parse_datetime(h.get("started", ""))) is None or t >= limit
        ]
        # Saved so that "done" / "skipped" survive a restart.
        self.hass.async_create_task(self.async_save())

    def _fire_skipped(
        self, zone_id: str, cycle_id: str | None, reason: str, **extra: Any
    ) -> None:
        zone = self.zones.get(zone_id)
        if zone is not None:
            self._record(
                zone_id,
                kind="skipped",
                cycle_id=cycle_id,
                started=dt_util.utcnow().isoformat(),
                reason=reason,
            )
            self._fire(
                EVENT_CYCLE_SKIPPED, zone, cycle_id=cycle_id, reason=reason, **extra
            )

    def _fire(self, event_type: str, zone: Zone, **data: Any) -> None:
        self.hass.bus.async_fire(
            event_type, {"zone_id": zone.id, "zone_name": zone.name, **data}
        )
