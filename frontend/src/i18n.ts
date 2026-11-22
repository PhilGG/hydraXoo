// Card translations. Language from the Home Assistant profile, English fallback.
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import type { Hass } from "./types";

type Dict = { [key: string]: string | string[] | Dict };

export const LOCALES: Record<string, Dict> = { de, en, es, fr, it };

function lookup(dict: Dict, key: string): string | undefined {
  let node: string | string[] | Dict | undefined = dict;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null || Array.isArray(node)) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function language(hass?: Hass): string {
  const lang = hass?.locale?.language || hass?.language || "en";
  return lang.split("-")[0];
}

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function translator(hass?: Hass): Translate {
  const dict = LOCALES[language(hass)] ?? en;
  return (key, vars) => {
    let text = lookup(dict, key) ?? lookup(en, key) ?? key;
    for (const [name, value] of Object.entries(vars ?? {})) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
    return text;
  };
}

/** Day names, Monday first: short letters and long names. */
export function dayNames(hass?: Hass): { short: string[]; long: string[] } {
  const dict = (LOCALES[language(hass)] ?? en) as Dict;
  return (dict.days ?? en.days) as { short: string[]; long: string[] };
}

/** Plural-aware key: picks `key_one` or `key_other`. */
export function plural(t: Translate, key: string, n: number, vars: Record<string, string | number> = {}): string {
  return t(`${key}_${n === 1 ? "one" : "other"}`, { n, ...vars });
}
