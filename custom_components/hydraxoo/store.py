"""Persistent storage of zones and cycles."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN
from .models import Zone

STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}.zones"


class ZoneStore:
    """Load and save zones in Home Assistant's .storage folder."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the store."""
        self._store: Store[dict] = Store(hass, STORAGE_VERSION, STORAGE_KEY)

    async def async_load(self) -> list[Zone]:
        """Return the saved zones (empty list on first start)."""
        data = await self._store.async_load()
        if not data:
            return []
        return [Zone.from_dict(z) for z in data.get("zones", [])]

    async def async_save(self, zones: list[Zone]) -> None:
        """Save all zones."""
        await self._store.async_save({"zones": [z.to_dict() for z in zones]})

    async def async_remove(self) -> None:
        """Delete the storage file."""
        await self._store.async_remove()
