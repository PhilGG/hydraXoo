"""Constants for hydraXoo."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "hydraxoo"

# Global settings (stored in the config entry options)
CONF_WEATHER_ENTITY: Final = "weather_entity"
CONF_SEQUENCE_MODE: Final = "sequence_mode"
MODE_SEQUENTIAL: Final = "sequential"  # one zone at a time (default)
MODE_PARALLEL: Final = "parallel"

# Zone fields
CONF_ZONE_ID: Final = "id"
CONF_NAME: Final = "name"
CONF_ICON: Final = "icon"
CONF_ENABLED: Final = "enabled"
CONF_SWITCH_ENTITY: Final = "switch_entity"
CONF_MAX_RUNTIME: Final = "max_runtime_min"
CONF_CYCLES: Final = "cycles"

# Cycle fields
CONF_CYCLE_ID: Final = "id"
CONF_START_TIME: Final = "start_time"
CONF_DURATION: Final = "duration_min"
CONF_WEEKDAYS: Final = "weekdays"

DEFAULT_ICON: Final = "mdi:sprinkler-variant"
DEFAULT_MAX_RUNTIME: Final = 30
DEFAULT_DURATION: Final = 10
DEFAULT_START_TIME: Final = "06:00"
MAX_RUNTIME_LIMIT: Final = 240

# How often the remaining-time sensor refreshes while watering (seconds)
REMAINING_REFRESH_SECONDS: Final = 10

# Service names and fields
SERVICE_RUN_ZONE: Final = "run_zone"
SERVICE_STOP_ZONE: Final = "stop_zone"
SERVICE_STOP_ALL: Final = "stop_all"
SERVICE_PAUSE: Final = "pause"
SERVICE_RESUME: Final = "resume"
ATTR_ZONE: Final = "zone"
ATTR_DURATION: Final = "duration"
ATTR_DAYS: Final = "days"
MAX_PAUSE_DAYS: Final = 365

# Identifier of the device holding the global entities
CONTROLLER_ID: Final = "controller"

# Events
EVENT_CYCLE_STARTED: Final = f"{DOMAIN}_cycle_started"
EVENT_CYCLE_FINISHED: Final = f"{DOMAIN}_cycle_finished"
EVENT_CYCLE_SKIPPED: Final = f"{DOMAIN}_cycle_skipped"

# Why a cycle was skipped
SKIP_PAUSED: Final = "paused"
SKIP_ZONE_DISABLED: Final = "zone_disabled"
SKIP_STOPPED: Final = "stopped"  # removed from the queue by a stop command

# Why a run started
SOURCE_SCHEDULE: Final = "schedule"
SOURCE_MANUAL: Final = "manual"

# Why a run ended
END_COMPLETED: Final = "completed"
END_MANUAL_STOP: Final = "manual_stop"
END_MAX_RUNTIME: Final = "max_runtime"
END_EXTERNAL: Final = "external"
END_RESTART: Final = "restart"
END_UNLOAD: Final = "unload"
