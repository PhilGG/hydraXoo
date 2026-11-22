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
    expect(t).toContain("Reçoit la pluie · durée ajustée");
    expect(t).toContain("À l'abri de la pluie");
    expect(t).toContain("Prochain : 13:00 · 3 min");
    expect(t).toContain("Météo : 60 % de la durée");
    // Timeline: 3 cycles today for Potager, 1 for Terrasse, a "now" marker per row
    expect(root(card).querySelectorAll(".track")[0].querySelectorAll(".mark").length).toBe(3);
    expect(root(card).querySelectorAll(".track .now").length).toBe(2);
  });

  it("shows skipped cycles differently from finished ones", async () => {
    const state = makeState();
    state.history.push({
      zone_id: "z2",
      kind: "skipped",
      cycle_id: "t1",
      started: "2026-11-23T06:00:00+00:00",
      reason: "weather",
    });
    const card = await mount(makeHass(state));
    const tracks = root(card).querySelectorAll(".track");
    expect(tracks[0].querySelector(".mark")!.classList.contains("done")).toBe(true);
    const skipped = tracks[1].querySelector(".mark")!;
    expect(skipped.classList.contains("skipped")).toBe(true);
    expect(skipped.getAttribute("title")).toContain("Sauté · pluie");
    expect(text(card)).toContain("Sauté");
    // Legend only lists "In progress" when something is watering
    expect(text(card)).not.toContain("En cours");
  });

  it("says plainly when rain will skip the watering", async () => {
    const zone = makeZone({
      weather: { ...makeZone().weather, coefficient_pct: 0, skip: true, reason: "rain_forecast" },
      next_run: { time: "2026-11-23T12:00:00+00:00", cycle_id: "c2", duration_min: 5, adjusted_duration_min: 0 },
    });
    const card = await mount(makeHass(makeState({ zones: [zone] })));
    const t = text(card);
    expect(t).toContain("Pluie : arrosage sauté");
    expect(t).toContain("Prochain : 13:00 · sauté (pluie)");
    const chips = root(card).querySelector(".chips")!.textContent!;
    expect(chips).not.toContain("0 min");
    expect(chips).not.toContain("100 %");
    const row = [...root(card).querySelectorAll(".cycle-row")][1];
    expect(row.querySelector("s")!.textContent).toBe("5 min");
    expect(row.textContent).toContain("Sauté · pluie");
    expect(row.querySelector(".status ha-icon")!.getAttribute("icon")).toBe("mdi:close");
    // and the tick for a finished cycle
    const done = [...root(card).querySelectorAll(".cycle-row")][0];
    expect(done.querySelector(".status ha-icon")!.getAttribute("icon")).toBe("mdi:check");
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

  it.each([
    ["de", "Jetzt bewässern", "Bewässerung"],
    ["es", "Regar ahora", "Riego"],
    ["it", "Irriga ora", "Irrigazione"],
  ])("speaks %s", async (lang, waterNow, title) => {
    const card = await mount(makeHass(makeState(), { lang }));
    expect(text(card)).toContain(waterNow);
    expect(text(card)).toContain(title);
  });

  it("falls back to English for other languages", async () => {
    const card = await mount(makeHass(makeState(), { lang: "nl" }));
    expect(text(card)).toContain("Water now");
  });

  it("speaks English when the profile is in English", async () => {
    const card = await mount(makeHass(makeState(), { lang: "en" }));
    expect(text(card)).toContain("Water now");
    expect(text(card)).toContain("Watering");
  });
});

describe("regional formats", () => {
  it("uses a 12-hour clock in American English", async () => {
    const card = await mount(makeHass(makeState(), { lang: "en-US" }));
    const t = text(card);
    expect(t).toContain("1:00 PM");
    expect(t).toMatch(/10:40\s?AM/);
    expect(t).toContain("6 AM");
    expect(t).not.toContain("13:00");
  });

  it("keeps 24 hours in French, or when the profile asks for it", async () => {
    expect(text(await mount(makeHass(makeState())))).toContain("13:00");
    document.body.innerHTML = "";
    const card = await mount(makeHass(makeState(), { lang: "en-US", timeFormat: "24" }));
    expect(text(card)).toContain("13:00");
  });

  it("follows a 12-hour profile setting even in French", async () => {
    const card = await mount(makeHass(makeState(), { timeFormat: "12" }));
    expect(text(card)).toContain("1:00 PM");
  });

  it("starts the week on Sunday when the profile or the language says so", async () => {
    for (const opts of [{ firstWeekday: "sunday" }, { lang: "en-US" }]) {
      document.body.innerHTML = "";
      const card = await mount(makeHass(makeState(), opts));
      buttonByText(root(card), opts.lang ? "Edit" : "Modifier").click();
      const el = await form(card);
      const first = el.shadowRoot!.querySelector(".days .choice")!;
      expect(first.getAttribute("aria-label")).toMatch(/^(Dimanche|Sunday), cycle 1$/);
    }
  });

  it("starts the week on Monday in French", async () => {
    const card = await mount(makeHass(makeState()));
    buttonByText(root(card), "Modifier").click();
    const el = await form(card);
    const first = el.shadowRoot!.querySelector(".days .choice")!;
    expect(first.getAttribute("aria-label")).toBe("Lundi, cycle 1");
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
    expect(scope.textContent).toContain("Reçoit la pluie");

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

  it("lets the threshold go down to 0.1 W in 0.1 W steps", async () => {
    const card = await mount(makeHass(makeState()));
    buttonByText(root(card), "Modifier").click();
    const el = await form(card);
    const scope = el.shadowRoot!;
    const label = 'Diminuer Vanne considérée ouverte au-delà de';
    for (let i = 0; i < 12; i++) {
      (scope.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement).click();
      await el.updateComplete;
    }
    expect(scope.textContent).toContain("0,1 W");
    expect((scope.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement).disabled).toBe(true);
    (scope.querySelector('[aria-label="Augmenter Vanne considérée ouverte au-delà de"]') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(scope.textContent).toContain("0,2 W");
  });

  it("explains the heat bonus in plain words", async () => {
    const zone = makeZone({ weather_rules: { ...makeZone().weather_rules, heat_bonus_pct: 30 } });
    const card = await mount(makeHass(makeState({ zones: [zone] })));
    buttonByText(root(card), "Modifier").click();
    const el = await form(card);
    const t = el.shadowRoot!.textContent!.replace(/\s+/g, " ");
    expect(t).toContain("Arroser plus les jours chauds");
    expect(t).toContain("+30 %");
    expect(t).toContain("Jour chaud à partir de");
    expect(t).toContain("Si la journée doit atteindre 30 °C ou plus, la durée est allongée de 30 %.");
    // 60 % fills 60 % of the bar
    const bar = el.shadowRoot!.querySelector(".meter > div") as HTMLElement;
    expect(bar.style.width).toBe("60%");
  });

  it("a zone sheltered from rain keeps the heat bonus settings", async () => {
    const hass = makeHass(makeState());
    const card = await mount(hass);
    buttonByText(root(card), "Modifier").click();
    const el = await form(card);
    const scope = el.shadowRoot!;
    // No duplicate rain choice in the settings screen: one switch in "Météo"
    expect(scope.querySelector(".choice-grid")).toBeNull();
    const rainSwitch = scope.querySelector('[aria-label="Reçoit la pluie"]') as HTMLButtonElement;
    expect(rainSwitch.getAttribute("aria-checked")).toBe("true");
    expect(scope.textContent).toContain("Sauter le cycle si la pluie prévue atteint");
    rainSwitch.click();
    await el.updateComplete;
    expect(scope.textContent).not.toContain("Sauter le cycle si la pluie prévue atteint");
    expect(scope.textContent).toContain("Arroser plus les jours chauds");
    buttonByText(scope, "Enregistrer").click();
    await vi.waitFor(() => expect(hass.callWS).toHaveBeenCalled());
    expect(hass.callWS.mock.calls[0][0].zone.receives_rain).toBe(false);
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
    buttonByText(scope, "À l'abri de la pluie").click();
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
      receives_rain: false,
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

describe("general settings", () => {
  async function openSettings(hass: FakeHass) {
    const card = await mount(hass);
    (root(card).querySelector('[aria-label="Réglages généraux"]') as HTMLButtonElement).click();
    await card.updateComplete;
    const el = root(card).querySelector("hydraxoo-settings-form") as any;
    await el.updateComplete;
    return { card, el, scope: el.shadowRoot as ShadowRoot };
  }

  it("shows weather, order, pause and phones by name", async () => {
    const { scope } = await openSettings(makeHass(makeState()));
    const t = scope.textContent!.replace(/\s+/g, " ");
    expect(t).toContain("Météo");
    expect(t).toContain("Une zone à la fois");
    expect(t).toContain("Mettre en pause pendant");
    expect(t).toContain("iPhone de Phil");
    expect(t).toContain("iPad de Philippe");
    const boxes = [...scope.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
    expect(boxes.map((b) => b.checked)).toEqual([true, false]);
  });

  it("saves the changes", async () => {
    const hass = makeHass(makeState());
    const { scope, el } = await openSettings(hass);
    buttonByText(scope, "Zones en parallèle").click();
    (scope.querySelectorAll('input[type="checkbox"]')[1] as HTMLInputElement).dispatchEvent(new Event("change"));
    await el.updateComplete;
    buttonByText(scope, "Enregistrer").click();
    await vi.waitFor(() => expect(hass.callWS).toHaveBeenCalled());
    expect(hass.callWS.mock.calls[0][0]).toEqual({
      type: "hydraxoo/settings/save",
      weather_entity: "weather.maison",
      rain_sensor: null,
      sequential: false,
      notify_services: ["mobile_app_iphone_de_phil", "mobile_app_ipad_de_philippe"],
    });
  });

  it("sends a test notification to the checked phones", async () => {
    const hass = makeHass(makeState());
    hass.callWS.mockResolvedValueOnce({ sent: ["mobile_app_iphone_de_phil"], failed: [] });
    const { scope, el } = await openSettings(hass);
    buttonByText(scope, "Envoyer une notification de test").click();
    await vi.waitFor(() =>
      expect(hass.callWS).toHaveBeenCalledWith({
        type: "hydraxoo/notify/test",
        services: ["mobile_app_iphone_de_phil"],
      }),
    );
    await el.updateComplete;
    await vi.waitFor(() => expect(scope.textContent).toContain("Notification de test envoyée."));
  });

  it("pauses for 3 days at once", async () => {
    const hass = makeHass(makeState());
    const { scope } = await openSettings(hass);
    buttonByText(scope, "3 jours").click();
    expect(hass.callWS).toHaveBeenCalledWith({ type: "hydraxoo/pause", days: 3 });
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
