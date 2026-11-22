// Screen 4: general settings (weather, watering order, pause, alerts).
import { LitElement, html, nothing } from "lit";
import { translator, type Translate } from "./i18n";
import { fullLanguage, uses12h } from "./locale";
import { formatDate, formatTime } from "./schedule";
import { styles } from "./styles";
import type { Hass, HydraxooState } from "./types";

interface Draft {
  weather_entity: string | null;
  rain_sensor: string | null;
  sequential: boolean;
  notify_services: string[];
  external_open: "close" | "allow";
}

export class HydraxooSettingsForm extends LitElement {
  static properties = {
    hass: { attribute: false },
    state: { attribute: false },
    _draft: { state: true },
    _message: { state: true },
    _error: { state: true },
    _saving: { state: true },
  };

  static styles = styles;

  hass!: Hass;
  state: HydraxooState | null = null;
  _draft: Draft | null = null;
  _message = "";
  _error = "";
  _saving = false;

  willUpdate(): void {
    if (!this._draft && this.state) {
      const s = this.state.settings;
      this._draft = {
        weather_entity: s.weather_entity,
        rain_sensor: s.rain_sensor,
        sequential: s.sequential,
        notify_services: [...s.notify_services],
        external_open: s.external_open ?? "close",
      };
    }
  }

  private get _t(): Translate {
    return translator(this.hass);
  }

  private _set(patch: Partial<Draft>): void {
    this._draft = { ...this._draft!, ...patch };
    this._message = "";
  }

  /** Home Assistant's entity picker when available, a plain list otherwise. */
  private _picker(
    value: string | null,
    filter: { domain: string; device_class?: string },
    label: string,
    none: string,
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
        <option value="" ?selected=${!value}>${none}</option>
        ${options.map(
          (s) => html`<option value=${s.entity_id} ?selected=${s.entity_id === value}>
            ${s.attributes.friendly_name ?? s.entity_id}
          </option>`,
        )}
      </select>
    </label>`;
  }

  private _weather() {
    const t = this._t;
    const d = this._draft!;
    return html`<section class="tile" aria-labelledby="hx-s-weather">
      <h2 id="hx-s-weather">${t("settings_screen.weather")}</h2>
      ${this._picker(d.weather_entity, { domain: "weather" }, t("settings_screen.weather_entity"),
        t("settings_screen.none"), (v) => this._set({ weather_entity: v }))}
      <span class="tiny">${t("settings_screen.weather_hint")}</span>
      ${this._picker(d.rain_sensor, { domain: "sensor", device_class: "precipitation" },
        t("settings_screen.rain_sensor"), t("settings_screen.none"), (v) => this._set({ rain_sensor: v }))}
      <span class="tiny">${t("settings_screen.rain_hint")}</span>
    </section>`;
  }

  private _order() {
    const t = this._t;
    const d = this._draft!;
    return html`<section class="tile" aria-labelledby="hx-s-order">
      <h2 id="hx-s-order">${t("settings_screen.order")}</h2>
      <div class="choice-grid" role="group" aria-labelledby="hx-s-order">
        ${([true, false] as const).map(
          (seq) => html`<button
            type="button"
            class="choice"
            aria-pressed=${d.sequential === seq ? "true" : "false"}
            @click=${() => this._set({ sequential: seq })}
          >
            <span class="strong">${t(seq ? "settings_screen.sequential" : "settings_screen.parallel")}</span>
            <span class="tiny">${t(seq ? "settings_screen.sequential_desc" : "settings_screen.parallel_desc")}</span>
          </button>`,
        )}
      </div>
    </section>`;
  }

  private _pause() {
    const t = this._t;
    const s = this.state!.settings;
    const tz = this.hass.config.time_zone;
    const lang = fullLanguage(this.hass);
    // Pause and resume act at once (like the dashboard), not on Save.
    return html`<section class="tile" aria-labelledby="hx-s-pause">
      <h2 id="hx-s-pause">${t("settings_screen.pause")}</h2>
      ${s.paused
        ? html`<div class="row">
            <span class="stack grow">
              <span class="strong">${t("pause.paused")}</span>
              <span class="small">${s.pause_until
                ? t("pause.until", {
                    date: `${formatDate(s.pause_until, tz, lang)} ${formatTime(s.pause_until, tz, lang, uses12h(this.hass))}`,
                  })
                : t("pause.indefinite")}</span>
            </span>
            <button type="button" class="btn" @click=${() => this._call({ type: "hydraxoo/resume" })}>
              ${t("pause.resume")}
            </button>
          </div>`
        : html`<span class="small">${t("settings_screen.pause_off")}</span>
            <div class="actions">
              ${[1, 3, 7].map(
                (days) => html`<button
                  type="button"
                  class="btn"
                  @click=${() => this._call({ type: "hydraxoo/pause", days })}
                >${t(days === 1 ? "settings_screen.pause_day" : "settings_screen.pause_days", { n: days })}</button>`,
              )}
              <button type="button" class="btn" @click=${() => this._call({ type: "hydraxoo/pause" })}>
                ${t("settings_screen.pause_until_resumed")}
              </button>
            </div>`}
    </section>`;
  }

  private _safety() {
    const t = this._t;
    const d = this._draft!;
    return html`<section class="tile" aria-labelledby="hx-s-safety">
      <h2 id="hx-s-safety">${t("settings_screen.external")}</h2>
      <div class="choice-grid" role="group" aria-labelledby="hx-s-safety">
        ${(["close", "allow"] as const).map(
          (mode) => html`<button
            type="button"
            class="choice"
            aria-pressed=${d.external_open === mode ? "true" : "false"}
            @click=${() => this._set({ external_open: mode })}
          >
            <span class="strong">${t(`settings_screen.external_${mode}`)}</span>
            <span class="tiny">${t(`settings_screen.external_${mode}_desc`)}</span>
          </button>`,
        )}
      </div>
    </section>`;
  }

  private _alerts() {
    const t = this._t;
    const d = this._draft!;
    const options = this.state!.settings.notify_options;
    return html`<section class="tile" aria-labelledby="hx-s-alerts">
      <h2 id="hx-s-alerts">${t("settings_screen.alerts")}</h2>
      <span class="tiny">${t("settings_screen.alerts_hint")}</span>
      ${options.length
        ? html`<div class="stack" role="group" aria-labelledby="hx-s-alerts">
            ${options.map((o) => {
              const on = d.notify_services.includes(o.value);
              return html`<label class="check-row">
                <input
                  type="checkbox"
                  .checked=${on}
                  @change=${() =>
                    this._set({
                      notify_services: on
                        ? d.notify_services.filter((s) => s !== o.value)
                        : [...d.notify_services, o.value],
                    })}
                />
                <span>${o.label}</span>
              </label>`;
            })}
          </div>`
        : html`<span class="small">${t("settings_screen.no_phone")}</span>`}
      <button
        type="button"
        class="btn"
        ?disabled=${!d.notify_services.length}
        @click=${this._test}
      ><ha-icon icon="mdi:bell-ring-outline"></ha-icon>${t("settings_screen.test")}</button>
    </section>`;
  }

  private async _call(message: Record<string, unknown>): Promise<unknown> {
    try {
      this._error = "";
      return await this.hass.callWS(message);
    } catch (err: any) {
      this._error = t_error(this._t, err);
      return undefined;
    }
  }

  private _test = async (): Promise<void> => {
    const t = this._t;
    const result = (await this._call({
      type: "hydraxoo/notify/test",
      services: this._draft!.notify_services,
    })) as { sent: string[]; failed: string[] } | undefined;
    if (!result) return;
    const label = (v: string) =>
      this.state!.settings.notify_options.find((o) => o.value === v)?.label ?? v;
    this._message = result.failed.length
      ? t("settings_screen.test_failed", { names: result.failed.map(label).join(", ") })
      : t("settings_screen.test_sent");
  };

  private async _save(): Promise<void> {
    this._saving = true;
    const ok = await this._call({ type: "hydraxoo/settings/save", ...this._draft! });
    this._saving = false;
    if (ok !== undefined || !this._error) {
      this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
    }
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  private _advanced(): void {
    history.pushState(null, "", "/config/integrations/integration/hydraxoo");
    window.dispatchEvent(new CustomEvent("location-changed"));
  }

  render() {
    if (!this._draft || !this.state) return nothing;
    const t = this._t;
    return html`<div style="display:flex;flex-direction:column;gap:14px">
      <div class="header">
        <div class="header-left">
          <button type="button" class="icon-button" aria-label=${t("editor.back")} @click=${this._close}>
            <ha-icon icon="mdi:arrow-left"></ha-icon>
          </button>
          <h1>${t("settings")}</h1>
        </div>
      </div>
      ${this._weather()} ${this._order()} ${this._pause()} ${this._safety()} ${this._alerts()}
      ${this._message ? html`<div class="small" role="status">${this._message}</div>` : nothing}
      ${this._error ? html`<div class="error-text" role="alert">${this._error}</div>` : nothing}
      <button type="button" class="btn primary" ?disabled=${this._saving} @click=${this._save}>
        ${this._saving ? t("editor.saving") : t("editor.save")}
      </button>
      <button type="button" class="btn" @click=${this._advanced}>${t("settings_screen.advanced")}</button>
    </div>`;
  }
}

function t_error(t: Translate, err: any): string {
  return t("editor.errors.generic", { message: err?.message ?? String(err) });
}

if (!customElements.get("hydraxoo-settings-form")) {
  customElements.define("hydraxoo-settings-form", HydraxooSettingsForm);
}
