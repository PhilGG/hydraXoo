// Visual editor of the card: title, compact display, zones shown.
import { LitElement, html, nothing } from "lit";
import { translator } from "./i18n";
import type { CardConfig, Hass, HydraxooState } from "./types";

export class HydraxooCardEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _zones: { state: true },
  };

  hass!: Hass;
  _config: CardConfig = { type: "custom:hydraxoo-card" };
  _zones: { id: string; name: string }[] = [];
  private _loading = false;

  setConfig(config: CardConfig): void {
    this._config = { ...config };
  }

  updated(): void {
    if (this.hass && !this._zones.length && !this._loading) void this._loadZones();
  }

  /** Read the zone list once from the integration. */
  private async _loadZones(): Promise<void> {
    this._loading = true;
    try {
      let unsub: (() => unknown) | undefined;
      await new Promise<void>((resolve, reject) => {
        this.hass.connection
          .subscribeMessage<HydraxooState>(
            (state) => {
              if ("zones" in state) {
                this._zones = state.zones.map((z) => ({ id: z.id, name: z.name }));
                resolve();
              }
            },
            { type: "hydraxoo/subscribe" },
          )
          .then((u) => (unsub = u), reject);
      });
      void unsub?.();
    } catch {
      // integration not loaded: zone list stays empty
    }
  }

  private _schema() {
    return [
      { name: "title", selector: { text: {} } },
      { name: "compact", selector: { boolean: {} } },
      {
        name: "zones",
        selector: {
          select: {
            multiple: true,
            mode: "list",
            options: this._zones.map((z) => ({ value: z.id, label: z.name })),
          },
        },
      },
    ];
  }

  private _changed(ev: CustomEvent): void {
    const config = { ...this._config, ...ev.detail.value };
    for (const key of ["title", "zones"] as const) {
      const value = config[key];
      if (value === "" || (Array.isArray(value) && value.length === 0)) delete config[key];
    }
    if (!config.compact) delete config.compact;
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass) return nothing;
    const t = translator(this.hass);
    return html`<ha-form
      .hass=${this.hass}
      .data=${{ compact: false, zones: [], ...this._config }}
      .schema=${this._schema()}
      .computeLabel=${(s: { name: string }) => t(`card_editor.${s.name}`)}
      @value-changed=${this._changed}
    ></ha-form>`;
  }
}

if (!customElements.get("hydraxoo-card-editor")) {
  customElements.define("hydraxoo-card-editor", HydraxooCardEditor);
}
