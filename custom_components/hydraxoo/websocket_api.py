"""WebSocket commands used by the Lovelace card.

The card reads the whole state with `hydraxoo/subscribe` (pushed again after
every change) and changes the configuration with the other commands. Changes
apply at once: nothing is reloaded.
"""

from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util

from .const import (
    CONF_EXTERNAL_OPEN,
    CONF_FROST_ALERT,
    CONF_FROST_THAW_NOTICE,
    CONF_FROST_THRESHOLD,
    CONF_NOTIFY_SERVICES,
    CONF_RAIN_SENSOR,
    CONF_SEQUENCE_MODE,
    CONF_WEATHER_ENTITY,
    DEFAULT_ICON,
    DEFAULT_MAX_RUNTIME,
    DOMAIN,
    EXTERNAL_ALLOW,
    EXTERNAL_CLOSE,
    MAX_PAUSE_DAYS,
    MAX_RUNTIME_LIMIT,
    MODE_PARALLEL,
    MODE_SEQUENTIAL,
)
from .engine import HydraxooEngine
from .helpers import notify_options
from .models import new_id

TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _time(value: Any) -> str:
    value = str(value)[:5]
    if not TIME_RE.match(value):
        raise vol.Invalid("invalid time")
    return value


CYCLE_SCHEMA = vol.Schema(
    {
        vol.Optional("id"): cv.string,
        vol.Optional("enabled", default=True): cv.boolean,
        vol.Required("start_time"): _time,
        vol.Required("duration_min"): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=MAX_RUNTIME_LIMIT)
        ),
        vol.Required("weekdays"): vol.All(
            [vol.All(vol.Coerce(int), vol.Range(min=0, max=6))], vol.Length(min=1)
        ),
    },
    extra=vol.REMOVE_EXTRA,
)

SAFETY_SCHEMA = vol.Schema(
    {
        vol.Optional("threshold_w"): vol.All(
            vol.Coerce(float), vol.Range(min=0.1, max=100)
        ),
        vol.Optional("check_delay_s"): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=300)
        ),
        vol.Optional("retry_pulse_s"): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=60)
        ),
        vol.Optional("max_attempts"): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=10)
        ),
    },
    extra=vol.REMOVE_EXTRA,
)

WEATHER_SCHEMA = vol.Schema(
    {
        vol.Optional("skip_mm"): vol.All(vol.Coerce(float), vol.Range(min=0.5, max=50)),
        vol.Optional("past_window_h"): vol.All(
            vol.Coerce(int), vol.Range(min=0, max=96)
        ),
        vol.Optional("forecast_window_h"): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=72)
        ),
        vol.Optional("heat_threshold_c"): vol.All(
            vol.Coerce(float), vol.Range(min=15, max=45)
        ),
        vol.Optional("heat_bonus_pct"): vol.All(
            vol.Coerce(int), vol.Range(min=0, max=100)
        ),
        vol.Optional("min_pct"): vol.All(vol.Coerce(int), vol.Range(min=0, max=100)),
        vol.Optional("max_pct"): vol.All(vol.Coerce(int), vol.Range(min=100, max=200)),
    },
    extra=vol.REMOVE_EXTRA,
)

ZONE_SCHEMA = vol.Schema(
    {
        vol.Optional("id"): cv.string,
        vol.Required("name"): vol.All(cv.string, vol.Strip, vol.Length(min=1)),
        vol.Optional("icon", default=DEFAULT_ICON): cv.icon,
        vol.Optional("enabled", default=True): cv.boolean,
        vol.Required("switch_entity"): cv.entity_domain("switch"),
        vol.Optional("power_entity", default=None): vol.Any(
            None, cv.entity_domain("sensor")
        ),
        vol.Optional("max_runtime_min", default=DEFAULT_MAX_RUNTIME): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=MAX_RUNTIME_LIMIT)
        ),
        vol.Optional("receives_rain", default=True): cv.boolean,
        vol.Optional("frost_alert", default=True): cv.boolean,
        vol.Optional("safety", default={}): SAFETY_SCHEMA,
        vol.Optional("weather_rules", default={}): WEATHER_SCHEMA,
        vol.Optional("cycles", default=[]): [CYCLE_SCHEMA],
    },
    extra=vol.REMOVE_EXTRA,
)


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register the commands (once)."""
    for command in (
        ws_subscribe,
        ws_save_zone,
        ws_delete_zone,
        ws_run_zone,
        ws_stop_zone,
        ws_enable_zone,
        ws_acknowledge,
        ws_stop_all,
        ws_pause,
        ws_resume,
        ws_save_settings,
        ws_test_notification,
        ws_frost_acknowledge,
    ):
        websocket_api.async_register_command(hass, command)


def _engine(hass: HomeAssistant) -> HydraxooEngine | None:
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    return entries[0].runtime_data if entries else None


def serialize(hass: HomeAssistant, engine: HydraxooEngine) -> dict[str, Any]:
    """Everything the card displays."""

    def friendly(entity_id: str | None) -> dict[str, Any] | None:
        if not entity_id:
            return None
        state = hass.states.get(entity_id)
        return {
            "entity_id": entity_id,
            "name": state.name if state else entity_id,
            "state": state.state if state else None,
        }

    zones = []
    for zone in engine.zones.values():
        run = engine.runs.get(zone.id)
        nxt = engine.next_run(zone.id)
        result = engine.weather_result(zone.id)
        last = engine.last_check.get(zone.id)
        zones.append(
            zone.to_dict()
            | {
                "running": run is not None,
                "run": None
                if run is None
                else {
                    "source": run.source,
                    "started": run.started.isoformat(),
                    "ends": run.ends.isoformat(),
                    "duration_min": run.duration_min,
                    "cycle_id": run.cycle_id,
                    **(run.weather or {}),
                },
                "remaining_s": engine.remaining_seconds(zone.id),
                "queued": any(item.zone_id == zone.id for item in engine.queue),
                "checking": zone.id in engine.checking,
                "weather": result.as_dict(),
                "next_run": None
                if nxt is None
                else {
                    "time": nxt[0].isoformat(),
                    "cycle_id": nxt[1].id,
                    "duration_min": nxt[1].duration_min,
                    # What will really run: never more than the safety cut-off
                    "adjusted_duration_min": min(
                        result.adjust(nxt[1].duration_min), zone.max_runtime_min
                    ),
                },
                "last_check": None
                if last is None
                else {
                    "result": last.result,
                    "retries": last.retries,
                    "power_w": last.power_w,
                    "time": last.finished.isoformat(),
                },
                "external_open": None
                if (since := engine.external_open.get(zone.id)) is None
                else {
                    "since": since.isoformat(),
                    "ends": (
                        since + timedelta(minutes=zone.max_runtime_min)
                    ).isoformat(),
                },
                "switch": friendly(zone.switch_entity),
                "power": friendly(zone.power_entity),
            }
        )

    latest = None
    for zone_id, check in engine.last_check.items():
        if zone_id in engine.zones and (
            latest is None or check.finished > latest[1].finished
        ):
            latest = (zone_id, check)

    return {
        "now": dt_util.now().isoformat(),
        "settings": {
            "weather_entity": engine.weather.weather_entity,
            "weather_name": (friendly(engine.weather.weather_entity) or {}).get("name"),
            "rain_sensor": engine.weather.rain_sensor,
            "rain_name": (friendly(engine.weather.rain_sensor) or {}).get("name"),
            "notify_services": list(engine.notify_services),
            "external_open": engine.external_mode,
            "frost_alert": engine.frost_settings.enabled,
            "frost_threshold_c": engine.frost_settings.threshold_c,
            "frost_thaw_notice": engine.frost_settings.thaw_notice,
            "notify_options": notify_options(hass),
            "sequential": engine.sequential,
            "paused": engine.paused,
            "pause_until": engine.pause_until.isoformat()
            if engine.pause_until
            else None,
        },
        "weather": engine.global_weather().as_dict(),
        "frost": {
            "active": engine.frost.active,
            "acknowledged": engine.frost.acknowledged,
            "alerted": engine.frost.alerted,
            "min_c": engine.frost.min_c,
            "frost_at": engine.frost.frost_at.isoformat()
            if engine.frost.frost_at
            else None,
        },
        "last_check": None
        if latest is None
        else {
            "zone_id": latest[0],
            "zone_name": engine.zones[latest[0]].name,
            "result": latest[1].result,
            "retries": latest[1].retries,
            "power_w": latest[1].power_w,
            "time": latest[1].finished.isoformat(),
        },
        "queue": [
            {
                "zone_id": item.zone_id,
                "duration_min": item.duration_min,
                "source": item.source,
            }
            for item in engine.queue
        ],
        "zones": zones,
        "history": engine.history,
    }


def _not_loaded(connection: websocket_api.ActiveConnection, msg: dict) -> None:
    connection.send_error(msg["id"], "not_loaded", "hydraXoo is not loaded")


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/subscribe"})
@callback
def ws_subscribe(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Send the state now and after every change."""
    engine = _engine(hass)
    if engine is None:
        _not_loaded(connection, msg)
        return

    @callback
    def send() -> None:
        connection.send_message(
            websocket_api.event_message(msg["id"], serialize(hass, engine))
        )

    @callback
    def closed() -> None:
        # The integration is reloading: tell the card to subscribe again.
        connection.send_message(
            websocket_api.event_message(msg["id"], {"reload": True})
        )

    unsubs = [engine.async_add_listener(send), engine.async_on_shutdown(closed)]

    @callback
    def unsubscribe() -> None:
        for unsub in unsubs:
            unsub()

    connection.subscriptions[msg["id"]] = unsubscribe
    connection.send_result(msg["id"])
    send()


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/zone/save", vol.Required("zone"): dict}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_zone(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Create (no id) or update a zone with its cycles."""
    engine = _engine(hass)
    if engine is None:
        _not_loaded(connection, msg)
        return
    try:
        data = ZONE_SCHEMA(msg["zone"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    if data.get("id") and data["id"] not in engine.zones:
        connection.send_error(msg["id"], "not_found", "Unknown zone")
        return
    for cycle in data["cycles"]:
        cycle.setdefault("id", new_id())
    zone = await engine.async_save_zone(data)
    connection.send_result(msg["id"], {"id": zone.id})


def _zone_command(extra: dict | None = None):
    """Decorator factory for commands acting on one zone."""

    def wrap(name: str):
        schema = {
            vol.Required("type"): f"{DOMAIN}/zone/{name}",
            vol.Required("zone_id"): cv.string,
        } | (extra or {})
        return websocket_api.websocket_command(schema)

    return wrap


async def _with_zone(hass, connection, msg) -> HydraxooEngine | None:
    engine = _engine(hass)
    if engine is None:
        _not_loaded(connection, msg)
        return None
    if msg["zone_id"] not in engine.zones:
        connection.send_error(msg["id"], "not_found", "Unknown zone")
        return None
    return engine


@_zone_command()("delete")
@websocket_api.require_admin
@websocket_api.async_response
async def ws_delete_zone(hass, connection, msg) -> None:
    """Delete a zone."""
    if engine := await _with_zone(hass, connection, msg):
        await engine.async_delete_zone(msg["zone_id"])
        connection.send_result(msg["id"])


@_zone_command(
    {
        vol.Optional("duration"): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=MAX_RUNTIME_LIMIT)
        )
    }
)("run")
@websocket_api.async_response
async def ws_run_zone(hass, connection, msg) -> None:
    """Water now (waits its turn in one-at-a-time mode)."""
    if engine := await _with_zone(hass, connection, msg):
        if engine.zones[msg["zone_id"]].fault:
            connection.send_error(msg["id"], "zone_in_fault", "Zone in fault")
            return
        await engine.async_request_zone(msg["zone_id"], msg.get("duration"))
        connection.send_result(msg["id"])


@_zone_command()("stop")
@websocket_api.async_response
async def ws_stop_zone(hass, connection, msg) -> None:
    """Stop a zone."""
    if engine := await _with_zone(hass, connection, msg):
        await engine.async_stop_zone(msg["zone_id"])
        connection.send_result(msg["id"])


@_zone_command({vol.Required("enabled"): cv.boolean})("enable")
@websocket_api.async_response
async def ws_enable_zone(hass, connection, msg) -> None:
    """Enable or disable a zone's cycles."""
    if engine := await _with_zone(hass, connection, msg):
        await engine.async_set_zone_enabled(msg["zone_id"], msg["enabled"])
        connection.send_result(msg["id"])


@_zone_command()("acknowledge")
@websocket_api.async_response
async def ws_acknowledge(hass, connection, msg) -> None:
    """Acknowledge a closing fault."""
    if engine := await _with_zone(hass, connection, msg):
        await engine.async_acknowledge_fault(msg["zone_id"])
        connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/stop_all"})
@websocket_api.async_response
async def ws_stop_all(hass, connection, msg) -> None:
    """Stop every zone."""
    engine = _engine(hass)
    if engine is None:
        _not_loaded(connection, msg)
        return
    await engine.async_stop_all()
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/pause",
        vol.Optional("days"): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=MAX_PAUSE_DAYS)
        ),
    }
)
@websocket_api.async_response
async def ws_pause(hass, connection, msg) -> None:
    """Pause watering."""
    engine = _engine(hass)
    if engine is None:
        _not_loaded(connection, msg)
        return
    await engine.async_pause(msg.get("days"))
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/resume"})
@websocket_api.async_response
async def ws_resume(hass, connection, msg) -> None:
    """Resume watering."""
    engine = _engine(hass)
    if engine is None:
        _not_loaded(connection, msg)
        return
    await engine.async_resume()
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/settings/save",
        vol.Optional("weather_entity"): vol.Any(None, cv.entity_domain("weather")),
        vol.Optional("rain_sensor"): vol.Any(None, cv.entity_domain("sensor")),
        vol.Optional("sequential"): cv.boolean,
        vol.Optional("notify_services"): [cv.string],
        vol.Optional("external_open"): vol.In([EXTERNAL_CLOSE, EXTERNAL_ALLOW]),
        vol.Optional("frost_alert"): cv.boolean,
        vol.Optional("frost_threshold_c"): vol.All(
            vol.Coerce(float), vol.Range(min=-5, max=10)
        ),
        vol.Optional("frost_thaw_notice"): cv.boolean,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_settings(hass, connection, msg) -> None:
    """Save the general settings; they apply at once, without a reload."""
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    if not entries:
        _not_loaded(connection, msg)
        return
    entry = entries[0]
    engine: HydraxooEngine = entry.runtime_data
    options = dict(entry.options)
    if "weather_entity" in msg:
        options[CONF_WEATHER_ENTITY] = msg["weather_entity"]
    if "rain_sensor" in msg:
        options[CONF_RAIN_SENSOR] = msg["rain_sensor"]
    if "sequential" in msg:
        options[CONF_SEQUENCE_MODE] = (
            MODE_SEQUENTIAL if msg["sequential"] else MODE_PARALLEL
        )
    if "notify_services" in msg:
        options[CONF_NOTIFY_SERVICES] = msg["notify_services"]
    if "external_open" in msg:
        options[CONF_EXTERNAL_OPEN] = msg["external_open"]
    for key, conf in (
        ("frost_alert", CONF_FROST_ALERT),
        ("frost_threshold_c", CONF_FROST_THRESHOLD),
        ("frost_thaw_notice", CONF_FROST_THAW_NOTICE),
    ):
        if key in msg:
            options[conf] = msg[key]
    options = {k: v for k, v in options.items() if v is not None}
    # Engine first: the entry's update listener then sees nothing to reload.
    await engine.async_apply_settings(options)
    hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/notify/test",
        vol.Required("services"): vol.All([cv.string], vol.Length(min=1)),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_test_notification(hass, connection, msg) -> None:
    """Send a test alert to the given notify services."""
    engine = _engine(hass)
    if engine is None:
        _not_loaded(connection, msg)
        return
    failed = await engine.async_send_test_notification(msg["services"])
    connection.send_result(
        msg["id"],
        {"sent": [s for s in msg["services"] if s not in failed], "failed": failed},
    )


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/frost/acknowledge"})
@websocket_api.async_response
async def ws_frost_acknowledge(hass, connection, msg) -> None:
    """Outdoor circuits are shut: stop reminding for this frost episode."""
    engine = _engine(hass)
    if engine is None:
        _not_loaded(connection, msg)
        return
    await engine.async_acknowledge_frost()
    connection.send_result(msg["id"])
