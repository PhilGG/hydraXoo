// Fake Home Assistant objects for the card tests.
import { vi } from "vitest";
import { DEFAULT_SAFETY, DEFAULT_WEATHER, type Hass, type HydraxooState, type Zone } from "../src/types";

export function makeZone(overrides: Partial<Zone> = {}): Zone {
  return {
    id: "z1",
    name: "Potager",
    icon: "mdi:sprout",
    enabled: true,
    switch_entity: "switch.vanne_potager",
    power_entity: "sensor.vanne_potager_power",
    max_runtime_min: 30,
    receives_rain: true,
    frost_alert: true,
    safety: { ...DEFAULT_SAFETY },
    weather_rules: { ...DEFAULT_WEATHER },
    cycles: [
      { id: "c1", enabled: true, start_time: "06:00", duration_min: 15, weekdays: [0, 1, 2, 3, 4, 5, 6] },
      { id: "c2", enabled: true, start_time: "13:00", duration_min: 5, weekdays: [0, 1, 3, 4] },
      { id: "c3", enabled: false, start_time: "20:30", duration_min: 12, weekdays: [0] },
    ],
    fault: false,
    running: false,
    run: null,
    remaining_s: 0,
    queued: false,
    checking: false,
    weather: {
      coefficient_pct: 60,
      skip: false,
      reason: "adjusted",
      past_rain_mm: 1,
      forecast_rain_mm: 1,
      temperature_c: 14,
      heat_bonus_pct: 0,
      warnings: [],
    },
    next_run: {
      time: "2026-11-23T12:00:00+00:00",
      cycle_id: "c2",
      duration_min: 5,
      adjusted_duration_min: 3,
    },
    last_check: null,
    external_open: null,
    switch: { entity_id: "switch.vanne_potager", name: "Vanne potager", state: "off" },
    power: null,
    ...overrides,
  };
}

export function makeState(overrides: Partial<HydraxooState> = {}): HydraxooState {
  return {
    now: "2026-11-23T09:40:00+00:00",
    settings: {
      weather_entity: "weather.maison",
      weather_name: "Maison",
      rain_sensor: null,
      rain_name: null,
      notify_services: ["mobile_app_iphone_de_phil"],
      external_open: "close",
      frost_alert: true,
      frost_threshold_c: 2,
      frost_thaw_notice: false,
      notify_options: [
        { value: "mobile_app_iphone_de_phil", label: "iPhone de Phil" },
        { value: "mobile_app_ipad_de_philippe", label: "iPad de Philippe" },
      ],
      sequential: true,
      paused: false,
      pause_until: null,
    },
    weather: {
      coefficient_pct: 60,
      skip: false,
      reason: "adjusted",
      past_rain_mm: 1,
      forecast_rain_mm: 1,
      temperature_c: 14,
      heat_bonus_pct: 0,
      warnings: [],
    },
    frost: { active: false, acknowledged: false, alerted: false, min_c: null, frost_at: null },
    last_check: {
      zone_id: "z2",
      zone_name: "Terrasse",
      result: "confirmed",
      retries: 1,
      power_w: 0,
      time: "2026-11-23T06:08:00+00:00",
    },
    queue: [],
    zones: [
      makeZone(),
      makeZone({
        id: "z2",
        name: "Terrasse",
        receives_rain: false,
        switch_entity: "switch.vanne_terrasse",
        cycles: [{ id: "t1", enabled: true, start_time: "07:00", duration_min: 8, weekdays: [0] }],
        weather: { ...makeZone().weather, coefficient_pct: 100, reason: "sheltered" },
        next_run: null,
      }),
    ],
    history: [
      {
        zone_id: "z1",
        kind: "run",
        cycle_id: "c1",
        started: "2026-11-23T05:00:00+00:00",
        reason: "completed",
        duration_min: 9,
      },
    ],
    ...overrides,
  };
}

export type FakeHass = Hass & {
  push(state: HydraxooState | { reload: true }): void;
  callWS: Hass["callWS"] & ReturnType<typeof vi.fn>;
};

export function makeHass(
  state: HydraxooState,
  opts: { admin?: boolean; lang?: string; timeFormat?: string; firstWeekday?: string } = {},
): FakeHass {
  let listener: ((message: any) => void) | undefined;
  const hass = {
    language: opts.lang ?? "fr",
    locale: {
      language: opts.lang ?? "fr",
      time_format: opts.timeFormat ?? "language",
      first_weekday: opts.firstWeekday ?? "language",
    },
    config: { time_zone: "Europe/Paris" },
    user: { is_admin: opts.admin ?? true },
    states: {
      "switch.vanne_potager": { entity_id: "switch.vanne_potager", state: "off", attributes: { friendly_name: "Vanne potager" } },
      "switch.vanne_terrasse": { entity_id: "switch.vanne_terrasse", state: "off", attributes: {} },
      "switch.vanne_roses": { entity_id: "switch.vanne_roses", state: "off", attributes: { friendly_name: "Vanne roses" } },
      "sensor.vanne_potager_power": {
        entity_id: "sensor.vanne_potager_power",
        state: "0",
        attributes: { device_class: "power" },
      },
    },
    connection: {
      subscribeMessage: vi.fn(async (callback: (m: any) => void) => {
        listener = callback;
        callback(state);
        return () => undefined;
      }),
    },
    callWS: vi.fn(async (msg: { type: string }) => (msg.type === "hydraxoo/zone/save" ? { id: "new1" } : null)),
    push(next: any) {
      listener?.(next);
    },
  };
  return hass as unknown as FakeHass;
}
