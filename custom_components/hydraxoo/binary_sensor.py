"""Binary sensor entities: watering in progress."""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import HydraxooConfigEntry
from .entity import HydraxooZoneEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: HydraxooConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Create one binary sensor per zone."""
    engine = entry.runtime_data
    async_add_entities(WateringBinarySensor(engine, z) for z in engine.zones.values())


class WateringBinarySensor(HydraxooZoneEntity, BinarySensorEntity):
    """On while hydraXoo has the zone's valve open."""

    _attr_device_class = BinarySensorDeviceClass.RUNNING

    def __init__(self, engine, zone) -> None:
        """Initialize."""
        super().__init__(engine, zone, "watering")

    @property
    def is_on(self) -> bool:
        """Return True while watering."""
        return self.engine.is_running(self.zone.id)

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Details of the current watering."""
        run = self.engine.runs.get(self.zone.id)
        if run is None:
            return None
        return {
            "source": run.source,
            "started": run.started.isoformat(),
            "ends": run.ends.isoformat(),
            "duration_min": run.duration_min,
        }
