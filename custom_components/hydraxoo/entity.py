"""Base class for the entities of a zone."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from .const import DOMAIN
from .engine import HydraxooEngine
from .models import Zone


class HydraxooZoneEntity(Entity):
    """An entity attached to one zone (one device per zone)."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, engine: HydraxooEngine, zone: Zone, key: str) -> None:
        """Initialize the entity."""
        self.engine = engine
        self.zone = zone
        self._attr_translation_key = key
        self._attr_unique_id = f"{zone.id}_{key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, zone.id)},
            name=zone.name,
            manufacturer="hydraXoo",
            model="Zone",
        )

    async def async_added_to_hass(self) -> None:
        """Refresh whenever the engine changes."""
        self.async_on_remove(self.engine.async_add_listener(self.async_write_ha_state))
