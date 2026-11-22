"""Weather coefficient: adjusts watering to rain and heat.

Sources
- Rain expected: `weather.get_forecasts` (hourly if available, else daily).
- Rain fallen: an optional cumulative rain sensor, otherwise an estimate
  built by recording, each hour, the forecast rain for the hour starting.

Rule (per zone, see WeatherRules)
- rain expected >= skip threshold: the cycle is skipped;
- otherwise coefficient = 1 - (weighted rain fallen + rain expected) / threshold,
  kept between 0 and 1, then the heat bonus (if any), then clamped to the
  zone's min/max. A coefficient of 0 skips the cycle.
- No usable weather: 100 % and a warning.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util

from .const import FORECAST_CACHE_MINUTES, RAIN_HISTORY_HOURS
from .models import WeatherRules, Zone

_LOGGER = logging.getLogger(__name__)

# Why the coefficient has its value
REASON_ADJUSTED = "adjusted"
REASON_RAIN_FORECAST = "rain_forecast"  # skipped: enough rain expected
REASON_ENOUGH_RAIN = "enough_rain"  # skipped: coefficient fell to 0
REASON_SHELTERED = "sheltered"  # no rain, no heat bonus: base duration
REASON_NO_WEATHER = "no_weather_entity"
REASON_UNAVAILABLE = "weather_unavailable"

# Warnings shown with the coefficient
WARN_UNAVAILABLE = "weather_unavailable"
WARN_NO_PRECIPITATION = "no_precipitation_data"


@dataclass
class WeatherResult:
    """A coefficient and everything needed to explain it."""

    coefficient: float  # 1.0 = 100 %
    skip: bool
    reason: str
    past_rain_mm: float | None = None
    forecast_rain_mm: float | None = None
    temperature_c: float | None = None
    heat_bonus_pct: int = 0
    warnings: list[str] = field(default_factory=list)

    @property
    def percent(self) -> int:
        """Coefficient in percent."""
        return round(self.coefficient * 100)

    def adjust(self, duration_min: int) -> int:
        """Adjusted duration, rounded to the minute (0 when skipped)."""
        return 0 if self.skip else round(duration_min * self.coefficient)

    def as_dict(self) -> dict[str, Any]:
        """Attributes for the sensor and the events."""
        return {
            "coefficient_pct": self.percent,
            "skip": self.skip,
            "reason": self.reason,
            "past_rain_mm": _round(self.past_rain_mm),
            "forecast_rain_mm": _round(self.forecast_rain_mm),
            "temperature_c": _round(self.temperature_c),
            "heat_bonus_pct": self.heat_bonus_pct,
            "warnings": self.warnings,
        }


def _round(value: float | None) -> float | None:
    return None if value is None else round(value, 1)


def compute_coefficient(
    rules: WeatherRules,
    past_mm: float,
    forecast_mm: float,
    temperature_c: float | None,
    warnings: list[str] | None = None,
) -> WeatherResult:
    """Apply the zone's weather rule (pure function, easy to test)."""
    details: dict[str, Any] = {
        "past_rain_mm": past_mm,
        "forecast_rain_mm": forecast_mm,
        "temperature_c": temperature_c,
        "warnings": list(warnings or []),
    }
    if forecast_mm >= rules.skip_mm:
        return WeatherResult(0.0, True, REASON_RAIN_FORECAST, **details)

    coefficient = 1 - (past_mm + forecast_mm) / rules.skip_mm
    coefficient = min(1.0, max(0.0, coefficient))

    bonus = 0
    if (
        rules.heat_bonus_pct > 0
        and temperature_c is not None
        and temperature_c >= rules.heat_threshold_c
    ):
        bonus = rules.heat_bonus_pct
        coefficient *= 1 + bonus / 100

    coefficient = min(rules.max_pct / 100, max(rules.min_pct / 100, coefficient))
    skip = coefficient <= 0
    reason = REASON_ENOUGH_RAIN if skip else REASON_ADJUSTED
    return WeatherResult(coefficient, skip, reason, heat_bonus_pct=bonus, **details)


def _parse_time(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return dt_util.as_utc(value)
    if isinstance(value, str):
        parsed = dt_util.parse_datetime(value)
        return dt_util.as_utc(parsed) if parsed else None
    return None


def _number(value: Any) -> float | None:
    try:
        return None if value is None else float(value)
    except TypeError, ValueError:
        return None


class WeatherService:
    """Reads forecasts and the rain history, and computes coefficients."""

    def __init__(
        self,
        hass: HomeAssistant,
        weather_entity: str | None,
        rain_sensor: str | None,
        history: dict[str, float] | None = None,
        rain_total: float | None = None,
    ) -> None:
        """Initialize.

        `history` maps the start of each hour (UTC, ISO) to the rain fallen
        during that hour, in mm. `rain_total` is the rain sensor's last value.
        """
        self.hass = hass
        self.weather_entity = weather_entity
        self.rain_sensor = rain_sensor
        self.history: dict[str, float] = dict(history or {})
        self.rain_total = rain_total
        self.hourly: list[dict[str, Any]] | None = None
        self.daily: list[dict[str, Any]] | None = None
        self.fetched_at: datetime | None = None

    # ------------------------------------------------------------- forecasts

    def _weather_state(self):
        if self.weather_entity is None:
            return None
        state = self.hass.states.get(self.weather_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        return state

    def _precipitation_factor(self) -> float:
        """Forecast precipitation unit to mm."""
        state = self._weather_state()
        unit = state.attributes.get("precipitation_unit") if state else None
        return 25.4 if unit == "in" else 1.0

    def _to_celsius(self, value: float | None) -> float | None:
        state = self._weather_state()
        unit = state.attributes.get("temperature_unit") if state else None
        if value is None or unit != "°F":
            return value
        return (value - 32) * 5 / 9

    async def _async_get(self, kind: str) -> list[dict[str, Any]] | None:
        try:
            response = await self.hass.services.async_call(
                "weather",
                "get_forecasts",
                {"entity_id": self.weather_entity, "type": kind},
                blocking=True,
                return_response=True,
            )
        except (HomeAssistantError, ValueError) as err:
            _LOGGER.debug("No %s forecast from %s: %s", kind, self.weather_entity, err)
            return None
        data = (response or {}).get(self.weather_entity) or {}
        forecast = data.get("forecast")
        return forecast if isinstance(forecast, list) and forecast else None

    async def async_refresh(self, force: bool = False) -> None:
        """Fetch forecasts (cached for a few minutes unless forced)."""
        now = dt_util.utcnow()
        if (
            not force
            and self.fetched_at is not None
            and now - self.fetched_at < timedelta(minutes=FORECAST_CACHE_MINUTES)
        ):
            return
        if self._weather_state() is None:
            self.hourly = self.daily = None
            return
        self.hourly = await self._async_get("hourly")
        self.daily = await self._async_get("daily")
        self.fetched_at = now

    @property
    def available(self) -> bool:
        """True when forecasts could be read."""
        return self._weather_state() is not None and bool(self.hourly or self.daily)

    def forecast_rain(self, now: datetime, window_h: int) -> float | None:
        """Rain expected from the current hour over the window (mm)."""
        factor = self._precipitation_factor()
        end = now + timedelta(hours=window_h)
        if self.hourly:
            values = [
                _number(item.get("precipitation"))
                for item in self.hourly
                if (start := _parse_time(item.get("datetime"))) is not None
                and start + timedelta(hours=1) > now
                and start < end
            ]
            known = [v for v in values if v is not None]
            if known:
                return sum(known) * factor
        if self.daily:
            values = [
                _number(item.get("precipitation"))
                for item in self.daily
                if (start := _parse_time(item.get("datetime"))) is not None
                and start + timedelta(days=1) > now
                and start < end
            ]
            known = [v for v in values if v is not None]
            if known:
                return sum(known) * factor
        return None

    def temperature(self, now: datetime, window_h: int) -> float | None:
        """Highest temperature expected over the window (°C)."""
        end = now + timedelta(hours=window_h)
        for forecast, length in ((self.hourly, 1), (self.daily, 24)):
            if not forecast:
                continue
            values = [
                _number(item.get("temperature"))
                for item in forecast
                if (start := _parse_time(item.get("datetime"))) is not None
                and start + timedelta(hours=length) > now
                and start < end
            ]
            known = [v for v in values if v is not None]
            if known:
                return self._to_celsius(max(known))
        state = self._weather_state()
        current = _number(state.attributes.get("temperature")) if state else None
        return self._to_celsius(current)

    def frost_forecast(
        self, now: datetime, threshold_c: float, window_h: int = 24
    ) -> tuple[float, datetime | None] | None:
        """Lowest temperature over the window (°C) and first hour at/below threshold.

        Hourly forecasts give the exact hour; with daily forecasts only, the
        day's low temperature is used and the frost time is the start of
        that day (or now).
        """
        if not self.available:
            return None
        end = now + timedelta(hours=window_h)
        if self.hourly:
            points = [
                (start, self._to_celsius(value))
                for item in self.hourly
                if (start := _parse_time(item.get("datetime"))) is not None
                and start + timedelta(hours=1) > now
                and start < end
                and (value := _number(item.get("temperature"))) is not None
            ]
            if points:
                first = next((t for t, c in sorted(points) if c <= threshold_c), None)
                return min(c for _, c in points), max(first, now) if first else None
        if self.daily:
            points = [
                (start, self._to_celsius(value))
                for item in self.daily
                if (start := _parse_time(item.get("datetime"))) is not None
                and start + timedelta(days=1) > now
                and start < end
                and (value := _number(item.get("templow", item.get("temperature"))))
                is not None
            ]
            if points:
                first = next((t for t, c in sorted(points) if c <= threshold_c), None)
                return min(c for _, c in points), max(first, now) if first else None
        return None

    # ---------------------------------------------------------- rain history

    def record_hour(self, now: datetime) -> bool:
        """Called at the top of each hour. Returns True if history changed."""
        hour = dt_util.as_utc(now).replace(minute=0, second=0, microsecond=0)
        changed = False
        if self.rain_sensor is not None:
            value = self._rain_sensor_value()
            if value is not None:
                if self.rain_total is not None:
                    delta = value - self.rain_total
                    if delta < 0:  # the sensor was reset (e.g. daily total)
                        delta = value
                    previous = (hour - timedelta(hours=1)).isoformat()
                    self.history[previous] = delta
                self.rain_total = value
                changed = True
        elif self.hourly:
            # No rain gauge: use the forecast for the hour starting now.
            for item in self.hourly:
                start = _parse_time(item.get("datetime"))
                if start is not None and start <= hour < start + timedelta(hours=1):
                    value = _number(item.get("precipitation"))
                    if value is not None:
                        self.history[hour.isoformat()] = (
                            value * self._precipitation_factor()
                        )
                        changed = True
                    break
        oldest = hour - timedelta(hours=RAIN_HISTORY_HOURS)
        for key in [k for k in self.history if _parse_time(k) < oldest]:
            del self.history[key]
            changed = True
        return changed

    def _rain_sensor_value(self) -> float | None:
        assert self.rain_sensor is not None
        state = self.hass.states.get(self.rain_sensor)
        if state is None:
            return None
        value = _number(state.state)
        if value is not None and state.attributes.get("unit_of_measurement") == "in":
            value *= 25.4
        return value

    def past_rain(self, now: datetime, window_h: int) -> float | None:
        """Rain fallen over the window, the last 24 h counting double.

        Weight 1 for hours ended less than 24 h ago, 0.5 before. Only hours
        already over count (the current hour is part of the forecast).
        """
        if not self.history:
            return None
        total = 0.0
        for key, mm in self.history.items():
            start = _parse_time(key)
            if start is None:
                continue
            age = now - (start + timedelta(hours=1))
            if timedelta(0) <= age < timedelta(hours=window_h):
                total += mm * (1.0 if age < timedelta(hours=24) else 0.5)
        return total

    # ----------------------------------------------------------- coefficient

    def compute(self, zone: Zone) -> WeatherResult:
        """Coefficient for a zone, with the data already fetched."""
        rules = zone.weather_rules
        if not zone.receives_rain and rules.heat_bonus_pct == 0:
            return WeatherResult(1.0, False, REASON_SHELTERED)
        if self.weather_entity is None:
            return WeatherResult(1.0, False, REASON_NO_WEATHER)
        if not self.available:
            return WeatherResult(
                1.0, False, REASON_UNAVAILABLE, warnings=[WARN_UNAVAILABLE]
            )
        now = dt_util.utcnow()
        temperature = self.temperature(now, rules.forecast_window_h)
        if not zone.receives_rain:
            # Sheltered from rain: only the heat bonus can change the duration.
            result = compute_coefficient(rules, 0.0, 0.0, temperature)
            result.past_rain_mm = result.forecast_rain_mm = None
            return result
        warnings: list[str] = []
        forecast = self.forecast_rain(now, rules.forecast_window_h)
        if forecast is None:
            warnings.append(WARN_NO_PRECIPITATION)
        past = self.past_rain(now, rules.past_window_h)
        return compute_coefficient(
            rules, past or 0.0, forecast or 0.0, temperature, warnings
        )
