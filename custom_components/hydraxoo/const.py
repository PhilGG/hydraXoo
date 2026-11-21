"""Constants for hydraXoo."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "hydraxoo"

# Global settings (stored in the config entry options)
CONF_WEATHER_ENTITY: Final = "weather_entity"
CONF_RAIN_SENSOR: Final = "rain_sensor"
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
CONF_POWER_ENTITY: Final = "power_entity"
CONF_SAFETY: Final = "safety"
CONF_THRESHOLD_W: Final = "threshold_w"
CONF_CHECK_DELAY_S: Final = "check_delay_s"
CONF_RETRY_PULSE_S: Final = "retry_pulse_s"
CONF_MAX_ATTEMPTS: Final = "max_attempts"
CONF_EXPOSURE: Final = "exposure"
EXPOSURE_OUTDOOR: Final = "outdoor"  # adjusted to the weather
EXPOSURE_SHELTERED: Final = "sheltered"  # never adjusted
CONF_WEATHER_RULES: Final = "weather_rules"
CONF_SKIP_MM: Final = "skip_mm"
CONF_PAST_WINDOW_H: Final = "past_window_h"
CONF_FORECAST_WINDOW_H: Final = "forecast_window_h"
CONF_HEAT_THRESHOLD_C: Final = "heat_threshold_c"
CONF_HEAT_BONUS_PCT: Final = "heat_bonus_pct"
CONF_MIN_PCT: Final = "min_pct"
CONF_MAX_PCT: Final = "max_pct"

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

# Valve-closing check defaults
DEFAULT_THRESHOLD_W: Final = 1.0
DEFAULT_CHECK_DELAY_S: Final = 10
DEFAULT_RETRY_PULSE_S: Final = 5
DEFAULT_MAX_ATTEMPTS: Final = 5
# Weather rule defaults
DEFAULT_SKIP_MM: Final = 5.0  # forecast rain that cancels a cycle (also the scale)
DEFAULT_PAST_WINDOW_H: Final = 48  # rain fallen over this window counts
DEFAULT_FORECAST_WINDOW_H: Final = 24  # rain expected over this window counts
DEFAULT_HEAT_THRESHOLD_C: Final = 30.0
DEFAULT_HEAT_BONUS_PCT: Final = 0  # 0 = heat bonus disabled
DEFAULT_MIN_PCT: Final = 0
DEFAULT_MAX_PCT: Final = 150
# Forecasts are fetched at most this often, except right before a start
FORECAST_CACHE_MINUTES: Final = 10
# Rain history kept (hours)
RAIN_HISTORY_HOURS: Final = 96

# Longest wait for a fresh power reading when the last one predates the command
SENSOR_WAIT_MAX_S: Final = 60

# How often the remaining-time sensor refreshes while watering (seconds)
REMAINING_REFRESH_SECONDS: Final = 10

# Service names and fields
SERVICE_RUN_ZONE: Final = "run_zone"
SERVICE_STOP_ZONE: Final = "stop_zone"
SERVICE_STOP_ALL: Final = "stop_all"
SERVICE_PAUSE: Final = "pause"
SERVICE_RESUME: Final = "resume"
SERVICE_ACKNOWLEDGE_FAULT: Final = "acknowledge_fault"
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
EVENT_SAFETY_RETRY: Final = f"{DOMAIN}_safety_retry"
EVENT_SAFETY_FAILED: Final = f"{DOMAIN}_safety_failed"

# Result of a closing check
CHECK_CONFIRMED: Final = "confirmed"  # closed (possibly after retries)
CHECK_FAILED: Final = "failed"  # still drawing power after all retries
CHECK_SENSOR_UNAVAILABLE: Final = "sensor_unavailable"  # no reading, no retry

# Why a cycle was skipped
SKIP_PAUSED: Final = "paused"
SKIP_ZONE_DISABLED: Final = "zone_disabled"
SKIP_STOPPED: Final = "stopped"  # removed from the queue by a stop command
SKIP_WEATHER: Final = "weather"  # enough rain fallen or expected
SKIP_FAULT: Final = "fault"  # closing check failed, not acknowledged yet

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
