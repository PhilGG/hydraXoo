"""Tests of the weather coefficient (Met.no and Météo-France formats)."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    async_capture_events,
    async_fire_time_changed,
)

from custom_components.hydraxoo.const import EVENT_CYCLE_SKIPPED, EVENT_CYCLE_STARTED
from custom_components.hydraxoo.models import WeatherRules
from custom_components.hydraxoo.weather import WeatherService, compute_coefficient

from .conftest import MockValve, setup_entry, store_zones, zone_data

PARIS = ZoneInfo("Europe/Paris")
MONDAY_0559 = datetime(2026, 11, 23, 5, 59, 30, tzinfo=PARIS)
MONDAY_0600 = datetime(2026, 11, 23, 6, 0, 0, tzinfo=PARIS)
WEATHER = "weather.home"
COEF = "sensor.lawn_weather_coefficient"
NEXT = "sensor.lawn_next_watering"
VALVE = "switch.valve"


def hours(start: datetime, values: list[float | None], **extra: Any) -> list[dict]:
    """Hourly forecast items from `start`, Met.no style."""
    return [
        {
            "datetime": (start + timedelta(hours=i))
            .astimezone(dt_util.UTC)
            .isoformat(),
            "condition": "rainy" if v else "cloudy",
            "precipitation": v,
            "temperature": extra.get("temperature", 12.0),
        }
        for i, v in enumerate(values)
    ]


def days(start: datetime, values: list[float | None], temp: float = 14.0) -> list:
    """Daily forecast items, midnight local time."""
    midnight = start.replace(hour=0, minute=0, second=0)
    return [
        {
            "datetime": (midnight + timedelta(days=i))
            .astimezone(dt_util.UTC)
            .isoformat(),
            "condition": "rainy" if v else "sunny",
            "precipitation": v,
            "temperature": temp,
            "templow": 4.0,
        }
        for i, v in enumerate(values)
    ]


class FakeProvider:
    """Stands in for a weather integration answering weather.get_forecasts."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Register the weather entity and the service."""
        self.hass = hass
        self.hourly: list[dict] | None = None
        self.daily: list[dict] | None = None
        self.calls = 0
        hass.states.async_set(
            WEATHER,
            "cloudy",
            {
                "temperature": 11.0,
                "temperature_unit": "°C",
                "precipitation_unit": "mm",
            },
        )
        hass.services.async_register(
            "weather",
            "get_forecasts",
            self._handle,
            supports_response=SupportsResponse.ONLY,
        )

    async def _handle(self, call: ServiceCall) -> dict:
        self.calls += 1
        forecast = self.hourly if call.data["type"] == "hourly" else self.daily
        if forecast is None:
            raise HomeAssistantError("Forecast type not supported")
        return {WEATHER: {"forecast": forecast}}


@pytest.fixture
def provider(hass: HomeAssistant) -> FakeProvider:
    """A weather provider with no forecast yet."""
    return FakeProvider(hass)


async def _go_to(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, when: datetime
) -> None:
    freezer.move_to(when)
    async_fire_time_changed(hass, when)
    await hass.async_block_till_done()


async def _setup(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    options: dict[str, Any] | None = None,
    **zone: Any,
) -> None:
    freezer.move_to(MONDAY_0559)
    store_zones(hass_storage, [zone_data(**zone)])
    await setup_entry(hass, {"weather_entity": WEATHER} | (options or {}))


# ----------------------------------------------------------------- the rule


@pytest.mark.parametrize(
    ("past", "forecast", "temp", "rules", "expected", "skip"),
    [
        (0, 0, 15, {}, 1.0, False),  # dry: full watering
        (2, 1, 15, {}, 0.4, False),  # 1 - 3/5
        (0, 5, 15, {}, 0.0, True),  # forecast at the threshold: skipped
        (4, 0.9, 15, {}, 0.02, False),  # almost enough rain
        (6, 0, 15, {}, 0.0, True),  # enough rain fallen: skipped
        (2, 1, 32, {"heat_bonus_pct": 20}, 0.48, False),  # 0.4 x 1.2
        (2, 1, 25, {"heat_bonus_pct": 20}, 0.4, False),  # below 30 °C: no bonus
        (0, 0, 35, {"heat_bonus_pct": 100}, 1.5, False),  # capped at 150 %
        (6, 0, 15, {"min_pct": 20}, 0.2, False),  # minimum keeps watering
        (0, 6, 15, {"min_pct": 20}, 0.0, True),  # but rain expected still skips
    ],
)
def test_rule(
    past: float,
    forecast: float,
    temp: float,
    rules: dict,
    expected: float,
    skip: bool,
) -> None:
    """The coefficient follows the brief's rule."""
    result = compute_coefficient(WeatherRules.from_dict(rules), past, forecast, temp)
    assert result.coefficient == pytest.approx(expected)
    assert result.skip is skip


# ------------------------------------------------------------- providers


async def test_met_no_hourly(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    provider: FakeProvider,
    valve: MockValve,
) -> None:
    """Met.no: 1.5 mm expected → 70 %; the 10 min cycle waters 7 min."""
    provider.hourly = hours(MONDAY_0600, [0.5, 0.5, 0.5] + [0.0] * 30)
    provider.daily = days(MONDAY_0600, [1.5, 0, 0])
    started = async_capture_events(hass, EVENT_CYCLE_STARTED)
    await _setup(hass, hass_storage, freezer)

    state = hass.states.get(COEF)
    assert state.state == "70"
    assert state.attributes["forecast_rain_mm"] == 1.5
    assert state.attributes["reason"] == "adjusted"
    assert state.attributes["warnings"] == []
    assert hass.states.get(NEXT).attributes["adjusted_duration_min"] == 7

    await _go_to(hass, freezer, MONDAY_0600)
    assert hass.states.get(VALVE).state == STATE_ON
    assert started[0].data["duration_min"] == 7
    assert started[0].data["base_duration_min"] == 10
    assert started[0].data["coefficient_pct"] == 70


async def test_meteo_france_missing_hourly_rain(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    provider: FakeProvider,
    valve: MockValve,
) -> None:
    """Météo-France: hours without a rain value are ignored, others count."""
    provider.hourly = hours(MONDAY_0600, [None, 1.0, None, 1.0] + [None] * 20)
    provider.daily = days(MONDAY_0600, [4.0, 0.0])
    await _setup(hass, hass_storage, freezer)
    assert hass.states.get(COEF).attributes["forecast_rain_mm"] == 2.0
    assert hass.states.get(COEF).state == "60"


async def test_hourly_without_rain_falls_back_to_daily(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    provider: FakeProvider,
    valve: MockValve,
) -> None:
    """No rain value at all in the hourly forecast: the daily one is used."""
    provider.hourly = hours(MONDAY_0600, [None] * 24)
    provider.daily = days(MONDAY_0600, [2.0, 0.0])
    await _setup(hass, hass_storage, freezer)
    # Today (2 mm) and tomorrow (0 mm) both overlap the next 24 hours.
    assert hass.states.get(COEF).attributes["forecast_rain_mm"] == 2.0
    assert hass.states.get(COEF).state == "60"


async def test_daily_only_provider(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    provider: FakeProvider,
    valve: MockValve,
) -> None:
    """A provider without hourly forecasts still works."""
    provider.daily = days(MONDAY_0600, [1.0, 0.0], temp=33.0)
    await _setup(hass, hass_storage, freezer, weather_rules={"heat_bonus_pct": 50})
    attrs = hass.states.get(COEF).attributes
    assert attrs["forecast_rain_mm"] == 1.0
    assert attrs["temperature_c"] == 33.0
    assert attrs["heat_bonus_pct"] == 50
    assert hass.states.get(COEF).state == "120"  # 0.8 x 1.5


async def test_no_precipitation_field(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    provider: FakeProvider,
    valve: MockValve,
) -> None:
    """A provider that never gives rain amounts: 100 % with a warning."""
    provider.hourly = [
        {k: v for k, v in item.items() if k != "precipitation"}
        for item in hours(MONDAY_0600, [0.0] * 24)
    ]
    await _setup(hass, hass_storage, freezer)
    state = hass.states.get(COEF)
    assert state.state == "100"
    assert state.attributes["warnings"] == ["no_precipitation_data"]


async def test_heavy_rain_skips_cycle(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    provider: FakeProvider,
    valve: MockValve,
) -> None:
    """6 mm expected: the cycle is skipped and the reason is kept."""
    provider.hourly = hours(MONDAY_0600, [2.0, 2.0, 2.0] + [0.0] * 21)
    skipped = async_capture_events(hass, EVENT_CYCLE_SKIPPED)
    await _setup(hass, hass_storage, freezer)
    await _go_to(hass, freezer, MONDAY_0600)

    assert hass.states.get(VALVE).state == STATE_OFF
    assert skipped[0].data["reason"] == "weather"
    assert skipped[0].data["weather"]["reason"] == "rain_forecast"
    assert skipped[0].data["weather"]["forecast_rain_mm"] == 6.0


async def test_weather_unavailable_full_watering(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    provider: FakeProvider,
    valve: MockValve,
) -> None:
    """Weather entity unavailable: 100 % and a warning; the cycle runs."""
    hass.states.async_set(WEATHER, STATE_UNAVAILABLE)
    started = async_capture_events(hass, EVENT_CYCLE_STARTED)
    await _setup(hass, hass_storage, freezer)
    state = hass.states.get(COEF)
    assert state.state == "100"
    assert state.attributes["reason"] == "weather_unavailable"
    assert state.attributes["warnings"] == ["weather_unavailable"]

    await _go_to(hass, freezer, MONDAY_0600)
    assert started[0].data["duration_min"] == 10


async def test_sheltered_zone_not_adjusted(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    provider: FakeProvider,
    valve: MockValve,
) -> None:
    """A sheltered zone waters its base duration whatever the weather."""
    provider.hourly = hours(MONDAY_0600, [3.0] * 24)
    started = async_capture_events(hass, EVENT_CYCLE_STARTED)
    await _setup(hass, hass_storage, freezer, exposure="sheltered")
    assert hass.states.get(COEF).attributes["reason"] == "sheltered"
    await _go_to(hass, freezer, MONDAY_0600)
    assert started[0].data["duration_min"] == 10


async def test_no_weather_entity(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    valve: MockValve,
) -> None:
    """Without a weather entity the coefficient is 100 %, no warning."""
    freezer.move_to(MONDAY_0559)
    store_zones(hass_storage, [zone_data()])
    await setup_entry(hass)
    state = hass.states.get(COEF)
    assert state.state == "100"
    assert state.attributes["reason"] == "no_weather_entity"


async def test_recalculated_right_before_start(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    provider: FakeProvider,
    valve: MockValve,
) -> None:
    """The forecast changes after setup: the start uses the fresh one."""
    provider.hourly = hours(MONDAY_0600, [0.0] * 24)
    started = async_capture_events(hass, EVENT_CYCLE_STARTED)
    await _setup(hass, hass_storage, freezer)
    assert hass.states.get(COEF).state == "100"

    provider.hourly = hours(MONDAY_0600, [2.5] + [0.0] * 23)
    await _go_to(hass, freezer, MONDAY_0600)
    assert started[0].data["coefficient_pct"] == 50
    assert started[0].data["duration_min"] == 5


# ---------------------------------------------------------- rain fallen


async def test_rain_estimated_from_hourly_forecast(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    provider: FakeProvider,
    valve: MockValve,
) -> None:
    """Each hour the rain forecast for that hour is recorded as fallen."""
    night = MONDAY_0600 - timedelta(hours=5)  # 01:00
    provider.hourly = hours(night, [1.0, 1.0] + [0.0] * 40)
    freezer.move_to(night - timedelta(seconds=30))
    store_zones(hass_storage, [zone_data()])
    await setup_entry(hass, {"weather_entity": WEATHER})

    for hour in range(6):
        await _go_to(hass, freezer, night + timedelta(hours=hour))
    state = hass.states.get(COEF)
    assert state.attributes["past_rain_mm"] == 2.0
    assert state.state == "60"
    history = hass_storage["hydraxoo.zones"]["data"]["rain_history"]
    assert sum(history.values()) == 2.0


async def test_rain_sensor(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    """A cumulative rain gauge: hourly deltas, resets handled."""
    freezer.move_to(MONDAY_0600)
    service = WeatherService(hass, None, "sensor.rain")
    for total in (10.0, 12.0, 12.5, 1.0):  # last one: daily reset
        hass.states.async_set("sensor.rain", str(total), {"unit_of_measurement": "mm"})
        service.record_hour(dt_util.utcnow())
        freezer.tick(timedelta(hours=1))
    assert sorted(service.history.values()) == [0.5, 1.0, 2.0]
    assert service.past_rain(dt_util.utcnow(), 48) == 3.5


def test_older_rain_counts_half(hass: HomeAssistant) -> None:
    """Rain from 30 hours ago counts for half, beyond the window not at all."""
    now = dt_util.utcnow().replace(minute=0, second=0, microsecond=0)
    service = WeatherService(hass, WEATHER, None)
    service.history = {
        (now - timedelta(hours=3)).isoformat(): 1.0,
        (now - timedelta(hours=31)).isoformat(): 2.0,
        (now - timedelta(hours=60)).isoformat(): 5.0,
    }
    assert service.past_rain(now, 48) == pytest.approx(1.0 + 1.0)


async def test_inches_converted(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
    provider: FakeProvider,
    valve: MockValve,
) -> None:
    """Forecasts in inches are converted to mm."""
    hass.states.async_set(
        WEATHER, "rainy", {"precipitation_unit": "in", "temperature_unit": "°F"}
    )
    provider.hourly = hours(MONDAY_0600, [0.04] + [0.0] * 23, temperature=86.0)
    await _setup(hass, hass_storage, freezer)
    attrs = hass.states.get(COEF).attributes
    assert attrs["forecast_rain_mm"] == 1.0
    assert attrs["temperature_c"] == 30.0
