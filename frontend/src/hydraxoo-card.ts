// hydraXoo Lovelace card: dashboard, zone settings and zone creation.
import { LitElement, html, nothing, type TemplateResult } from "lit";
import "./editor";
import { dayNames, plural, translator, type Translate } from "./i18n";
import {
  formatClock,
  formatDate,
  formatHHMM,
  formatHourMark,
  formatTime,
  todayCycles,
  totalToday,
  zonedParts,
  type TodayCycle,
  type ZonedNow,
} from "./schedule";
import { fullLanguage, uses12h } from "./locale";
import { styles } from "./styles";
import type { CardConfig, Hass, HydraxooState, Zone } from "./types";
import "./settings-form";
import "./zone-form";

type View =
  | { name: "dashboard" }
  | { name: "zone"; id: string }
  | { name: "new" }
  | { name: "settings" };

const VERSION = "0.1.2";

export class HydraxooCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _state: { state: true },
    _view: { state: true },
    _error: { state: true },
    _runFor: { state: true },
    _runMinutes: { state: true },
  };

  static styles = styles;

  hass!: Hass;
  _config: CardConfig = { type: "custom:hydraxoo-card" };
  _state: HydraxooState | null = null;
  _view: View = { name: "dashboard" };
  _error = "";
  _runFor: string | null = null; // zone whose "water now" duration picker is open
  _runMinutes = 10;
  private _unsub?: () => Promise<void> | void;
  private _subscribing = false;
  private _ticker?: number;

  // ------------------------------------------------------- Lovelace API

  static getConfigElement(): HTMLElement {
    return document.createElement("hydraxoo-card-editor");
  }

  static getStubConfig(): CardConfig {
    return { type: "custom:hydraxoo-card" };
  }

  setConfig(config: CardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    this._config = { ...config };
  }

  getCardSize(): number {
    return this._config.compact ? 4 : 10;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  // ------------------------------------------------------ subscription

  connectedCallback(): void {
    super.connectedCallback();
    this._ticker = window.setInterval(() => {
      if (this._state?.zones.some((z) => z.running)) this.requestUpdate();
    }, 1000);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._ticker);
    this._unsubscribe();
  }

  updated(): void {
    if (this.hass && !this._unsub && !this._subscribing) this._subscribe();
  }

  private async _subscribe(): Promise<void> {
    this._subscribing = true;
    try {
      this._unsub = await this.hass.connection.subscribeMessage<HydraxooState | { reload: true }>(
        (message) => {
          if ("reload" in message) {
            // The integration reloaded: subscribe again shortly.
            this._unsubscribe();
            window.setTimeout(() => this.requestUpdate(), 1500);
            return;
          }
          this._state = message;
          this._error = "";
        },
        { type: "hydraxoo/subscribe" },
      );
    } catch (err: any) {
      this._error = err?.code === "not_loaded" || err?.code === "unknown_command" ? "not_loaded" : String(err?.message ?? err);
      window.setTimeout(() => this.requestUpdate(), 10000);
    } finally {
      this._subscribing = false;
    }
  }

  private _unsubscribe(): void {
    const unsub = this._unsub;
    this._unsub = undefined;
    try {
      void unsub?.();
    } catch {
      // connection already closed
    }
  }

  private _call(type: string, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.hass.callWS({ type: `hydraxoo/${type}`, ...data }).catch((err) => {
      this._error = String(err?.message ?? err);
    });
  }

  // ----------------------------------------------------------- helpers

  private get _t(): Translate {
    return translator(this.hass);
  }

  private get _tz(): string {
    return this.hass.config.time_zone;
  }

  /** Full language tag for formats (e.g. "en-US"). */
  private get _lang(): string {
    return fullLanguage(this.hass);
  }

  private get _h12(): boolean {
    return uses12h(this.hass);
  }

  private _time(iso: string | Date): string {
    return formatTime(iso, this._tz, this._lang, this._h12);
  }

  private get _isAdmin(): boolean {
    return this.hass.user?.is_admin ?? false;
  }

  private _zones(): Zone[] {
    const zones = this._state?.zones ?? [];
    const wanted = this._config.zones;
    return wanted?.length ? zones.filter((z) => wanted.includes(z.id)) : zones;
  }

  private _openSettings(): void {
    this._view = { name: "settings" };
  }

  // ------------------------------------------------------------ render

  render() {
    if (!this.hass) return nothing;
    const t = this._t;
    if (this._error === "not_loaded") {
      return html`<ha-card><div class="small">${t("not_loaded")}</div></ha-card>`;
    }
    if (!this._state) {
      return html`<ha-card><div class="small">${t("loading")}</div></ha-card>`;
    }
    const view = this._view;
    if (view.name === "zone") {
      const zone = this._state.zones.find((z) => z.id === view.id);
      if (zone) {
        return html`<ha-card>
          <hydraxoo-zone-form
            .hass=${this.hass}
            .zone=${zone}
            .state=${this._state}
            @close=${() => (this._view = { name: "dashboard" })}
            @saved=${() => (this._view = { name: "dashboard" })}
          ></hydraxoo-zone-form>
        </ha-card>`;
      }
    }
    if (view.name === "settings") {
      return html`<ha-card>
        <hydraxoo-settings-form
          .hass=${this.hass}
          .state=${this._state}
          @close=${() => (this._view = { name: "dashboard" })}
        ></hydraxoo-settings-form>
      </ha-card>`;
    }
    if (view.name === "new") {
      return html`<ha-card>
        <hydraxoo-zone-form
          .hass=${this.hass}
          .zone=${null}
          .state=${this._state}
          @close=${() => (this._view = { name: "dashboard" })}
          @saved=${(e: CustomEvent) => (this._view = { name: "zone", id: e.detail.id })}
        ></hydraxoo-zone-form>
      </ha-card>`;
    }
    return this._dashboard();
  }

  private _dashboard() {
    const t = this._t;
    const state = this._state!;
    const now = new Date();
    const zoned = zonedParts(now, this._tz);
    const zones = this._zones();
    const compact = !!this._config.compact;
    const perZone = new Map(
      zones.map((z) => [z.id, todayCycles(z, zoned, state.history, this._tz)] as const),
    );
    return html`<ha-card class=${compact ? "compact" : ""}>
      <div class="header">
        <div class="stack">
          <h1>${this._config.title || t("title")}</h1>
          <span class="sub">${formatDate(now, this._tz, this._lang)} · ${this._time(now)}</span>
        </div>
        ${this._isAdmin
          ? html`<button type="button" class="icon-button" aria-label=${t("settings")} @click=${this._openSettings}>
              <ha-icon icon="mdi:cog-outline"></ha-icon>
            </button>`
          : nothing}
      </div>
      ${this._pauseBanner()}
      ${this._weatherBanner()}
      ${this._faultBanners(zones)}
      ${this._safetyBanner()}
      ${compact ? nothing : this._timeline(zones, perZone, zoned)}
      ${zones.map((z) => this._zoneCard(z, perZone.get(z.id) ?? []))}
      ${this._isAdmin
        ? html`<button type="button" class="btn ghost-dashed" @click=${() => (this._view = { name: "new" })}>
            <ha-icon icon="mdi:plus"></ha-icon>${t("new_zone")}
          </button>`
        : nothing}
      ${this._error && this._error !== "not_loaded"
        ? html`<div class="error-text" role="alert">${this._error}</div>`
        : nothing}
    </ha-card>`;
  }

  private _pauseBanner() {
    const t = this._t;
    const s = this._state!.settings;
    if (!s.paused) return nothing;
    return html`<div class="tile">
      <div class="row">
        <div class="badge-icon warning"><ha-icon icon="mdi:pause"></ha-icon></div>
        <span class="stack grow">
          <span class="strong">${t("pause.paused")}</span>
          <span class="small">${s.pause_until
            ? t("pause.until", { date: `${formatDate(s.pause_until, this._tz, this._lang)} ${this._time(s.pause_until)}` })
            : t("pause.indefinite")}</span>
        </span>
        <button type="button" class="btn" @click=${() => this._call("resume")}>${t("pause.resume")}</button>
      </div>
    </div>`;
  }

  private _weatherBanner() {
    const t = this._t;
    const state = this._state!;
    if (!state.settings.weather_entity) return nothing;
    const w = state.weather;
    if (w.warnings.includes("weather_unavailable")) {
      return html`<div class="tile"><div class="row">
        <div class="badge-icon warning"><ha-icon icon="mdi:weather-cloudy-alert"></ha-icon></div>
        <span class="stack grow">
          <span class="strong">${t("weather.unavailable")}</span>
          <span class="small">${t("weather.unavailable_detail")}</span>
        </span>
        <span class="big-number">100 %</span>
      </div></div>`;
    }
    const past = w.past_rain_mm ?? 0;
    const forecast = w.forecast_rain_mm ?? 0;
    const title = w.past_rain_mm
      ? t("weather.rain", { past, forecast })
      : t("weather.rain_forecast", { forecast });
    const detail = w.warnings.includes("no_precipitation_data")
      ? t("weather.no_data")
      : w.skip
        ? t("weather.skipped")
        : w.heat_bonus_pct
          ? t("weather.heat", { bonus: w.heat_bonus_pct, temp: w.temperature_c ?? "" })
          : t("weather.adjusted");
    return html`<div class="tile"><div class="row">
      <div class="badge-icon warning"><ha-icon icon=${forecast || past ? "mdi:weather-rainy" : "mdi:weather-partly-cloudy"}></ha-icon></div>
      <span class="stack grow">
        <span class="strong">${title}</span>
        <span class="small">${detail}</span>
      </span>
      <span class="stack">
        <span class="big-number">${w.coefficient_pct} %</span>
        <span class="tiny" style="text-align:right">${t("weather.of_durations")}</span>
      </span>
    </div></div>`;
  }

  private _faultBanners(zones: Zone[]) {
    const t = this._t;
    return zones
      .filter((z) => z.fault)
      .map(
        (z) => html`<div class="tile" role="alert"><div class="row">
          <div class="badge-icon error"><ha-icon icon="mdi:valve-closed"></ha-icon></div>
          <span class="stack grow">
            <span class="strong">${t("safety.failed", { zone: z.name })}</span>
            <span class="small">${t("safety.failed_detail", {
              power: z.last_check?.power_w ?? "?",
              n: z.last_check?.retries ?? z.safety.max_attempts,
            })}</span>
          </span>
          <button type="button" class="btn" @click=${() => this._call("zone/acknowledge", { zone_id: z.id })}>
            ${t("safety.acknowledge")}
          </button>
        </div></div>`,
      );
  }

  private _safetyBanner() {
    const t = this._t;
    const last = this._state!.last_check;
    if (!last || last.result === "failed") return nothing;
    const zone = this._state!.zones.find((z) => z.id === last.zone_id);
    const time = this._time(last.time);
    let title: string;
    let detail: string;
    let tone = "success";
    if (last.result === "sensor_unavailable") {
      title = t("safety.unavailable", { zone: last.zone_name });
      detail = t("safety.unavailable_detail", { time });
      tone = "warning";
    } else if (last.retries > 0) {
      title = t("safety.retried", { zone: last.zone_name, time });
      detail = plural(t, "safety.retried_detail", last.retries, { s: zone?.safety.retry_pulse_s ?? 5 });
      tone = "warning";
    } else {
      title = t("safety.confirmed", { zone: last.zone_name, time });
      detail = t("safety.confirmed_detail");
    }
    return html`<div class="tile"><div class="row">
      <div class="badge-icon ${tone}"><ha-icon icon="mdi:shield-check-outline"></ha-icon></div>
      <span class="stack grow">
        <span class="strong">${title}</span>
        <span class="tiny">${detail}</span>
      </span>
    </div></div>`;
  }

  private _timeline(zones: Zone[], perZone: Map<string, TodayCycle[]>, now: ZonedNow) {
    const t = this._t;
    if (!zones.length) return nothing;
    const total = [...perZone.values()].reduce((sum, c) => sum + totalToday(c), 0);
    const nowPct = (now.minutes / 1440) * 100;
    const kinds = new Set([...perZone.values()].flat().map((c) => c.status.kind));
    return html`<section class="tile" aria-labelledby="hx-today">
      <div class="row">
        <h2 id="hx-today" class="grow">${t("timeline.title")}</h2>
        <span class="small">${t("timeline.total", { min: total })}</span>
      </div>
      <div class="timeline">
        ${zones.map((zone) => {
          const cycles = perZone.get(zone.id) ?? [];
          return html`<span class="label">${zone.name}</span>
            <div class="track" role="img" aria-label=${t("timeline.label", { zone: zone.name, count: cycles.length })}>
              ${cycles.map((c) => {
                const left = (c.start / 1440) * 100;
                const width = (Math.max(c.adjusted, c.base) / 1440) * 100;
                return html`<div
                  class="mark ${c.status.kind}"
                  style="left: ${left}%; width: ${width}%"
                  title="${formatHHMM(c.cycle.start_time, this._lang, this._h12)} · ${c.status.kind === "skipped"
                    ? t(`zone.skip.${c.status.reason}`)
                    : `${c.adjusted} min`}"
                ></div>`;
              })}
              <div class="now" style="left: ${nowPct}%"></div>
            </div>`;
        })}
        <span></span>
        <div class="hours">
          ${[0, 6, 12, 18, 24].map((h) => html`<span>${formatHourMark(h, this._lang, this._h12)}</span>`)}
        </div>
      </div>
      <div class="legend">
        ${kinds.has("running")
          ? html`<span><span class="swatch running"></span>${t("timeline.running")}</span>`
          : nothing}
        <span><span class="swatch done"></span>${t("timeline.done")}</span>
        ${kinds.has("skipped")
          ? html`<span><span class="swatch skipped"></span>${t("timeline.skipped")}</span>`
          : nothing}
        <span><span class="swatch"></span>${t("timeline.upcoming")}</span>
        <span><span class="swatch disabled"></span>${t("timeline.disabled")}</span>
        <span><span class="swatch nowline"></span>${t("timeline.now")}</span>
      </div>
    </section>`;
  }

  private _remaining(zone: Zone): number {
    if (!zone.run) return zone.remaining_s;
    return Math.max(0, (new Date(zone.run.ends).getTime() - Date.now()) / 1000);
  }

  private _chips(zone: Zone) {
    const t = this._t;
    const chips: TemplateResult[] = [];
    if (zone.fault) chips.push(html`<span class="chip error">${t("zone.fault")}</span>`);
    if (zone.running)
      chips.push(html`<span class="chip success"><ha-icon icon="mdi:water"></ha-icon>${t("zone.running", { left: formatClock(this._remaining(zone)) })}</span>`);
    if (zone.queued) chips.push(html`<span class="chip warning">${t("zone.queued")}</span>`);
    if (zone.checking) chips.push(html`<span class="chip warning">${t("zone.checking")}</span>`);
    if (!zone.enabled) chips.push(html`<span class="chip muted">${t("zone.disabled")}</span>`);
    if (zone.next_run && !zone.running) {
      const next = new Date(zone.next_run.time);
      const sameDay = zonedParts(next, this._tz).dateKey === zonedParts(new Date(), this._tz).dateKey;
      const time = this._time(next);
      const min = zone.next_run.adjusted_duration_min;
      const day = dayNames(this.hass).long[zonedParts(next, this._tz).weekday];
      // 0 min means the weather will skip it: say so instead of "0 min".
      const key = `zone.${sameDay ? "next" : "next_day"}${min === 0 ? "_skipped" : ""}`;
      chips.push(html`<span class="chip ${min === 0 ? "muted" : ""}"><ha-icon icon="mdi:clock-outline"></ha-icon>${t(key, { time, min, day })}</span>`);
    } else if (!zone.next_run && zone.enabled && !zone.running) {
      chips.push(html`<span class="chip muted">${t("zone.nothing")}</span>`);
    }
    if (this._state!.settings.weather_entity) {
      const w = zone.weather;
      if (w.skip || w.coefficient_pct === 0) {
        chips.push(html`<span class="chip warning"><ha-icon icon="mdi:weather-rainy"></ha-icon>${t("zone.weather_skip")}</span>`);
      } else if (w.coefficient_pct !== 100) {
        // Shown as the share of the duration actually watered, never as a "−x %".
        chips.push(html`<span class="chip warning">${t("zone.weather", { pct: w.coefficient_pct })}</span>`);
      }
    }
    return chips;
  }

  private _statusLabel(c: TodayCycle) {
    const t = this._t;
    const s = c.status;
    switch (s.kind) {
      case "running":
        return html`<span class="status running">${t("zone.status.running")}</span>`;
      case "done":
        return html`<span class="status"><ha-icon icon="mdi:check"></ha-icon>${t("zone.status.done")}</span>`;
      case "skipped":
        // A cross, like the tick for "done", so "not watered" reads at a glance.
        return html`<span class="status skipped"><ha-icon icon="mdi:close"></ha-icon>${t(`zone.skip.${s.reason}`)}</span>`;
      case "disabled":
        return html`<span class="status">${t("zone.status.disabled")}</span>`;
      case "past":
        return html`<span class="status">—</span>`;
      case "upcoming": {
        let label: string;
        if (s.inMinutes < 60) label = t("zone.status.in_min", { m: s.inMinutes });
        else if (s.startMinutes >= 18 * 60 && s.inMinutes >= 180) label = t("zone.status.tonight");
        else label = t("zone.status.in_h", { h: Math.round(s.inMinutes / 60) });
        return html`<span class="status upcoming">${label}</span>`;
      }
    }
  }

  private _zoneCard(zone: Zone, cycles: TodayCycle[]) {
    const t = this._t;
    const busy = zone.running || zone.queued;
    return html`<section class="tile" aria-labelledby="hx-zone-${zone.id}">
      <div class="row">
        <div class="badge-icon"><ha-icon .icon=${zone.icon}></ha-icon></div>
        <span class="stack grow">
          <span id="hx-zone-${zone.id}" class="strong" style="font-size:17px">${zone.name}</span>
          <span class="small zone-sub"
            >${t(zone.receives_rain ? "zone.rain" : "zone.no_rain")}${zone.weather_rules.heat_bonus_pct > 0
              ? t("zone.heat")
              : ""}</span
          >
        </span>
        <button
          type="button"
          class="switch"
          role="switch"
          aria-checked=${zone.enabled ? "true" : "false"}
          aria-label=${t("zone.enable", { zone: zone.name })}
          @click=${() => this._call("zone/enable", { zone_id: zone.id, enabled: !zone.enabled })}
        ></button>
      </div>
      <div class="chips">${this._chips(zone)}</div>
      <div class="cycles">
        ${cycles.length
          ? cycles.map((c) => {
              const muted = ["done", "past", "disabled", "skipped"].includes(c.status.kind);
              const changed = c.adjusted !== c.base && c.status.kind !== "skipped";
              return html`<div class="cycle-row ${muted ? "muted" : ""}">
                <span class="time">${formatHHMM(c.cycle.start_time, this._lang, this._h12)}</span>
                <span class="dur">
                  ${c.status.kind === "skipped"
                    ? html`<s>${c.base} min</s>`
                    : html`${changed ? html`<s>${c.base} min</s>` : nothing}<b>${changed ? c.adjusted : c.base} min</b>`}
                </span>
                ${this._statusLabel(c)}
              </div>`;
            })
          : html`<div class="cycle-row muted"><span class="small" style="grid-column: 1 / -1">${t("zone.no_cycle_today")}</span></div>`}
      </div>
      ${this._runFor === zone.id ? this._runPicker(zone) : html`<div class="actions">
        ${busy
          ? html`<button type="button" class="btn grow" @click=${() => this._call("zone/stop", { zone_id: zone.id })}>
              <ha-icon icon="mdi:stop"></ha-icon>${t("zone.stop")}
            </button>`
          : html`<button
              type="button"
              class="btn primary grow"
              ?disabled=${zone.fault}
              @click=${() => {
                this._runFor = zone.id;
                this._runMinutes = Math.min(zone.cycles.find((c) => c.enabled)?.duration_min ?? 10, zone.max_runtime_min);
              }}
            ><ha-icon icon="mdi:play"></ha-icon>${t("zone.water_now")}</button>`}
        ${this._isAdmin
          ? html`<button type="button" class="btn" @click=${() => (this._view = { name: "zone", id: zone.id })}>${t("zone.edit")}</button>`
          : nothing}
      </div>`}
    </section>`;
  }

  private _runPicker(zone: Zone) {
    const t = this._t;
    const set = (v: number) => (this._runMinutes = Math.min(zone.max_runtime_min, Math.max(1, v)));
    return html`<div class="row" style="flex-wrap: wrap">
      <span class="strong">${t("zone.duration")}</span>
      <span class="stepper">
        <button type="button" aria-label=${t("editor.decrease", { what: t("zone.duration") })} @click=${() => set(this._runMinutes - 1)}>−</button>
        <span class="value" aria-live="polite">${this._runMinutes} min</span>
        <button type="button" aria-label=${t("editor.increase", { what: t("zone.duration") })} @click=${() => set(this._runMinutes + 1)}>+</button>
      </span>
      <span class="grow"></span>
      <button type="button" class="btn" @click=${() => (this._runFor = null)}>${t("zone.cancel")}</button>
      <button
        type="button"
        class="btn primary"
        @click=${() => {
          this._runFor = null;
          void this._call("zone/run", { zone_id: zone.id, duration: this._runMinutes });
        }}
      >${t("zone.start")}</button>
    </div>`;
  }
}

if (!customElements.get("hydraxoo-card")) {
  customElements.define("hydraxoo-card", HydraxooCard);
}

declare global {
  interface Window {
    customCards?: { type: string; name: string; description: string; preview?: boolean }[];
  }
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((c) => c.type === "hydraxoo-card")) {
  window.customCards.push({
    type: "hydraxoo-card",
    name: "hydraXoo",
    description: "Zone-based irrigation: schedule, weather and valve safety.",
    preview: false,
  });
}

console.info(`%c hydraXoo card %c ${VERSION} `, "background:#1d4ed8;color:#fff", "");
