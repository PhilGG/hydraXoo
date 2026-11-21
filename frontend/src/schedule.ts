// Time helpers and today's cycles, computed in Home Assistant's time zone.
import type { Cycle, HistoryItem, Zone } from "./types";

export interface ZonedNow {
  weekday: number; // 0 = Monday
  minutes: number; // since local midnight
  dateKey: string; // "YYYY-MM-DD" local
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function zonedParts(date: Date, timeZone: string): ZonedNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    weekday: WEEKDAYS.indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime(iso: string | Date, timeZone: string, lang: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(lang, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatDate(iso: string | Date, timeZone: string, lang: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const text = new Intl.DateTimeFormat(lang, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Duration after the weather coefficient (0 when the cycle would be skipped). */
export function adjustedDuration(zone: Zone, base: number): number {
  if (zone.weather.skip) return 0;
  return Math.round((base * zone.weather.coefficient_pct) / 100);
}

export type CycleStatus =
  | { kind: "running" }
  | { kind: "done"; duration?: number }
  | { kind: "skipped"; reason: string }
  | { kind: "past" }
  | { kind: "disabled" }
  | { kind: "upcoming"; inMinutes: number; startMinutes: number };

export interface TodayCycle {
  cycle: Cycle;
  start: number; // minutes since midnight
  base: number;
  adjusted: number;
  status: CycleStatus;
}

function historyFor(
  history: HistoryItem[],
  zone: Zone,
  cycleId: string | undefined,
  dateKey: string,
  timeZone: string,
): HistoryItem | undefined {
  return [...history]
    .reverse()
    .find(
      (h) =>
        h.zone_id === zone.id &&
        h.cycle_id === cycleId &&
        zonedParts(new Date(h.started), timeZone).dateKey === dateKey,
    );
}

/** The zone's cycles planned today, sorted, with their state. */
export function todayCycles(
  zone: Zone,
  now: ZonedNow,
  history: HistoryItem[],
  timeZone: string,
): TodayCycle[] {
  return zone.cycles
    .filter((c) => c.weekdays.includes(now.weekday))
    .map((cycle) => {
      const start = toMinutes(cycle.start_time);
      const base = cycle.duration_min;
      let adjusted = adjustedDuration(zone, base);
      let status: CycleStatus;
      if (zone.running && zone.run && zone.run.cycle_id === cycle.id) {
        status = { kind: "running" };
        adjusted = zone.run.duration_min;
      } else if (!cycle.enabled || !zone.enabled) {
        status = { kind: "disabled" };
      } else if (start <= now.minutes) {
        const record = historyFor(history, zone, cycle.id, now.dateKey, timeZone);
        if (record?.kind === "run") {
          status = { kind: "done", duration: record.duration_min };
          adjusted = record.duration_min ?? adjusted;
        } else if (record?.kind === "skipped") {
          status = { kind: "skipped", reason: record.reason };
          adjusted = 0;
        } else {
          status = { kind: "past" };
        }
      } else if (adjusted === 0) {
        status = { kind: "skipped", reason: "weather" };
      } else {
        status = { kind: "upcoming", inMinutes: start - now.minutes, startMinutes: start };
      }
      return { cycle, start, base, adjusted, status };
    })
    .sort((a, b) => a.start - b.start);
}

/** Minutes of watering today (done and planned), for the timeline header. */
export function totalToday(cycles: TodayCycle[]): number {
  return cycles
    .filter((c) => c.status.kind !== "disabled")
    .reduce((sum, c) => sum + c.adjusted, 0);
}

/** "every_day", "weekdays_only", "weekend", or a count of days. */
export function daysSummary(weekdays: number[]): { key: string; n?: number } {
  const set = [...new Set(weekdays)].sort();
  if (set.length === 7) return { key: "every_day" };
  if (set.join() === "0,1,2,3,4") return { key: "weekdays_only" };
  if (set.join() === "5,6") return { key: "weekend" };
  if (set.length === 0) return { key: "no_day" };
  return { key: "n_days", n: set.length };
}
