"""Serve the Lovelace card and add it to the dashboard resources."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

URL_BASE = f"/{DOMAIN}_static"
CARD_FILE = "hydraxoo-card.js"
CARD_URL = f"{URL_BASE}/{CARD_FILE}"


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Serve frontend/ and register the card (once per start)."""
    if getattr(hass, "http", None) is None:  # e.g. tests without http
        return
    from homeassistant.components.http import StaticPathConfig

    folder = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL_BASE, str(folder), cache_headers=False)]
    )
    # The version in the URL makes browsers fetch the new card after an update.
    version = (await async_get_integration(hass, DOMAIN)).version
    url = f"{CARD_URL}?v={version}"
    if not await _async_add_lovelace_resource(hass, url):
        _add_extra_module(hass, url)


async def _async_add_lovelace_resource(hass: HomeAssistant, url: str) -> bool:
    """Add or update the dashboard resource (dashboards in UI mode)."""
    try:
        from homeassistant.components.lovelace.const import LOVELACE_DATA
    except ImportError:
        return False
    lovelace = hass.data.get(LOVELACE_DATA)
    if lovelace is None or getattr(lovelace, "resource_mode", None) != "storage":
        return False
    resources = lovelace.resources
    try:
        await resources.async_get_info()  # loads the collection
        for item in resources.async_items():
            if str(item.get("url", "")).split("?")[0] == CARD_URL:
                if item["url"] != url:
                    await resources.async_update_item(
                        item["id"], {"res_type": "module", "url": url}
                    )
                return True
        await resources.async_create_item({"res_type": "module", "url": url})
    except Exception:
        _LOGGER.exception("Could not add the hydraXoo card to the dashboard resources")
        return False
    return True


def _add_extra_module(hass: HomeAssistant, url: str) -> None:
    """Dashboards in YAML mode: load the card on every page instead."""
    try:
        from homeassistant.components.frontend import add_extra_js_url

        add_extra_js_url(hass, url)
    except Exception:  # frontend not loaded
        _LOGGER.debug("Frontend not loaded, card not registered")
