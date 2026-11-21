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
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import selector

from .const import (
    CONF_DURATION,
    CONF_ICON,
    CONF_MAX_RUNTIME,
    CONF_NAME,
    CONF_START_TIME,
    CONF_SWITCH_ENTITY,
    CONF_WEATHER_ENTITY,
    CONF_WEEKDAYS,
    DEFAULT_DURATION,
    DEFAULT_ICON,
    DEFAULT_MAX_RUNTIME,
    DEFAULT_START_TIME,
    DOMAIN,
    MAX_RUNTIME_LIMIT,
)
from .models import Cycle, Zone

if TYPE_CHECKING:
    from .engine import HydraxooEngine

CONF_ZONE = "zone"
CONF_CYCLE_ENABLED = "cycle_enabled"
ALL_WEEKDAYS = [str(d) for d in range(7)]


def _settings_schema(defaults: dict[str, Any]) -> vol.Schema:
    weather = defaults.get(CONF_WEATHER_ENTITY)
    key = (
        vol.Optional(CONF_WEATHER_ENTITY, description={"suggested_value": weather})
        if weather
        else vol.Optional(CONF_WEATHER_ENTITY)
    )
    return vol.Schema(
        {key: selector.EntitySelector(selector.EntitySelectorConfig(domain="weather"))}
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


def _zone_schema(defaults: dict[str, Any], exclude: list[str]) -> vol.Schema:
    """Form for one zone and its (single, for now) cycle."""
    return vol.Schema(
        {
            vol.Required(CONF_NAME, default=defaults.get(CONF_NAME, "")): (
                selector.TextSelector()
            ),
            vol.Required(CONF_ICON, default=defaults.get(CONF_ICON, DEFAULT_ICON)): (
                selector.IconSelector()
            ),
            vol.Required(
                CONF_SWITCH_ENTITY,
                default=defaults.get(CONF_SWITCH_ENTITY, vol.UNDEFINED),
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="switch", exclude_entities=exclude)
            ),
            vol.Required(
                CONF_MAX_RUNTIME,
                default=defaults.get(CONF_MAX_RUNTIME, DEFAULT_MAX_RUNTIME),
            ): _minutes_selector(),
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
    )


def _validate_zone(user_input: dict[str, Any]) -> dict[str, str]:
    errors: dict[str, str] = {}
    if not str(user_input.get(CONF_NAME, "")).strip():
        errors[CONF_NAME] = "name_required"
    if not user_input.get(CONF_WEEKDAYS):
        errors[CONF_WEEKDAYS] = "no_weekday"
    if int(user_input[CONF_DURATION]) > int(user_input[CONF_MAX_RUNTIME]):
        errors[CONF_DURATION] = "duration_exceeds_max"
    return errors


def _zone_to_form(zone: Zone) -> dict[str, Any]:
    form: dict[str, Any] = {
        CONF_NAME: zone.name,
        CONF_ICON: zone.icon,
        CONF_SWITCH_ENTITY: zone.switch_entity,
        CONF_MAX_RUNTIME: zone.max_runtime_min,
    }
    if zone.cycles:
        cycle = zone.cycles[0]
        form |= {
            CONF_CYCLE_ENABLED: cycle.enabled,
            CONF_START_TIME: cycle.start_time,
            CONF_DURATION: cycle.duration_min,
            CONF_WEEKDAYS: [str(d) for d in cycle.weekdays],
        }
    return form


def _apply_form(zone: Zone, user_input: dict[str, Any]) -> None:
    """Copy form values onto a zone (and its first cycle)."""
    zone.name = str(user_input[CONF_NAME]).strip()
    zone.icon = user_input[CONF_ICON]
    zone.switch_entity = user_input[CONF_SWITCH_ENTITY]
    zone.max_runtime_min = int(user_input[CONF_MAX_RUNTIME])
    start = str(user_input[CONF_START_TIME])[:5]  # "HH:MM:SS" -> "HH:MM"
    weekdays = sorted(int(d) for d in user_input[CONF_WEEKDAYS])
    if not zone.cycles:
        zone.cycles.append(Cycle(start_time=start, duration_min=0, weekdays=[]))
    cycle = zone.cycles[0]
    cycle.enabled = bool(user_input[CONF_CYCLE_ENABLED])
    cycle.start_time = start
    cycle.duration_min = int(user_input[CONF_DURATION])
    cycle.weekdays = weekdays


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
        return self.async_show_form(step_id="user", data_schema=_settings_schema({}))

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

    @property
    def _engine(self) -> HydraxooEngine:
        return self.config_entry.runtime_data

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

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Main menu."""
        options = ["add_zone"]
        if self._engine.zones:
            options += ["pick_zone", "remove_zone"]
        options.append("settings")
        return self.async_show_menu(step_id="init", menu_options=options)

    async def async_step_settings(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Global settings."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        return self.async_show_form(
            step_id="settings",
            data_schema=_settings_schema(dict(self.config_entry.options)),
        )

    async def async_step_add_zone(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Create a zone with its first cycle."""
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate_zone(user_input)
            if not errors:
                zone = Zone(name="", switch_entity="")
                _apply_form(zone, user_input)
                self._engine.zones[zone.id] = zone
                return await self._async_save_and_finish()
        return self.async_show_form(
            step_id="add_zone",
            data_schema=self.add_suggested_values_to_schema(
                _zone_schema({}, self._own_switches()), user_input or {}
            ),
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
        """Choose the zone to edit."""
        if user_input is not None:
            self._zone_id = user_input[CONF_ZONE]
            return await self.async_step_edit_zone()
        return self.async_show_form(
            step_id="pick_zone", data_schema=self._zone_picker()
        )

    async def async_step_edit_zone(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Edit a zone and its first cycle."""
        assert self._zone_id is not None
        zone = self._engine.zones[self._zone_id]
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate_zone(user_input)
            if not errors:
                _apply_form(zone, user_input)
                return await self._async_save_and_finish()
        return self.async_show_form(
            step_id="edit_zone",
            data_schema=self.add_suggested_values_to_schema(
                _zone_schema(_zone_to_form(zone), self._own_switches()),
                user_input or {},
            ),
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
