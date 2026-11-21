"""hydraXoo: zone-based irrigation for Home Assistant."""

from __future__ import annotations

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.typing import ConfigType

from . import websocket_api
from .const import (
    ATTR_DAYS,
    ATTR_DURATION,
    ATTR_ZONE,
    CONF_RAIN_SENSOR,
    CONF_SEQUENCE_MODE,
    CONF_WEATHER_ENTITY,
    CONTROLLER_ID,
    DOMAIN,
    MAX_PAUSE_DAYS,
    MAX_RUNTIME_LIMIT,
    MODE_PARALLEL,
    SERVICE_ACKNOWLEDGE_FAULT,
    SERVICE_PAUSE,
    SERVICE_RESUME,
    SERVICE_RUN_ZONE,
    SERVICE_STOP_ALL,
    SERVICE_STOP_ZONE,
)
from .engine import HydraxooEngine
from .frontend_setup import async_setup_frontend
from .store import ZoneStore

PLATFORMS: list[Platform] = [Platform.BINARY_SENSOR, Platform.SENSOR, Platform.SWITCH]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type HydraxooConfigEntry = ConfigEntry[HydraxooEngine]

RUN_ZONE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE): cv.string,
        vol.Optional(ATTR_DURATION): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=MAX_RUNTIME_LIMIT)
        ),
    }
)
STOP_ZONE_SCHEMA = vol.Schema({vol.Required(ATTR_ZONE): cv.string})
PAUSE_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_DAYS): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=MAX_PAUSE_DAYS)
        )
    }
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the services (once, whatever the number of entries)."""

    def _engine() -> HydraxooEngine:
        entries = hass.config_entries.async_loaded_entries(DOMAIN)
        if not entries:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="not_loaded"
            )
        return entries[0].runtime_data

    def _zone_id(engine: HydraxooEngine, device_id: str) -> str:
        device = dr.async_get(hass).async_get(device_id)
        if device is not None:
            for domain, identifier in device.identifiers:
                if domain == DOMAIN and identifier in engine.zones:
                    return identifier
        raise ServiceValidationError(
            translation_domain=DOMAIN, translation_key="zone_not_found"
        )

    async def run_zone(call: ServiceCall) -> None:
        engine = _engine()
        await engine.async_request_zone(
            _zone_id(engine, call.data[ATTR_ZONE]), call.data.get(ATTR_DURATION)
        )

    async def stop_zone(call: ServiceCall) -> None:
        engine = _engine()
        await engine.async_stop_zone(_zone_id(engine, call.data[ATTR_ZONE]))

    async def stop_all(call: ServiceCall) -> None:
        await _engine().async_stop_all()

    async def pause(call: ServiceCall) -> None:
        await _engine().async_pause(call.data.get(ATTR_DAYS))

    async def resume(call: ServiceCall) -> None:
        await _engine().async_resume()

    async def acknowledge_fault(call: ServiceCall) -> None:
        engine = _engine()
        await engine.async_acknowledge_fault(_zone_id(engine, call.data[ATTR_ZONE]))

    websocket_api.async_register(hass)
    await async_setup_frontend(hass)

    hass.services.async_register(DOMAIN, SERVICE_RUN_ZONE, run_zone, RUN_ZONE_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_STOP_ZONE, stop_zone, STOP_ZONE_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_STOP_ALL, stop_all)
    hass.services.async_register(DOMAIN, SERVICE_PAUSE, pause, PAUSE_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_RESUME, resume)
    hass.services.async_register(
        DOMAIN, SERVICE_ACKNOWLEDGE_FAULT, acknowledge_fault, STOP_ZONE_SCHEMA
    )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: HydraxooConfigEntry) -> bool:
    """Load the zones and start the engine."""
    store = ZoneStore(hass)
    engine = HydraxooEngine(
        hass,
        store,
        await store.async_load(),
        sequential=entry.options.get(CONF_SEQUENCE_MODE) != MODE_PARALLEL,
        weather_entity=entry.options.get(CONF_WEATHER_ENTITY) or None,
        rain_sensor=entry.options.get(CONF_RAIN_SENSOR) or None,
    )
    engine.entry_id = entry.entry_id
    entry.runtime_data = engine

    _remove_orphan_devices(hass, entry, engine)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await engine.async_start()
    entry.async_on_unload(entry.add_update_listener(_async_reload))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: HydraxooConfigEntry) -> bool:
    """Stop the engine (closing open valves) and unload entities."""
    await entry.runtime_data.async_shutdown()
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass: HomeAssistant, entry: HydraxooConfigEntry) -> None:
    """Delete stored zones when the integration is removed."""
    await ZoneStore(hass).async_remove()


async def _async_reload(hass: HomeAssistant, entry: HydraxooConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


def _remove_orphan_devices(
    hass: HomeAssistant, entry: HydraxooConfigEntry, engine: HydraxooEngine
) -> None:
    """Remove devices of zones that no longer exist."""
    registry = dr.async_get(hass)
    for device in dr.async_entries_for_config_entry(registry, entry.entry_id):
        if not any(
            domain == DOMAIN
            and (identifier in engine.zones or identifier == CONTROLLER_ID)
            for domain, identifier in device.identifiers
        ):
            registry.async_remove_device(device.id)
