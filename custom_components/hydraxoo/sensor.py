"""Sensor entities: next watering and remaining time."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import HydraxooConfigEntry
from .entity import HydraxooZoneEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: HydraxooConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Create the sensors of each zone."""
    engine = entry.runtime_data
    entities: list[SensorEntity] = []
    for zone in engine.zones.values():
        entities += [NextRunSensor(engine, zone), RemainingSensor(engine, zone)]
    async_add_entities(entities)


class NextRunSensor(HydraxooZoneEntity, SensorEntity):
    """Date and time of the next scheduled watering."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, engine, zone) -> None:
        """Initialize."""
        super().__init__(engine, zone, "next_run")

    @property
    def native_value(self) -> datetime | None:
        """Next start, or None if nothing is scheduled."""
        nxt = self.engine.next_run(self.zone.id)
        return nxt[0] if nxt else None

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Planned duration (before weather adjustment)."""
        nxt = self.engine.next_run(self.zone.id)
        if nxt is None:
            return None
        return {"duration_min": nxt[1].duration_min, "cycle_id": nxt[1].id}


class RemainingSensor(HydraxooZoneEntity, SensorEntity):
    """Time left in the current watering."""

    _attr_device_class = SensorDeviceClass.DURATION
    _attr_native_unit_of_measurement = UnitOfTime.SECONDS

    def __init__(self, engine, zone) -> None:
        """Initialize."""
        super().__init__(engine, zone, "remaining")

    @property
    def native_value(self) -> int:
        """Seconds left (0 when idle)."""
        return self.engine.remaining_seconds(self.zone.id)
