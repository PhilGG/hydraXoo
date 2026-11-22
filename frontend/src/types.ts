// Shapes of the data sent by the integration (websocket_api.py).

export interface Cycle {
  id?: string;
  enabled: boolean;
  start_time: string; // "HH:MM"
  duration_min: number;
  weekdays: number[]; // 0 = Monday
}

export interface SafetySettings {
  threshold_w: number;
  check_delay_s: number;
  retry_pulse_s: number;
  max_attempts: number;
}

export interface WeatherRules {
  skip_mm: number;
  past_window_h: number;
  forecast_window_h: number;
  heat_threshold_c: number;
  heat_bonus_pct: number;
  min_pct: number;
  max_pct: number;
}

export interface WeatherResult {
  coefficient_pct: number;
  skip: boolean;
  reason: string;
  past_rain_mm: number | null;
  forecast_rain_mm: number | null;
  temperature_c: number | null;
  heat_bonus_pct: number;
  warnings: string[];
}

export interface EntityRef {
  entity_id: string;
  name: string;
  state: string | null;
}

export interface CheckInfo {
  result: "confirmed" | "failed" | "sensor_unavailable";
  retries: number;
  power_w: number | null;
  time: string;
}

/** Zone configuration, as saved. */
export interface ZoneConfig {
  id?: string;
  name: string;
  icon: string;
  enabled: boolean;
  switch_entity: string;
  power_entity: string | null;
  max_runtime_min: number;
  receives_rain: boolean; // false: sheltered, rain ignored (heat still counts)
  frost_alert: boolean; // false: protected from frost (heated greenhouse)
  safety: SafetySettings;
  weather_rules: WeatherRules;
  cycles: Cycle[];
}

/** Zone with its live state. */
export interface Zone extends ZoneConfig {
  id: string;
  fault: boolean;
  running: boolean;
  run: {
    source: string;
    started: string;
    ends: string;
    duration_min: number;
    cycle_id: string | null;
    base_duration_min?: number;
    coefficient_pct?: number;
  } | null;
  remaining_s: number;
  queued: boolean;
  checking: boolean;
  weather: WeatherResult;
  next_run: {
    time: string;
    cycle_id: string;
    duration_min: number;
    adjusted_duration_min: number;
  } | null;
  last_check: CheckInfo | null;
  /** Valve switched on outside hydraXoo and left open ("allow" mode). */
  external_open: { since: string; ends: string } | null;
  switch: EntityRef | null;
  power: EntityRef | null;
}

export interface HistoryItem {
  zone_id: string;
  kind: "run" | "skipped" | "unexpected";
  cycle_id: string | null;
  started: string;
  reason: string;
  duration_min?: number;
  source?: string;
}

export interface HydraxooState {
  now: string;
  settings: {
    weather_entity: string | null;
    weather_name: string | null;
    rain_sensor: string | null;
    rain_name: string | null;
    notify_services: string[];
    external_open: "close" | "allow";
    frost_alert: boolean;
    frost_threshold_c: number;
    frost_thaw_notice: boolean;
    notify_options: { value: string; label: string }[];
    sequential: boolean;
    paused: boolean;
    pause_until: string | null;
  };
  weather: WeatherResult;
  frost: { active: boolean; acknowledged: boolean; alerted: boolean; min_c: number | null; frost_at: string | null };
  last_check: (CheckInfo & { zone_id: string; zone_name: string }) | null;
  queue: { zone_id: string; duration_min: number; source: string }[];
  zones: Zone[];
  history: HistoryItem[];
}

export interface CardConfig {
  type: string;
  title?: string;
  zones?: string[]; // ids to show; empty or missing = all
  compact?: boolean;
}

// Minimal part of Home Assistant's `hass` object used by the card.
export interface Hass {
  language: string;
  locale?: {
    language: string;
    time_format?: "language" | "system" | "12" | "24";
    first_weekday?: string;
  };
  config: { time_zone: string; unit_system?: { temperature?: string } };
  user?: { is_admin: boolean };
  states: Record<string, { entity_id: string; state: string; attributes: Record<string, any> }>;
  connection: {
    subscribeMessage<T>(
      callback: (message: T) => void,
      message: Record<string, unknown>,
    ): Promise<() => Promise<void> | void>;
  };
  callWS<T>(message: Record<string, unknown>): Promise<T>;
}

export const DEFAULT_SAFETY: SafetySettings = {
  threshold_w: 1,
  check_delay_s: 10,
  retry_pulse_s: 5,
  max_attempts: 5,
};

export const DEFAULT_WEATHER: WeatherRules = {
  skip_mm: 5,
  past_window_h: 48,
  forecast_window_h: 24,
  heat_threshold_c: 30,
  heat_bonus_pct: 0,
  min_pct: 0,
  max_pct: 150,
};

/** Short list of zone icons offered by the card. */
export const ZONE_ICONS = [
  { icon: "mdi:sprout", key: "plant" },
  { icon: "mdi:tree", key: "tree" },
  { icon: "mdi:grass", key: "lawn" },
  { icon: "mdi:flower", key: "flower" },
  { icon: "mdi:water", key: "drop" },
] as const;
