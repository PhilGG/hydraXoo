"""Persistent storage of zones, cycles and the pause state."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .models import Zone

STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}.zones"


@dataclass
class StoredData:
    """Everything hydraXoo keeps between restarts."""

    zones: list[Zone] = field(default_factory=list)
    paused: bool = False
    pause_until: datetime | None = None  # None with paused=True: until resumed
    rain_history: dict[str, float] = field(default_factory=dict)  # hour -> mm
    rain_total: float | None = None  # last value of the rain sensor
    # Waterings and skipped cycles of the last 48 h (shown by the card)
    history: list[dict[str, Any]] = field(default_factory=list)
    frost: dict[str, Any] = field(default_factory=dict)  # current frost episode


class ZoneStore:
    """Load and save data in Home Assistant's .storage folder."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the store."""
        self._store: Store[dict] = Store(hass, STORAGE_VERSION, STORAGE_KEY)

    async def async_load(self) -> StoredData:
        """Return the saved data (empty on first start)."""
        data = await self._store.async_load()
        if not data:
            return StoredData()
        until = data.get("pause_until")
        return StoredData(
            zones=[Zone.from_dict(z) for z in data.get("zones", [])],
            paused=bool(data.get("paused", False)),
            pause_until=dt_util.parse_datetime(until) if until else None,
            rain_history={
                k: float(v) for k, v in (data.get("rain_history") or {}).items()
            },
            rain_total=data.get("rain_total"),
            history=list(data.get("history") or []),
            frost=dict(data.get("frost") or {}),
        )

    async def async_save(self, data: StoredData) -> None:
        """Save everything."""
        await self._store.async_save(
            {
                "zones": [z.to_dict() for z in data.zones],
                "paused": data.paused,
                "pause_until": (
                    data.pause_until.isoformat() if data.pause_until else None
                ),
                "rain_history": data.rain_history,
                "rain_total": data.rain_total,
                "history": data.history,
                "frost": data.frost,
            }
        )

    async def async_remove(self) -> None:
        """Delete the storage file."""
        await self._store.async_remove()
