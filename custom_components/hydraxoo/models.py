"""Data model: zones and their watering cycles."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from typing import Any
from uuid import uuid4

from .const import (
    DEFAULT_CHECK_DELAY_S,
    DEFAULT_FORECAST_WINDOW_H,
    DEFAULT_HEAT_BONUS_PCT,
    DEFAULT_HEAT_THRESHOLD_C,
    DEFAULT_ICON,
    DEFAULT_MAX_ATTEMPTS,
    DEFAULT_MAX_PCT,
    DEFAULT_MAX_RUNTIME,
    DEFAULT_MIN_PCT,
    DEFAULT_PAST_WINDOW_H,
    DEFAULT_RETRY_PULSE_S,
    DEFAULT_SKIP_MM,
    DEFAULT_THRESHOLD_W,
    EXPOSURE_OUTDOOR,
)


def new_id() -> str:
    """Return a short, stable identifier."""
    return uuid4().hex[:12]


def parse_time(value: str) -> time:
    """Parse 'HH:MM' (or 'HH:MM:SS') into a time."""
    parts = [int(p) for p in value.split(":")]
    return time(parts[0], parts[1])


@dataclass
class Cycle:
    """One scheduled watering of a zone."""

    start_time: str  # "HH:MM", Home Assistant local time
    duration_min: int
    weekdays: list[int]  # 0 = Monday ... 6 = Sunday
    enabled: bool = True
    id: str = field(default_factory=new_id)

    @property
    def start(self) -> time:
        """Start time as a time object."""
        return parse_time(self.start_time)

    def next_start(self, after: datetime) -> datetime | None:
        """Return the first start strictly after `after` (aware, local time)."""
        if not self.enabled or not self.weekdays:
            return None
        start = self.start
        for offset in range(8):
            day = after.date() + timedelta(days=offset)
            if day.weekday() not in self.weekdays:
                continue
            candidate = datetime.combine(day, start, tzinfo=after.tzinfo)
            if candidate > after:
                return candidate
        return None

    def to_dict(self) -> dict[str, Any]:
        """Serialize for storage."""
        return {
            "id": self.id,
            "enabled": self.enabled,
            "start_time": self.start_time,
            "duration_min": self.duration_min,
            "weekdays": sorted(self.weekdays),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Cycle:
        """Load from storage."""
        return cls(
            id=data["id"],
            enabled=data.get("enabled", True),
            start_time=data["start_time"],
            duration_min=int(data["duration_min"]),
            weekdays=[int(d) for d in data.get("weekdays", [])],
        )


@dataclass
class SafetySettings:
    """Valve-closing check, active when the zone has a power sensor."""

    threshold_w: float = DEFAULT_THRESHOLD_W  # above this, the valve is open
    check_delay_s: int = DEFAULT_CHECK_DELAY_S  # wait after switching off
    retry_pulse_s: int = DEFAULT_RETRY_PULSE_S  # on-time before switching off again
    max_attempts: int = DEFAULT_MAX_ATTEMPTS  # retries before declaring a fault

    def to_dict(self) -> dict[str, Any]:
        """Serialize for storage."""
        return {
            "threshold_w": self.threshold_w,
            "check_delay_s": self.check_delay_s,
            "retry_pulse_s": self.retry_pulse_s,
            "max_attempts": self.max_attempts,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> SafetySettings:
        """Load from storage (missing values get defaults)."""
        data = data or {}
        return cls(
            threshold_w=float(data.get("threshold_w", DEFAULT_THRESHOLD_W)),
            check_delay_s=int(data.get("check_delay_s", DEFAULT_CHECK_DELAY_S)),
            retry_pulse_s=int(data.get("retry_pulse_s", DEFAULT_RETRY_PULSE_S)),
            max_attempts=int(data.get("max_attempts", DEFAULT_MAX_ATTEMPTS)),
        )


@dataclass
class WeatherRules:
    """How the weather adjusts an outdoor zone's watering time."""

    skip_mm: float = DEFAULT_SKIP_MM
    past_window_h: int = DEFAULT_PAST_WINDOW_H
    forecast_window_h: int = DEFAULT_FORECAST_WINDOW_H
    heat_threshold_c: float = DEFAULT_HEAT_THRESHOLD_C
    heat_bonus_pct: int = DEFAULT_HEAT_BONUS_PCT
    min_pct: int = DEFAULT_MIN_PCT
    max_pct: int = DEFAULT_MAX_PCT

    def to_dict(self) -> dict[str, Any]:
        """Serialize for storage."""
        return {
            "skip_mm": self.skip_mm,
            "past_window_h": self.past_window_h,
            "forecast_window_h": self.forecast_window_h,
            "heat_threshold_c": self.heat_threshold_c,
            "heat_bonus_pct": self.heat_bonus_pct,
            "min_pct": self.min_pct,
            "max_pct": self.max_pct,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> WeatherRules:
        """Load from storage (missing values get defaults)."""
        data = data or {}
        default = cls()
        return cls(
            skip_mm=float(data.get("skip_mm", default.skip_mm)),
            past_window_h=int(data.get("past_window_h", default.past_window_h)),
            forecast_window_h=int(
                data.get("forecast_window_h", default.forecast_window_h)
            ),
            heat_threshold_c=float(
                data.get("heat_threshold_c", default.heat_threshold_c)
            ),
            heat_bonus_pct=int(data.get("heat_bonus_pct", default.heat_bonus_pct)),
            min_pct=int(data.get("min_pct", default.min_pct)),
            max_pct=int(data.get("max_pct", default.max_pct)),
        )


@dataclass
class Zone:
    """A watering zone driven by one switch entity."""

    name: str
    switch_entity: str
    max_runtime_min: int = DEFAULT_MAX_RUNTIME
    icon: str = DEFAULT_ICON
    enabled: bool = True
    cycles: list[Cycle] = field(default_factory=list)
    power_entity: str | None = None  # optional; enables the closing check
    safety: SafetySettings = field(default_factory=SafetySettings)
    fault: bool = False  # closing check failed; blocks watering until acknowledged
    exposure: str = EXPOSURE_OUTDOOR
    weather_rules: WeatherRules = field(default_factory=WeatherRules)
    id: str = field(default_factory=new_id)

    def next_run(self, after: datetime) -> tuple[datetime, Cycle] | None:
        """Return the next scheduled start and its cycle, if any."""
        if not self.enabled:
            return None
        best: tuple[datetime, Cycle] | None = None
        for cycle in self.cycles:
            start = cycle.next_start(after)
            if start is not None and (best is None or start < best[0]):
                best = (start, cycle)
        return best

    def to_dict(self) -> dict[str, Any]:
        """Serialize for storage."""
        return {
            "id": self.id,
            "name": self.name,
            "icon": self.icon,
            "enabled": self.enabled,
            "switch_entity": self.switch_entity,
            "max_runtime_min": self.max_runtime_min,
            "power_entity": self.power_entity,
            "safety": self.safety.to_dict(),
            "fault": self.fault,
            "exposure": self.exposure,
            "weather_rules": self.weather_rules.to_dict(),
            "cycles": [c.to_dict() for c in self.cycles],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Zone:
        """Load from storage."""
        return cls(
            id=data["id"],
            name=data["name"],
            icon=data.get("icon", DEFAULT_ICON),
            enabled=data.get("enabled", True),
            switch_entity=data["switch_entity"],
            max_runtime_min=int(data.get("max_runtime_min", DEFAULT_MAX_RUNTIME)),
            power_entity=data.get("power_entity") or None,
            safety=SafetySettings.from_dict(data.get("safety")),
            fault=bool(data.get("fault", False)),
            exposure=data.get("exposure", EXPOSURE_OUTDOOR),
            weather_rules=WeatherRules.from_dict(data.get("weather_rules")),
            cycles=[Cycle.from_dict(c) for c in data.get("cycles", [])],
        )
