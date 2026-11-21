"""Shared test fixtures."""

from __future__ import annotations

from typing import Any

import pytest
from homeassistant.components.switch import SwitchEntity
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    setup_test_component_platform,
)

from custom_components.hydraxoo.const import DOMAIN
from custom_components.hydraxoo.store import STORAGE_KEY, STORAGE_VERSION

ZONE_ID = "zone1"
CYCLE_ID = "cycle1"
VALVE = "switch.valve"


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Allow loading custom_components/ in every test."""


@pytest.fixture(autouse=True)
async def paris_time_zone(hass: HomeAssistant) -> None:
    """Run tests in a real European time zone."""
    await hass.config.async_set_time_zone("Europe/Paris")


class MockValve(SwitchEntity):
    """A switch standing in for a smart plug driving a solenoid valve."""

    _attr_should_poll = False

    def __init__(self, name: str, is_on: bool = False) -> None:
        """Initialize."""
        self._attr_name = name
        self._attr_is_on = is_on
        self.calls: list[str] = []

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Open."""
        self.calls.append("on")
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Close."""
        self.calls.append("off")
        self._attr_is_on = False
        self.async_write_ha_state()


@pytest.fixture
async def valve(hass: HomeAssistant) -> MockValve:
    """A closed valve exposed as switch.valve."""
    entity = MockValve("Valve")
    setup_test_component_platform(hass, "switch", [entity])
    assert await async_setup_component(hass, "switch", {"switch": {"platform": "test"}})
    await hass.async_block_till_done()
    return entity


@pytest.fixture
async def two_valves(hass: HomeAssistant) -> tuple[MockValve, MockValve]:
    """Two closed valves: switch.valve and switch.valve_2."""
    first, second = MockValve("Valve"), MockValve("Valve 2")
    setup_test_component_platform(hass, "switch", [first, second])
    assert await async_setup_component(hass, "switch", {"switch": {"platform": "test"}})
    await hass.async_block_till_done()
    return first, second


def zone_data(**overrides: Any) -> dict[str, Any]:
    """A stored zone: Monday and Thursday at 06:00 for 10 minutes."""
    cycle = {
        "id": CYCLE_ID,
        "enabled": True,
        "start_time": "06:00",
        "duration_min": 10,
        "weekdays": [0, 3],
    }
    cycle |= overrides.pop("cycle", {})
    zone = {
        "id": ZONE_ID,
        "name": "Lawn",
        "icon": "mdi:sprinkler-variant",
        "enabled": True,
        "switch_entity": VALVE,
        "max_runtime_min": 30,
        "cycles": [cycle],
    }
    return zone | overrides


def store_zones(hass_storage: dict[str, Any], zones: list[dict[str, Any]]) -> None:
    """Pre-fill the zone storage file."""
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_VERSION,
        "minor_version": 1,
        "key": STORAGE_KEY,
        "data": {"zones": zones},
    }


async def setup_entry(
    hass: HomeAssistant, options: dict[str, Any] | None = None
) -> MockConfigEntry:
    """Install the integration."""
    entry = MockConfigEntry(domain=DOMAIN, title="hydraXoo", options=options or {})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry
