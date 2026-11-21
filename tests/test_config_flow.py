"""Tests of the setup and zone management screens."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.hydraxoo.const import DOMAIN

from .conftest import VALVE, ZONE_ID, MockValve, setup_entry, store_zones, zone_data

ZONE_FORM = {
    "name": "Vegetable garden",
    "icon": "mdi:sprout",
    "switch_entity": VALVE,
    "max_runtime_min": 30,
    "cycle_enabled": True,
    "start_time": "07:30:00",
    "duration_min": 15,
    "weekdays": ["1", "4"],
}


async def test_user_step_creates_entry(hass: HomeAssistant) -> None:
    """Installing asks for an optional weather entity."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "hydraXoo"
    await hass.async_block_till_done()


async def test_single_instance(hass: HomeAssistant) -> None:
    """Only one installation is allowed."""
    MockConfigEntry(domain=DOMAIN).add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"


async def _open_menu(hass: HomeAssistant, entry_id: str, choice: str) -> dict:
    result = await hass.config_entries.options.async_init(entry_id)
    assert result["type"] is FlowResultType.MENU
    return await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": choice}
    )


async def test_add_zone(
    hass: HomeAssistant, hass_storage: dict[str, Any], valve: MockValve
) -> None:
    """Adding a zone stores it and creates its entities."""
    entry = await setup_entry(hass)
    result = await _open_menu(hass, entry.entry_id, "add_zone")
    assert result["type"] is FlowResultType.FORM

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], ZONE_FORM
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    zones = hass_storage["hydraxoo.zones"]["data"]["zones"]
    assert len(zones) == 1
    assert zones[0]["name"] == "Vegetable garden"
    assert zones[0]["cycles"][0] | {"id": None} == {
        "id": None,
        "enabled": True,
        "start_time": "07:30",
        "duration_min": 15,
        "weekdays": [1, 4],
    }
    assert hass.states.get("binary_sensor.vegetable_garden_watering") is not None


async def test_add_zone_errors(hass: HomeAssistant, valve: MockValve) -> None:
    """No day checked, or duration above the cut-off, are refused."""
    entry = await setup_entry(hass)
    result = await _open_menu(hass, entry.entry_id, "add_zone")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        ZONE_FORM | {"weekdays": [], "duration_min": 45},
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {
        "weekdays": "no_weekday",
        "duration_min": "duration_exceeds_max",
    }


async def test_edit_zone(
    hass: HomeAssistant, hass_storage: dict[str, Any], valve: MockValve
) -> None:
    """Editing a zone keeps its id and updates its cycle."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)

    result = await _open_menu(hass, entry.entry_id, "pick_zone")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"zone": ZONE_ID}
    )
    assert result["step_id"] == "edit_zone"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], ZONE_FORM | {"name": "Lawn", "duration_min": 20}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    zone = hass_storage["hydraxoo.zones"]["data"]["zones"][0]
    assert zone["id"] == ZONE_ID
    assert zone["cycles"][0]["duration_min"] == 20
    assert zone["cycles"][0]["id"] == "cycle1"


async def test_remove_zone(
    hass: HomeAssistant, hass_storage: dict[str, Any], valve: MockValve
) -> None:
    """Removing a zone deletes it and its device."""
    store_zones(hass_storage, [zone_data()])
    entry = await setup_entry(hass)
    registry = dr.async_get(hass)
    assert (
        registry.async_get_device_by_identifier((DOMAIN, ZONE_ID), entry.entry_id)
        is not None
    )

    result = await _open_menu(hass, entry.entry_id, "remove_zone")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"zone": ZONE_ID}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    assert hass_storage["hydraxoo.zones"]["data"]["zones"] == []
    assert (
        registry.async_get_device_by_identifier((DOMAIN, ZONE_ID), entry.entry_id)
        is None
    )
    assert hass.states.get("binary_sensor.lawn_watering") is None


async def test_settings(hass: HomeAssistant) -> None:
    """General settings save the weather entity."""
    entry = await setup_entry(hass)
    result = await _open_menu(hass, entry.entry_id, "settings")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"weather_entity": "weather.home"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert entry.options == {"weather_entity": "weather.home"}
