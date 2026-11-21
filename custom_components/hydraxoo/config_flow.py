"""Setup screens (config flow) and zone management screens (options flow)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.data_entry_flow import section
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import selector

from .const import (
    CONF_CHECK_DELAY_S,
    CONF_DURATION,
    CONF_FORECAST_WINDOW_H,
    CONF_HEAT_BONUS_PCT,
    CONF_HEAT_THRESHOLD_C,
    CONF_ICON,
    CONF_MAX_ATTEMPTS,
    CONF_MAX_PCT,
    CONF_MAX_RUNTIME,
    CONF_MIN_PCT,
    CONF_NAME,
    CONF_NOTIFY_SERVICES,
    CONF_PAST_WINDOW_H,
    CONF_POWER_ENTITY,
    CONF_RAIN_SENSOR,
    CONF_RECEIVES_RAIN,
    CONF_RETRY_PULSE_S,
    CONF_SAFETY,
    CONF_SEQUENCE_MODE,
    CONF_SKIP_MM,
    CONF_START_TIME,
    CONF_SWITCH_ENTITY,
    CONF_THRESHOLD_W,
    CONF_WEATHER_ENTITY,
    CONF_WEATHER_RULES,
    CONF_WEEKDAYS,
    DEFAULT_DURATION,
    DEFAULT_ICON,
    DEFAULT_MAX_RUNTIME,
    DEFAULT_START_TIME,
    DOMAIN,
    MAX_RUNTIME_LIMIT,
    MODE_PARALLEL,
    MODE_SEQUENTIAL,
)
from .models import Cycle, SafetySettings, WeatherRules, Zone

if TYPE_CHECKING:
    from .engine import HydraxooEngine

CONF_ZONE = "zone"
CONF_CYCLE = "cycle"
CONF_CYCLE_ENABLED = "cycle_enabled"
ALL_WEEKDAYS = [str(d) for d in range(7)]
WEEKDAY_SHORT = {
    "en": ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    "fr": ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"],
    "de": ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    "es": ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"],
    "it": ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"],
}


def _notify_options(hass) -> list[str]:
    """notify services, phones of the companion app first."""
    names = [
        name
        for name in hass.services.async_services_for_domain("notify")
        if name not in ("persistent_notification", "send_message")
    ]
    return sorted(names, key=lambda n: (not n.startswith("mobile_app_"), n))


def _settings_schema(defaults: dict[str, Any], notify: list[str]) -> vol.Schema:
    weather = defaults.get(CONF_WEATHER_ENTITY)
    key = (
        vol.Optional(CONF_WEATHER_ENTITY, description={"suggested_value": weather})
        if weather
        else vol.Optional(CONF_WEATHER_ENTITY)
    )
    return vol.Schema(
        {
            key: selector.EntitySelector(
                selector.EntitySelectorConfig(domain="weather")
            ),
            vol.Optional(
                CONF_RAIN_SENSOR,
                description={"suggested_value": defaults.get(CONF_RAIN_SENSOR)},
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(
                    domain="sensor", device_class="precipitation"
                )
            ),
            vol.Required(
                CONF_SEQUENCE_MODE,
                default=defaults.get(CONF_SEQUENCE_MODE, MODE_SEQUENTIAL),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[MODE_SEQUENTIAL, MODE_PARALLEL],
                    mode=selector.SelectSelectorMode.LIST,
                    translation_key="sequence_mode",
                )
            ),
            vol.Optional(
                CONF_NOTIFY_SERVICES,
                default=[
                    s for s in defaults.get(CONF_NOTIFY_SERVICES, []) if s in notify
                ],
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[
                        selector.SelectOptionDict(value=n, label=f"notify.{n}")
                        for n in notify
                    ],
                    multiple=True,
                    mode=selector.SelectSelectorMode.LIST,
                )
            ),
        }
    )


def _minutes_selector(minimum: int = 1) -> selector.NumberSelector:
    return selector.NumberSelector(
        selector.NumberSelectorConfig(
            min=minimum,
            max=MAX_RUNTIME_LIMIT,
            step=1,
            mode=selector.NumberSelectorMode.BOX,
            unit_of_measurement="min",
        )
    )


def _zone_fields(defaults: dict[str, Any], exclude: list[str]) -> dict:
    """Fields describing the zone itself."""
    return {
        vol.Required(CONF_NAME, default=defaults.get(CONF_NAME, "")): (
            selector.TextSelector()
        ),
        vol.Required(CONF_ICON, default=defaults.get(CONF_ICON, DEFAULT_ICON)): (
            selector.IconSelector()
        ),
        vol.Required(
            CONF_SWITCH_ENTITY,
            CONF_THRESHOLD_W,
            default=defaults.get(CONF_SWITCH_ENTITY, vol.UNDEFINED),
        ): selector.EntitySelector(
            selector.EntitySelectorConfig(domain="switch", exclude_entities=exclude)
        ),
        vol.Required(
            CONF_MAX_RUNTIME,
            default=defaults.get(CONF_MAX_RUNTIME, DEFAULT_MAX_RUNTIME),
        ): _minutes_selector(),
        vol.Optional(
            CONF_POWER_ENTITY,
            description={"suggested_value": defaults.get(CONF_POWER_ENTITY)},
        ): selector.EntitySelector(
            selector.EntitySelectorConfig(domain="sensor", device_class="power")
        ),
        vol.Required(CONF_SAFETY): section(
            vol.Schema(_safety_fields(defaults.get(CONF_SAFETY) or {})),
            {"collapsed": True},
        ),
        vol.Required(
            CONF_RECEIVES_RAIN, default=defaults.get(CONF_RECEIVES_RAIN, True)
        ): selector.BooleanSelector(),
        vol.Required(CONF_WEATHER_RULES): section(
            vol.Schema(_weather_fields(defaults.get(CONF_WEATHER_RULES) or {})),
            {"collapsed": True},
        ),
    }


def _weather_fields(defaults: dict[str, Any]) -> dict:
    """Weather rule of a zone (rain part ignored when sheltered)."""
    base = WeatherRules().to_dict() | defaults
    fields = {
        CONF_SKIP_MM: _number(0.5, 50, 0.5, "mm"),
        CONF_PAST_WINDOW_H: _number(0, 96, 1, "h"),
        CONF_FORECAST_WINDOW_H: _number(1, 72, 1, "h"),
        CONF_HEAT_THRESHOLD_C: _number(15, 45, 0.5, "°C"),
        CONF_HEAT_BONUS_PCT: _number(0, 100, 5, "%"),
        CONF_MIN_PCT: _number(0, 100, 5, "%"),
        CONF_MAX_PCT: _number(100, 200, 5, "%"),
    }
    return {vol.Required(k, default=base[k]): v for k, v in fields.items()}


def _number(
    minimum: float, maximum: float, step: float, unit: str
) -> selector.NumberSelector:
    return selector.NumberSelector(
        selector.NumberSelectorConfig(
            min=minimum,
            max=maximum,
            step=step,
            mode=selector.NumberSelectorMode.BOX,
            unit_of_measurement=unit,
        )
    )


def _safety_fields(defaults: dict[str, Any]) -> dict:
    """Settings of the valve-closing check (used when a power sensor is set)."""
    base = SafetySettings().to_dict() | defaults
    return {
        vol.Required(CONF_THRESHOLD_W, default=base[CONF_THRESHOLD_W]): _number(
            0.1, 100, 0.1, "W"
        ),
        vol.Required(CONF_CHECK_DELAY_S, default=base[CONF_CHECK_DELAY_S]): _number(
            1, 300, 1, "s"
        ),
        vol.Required(CONF_RETRY_PULSE_S, default=base[CONF_RETRY_PULSE_S]): _number(
            1, 60, 1, "s"
        ),
        vol.Required(CONF_MAX_ATTEMPTS, default=base[CONF_MAX_ATTEMPTS]): _number(
            1, 10, 1, ""
        ),
    }


def _cycle_fields(defaults: dict[str, Any]) -> dict:
    """Fields describing one cycle."""
    return {
        vol.Required(
            CONF_CYCLE_ENABLED, default=defaults.get(CONF_CYCLE_ENABLED, True)
        ): selector.BooleanSelector(),
        vol.Required(
            CONF_START_TIME,
            default=defaults.get(CONF_START_TIME, DEFAULT_START_TIME),
        ): selector.TimeSelector(),
        vol.Required(
            CONF_DURATION, default=defaults.get(CONF_DURATION, DEFAULT_DURATION)
        ): _minutes_selector(),
        vol.Required(
            CONF_WEEKDAYS, default=defaults.get(CONF_WEEKDAYS, ALL_WEEKDAYS)
        ): selector.SelectSelector(
            selector.SelectSelectorConfig(
                options=ALL_WEEKDAYS,
                multiple=True,
                mode=selector.SelectSelectorMode.LIST,
                translation_key="weekday",
            )
        ),
    }


def _validate_zone(user_input: dict[str, Any]) -> dict[str, str]:
    if not str(user_input.get(CONF_NAME, "")).strip():
        return {CONF_NAME: "name_required"}
    return {}


def _validate_cycle(user_input: dict[str, Any], max_runtime: int) -> dict[str, str]:
    errors: dict[str, str] = {}
    if not user_input.get(CONF_WEEKDAYS):
        errors[CONF_WEEKDAYS] = "no_weekday"
    if int(user_input[CONF_DURATION]) > max_runtime:
        errors[CONF_DURATION] = "duration_exceeds_max"
    return errors


def _zone_to_form(zone: Zone) -> dict[str, Any]:
    return {
        CONF_NAME: zone.name,
        CONF_ICON: zone.icon,
        CONF_SWITCH_ENTITY: zone.switch_entity,
        CONF_MAX_RUNTIME: zone.max_runtime_min,
        CONF_POWER_ENTITY: zone.power_entity,
        CONF_SAFETY: zone.safety.to_dict(),
        CONF_RECEIVES_RAIN: zone.receives_rain,
        CONF_WEATHER_RULES: zone.weather_rules.to_dict(),
    }


def _cycle_to_form(cycle: Cycle) -> dict[str, Any]:
    return {
        CONF_CYCLE_ENABLED: cycle.enabled,
        CONF_START_TIME: cycle.start_time,
        CONF_DURATION: cycle.duration_min,
        CONF_WEEKDAYS: [str(d) for d in cycle.weekdays],
    }


def _apply_zone(zone: Zone, user_input: dict[str, Any]) -> None:
    zone.name = str(user_input[CONF_NAME]).strip()
    zone.icon = user_input[CONF_ICON]
    zone.switch_entity = user_input[CONF_SWITCH_ENTITY]
    zone.max_runtime_min = int(user_input[CONF_MAX_RUNTIME])
    zone.power_entity = user_input.get(CONF_POWER_ENTITY) or None
    zone.safety = SafetySettings.from_dict(user_input.get(CONF_SAFETY))
    zone.receives_rain = bool(user_input.get(CONF_RECEIVES_RAIN, True))
    zone.weather_rules = WeatherRules.from_dict(user_input.get(CONF_WEATHER_RULES))


def _apply_cycle(cycle: Cycle, user_input: dict[str, Any]) -> None:
    cycle.enabled = bool(user_input[CONF_CYCLE_ENABLED])
    cycle.start_time = str(user_input[CONF_START_TIME])[:5]  # "HH:MM:SS" -> "HH:MM"
    cycle.duration_min = int(user_input[CONF_DURATION])
    cycle.weekdays = sorted(int(d) for d in user_input[CONF_WEEKDAYS])


def _new_cycle(user_input: dict[str, Any]) -> Cycle:
    cycle = Cycle(start_time="", duration_min=0, weekdays=[])
    _apply_cycle(cycle, user_input)
    return cycle


def _cycle_label(cycle: Cycle, language: str) -> str:
    """Short label such as '06:00 · 10 min · Mo We Fr'."""
    names = WEEKDAY_SHORT.get(language.split("-")[0], WEEKDAY_SHORT["en"])
    days = " ".join(names[d] for d in sorted(cycle.weekdays))
    label = f"{cycle.start_time} · {cycle.duration_min} min · {days}"
    return label if cycle.enabled else f"({label})"


class HydraxooConfigFlow(ConfigFlow, domain=DOMAIN):
    """First installation of hydraXoo."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask for the (optional) weather entity."""
        if user_input is not None:
            return self.async_create_entry(
                title="hydraXoo", data={}, options=user_input
            )
        return self.async_show_form(
            step_id="user", data_schema=_settings_schema({}, _notify_options(self.hass))
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Return the options flow."""
        return HydraxooOptionsFlow()


class HydraxooOptionsFlow(OptionsFlow):
    """Manage zones and global settings."""

    def __init__(self) -> None:
        """Initialize."""
        self._zone_id: str | None = None
        self._cycle_id: str | None = None

    @property
    def _engine(self) -> HydraxooEngine:
        return self.config_entry.runtime_data

    @property
    def _zone(self) -> Zone:
        assert self._zone_id is not None
        return self._engine.zones[self._zone_id]

    def _own_switches(self) -> list[str]:
        """Our own switch entities, which must not be used as valves."""
        registry = er.async_get(self.hass)
        return [
            e.entity_id
            for e in er.async_entries_for_config_entry(
                registry, self.config_entry.entry_id
            )
            if e.domain == "switch"
        ]

    async def _async_save_and_finish(self) -> ConfigFlowResult:
        await self._engine.async_save()
        # Reload so that zone devices and entities are created/removed.
        self.hass.config_entries.async_schedule_reload(self.config_entry.entry_id)
        return self.async_create_entry(data=dict(self.config_entry.options))

    async def _async_cycles_changed(self) -> ConfigFlowResult:
        """Cycles apply at once (no reload): back to the zone menu."""
        await self._engine.async_zones_changed()
        return await self.async_step_zone_menu()

    async def async_step_finish(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Close the options (everything is already saved)."""
        return self.async_create_entry(data=dict(self.config_entry.options))

    # ---------------------------------------------------------------- menus

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Main menu."""
        options = ["add_zone"]
        if self._engine.zones:
            options += ["pick_zone", "remove_zone"]
        options.append("settings")
        return self.async_show_menu(step_id="init", menu_options=options)

    async def async_step_zone_menu(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """What to change in the chosen zone."""
        options = ["edit_zone", "add_cycle"]
        if self._zone.cycles:
            options += ["pick_cycle", "remove_cycle"]
        options += ["init", "finish"]
        return self.async_show_menu(
            step_id="zone_menu",
            menu_options=options,
            description_placeholders={"zone": self._zone.name},
        )

    async def async_step_settings(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Global settings."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        return self.async_show_form(
            step_id="settings",
            data_schema=_settings_schema(
                dict(self.config_entry.options), _notify_options(self.hass)
            ),
        )

    # ---------------------------------------------------------------- zones

    async def async_step_add_zone(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Create a zone with its first cycle."""
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate_zone(user_input) | _validate_cycle(
                user_input, int(user_input[CONF_MAX_RUNTIME])
            )
            if not errors:
                zone = Zone(name="", switch_entity="")
                _apply_zone(zone, user_input)
                zone.cycles.append(_new_cycle(user_input))
                self._engine.zones[zone.id] = zone
                return await self._async_save_and_finish()
        schema = vol.Schema(_zone_fields({}, self._own_switches()) | _cycle_fields({}))
        return self.async_show_form(
            step_id="add_zone",
            data_schema=self.add_suggested_values_to_schema(schema, user_input or {}),
            errors=errors,
        )

    def _zone_picker(self) -> vol.Schema:
        return vol.Schema(
            {
                vol.Required(CONF_ZONE): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[
                            selector.SelectOptionDict(value=z.id, label=z.name)
                            for z in self._engine.zones.values()
                        ]
                    )
                )
            }
        )

    async def async_step_pick_zone(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Choose the zone to change."""
        if user_input is not None:
            self._zone_id = user_input[CONF_ZONE]
            return await self.async_step_zone_menu()
        return self.async_show_form(
            step_id="pick_zone", data_schema=self._zone_picker()
        )

    async def async_step_edit_zone(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Edit the zone itself (name, valve, safety)."""
        zone = self._zone
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate_zone(user_input)
            if not errors:
                _apply_zone(zone, user_input)
                return await self._async_save_and_finish()
        schema = vol.Schema(_zone_fields(_zone_to_form(zone), self._own_switches()))
        return self.async_show_form(
            step_id="edit_zone",
            data_schema=self.add_suggested_values_to_schema(schema, user_input or {}),
            errors=errors,
            description_placeholders={"zone": zone.name},
        )

    async def async_step_remove_zone(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Delete a zone."""
        if user_input is not None:
            await self._engine.async_stop_zone(user_input[CONF_ZONE])
            self._engine.zones.pop(user_input[CONF_ZONE], None)
            return await self._async_save_and_finish()
        return self.async_show_form(
            step_id="remove_zone", data_schema=self._zone_picker()
        )

    # --------------------------------------------------------------- cycles

    def _cycle_picker(self) -> vol.Schema:
        language = self.hass.config.language
        return vol.Schema(
            {
                vol.Required(CONF_CYCLE): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[
                            selector.SelectOptionDict(
                                value=c.id, label=_cycle_label(c, language)
                            )
                            for c in sorted(self._zone.cycles, key=lambda c: c.start)
                        ]
                    )
                )
            }
        )

    async def async_step_add_cycle(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Add a cycle to the zone."""
        zone = self._zone
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate_cycle(user_input, zone.max_runtime_min)
            if not errors:
                zone.cycles.append(_new_cycle(user_input))
                return await self._async_cycles_changed()
        return self.async_show_form(
            step_id="add_cycle",
            data_schema=self.add_suggested_values_to_schema(
                vol.Schema(_cycle_fields({})), user_input or {}
            ),
            errors=errors,
            description_placeholders={"zone": zone.name},
        )

    async def async_step_pick_cycle(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Choose the cycle to edit."""
        if user_input is not None:
            self._cycle_id = user_input[CONF_CYCLE]
            return await self.async_step_edit_cycle()
        return self.async_show_form(
            step_id="pick_cycle",
            data_schema=self._cycle_picker(),
            description_placeholders={"zone": self._zone.name},
        )

    async def async_step_edit_cycle(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Edit one cycle."""
        zone = self._zone
        cycle = next(c for c in zone.cycles if c.id == self._cycle_id)
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate_cycle(user_input, zone.max_runtime_min)
            if not errors:
                _apply_cycle(cycle, user_input)
                return await self._async_cycles_changed()
        return self.async_show_form(
            step_id="edit_cycle",
            data_schema=self.add_suggested_values_to_schema(
                vol.Schema(_cycle_fields(_cycle_to_form(cycle))), user_input or {}
            ),
            errors=errors,
            description_placeholders={"zone": zone.name},
        )

    async def async_step_remove_cycle(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Delete one cycle."""
        zone = self._zone
        if user_input is not None:
            zone.cycles = [c for c in zone.cycles if c.id != user_input[CONF_CYCLE]]
            return await self._async_cycles_changed()
        return self.async_show_form(
            step_id="remove_cycle",
            data_schema=self._cycle_picker(),
            description_placeholders={"zone": zone.name},
        )
