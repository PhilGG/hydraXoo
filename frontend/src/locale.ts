// Regional preferences from the user's Home Assistant profile.
import type { Hass } from "./types";

/** Full language tag (e.g. "en-GB"), used for number, date and time formats. */
export function fullLanguage(hass?: Hass): string {
  return hass?.locale?.language || hass?.language || "en";
}

/**
 * 12-hour clock? Follows Profile › Time format: "12", "24", "language"
 * (the language's habit) or "system" (the browser's).
 */
export function uses12h(hass?: Hass): boolean {
  const pref = hass?.locale?.time_format;
  if (pref === "12") return true;
  if (pref === "24") return false;
  const locale = pref === "system" ? undefined : fullLanguage(hass);
  const cycle = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
  return cycle === "h12" || cycle === "h11";
}

const WEEKDAY_PREF: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

/**
 * First day of the week, 0 = Monday … 6 = Sunday. Follows Profile › First
 * day of the week, or the language's habit (Sunday in the US, Monday in France).
 */
export function firstWeekday(hass?: Hass): number {
  const pref = hass?.locale?.first_weekday;
  if (pref && pref in WEEKDAY_PREF) return WEEKDAY_PREF[pref];
  try {
    const locale = new Intl.Locale(fullLanguage(hass)) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info?.firstDay) return (info.firstDay + 6) % 7; // Intl: 1 = Monday … 7 = Sunday
  } catch {
    // unknown language tag
  }
  return 0;
}

/** Day indexes (0 = Monday) in display order. */
export function weekOrder(hass?: Hass): number[] {
  const first = firstWeekday(hass);
  return Array.from({ length: 7 }, (_, i) => (first + i) % 7);
}
