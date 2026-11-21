"""Switch entities: zone enabled."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import HydraxooConfigEntry
from .entity import HydraxooZoneEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: HydraxooConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Create one switch per zone."""
    engine = entry.runtime_data
    async_add_entities(ZoneEnabledSwitch(engine, z) for z in engine.zones.values())


class ZoneEnabledSwitch(HydraxooZoneEntity, SwitchEntity):
    """When off, the zone's cycles are not started."""

    def __init__(self, engine, zone) -> None:
        """Initialize."""
        super().__init__(engine, zone, "zone_enabled")

    @property
    def is_on(self) -> bool:
        """Return True if the zone is enabled."""
        return self.zone.enabled

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Enable the zone."""
        await self.engine.async_set_zone_enabled(self.zone.id, True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Disable the zone."""
        await self.engine.async_set_zone_enabled(self.zone.id, False)
