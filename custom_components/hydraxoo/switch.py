"""Switch entities: zone enabled."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import HydraxooConfigEntry
from .entity import HydraxooControllerEntity, HydraxooZoneEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: HydraxooConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Create the pause switch and one switch per zone."""
    engine = entry.runtime_data
    entities: list[SwitchEntity] = [PauseSwitch(engine, entry.entry_id)]
    entities += [ZoneEnabledSwitch(engine, z) for z in engine.zones.values()]
    async_add_entities(entities)
    entry.async_on_unload(
        engine.async_on_zone_added(
            lambda zone: async_add_entities([ZoneEnabledSwitch(engine, zone)])
        )
    )


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


class PauseSwitch(HydraxooControllerEntity, SwitchEntity):
    """When on, no cycle is started (manual watering still works)."""

    def __init__(self, engine, entry_id: str) -> None:
        """Initialize."""
        super().__init__(engine, entry_id, "pause")

    @property
    def is_on(self) -> bool:
        """Return True while paused."""
        return self.engine.paused

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """When the pause ends by itself (None: until switched off)."""
        until = self.engine.pause_until
        return {"until": until.isoformat() if until else None}

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Pause until switched off."""
        await self.engine.async_pause()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Resume."""
        await self.engine.async_resume()
