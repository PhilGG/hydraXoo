import { css } from "lit";

// Colours come from the Home Assistant theme (light and dark); the values
// after the commas are the mockup's, used only outside Home Assistant.
export const styles = css`
  :host {
    --hx-primary: var(--primary-color, #1d4ed8);
    --hx-on-primary: var(--text-primary-color, #ffffff);
    --hx-text: var(--primary-text-color, #111827);
    --hx-muted: var(--secondary-text-color, #4b5563);
    --hx-divider: var(--divider-color, #e5e7eb);
    --hx-warning: var(--warning-color, #b45309);
    --hx-success: var(--success-color, #166534);
    --hx-error: var(--error-color, #b91c1c);
    --hx-tile: color-mix(in srgb, var(--hx-text) 4%, transparent);
    --hx-track: color-mix(in srgb, var(--hx-text) 8%, transparent);
    --hx-soft: color-mix(in srgb, var(--hx-primary) 12%, transparent);
    --hx-warning-soft: color-mix(in srgb, var(--hx-warning) 14%, transparent);
    --hx-success-soft: color-mix(in srgb, var(--hx-success) 14%, transparent);
    --hx-error-soft: color-mix(in srgb, var(--hx-error) 14%, transparent);
    --hx-radius: var(--ha-card-border-radius, 16px);
    display: block;
    color: var(--hx-text);
  }
  ha-card {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.4px;
    line-height: 1.2;
  }
  .header .sub {
    font-size: 14px;
    color: var(--hx-muted);
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .tile {
    background: var(--hx-tile);
    border-radius: var(--hx-radius);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .grow {
    flex: 1 1 auto;
    min-width: 0;
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .strong {
    font-size: 15px;
    font-weight: 600;
  }
  .small {
    font-size: 13px;
    color: var(--hx-muted);
  }
  .tiny {
    font-size: 12px;
    color: var(--hx-muted);
  }
  .badge-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--hx-soft);
    color: var(--hx-primary);
    --mdc-icon-size: 22px;
  }
  .badge-icon.warning {
    background: var(--hx-warning-soft);
    color: var(--hx-warning);
  }
  .badge-icon.success {
    background: var(--hx-success-soft);
    color: var(--hx-success);
  }
  .badge-icon.error {
    background: var(--hx-error-soft);
    color: var(--hx-error);
  }
  .big-number {
    white-space: nowrap;
    font-size: 24px;
    font-weight: 700;
    color: var(--hx-warning);
    text-align: right;
    line-height: 1.1;
  }
  .error-text {
    color: var(--hx-error);
    font-size: 13px;
  }
  button {
    font: inherit;
    color: inherit;
  }
  .icon-button {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    border: 1px solid var(--hx-divider);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    color: var(--hx-text);
    --mdc-icon-size: 20px;
  }
  .btn {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 14px;
    border: 1px solid var(--hx-divider);
    background: transparent;
    font-size: 15px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    --mdc-icon-size: 18px;
  }
  .btn.primary {
    background: var(--hx-primary);
    color: var(--hx-on-primary);
    border-color: transparent;
  }
  .btn.danger {
    color: var(--hx-error);
    border-color: var(--hx-error);
  }
  .btn.ghost-dashed {
    border: 1.5px dashed var(--hx-primary);
    color: var(--hx-primary);
    background: var(--hx-soft);
    min-height: 52px;
  }
  .btn[disabled] {
    opacity: 0.5;
    cursor: default;
  }
  .btn.grow {
    flex: 1 1 auto;
  }
  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  /* Accessible switch: a real button with role=switch */
  .switch {
    width: 52px;
    height: 32px;
    border-radius: 16px;
    border: none;
    background: var(--hx-track);
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    /* 44 px touch target */
    outline-offset: 2px;
    margin: 6px 0;
  }
  .switch::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 26px;
    height: 26px;
    border-radius: 13px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    transition: left 0.15s;
  }
  .switch[aria-checked="true"] {
    background: var(--hx-primary);
  }
  .switch[aria-checked="true"]::after {
    left: 23px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--hx-soft);
    color: var(--hx-primary);
    --mdc-icon-size: 14px;
  }
  .chip.warning {
    background: var(--hx-warning-soft);
    color: var(--hx-warning);
  }
  .chip.error {
    background: var(--hx-error-soft);
    color: var(--hx-error);
  }
  .chip.success {
    background: var(--hx-success-soft);
    color: var(--hx-success);
  }
  .chip.muted {
    background: var(--hx-track);
    color: var(--hx-muted);
  }
  /* Timeline */
  .timeline {
    display: grid;
    grid-template-columns: 84px minmax(0, 1fr);
    row-gap: 10px;
    align-items: center;
  }
  .timeline .label {
    font-size: 13px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 8px;
  }
  .track {
    position: relative;
    height: 28px;
    border-radius: 8px;
    background: var(--hx-track);
  }
  .mark {
    position: absolute;
    top: 4px;
    height: 20px;
    min-width: 9px;
    border-radius: 4px;
    background: var(--hx-primary);
    box-sizing: border-box;
  }
  .mark.done,
  .mark.past {
    background: var(--hx-muted);
    opacity: 0.55;
  }
  /* Skipped (rain, pause, fault…): striped, so it never looks like "done" */
  .mark.skipped,
  .swatch.skipped {
    background: repeating-linear-gradient(
      135deg,
      var(--hx-muted) 0 2px,
      transparent 2px 5px
    );
    border: 1.5px solid var(--hx-muted);
    opacity: 0.8;
  }
  .mark.disabled {
    background: transparent;
    border: 1.5px dashed var(--hx-muted);
  }
  .mark.running {
    background: var(--hx-success);
  }
  .now {
    position: absolute;
    top: -4px;
    width: 2px;
    height: 36px;
    border-radius: 1px;
    background: var(--hx-warning);
  }
  .hours {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--hx-muted);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    font-size: 12px;
    color: var(--hx-muted);
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: var(--hx-primary);
    box-sizing: border-box;
  }
  .swatch.running {
    background: var(--hx-success);
  }
  .swatch.done {
    background: var(--hx-muted);
    opacity: 0.55;
  }
  .swatch.disabled {
    background: transparent;
    border: 1.5px dashed var(--hx-muted);
  }
  .swatch.nowline {
    width: 2px;
    height: 12px;
    background: var(--hx-warning);
  }
  /* Cycle list on the dashboard */
  .cycles {
    display: flex;
    flex-direction: column;
  }
  .cycle-row {
    display: grid;
    grid-template-columns: minmax(64px, auto) 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    border-top: 1px solid var(--hx-divider);
    font-size: 14px;
  }
  .cycle-row .time {
    font-size: 18px;
    font-weight: 600;
  }
  .cycle-row.muted .time,
  .cycle-row.muted .dur {
    color: var(--hx-muted);
  }
  .dur {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dur s {
    color: var(--hx-muted);
  }
  .dur b {
    color: var(--hx-primary);
  }
  .cycle-row.muted .dur b {
    color: var(--hx-muted);
  }
  .status {
    font-size: 13px;
    color: var(--hx-muted);
    text-align: right;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    justify-content: flex-end;
    --mdc-icon-size: 14px;
  }
  .status.upcoming {
    color: var(--hx-primary);
    font-weight: 500;
  }
  .status.running {
    color: var(--hx-success);
    font-weight: 600;
  }
  /* Steppers and settings rows */
  .stepper {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .stepper button {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1px solid var(--hx-divider);
    background: transparent;
    font-size: 20px;
    cursor: pointer;
  }
  .stepper .value {
    min-width: 56px;
    text-align: center;
    font-weight: 600;
    font-size: 15px;
  }
  .setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    border-top: 1px solid var(--hx-divider);
  }
  .setting:first-child {
    border-top: none;
  }
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--hx-muted);
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
  label.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
  }
  input[type="text"],
  input[type="time"],
  select {
    min-height: 48px;
    border-radius: 12px;
    border: 1px solid var(--hx-divider);
    padding: 0 14px;
    font: inherit;
    font-size: 16px;
    font-weight: 400;
    color: var(--hx-text);
    background: var(--card-background-color, transparent);
    box-sizing: border-box;
    width: 100%;
  }
  input[type="time"] {
    width: auto;
    padding: 0 10px;
    font-size: 18px;
    font-weight: 600;
  }
  .check-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    font-size: 15px;
    cursor: pointer;
  }
  .check-row input {
    width: 22px;
    height: 22px;
    accent-color: var(--hx-primary);
    margin: 0;
  }
  .icon-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }
  .choice {
    min-height: 52px;
    border-radius: 14px;
    border: 1px solid var(--hx-divider);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--hx-text);
    --mdc-icon-size: 22px;
  }
  .choice[aria-pressed="true"] {
    border: 2px solid var(--hx-primary);
    background: var(--hx-soft);
    color: var(--hx-primary);
  }
  .choice-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .choice-grid .choice {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 12px;
    text-align: left;
  }
  .days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 6px;
  }
  .days .choice {
    min-height: 44px;
    font-weight: 600;
  }
  .cycle-card {
    border: 1px solid var(--hx-divider);
    border-radius: 14px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  /* Time and duration wrap onto two lines on narrow screens */
  .cycle-card .row {
    flex-wrap: wrap;
  }
  .cycle-card.off {
    opacity: 0.6;
  }
  .warning-box {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--hx-warning-soft);
    color: var(--hx-text);
    font-size: 13px;
    --mdc-icon-size: 20px;
  }
  .warning-box ha-icon,
  ha-icon.capped {
    color: var(--hx-warning);
    flex-shrink: 0;
  }
  ha-icon.capped {
    --mdc-icon-size: 16px;
  }
  .link-button {
    align-self: flex-start;
    min-height: 44px;
    padding: 0;
    border: none;
    background: none;
    color: var(--hx-primary);
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
  }
  .meter {
    height: 8px;
    border-radius: 4px;
    background: var(--hx-track);
    overflow: hidden;
  }
  .meter > div {
    height: 100%;
    background: var(--hx-warning);
    border-radius: 4px;
  }
  .compact .cycles,
  .compact .zone-sub {
    display: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .switch::after {
      transition: none;
    }
  }
`;
