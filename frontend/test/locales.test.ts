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

function leaves(value: unknown, prefix = ""): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.assign(
      {},
      ...Object.entries(value).map(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k)),
    );
  }
  return typeof value === "string" ? { [prefix]: value } : {};
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
const english = leaves(load("en.json"));

describe("card placeholders", () => {
  for (const file of readdirSync(DIR).filter((f) => f !== "en.json")) {
    it(`${file} keeps {zone}, {n}… as in English`, () => {
      const found = leaves(load(file));
      const wrong = Object.keys(english).filter(
        (k) => found[k] !== undefined && placeholders(found[k]) !== placeholders(english[k]),
      );
      expect(wrong).toEqual([]);
    });
  }
});
