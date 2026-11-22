// Screens 2 and 3: zone settings (edit) and zone creation (new).
import { LitElement, html, nothing, type TemplateResult } from "lit";
import { dayNames, language, translator, type Translate } from "./i18n";
import { weekOrder } from "./locale";
import { daysSummary } from "./schedule";
import { styles } from "./styles";
import {
  DEFAULT_SAFETY,
  DEFAULT_WEATHER,
  ZONE_ICONS,
  type Cycle,
  type Hass,
  type HydraxooState,
  type Zone,
  type ZoneConfig,
} from "./types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function emptyZone(): ZoneConfig {
  return {
    name: "",
    icon: ZONE_ICONS[0].icon,
    enabled: true,
    switch_entity: "",
    power_entity: null,
    max_runtime_min: 30,
    receives_rain: true,
    safety: { ...DEFAULT_SAFETY },
    weather_rules: { ...DEFAULT_WEATHER },
    cycles: [],
  };
}

interface StepperOptions {
  min: number;
  max: number;
  step?: number;
  /** Smaller step used below `fineBelow` (e.g. 0.1 W under 1 W). */
  fine?: number;
  fineBelow?: number;
  /** Show "+" before positive values (bonus). */
  signed?: boolean;
  unit: string;
  what: string; // for the screen reader labels
}

export class HydraxooZoneForm extends LitElement {
  static properties = {
    hass: { attribute: false },
    zone: { attribute: false },
    state: { attribute: false },
    _draft: { state: true },
    _error: { state: true },
    _saving: { state: true },
  };

  hass!: Hass;
  zone: Zone | null = null; // null = creating a new zone
  state: HydraxooState | null = null;
  _draft: ZoneConfig = emptyZone();
  _error = "";
  _saving = false;
  private _loadedFor: string | null | undefined = undefined;

  static styles = styles;

  willUpdate(): void {
    const id = this.zone?.id ?? null;
    if (id !== this._loadedFor) {
      this._loadedFor = id;
      this._draft = this.zone ? clone(this._configOf(this.zone)) : emptyZone();
      this._error = "";
    }
  }

  private _configOf(zone: Zone): ZoneConfig {
    const {
      id, name, icon, enabled, switch_entity, power_entity, max_runtime_min,
      receives_rain, safety, weather_rules, cycles,
    } = zone;
    return {
      id, name, icon, enabled, switch_entity, power_entity, max_runtime_min,
      receives_rain, safety, weather_rules, cycles,
    };
  }

  private get _t(): Translate {
    return translator(this.hass);
  }

  private _set(patch: Partial<ZoneConfig>): void {
    this._draft = { ...this._draft, ...patch };
  }

  private _setCycle(index: number, patch: Partial<Cycle>): void {
    const cycles = this._draft.cycles.map((c, i) => (i === index ? { ...c, ...patch } : c));
    this._set({ cycles });
  }

  // ------------------------------------------------------------- widgets

  private _stepper(value: number, opts: StepperOptions, onChange: (v: number) => void) {
    const t = this._t;
    const step = opts.step ?? 1;
    const down = opts.fine && value <= (opts.fineBelow ?? 0) ? opts.fine : step;
    const up = opts.fine && value < (opts.fineBelow ?? 0) ? opts.fine : step;
    const round = (v: number) => Math.round(v * 10) / 10;
    const set = (v: number) => onChange(round(Math.min(opts.max, Math.max(opts.min, v))));
    return html`<span class="stepper">
      <button
        type="button"
        aria-label=${t("editor.decrease", { what: opts.what })}
        ?disabled=${value <= opts.min}
        @click=${() => set(value - down)}
      >−</button>
      <span class="value" aria-live="polite"
        >${opts.signed && value > 0 ? "+" : ""}${value.toLocaleString(language(this.hass))} ${opts.unit}</span
      >
      <button
        type="button"
        aria-label=${t("editor.increase", { what: opts.what })}
        ?disabled=${value >= opts.max}
        @click=${() => set(value + up)}
      >+</button>
    </span>`;
  }

  private _switch(checked: boolean, label: string, onChange: (v: boolean) => void) {
    return html`<button
      type="button"
      class="switch"
      role="switch"
      aria-checked=${checked ? "true" : "false"}
      aria-label=${label}
      @click=${() => onChange(!checked)}
    ></button>`;
  }

  /** Home Assistant's entity picker when available, a plain list otherwise. */
  private _entityPicker(
    value: string | null,
    filter: { domain: string; device_class?: string },
    label: string,
    placeholder: string,
    onChange: (v: string | null) => void,
  ) {
    if (customElements.get("ha-selector")) {
      return html`<ha-selector
        .hass=${this.hass}
        .selector=${{ entity: { filter } }}
        .value=${value ?? ""}
        .label=${label}
        @value-changed=${(e: CustomEvent) => onChange(e.detail.value || null)}
      ></ha-selector>`;
    }
    const options = Object.values(this.hass.states)
      .filter(
        (s) =>
          s.entity_id.startsWith(`${filter.domain}.`) &&
          (!filter.device_class || s.attributes.device_class === filter.device_class),
      )
      .sort((a, b) => a.entity_id.localeCompare(b.entity_id));
    return html`<label class="field">
      ${label}
      <select @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value || null)}>
        <option value="" ?selected=${!value}>${placeholder}</option>
        ${options.map(
          (s) => html`<option value=${s.entity_id} ?selected=${s.entity_id === value}>
            ${s.attributes.friendly_name ?? s.entity_id} (${s.entity_id})
          </option>`,
        )}
      </select>
    </label>`;
  }

  // -------------------------------------------------------------- sections

  private _general(creating: boolean) {
    const t = this._t;
    const d = this._draft;
    return html`<section class="tile" aria-labelledby="hx-general">
      <h3 id="hx-general">${t("editor.general")}</h3>
      <label class="field">
        ${t("editor.name")}
        <input
          type="text"
          .value=${d.name}
          placeholder=${t("editor.name_placeholder")}
          @input=${(e: Event) => this._set({ name: (e.target as HTMLInputElement).value })}
        />
      </label>
      <div class="stack" role="group" aria-label=${t("editor.icon")}>
        <span class="small strong">${t("editor.icon")}</span>
        <div class="icon-grid">
          ${ZONE_ICONS.map(
            (i) => html`<button
              type="button"
              class="choice"
              aria-pressed=${d.icon === i.icon ? "true" : "false"}
              aria-label=${t(`editor.icons.${i.key}`)}
              @click=${() => this._set({ icon: i.icon })}
            ><ha-icon .icon=${i.icon}></ha-icon></button>`,
          )}
        </div>
      </div>
      ${creating
        ? html`<div class="stack" role="group" aria-label=${t("editor.rain_choice")}>
            <span class="small strong">${t("editor.rain_choice")}</span>
            <div class="choice-grid">
              ${([true, false] as const).map(
                (rain) => html`<button
                  type="button"
                  class="choice"
                  aria-pressed=${d.receives_rain === rain ? "true" : "false"}
                  @click=${() => this._set({ receives_rain: rain })}
                >
                  <span class="strong">${t(rain ? "editor.receives_rain" : "editor.no_rain")}</span>
                  <span class="tiny">${t(rain ? "editor.receives_rain_desc" : "editor.no_rain_desc")}</span>
                </button>`,
              )}
            </div>
          </div>`
        : nothing}
    </section>`;
  }

  private _hardware(full: boolean) {
    const t = this._t;
    const d = this._draft;
    const switchState = d.switch_entity ? this.hass.states[d.switch_entity] : undefined;
    const online = switchState && switchState.state !== "unavailable";
    const checkOn = d.power_entity !== null;
    const s = d.safety;
    return html`<section class="tile" aria-labelledby="hx-hw">
      <h3 id="hx-hw">${full ? t("editor.valve") : t("editor.hardware")}</h3>
      ${this._entityPicker(
        d.switch_entity || null,
        { domain: "switch" },
        t("editor.switch"),
        t("editor.switch_choose"),
        (v) => this._set({ switch_entity: v ?? "" }),
      )}
      ${d.switch_entity
        ? html`<span class="chip ${online ? "success" : "error"}"
            >${online ? t("editor.online") : t("editor.offline")}</span
          >`
        : nothing}
      ${full
        ? html`<div class="row">
            <span class="grow strong">${t("editor.check")}</span>
            ${this._switch(checkOn, t("editor.check"), (v) =>
              this._set({ power_entity: v ? (d.power_entity ?? "") : null }),
            )}
          </div>`
        : nothing}
      ${!full || checkOn
        ? this._entityPicker(
            d.power_entity || null,
            { domain: "sensor", device_class: "power" },
            t("editor.power"),
            t("editor.power_choose"),
            (v) => this._set({ power_entity: v ?? (full ? "" : null) }),
          )
        : nothing}
      <span class="tiny">${t("editor.power_hint")}</span>
      ${full && checkOn
        ? html`<div>
            ${this._setting(t("editor.threshold"), t("editor.threshold_hint"),
              this._stepper(s.threshold_w, { min: 0.1, max: 100, step: 0.5, fine: 0.1, fineBelow: 1, unit: "W", what: t("editor.threshold") },
                (v) => this._set({ safety: { ...s, threshold_w: v } })))}
            ${this._setting(t("editor.delay"), t("editor.delay_hint"),
              this._stepper(s.check_delay_s, { min: 1, max: 300, unit: "s", what: t("editor.delay") },
                (v) => this._set({ safety: { ...s, check_delay_s: v } })))}
            ${this._setting(t("editor.pulse"), t("editor.pulse_hint"),
              this._stepper(s.retry_pulse_s, { min: 1, max: 60, unit: "s", what: t("editor.pulse") },
                (v) => this._set({ safety: { ...s, retry_pulse_s: v } })))}
            ${this._setting(t("editor.attempts"), t("editor.attempts_hint"),
              this._stepper(s.max_attempts, { min: 1, max: 10, unit: "", what: t("editor.attempts") },
                (v) => this._set({ safety: { ...s, max_attempts: v } })))}
          </div>`
        : nothing}
      ${full
        ? this._setting(t("editor.cutoff"), t("editor.cutoff_hint"),
            this._stepper(d.max_runtime_min, { min: 1, max: 240, unit: "min", what: t("editor.cutoff") },
              (v) => this._set({ max_runtime_min: v })))
        : nothing}
    </section>`;
  }

  private _setting(label: string, hint: string, control: TemplateResult) {
    return html`<div class="setting">
      <span class="stack"><span class="strong">${label}</span><span class="tiny">${hint}</span></span>
      ${control}
    </div>`;
  }

  private _cycles() {
    const t = this._t;
    const days = dayNames(this.hass);
    const cycles = this._draft.cycles;
    return html`<section class="tile" aria-labelledby="hx-cycles">
      <div class="row">
        <h2 id="hx-cycles" class="grow">${t("editor.cycles")}</h2>
      </div>
      ${cycles.length === 0 ? html`<span class="small">${t("editor.no_cycle")}</span>` : nothing}
      ${cycles.map((c, i) => {
        const n = i + 1;
        const summary = daysSummary(c.weekdays);
        return html`<div class="cycle-card ${c.enabled ? "" : "off"}">
          <div class="row">
            ${this._switch(c.enabled, t("editor.enable_cycle", { n }), (v) =>
              this._setCycle(i, { enabled: v }),
            )}
            <span class="stack grow">
              <span class="strong">${t("editor.cycle", { n })}</span>
              <span class="tiny">${t(`editor.${summary.key}`, { n: summary.n ?? 0 })}</span>
            </span>
            <button
              type="button"
              class="icon-button"
              aria-label=${t("editor.delete_cycle", { n })}
              @click=${() => this._set({ cycles: cycles.filter((_, j) => j !== i) })}
            ><ha-icon icon="mdi:delete-outline"></ha-icon></button>
          </div>
          <div class="row">
            <input
              type="time"
              aria-label=${t("editor.start_time", { n })}
              .value=${c.start_time}
              @change=${(e: Event) =>
                this._setCycle(i, { start_time: (e.target as HTMLInputElement).value || c.start_time })}
            />
            <span class="grow"></span>
            ${this._stepper(c.duration_min, {
              min: 1, max: this._draft.max_runtime_min, unit: "min",
              what: t("editor.duration_of", { n }),
            }, (v) => this._setCycle(i, { duration_min: v }))}
          </div>
          <div class="days">
            ${weekOrder(this.hass).map((day) => {
              const letter = days.short[day];
              const on = c.weekdays.includes(day);
              return html`<button
                type="button"
                class="choice"
                aria-pressed=${on ? "true" : "false"}
                aria-label=${t("editor.day_label", { day: days.long[day], n })}
                @click=${() => this._toggleDay(i, day)}
              >${letter}</button>`;
            })}
          </div>
        </div>`;
      })}
      <button type="button" class="btn ghost-dashed" @click=${this._addCycle}>
        <ha-icon icon="mdi:plus"></ha-icon>${t("editor.add_cycle")}
      </button>
    </section>`;
  }

  /** Reads the current draft, so quick successive clicks are all kept. */
  private _toggleDay(index: number, day: number): void {
    const current = this._draft.cycles[index].weekdays;
    this._setCycle(index, {
      weekdays: current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort(),
    });
  }

  private _addCycle = (): void => {
    const last = this._draft.cycles.at(-1);
    const cycle: Cycle = {
      enabled: true,
      start_time: last ? last.start_time : "06:00",
      duration_min: Math.min(10, this._draft.max_runtime_min),
      weekdays: [0, 1, 2, 3, 4, 5, 6],
    };
    this._set({ cycles: [...this._draft.cycles, cycle] });
  };

  private _weather() {
    const t = this._t;
    const d = this._draft;
    const rain = d.receives_rain;
    const w = d.weather_rules;
    const settings = this.state?.settings;
    const result = this.zone?.weather;
    return html`<section class="tile" aria-labelledby="hx-weather">
      <span class="stack">
        <h2 id="hx-weather">${t("editor.weather_title")}</h2>
        <span class="tiny">${settings?.weather_entity
          ? t("editor.rain_source", { name: settings.weather_name ?? settings.weather_entity })
          : t("editor.rain_none")}</span>
      </span>
      ${result && settings?.weather_entity
        ? html`<div class="stack">
            <div class="row">
              <span class="grow small">${t("editor.today")}</span>
              <span class="strong">${result.coefficient_pct} %</span>
            </div>
            <div class="meter" role="img" aria-label="${result.coefficient_pct} %">
              <div style="width: ${Math.min(100, result.coefficient_pct)}%"></div>
            </div>
            <span class="tiny">${rain
              ? t("editor.rain_detail", {
                  past: result.past_rain_mm ?? 0,
                  forecast: result.forecast_rain_mm ?? 0,
                })
              : t("editor.no_rain_detail")}</span>
          </div>`
        : nothing}
      <div>
        <div class="setting">
          <span class="stack"
            ><span class="strong">${t("editor.rain")}</span
            ><span class="tiny">${t(rain ? "editor.rain_hint" : "editor.no_rain_desc")}</span></span
          >
          ${this._switch(rain, t("editor.rain"), (v) => this._set({ receives_rain: v }))}
        </div>
        ${rain
          ? html`${this._setting(t("editor.skip"), t("editor.skip_hint"),
              this._stepper(w.skip_mm, { min: 0.5, max: 50, step: 0.5, unit: "mm", what: t("editor.skip") },
                (v) => this._set({ weather_rules: { ...w, skip_mm: v } })))}
            ${this._setting(t("editor.past"), t("editor.past_hint"),
              this._stepper(w.past_window_h, { min: 0, max: 96, step: 6, unit: "h", what: t("editor.past") },
                (v) => this._set({ weather_rules: { ...w, past_window_h: v } })))}`
          : nothing}
        ${this._setting(t("editor.heat"), t("editor.heat_hint"),
          this._stepper(w.heat_bonus_pct, { min: 0, max: 100, step: 5, signed: true, unit: "%", what: t("editor.heat") },
            (v) => this._set({ weather_rules: { ...w, heat_bonus_pct: v } })))}
        ${w.heat_bonus_pct > 0
          ? this._setting(t("editor.heat_threshold"), t("editor.heat_threshold_hint"),
              this._stepper(w.heat_threshold_c, { min: 15, max: 45, step: 1, unit: "°C", what: t("editor.heat_threshold") },
                (v) => this._set({ weather_rules: { ...w, heat_threshold_c: v } })))
          : nothing}
      </div>
      ${w.heat_bonus_pct > 0
        ? html`<span class="tiny">${t("editor.heat_summary", {
            t: w.heat_threshold_c.toLocaleString(language(this.hass)),
            pct: w.heat_bonus_pct,
          })}</span>`
        : nothing}
    </section>`;
  }

  // ---------------------------------------------------------------- saving

  private _validate(): string {
    const t = this._t;
    const d = this._draft;
    if (!d.name.trim()) return t("editor.errors.name");
    if (!d.switch_entity) return t("editor.errors.switch");
    if (d.cycles.some((c) => c.weekdays.length === 0)) return t("editor.errors.no_day");
    if (d.cycles.some((c) => c.duration_min > d.max_runtime_min))
      return t("editor.errors.duration_exceeds_max");
    return "";
  }

  private async _save(): Promise<void> {
    const t = this._t;
    this._error = this._validate();
    if (this._error) return;
    const draft = {
      ...this._draft,
      name: this._draft.name.trim(),
      power_entity: this._draft.power_entity || null,
    };
    this._saving = true;
    try {
      const result = await this.hass.callWS<{ id: string }>({ type: "hydraxoo/zone/save", zone: draft });
      this.dispatchEvent(
        new CustomEvent("saved", { detail: { id: result.id, created: !this.zone }, bubbles: true, composed: true }),
      );
    } catch (err: any) {
      const code = err?.code;
      this._error =
        code === "duration_exceeds_max"
          ? t("editor.errors.duration_exceeds_max")
          : t("editor.errors.generic", { message: err?.message ?? String(err) });
    } finally {
      this._saving = false;
    }
  }

  private async _delete(): Promise<void> {
    if (!this.zone) return;
    if (!window.confirm(this._t("editor.delete_confirm", { zone: this.zone.name }))) return;
    await this.hass.callWS({ type: "hydraxoo/zone/delete", zone_id: this.zone.id });
    this._close();
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  render() {
    const t = this._t;
    const creating = !this.zone;
    return html`<div class="form" style="display:flex;flex-direction:column;gap:14px">
      <div class="header">
        <div class="header-left">
          <button
            type="button"
            class="icon-button"
            aria-label=${creating ? t("editor.cancel") : t("editor.back")}
            @click=${this._close}
          ><ha-icon icon=${creating ? "mdi:close" : "mdi:arrow-left"}></ha-icon></button>
          <div class="stack">
            <h1>${creating ? t("new_zone") : this.zone!.name}</h1>
            ${creating ? nothing : html`<span class="sub">${t("editor.subtitle")}</span>`}
          </div>
        </div>
      </div>
      ${this._general(creating)}
      ${this._hardware(!creating)}
      ${creating ? nothing : this._cycles()}
      ${creating ? nothing : this._weather()}
      ${this._error ? html`<div class="error-text" role="alert">${this._error}</div>` : nothing}
      <button type="button" class="btn primary" ?disabled=${this._saving} @click=${this._save}>
        ${this._saving ? t("editor.saving") : creating ? t("editor.create") : t("editor.save")}
      </button>
      ${creating
        ? html`<span class="tiny" style="text-align:center">${t("editor.create_hint")}</span>`
        : html`<button type="button" class="btn danger" @click=${this._delete}>${t("editor.delete")}</button>`}
    </div>`;
  }
}

if (!customElements.get("hydraxoo-zone-form")) {
  customElements.define("hydraxoo-zone-form", HydraxooZoneForm);
}
