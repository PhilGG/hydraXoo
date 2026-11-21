import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/hydraxoo-card";
import type { HydraxooCard } from "../src/hydraxoo-card";
import type { HydraxooZoneForm } from "../src/zone-form";
import { makeHass, makeState, makeZone, type FakeHass } from "./fixtures";

// Monday 23 November 2026, 10:40 in Paris
const NOW = new Date("2026-11-23T09:40:00Z");

async function mount(hass: FakeHass, config: Record<string, unknown> = {}): Promise<HydraxooCard> {
  const card = document.createElement("hydraxoo-card") as HydraxooCard;
  card.setConfig({ type: "custom:hydraxoo-card", ...config });
  card.hass = hass;
  document.body.appendChild(card);
  await card.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await card.updateComplete;
  return card;
}

function root(card: HydraxooCard): ShadowRoot {
  return card.shadowRoot!;
}

function text(card: HydraxooCard): string {
  return root(card).textContent!.replace(/\s+/g, " ");
}

function buttonByText(scope: ParentNode, label: string): HTMLButtonElement {
  const button = [...scope.querySelectorAll("button")].find((b) =>
    b.textContent!.replace(/\s+/g, " ").includes(label),
  );
  if (!button) throw new Error(`No button "${label}"`);
  return button as HTMLButtonElement;
}

async function form(card: HydraxooCard): Promise<HydraxooZoneForm> {
  await card.updateComplete;
  const el = root(card).querySelector("hydraxoo-zone-form") as HydraxooZoneForm;
  await el.updateComplete;
  return el;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("dashboard", () => {
  it("shows the weather banner, safety event, timeline and zones", async () => {
    const card = await mount(makeHass(makeState()));
    const t = text(card);
    expect(t).toContain("Arrosage");
    expect(t).toContain("Lundi 23 novembre · 10:40");
    expect(t).toContain("Pluie : 1 mm tombés, 1 mm prévus");
    expect(t).toContain("60 %");
    expect(t).toContain("Terrasse · fermeture vérifiée à 07:08");
    expect(t).toContain("refermée après 1 relance de 5 s");
    expect(t).toContain("Potager");
    expect(t).toContain("Extérieur · adapté à la pluie");
    expect(t).toContain("Sous abri · durée fixe");
    expect(t).toContain("Prochain : 13:00 · 3 min");
    expect(t).toContain("Météo −40 %");
    // Timeline: 3 cycles today for Potager, 1 for Terrasse, a "now" marker per row
    expect(root(card).querySelectorAll(".track")[0].querySelectorAll(".mark").length).toBe(3);
    expect(root(card).querySelectorAll(".track .now").length).toBe(2);
  });

  it("lists today's cycles with base and adjusted durations", async () => {
    const card = await mount(makeHass(makeState()));
    const rows = [...root(card).querySelectorAll(".tile .cycles")[0].querySelectorAll(".cycle-row")];
    const rowText = rows.map((r) => r.textContent!.replace(/\s+/g, " ").trim());
    expect(rowText[0]).toMatch(/06:00.*15 min.*9 min.*Fait/);
    expect(rowText[1]).toMatch(/13:00.*5 min.*3 min.*dans 2 h/);
    expect(rowText[2]).toMatch(/20:30.*Désactivé/);
    expect(rows[1].querySelector("s")!.textContent).toBe("5 min");
  });

  it("enables and disables a zone", async () => {
    const hass = makeHass(makeState());
    const card = await mount(hass);
    const toggle = root(card).querySelector('[role="switch"]') as HTMLButtonElement;
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Activer la zone Potager");
    toggle.click();
    expect(hass.callWS).toHaveBeenCalledWith({ type: "hydraxoo/zone/enable", zone_id: "z1", enabled: false });
  });

  it("waters now with a chosen duration", async () => {
    const hass = makeHass(makeState());
    const card = await mount(hass);
    buttonByText(root(card), "Arroser maintenant").click();
    await card.updateComplete;
    buttonByText(root(card), "+").click();
    buttonByText(root(card), "+").click();
    await card.updateComplete;
    expect(text(card)).toContain("17 min");
    buttonByText(root(card), "Démarrer").click();
    expect(hass.callWS).toHaveBeenCalledWith({ type: "hydraxoo/zone/run", zone_id: "z1", duration: 17 });
  });

  it("shows a running zone with its remaining time and a stop button", async () => {
    const running = makeZone({
      running: true,
      run: {
        source: "manual",
        started: "2026-11-23T09:38:00Z",
        ends: "2026-11-23T09:44:30Z",
        duration_min: 6,
        cycle_id: null,
      },
    });
    const hass = makeHass(makeState({ zones: [running] }));
    const card = await mount(hass);
    expect(text(card)).toContain("Arrosage · reste 4:30");
    buttonByText(root(card), "Arrêter").click();
    expect(hass.callWS).toHaveBeenCalledWith({ type: "hydraxoo/zone/stop", zone_id: "z1" });
  });

  it("shows a closing fault and acknowledges it", async () => {
    const zone = makeZone({
      fault: true,
      last_check: { result: "failed", retries: 5, power_w: 6, time: "2026-11-23T09:00:00Z" },
    });
    const hass = makeHass(makeState({ zones: [zone], last_check: null }));
    const card = await mount(hass);
    expect(text(card)).toContain("Potager : vanne non refermée");
    expect(text(card)).toContain("Encore 6 W après 5 relances");
    buttonByText(root(card), "Acquitter").click();
    expect(hass.callWS).toHaveBeenCalledWith({ type: "hydraxoo/zone/acknowledge", zone_id: "z1" });
  });

  it("shows the pause and resumes", async () => {
    const state = makeState();
    state.settings.paused = true;
    const hass = makeHass(state);
    const card = await mount(hass);
    expect(text(card)).toContain("Arrosage en pause");
    buttonByText(root(card), "Reprendre").click();
    expect(hass.callWS).toHaveBeenCalledWith({ type: "hydraxoo/resume" });
  });

  it("hides editing for non-admin users", async () => {
    const card = await mount(makeHass(makeState(), { admin: false }));
    expect(text(card)).not.toContain("Modifier");
    expect(text(card)).not.toContain("Nouvelle zone");
    expect(text(card)).toContain("Arroser maintenant");
  });

  it("compact display hides the timeline; zones can be filtered", async () => {
    const card = await mount(makeHass(makeState()), { compact: true, zones: ["z2"] });
    expect(root(card).querySelector(".timeline")).toBeNull();
    expect(text(card)).toContain("Terrasse");
    expect(text(card)).not.toContain("Potager");
  });

  it("follows updates pushed by the integration", async () => {
    const hass = makeHass(makeState());
    const card = await mount(hass);
    const state = makeState();
    state.zones[0].name = "Jardin";
    hass.push(state);
    await card.updateComplete;
    expect(text(card)).toContain("Jardin");
  });

  it("speaks English when the profile is in English", async () => {
    const card = await mount(makeHass(makeState(), { lang: "en" }));
    expect(text(card)).toContain("Water now");
    expect(text(card)).toContain("Watering");
  });
});

describe("zone settings", () => {
  it("edits a cycle's days and duration, then saves", async () => {
    const hass = makeHass(makeState());
    const card = await mount(hass);
    buttonByText(root(card), "Modifier").click();
    const el = await form(card);
    const scope = el.shadowRoot!;
    expect(scope.textContent).toContain("Réglages de la zone");
    expect(scope.textContent).toContain("Vérifier la fermeture");
    expect(scope.textContent).toContain("Adapter selon la pluie");

    // Cycle 2: add Wednesday, one more minute
    (scope.querySelector('[aria-label="Mercredi, cycle 2"]') as HTMLButtonElement).click();
    (scope.querySelector('[aria-label="Augmenter la durée du cycle 2"]') as HTMLButtonElement).click();
    await el.updateComplete;
    buttonByText(scope, "Enregistrer").click();
    await vi.waitFor(() => expect(hass.callWS).toHaveBeenCalled());

    const call = hass.callWS.mock.calls[0][0];
    expect(call.type).toBe("hydraxoo/zone/save");
    expect(call.zone.id).toBe("z1");
    expect(call.zone.cycles[1].weekdays).toEqual([0, 1, 2, 3, 4]);
    expect(call.zone.cycles[1].duration_min).toBe(6);
    expect(call.zone).not.toHaveProperty("running");
  });

  it("adds and deletes cycles", async () => {
    const hass = makeHass(makeState());
    const card = await mount(hass);
    buttonByText(root(card), "Modifier").click();
    const el = await form(card);
    const scope = el.shadowRoot!;
    buttonByText(scope, "Ajouter un cycle").click();
    await el.updateComplete;
    expect(scope.querySelectorAll(".cycle-card").length).toBe(4);
    (scope.querySelector('[aria-label="Supprimer le cycle 1"]') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(scope.querySelectorAll(".cycle-card").length).toBe(3);
  });

  it("refuses a cycle without any day", async () => {
    const hass = makeHass(makeState());
    const card = await mount(hass);
    buttonByText(root(card), "Modifier").click();
    const el = await form(card);
    const scope = el.shadowRoot!;
    for (const day of ["Lundi", "Mardi", "Jeudi", "Vendredi"]) {
      (scope.querySelector(`[aria-label="${day}, cycle 2"]`) as HTMLButtonElement).click();
    }
    await el.updateComplete;
    buttonByText(scope, "Enregistrer").click();
    await el.updateComplete;
    expect(scope.querySelector('[role="alert"]')!.textContent).toContain("au moins un jour");
    expect(hass.callWS).not.toHaveBeenCalled();
  });

  it("goes back to the dashboard", async () => {
    const card = await mount(makeHass(makeState()));
    buttonByText(root(card), "Modifier").click();
    const el = await form(card);
    (el.shadowRoot!.querySelector('[aria-label="Retour au tableau de bord"]') as HTMLButtonElement).click();
    await card.updateComplete;
    expect(root(card).querySelector("hydraxoo-zone-form")).toBeNull();
  });
});

describe("new zone", () => {
  it("creates a zone then opens its settings to add cycles", async () => {
    const hass = makeHass(makeState());
    const card = await mount(hass);
    buttonByText(root(card), "Nouvelle zone").click();
    const el = await form(card);
    const scope = el.shadowRoot!;
    expect(scope.textContent).toContain("Créer et ajouter des cycles");

    const name = scope.querySelector('input[type="text"]') as HTMLInputElement;
    name.value = "Rosiers";
    name.dispatchEvent(new Event("input"));
    (scope.querySelector('[aria-label="Fleurs"]') as HTMLButtonElement).click();
    buttonByText(scope, "Sous abri").click();
    const select = scope.querySelector("select") as HTMLSelectElement;
    select.value = "switch.vanne_roses";
    select.dispatchEvent(new Event("change"));
    await el.updateComplete;

    buttonByText(scope, "Créer et ajouter des cycles").click();
    await vi.waitFor(() => expect(hass.callWS).toHaveBeenCalled());
    const zone = hass.callWS.mock.calls[0][0].zone;
    expect(zone).not.toHaveProperty("id");
    expect(zone).toMatchObject({
      name: "Rosiers",
      icon: "mdi:flower",
      exposure: "sheltered",
      switch_entity: "switch.vanne_roses",
      power_entity: null,
      cycles: [],
    });
  });

  it("requires a name and a valve", async () => {
    const hass = makeHass(makeState());
    const card = await mount(hass);
    buttonByText(root(card), "Nouvelle zone").click();
    const el = await form(card);
    buttonByText(el.shadowRoot!, "Créer et ajouter des cycles").click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[role="alert"]')!.textContent).toContain("Saisissez un nom");
    expect(hass.callWS).not.toHaveBeenCalled();
  });
});

describe("card editor", () => {
  it("offers title, compact display and the zones", async () => {
    const hass = makeHass(makeState());
    const editor = document.createElement("hydraxoo-card-editor") as any;
    editor.setConfig({ type: "custom:hydraxoo-card" });
    editor.hass = hass;
    document.body.appendChild(editor);
    await editor.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await editor.updateComplete;
    const haForm = editor.shadowRoot.querySelector("ha-form");
    expect(haForm.schema.map((s: any) => s.name)).toEqual(["title", "compact", "zones"]);
    expect(haForm.schema[2].selector.select.options).toEqual([
      { value: "z1", label: "Potager" },
      { value: "z2", label: "Terrasse" },
    ]);
    expect(haForm.computeLabel({ name: "compact" })).toBe("Affichage compact");
  });
});
