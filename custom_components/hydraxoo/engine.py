"""Watering engine: schedules cycles, opens and closes valves."""

from __future__ import annotations

import contextlib
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

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
from homeassistant.helpers.event import (
    async_call_later,
    async_track_point_in_utc_time,
    async_track_state_change_event,
    async_track_time_change,
    async_track_time_interval,
)
from homeassistant.util import dt as dt_util

from .const import (
    DEFAULT_DURATION,
    END_COMPLETED,
    END_EXTERNAL,
    END_MANUAL_STOP,
    END_MAX_RUNTIME,
    END_RESTART,
    END_UNLOAD,
    EVENT_CYCLE_FINISHED,
    EVENT_CYCLE_STARTED,
    REMAINING_REFRESH_SECONDS,
    SOURCE_MANUAL,
    SOURCE_SCHEDULE,
)
from .models import Cycle, Zone
from .store import ZoneStore

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
    unsubs: list[CALLBACK_TYPE] = field(default_factory=list)

    def cancel_timers(self) -> None:
        """Cancel the end and refresh timers."""
        while self.unsubs:
            self.unsubs.pop()()


class HydraxooEngine:
    """Owns the zones and everything that happens to them at run time."""

    def __init__(
        self, hass: HomeAssistant, store: ZoneStore, zones: list[Zone]
    ) -> None:
        """Initialize the engine."""
        self.hass = hass
        self._store = store
        self.zones: dict[str, Zone] = {z.id: z for z in zones}
        self.runs: dict[str, ZoneRun] = {}
        # Safety cut-off for valves switched on outside hydraXoo
        self._external_cutoff: dict[str, CALLBACK_TYPE] = {}
        self._listeners: list[Callable[[], None]] = []
        self._unsubs: list[CALLBACK_TYPE] = []

    # ------------------------------------------------------------------ setup

    async def async_start(self) -> None:
        """Start listening to the clock and to the valves."""
        self._unsubs.append(
            async_track_time_change(self.hass, self._async_tick, second=0)
        )
        switches = sorted({z.switch_entity for z in self.zones.values()})
        if switches:
            self._unsubs.append(
                async_track_state_change_event(
                    self.hass, switches, self._async_switch_changed
                )
            )
        self._unsubs.append(
            self.hass.bus.async_listen_once(
                EVENT_HOMEASSISTANT_STOP, self._async_on_ha_stop
            )
        )
        if self.hass.is_running:
            await self._async_close_open_valves()
        else:
            self._unsubs.append(
                self.hass.bus.async_listen_once(
                    EVENT_HOMEASSISTANT_STARTED, self._async_on_ha_started
                )
            )

    async def async_shutdown(self) -> None:
        """Stop everything (integration unloaded or reloaded)."""
        while self._unsubs:
            unsub = self._unsubs.pop()
            # A listen_once that already fired cannot be removed twice.
            with contextlib.suppress(ValueError):
                unsub()
        for cancel in self._external_cutoff.values():
            cancel()
        self._external_cutoff.clear()
        for zone_id in list(self.runs):
            await self.async_stop_zone(zone_id, END_UNLOAD)

    async def _async_on_ha_started(self, _event: Event) -> None:
        await self._async_close_open_valves()

    async def _async_on_ha_stop(self, _event: Event) -> None:
        """Close valves we opened before Home Assistant stops."""
        for zone_id in list(self.runs):
            await self.async_stop_zone(zone_id, END_UNLOAD)

    async def _async_close_open_valves(self) -> None:
        """At startup, any valve found open is closed: it was interrupted."""
        for zone in self.zones.values():
            state = self.hass.states.get(zone.switch_entity)
            if state is not None and state.state == STATE_ON:
                await self._async_close_interrupted(zone)

    async def _async_close_interrupted(self, zone: Zone) -> None:
        _LOGGER.warning(
            "Valve %s of zone %s was found open, closing it",
            zone.switch_entity,
            zone.name,
        )
        await self._async_switch(zone.switch_entity, SERVICE_TURN_OFF)
        self._fire(EVENT_CYCLE_FINISHED, zone, reason=END_RESTART)

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
        """Next scheduled start of a zone."""
        return self.zones[zone_id].next_run(dt_util.now())

    @staticmethod
    def base_duration(zone: Zone) -> int:
        """Duration used by 'water now' when none is given."""
        for cycle in zone.cycles:
            if cycle.enabled:
                return cycle.duration_min
        return zone.cycles[0].duration_min if zone.cycles else DEFAULT_DURATION

    # -------------------------------------------------------------- commands

    async def async_save(self) -> None:
        """Persist the zones."""
        await self._store.async_save(list(self.zones.values()))

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
        )
        self._notify()

    async def async_stop_zone(
        self, zone_id: str, reason: str = END_MANUAL_STOP
    ) -> None:
        """Close a zone's valve."""
        zone = self.zones.get(zone_id)
        if zone is None:
            return
        run = self.runs.pop(zone_id, None)
        if run is not None:
            run.cancel_timers()
        self._cancel_external_cutoff(zone_id)

        state = self.hass.states.get(zone.switch_entity)
        if run is not None or (state is not None and state.state != STATE_OFF):
            await self._async_switch(zone.switch_entity, SERVICE_TURN_OFF)
        if run is not None:
            self._fire_finished(zone, run, reason)
        self._notify()

    async def async_stop_all(self) -> None:
        """Close every zone."""
        for zone_id in list(self.zones):
            await self.async_stop_zone(zone_id)

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
        """Every minute: start the cycles due now."""
        local = dt_util.as_local(now).replace(second=0, microsecond=0)
        for zone in self.zones.values():
            if not zone.enabled:
                continue
            for cycle in zone.cycles:
                if (
                    not cycle.enabled
                    or local.weekday() not in cycle.weekdays
                    or cycle.start != local.time()
                ):
                    continue
                if self.is_running(zone.id):
                    _LOGGER.info(
                        "Zone %s already watering, cycle at %s not started",
                        zone.name,
                        cycle.start_time,
                    )
                    continue
                try:
                    await self.async_start_zone(
                        zone.id, cycle.duration_min, SOURCE_SCHEDULE, cycle.id
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
                    self._notify()

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
        self._fire(
            EVENT_CYCLE_FINISHED,
            zone,
            reason=reason,
            source=run.source,
            cycle_id=run.cycle_id,
            duration_min=run.duration_min,
            elapsed_min=round(elapsed / 60, 1),
        )

    def _fire(self, event_type: str, zone: Zone, **data: Any) -> None:
        self.hass.bus.async_fire(
            event_type, {"zone_id": zone.id, "zone_name": zone.name, **data}
        )
