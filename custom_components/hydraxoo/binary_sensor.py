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
    """Create the binary sensors of each zone."""
    engine = entry.runtime_data

    def zone_entities(zone) -> list[BinarySensorEntity]:
        return [WateringBinarySensor(engine, zone), FaultBinarySensor(engine, zone)]

    entities: list[BinarySensorEntity] = []
    for zone in engine.zones.values():
        entities += zone_entities(zone)
    async_add_entities(entities)
    entry.async_on_unload(
        engine.async_on_zone_added(lambda zone: async_add_entities(zone_entities(zone)))
    )


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


class FaultBinarySensor(HydraxooZoneEntity, BinarySensorEntity):
    """On when the valve could not be closed: the zone stops watering."""

    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, engine, zone) -> None:
        """Initialize."""
        super().__init__(engine, zone, "fault")

    @property
    def is_on(self) -> bool:
        """Return True while the zone is in fault."""
        return self.zone.fault

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Outcome of the last closing check."""
        attrs: dict[str, Any] = {
            "check_enabled": self.zone.power_entity is not None,
            "checking": self.zone.id in self.engine.checking,
        }
        last = self.engine.last_check.get(self.zone.id)
        if last is not None:
            attrs |= {
                "last_check": last.result,
                "last_check_retries": last.retries,
                "last_check_power_w": last.power_w,
                "last_check_time": last.finished.isoformat(),
            }
        return attrs
