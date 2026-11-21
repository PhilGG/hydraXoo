"""Sensor entities: next watering and remaining time."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import HydraxooConfigEntry
from .entity import HydraxooControllerEntity, HydraxooZoneEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: HydraxooConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Create the sensors of each zone."""
    engine = entry.runtime_data
    entities: list[SensorEntity] = [QueueSensor(engine, entry.entry_id)]
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


class QueueSensor(HydraxooControllerEntity, SensorEntity):
    """Number of waterings waiting for their turn, listed in attributes."""

    def __init__(self, engine, entry_id: str) -> None:
        """Initialize."""
        super().__init__(engine, entry_id, "queue")

    @property
    def native_value(self) -> int:
        """Number of queued waterings."""
        return len(self.engine.queue)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """The queue, in order."""
        return {
            "items": [
                {
                    "zone_id": item.zone_id,
                    "zone_name": self.engine.zones[item.zone_id].name,
                    "duration_min": item.duration_min,
                    "source": item.source,
                    "cycle_id": item.cycle_id,
                }
                for item in self.engine.queue
                if item.zone_id in self.engine.zones
            ]
        }
