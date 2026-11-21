import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = join(__dirname, "../src/locales");

function keys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

const load = (file: string) => JSON.parse(readFileSync(join(DIR, file), "utf-8"));
const reference = keys(load("en.json")).sort();

describe("card translations", () => {
  for (const file of readdirSync(DIR).filter((f) => f !== "en.json")) {
    it(`${file} has exactly the English keys`, () => {
      const found = keys(load(file)).sort();
      expect({
        missing: reference.filter((k) => !found.includes(k)),
        extra: found.filter((k) => !reference.includes(k)),
      }).toEqual({ missing: [], extra: [] });
    });
  }
});
