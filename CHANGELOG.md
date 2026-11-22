# Changelog

All notable changes to hydraXoo. Versions follow [Semantic Versioning](https://semver.org/).

## 0.1.3

- A valve switched on outside hydraXoo is now closed at once by default, checked, shown on the card and sent to the chosen phones (at most once per zone every 10 minutes; new event `hydraxoo_unexpected_open`). New setting to leave such openings until the safety cut-off instead, with a countdown on the card.
- Default safety cut-off for new zones: 5 minutes (was 30); default cycle duration: 5 minutes. Existing zones keep their settings.
- A cycle longer than the safety cut-off is no longer refused: the card warns that it will be stopped at the cut-off and offers to raise the cut-off; the dashboard and "Next watering" show the real duration (⚠).

## 0.1.2

- Card: new **General settings** screen (⚙ button): weather entity and rain gauge, watering order, pause for 1, 3 or 7 days, phones to alert with a **Send a test notification** button. Settings apply at once, without reloading or interrupting a watering.
- Phones are listed by their name ("iPhone de Phil") instead of the technical service name, in the card and in Configure › General settings.

## 0.1.1

- Card follows the profile's time format (12 or 24 hours) and first day of the week.
- Zone settings: time and duration of a cycle wrap onto two lines on narrow screens instead of overflowing.
- Screenshots in the README.

## 0.1.0 — First public release

- German, Spanish and Italian translations, for the integration (setup screens, entities, services, notifications) and the card, alongside English and French.
- Complete documentation in English and French: installation, getting started, card, scheduling, weather, safety, entities, services, events, automation examples, troubleshooting.
- Tests check that every language has the same texts and keeps the same placeholders.

## 0.0.7

- Done and skipped cycles of the last 48 hours are saved and survive restarts.
- Heat bonus help: "0 % = normal duration".

## 0.0.6

- Power consumption watched at all times: a switched-off plug drawing power triggers the closing check.
- Mobile notifications (high priority) when a valve cannot be closed, removed once acknowledged.
- "Receives rain" replaces outdoor/sheltered; the heat bonus applies to every zone.
- Card: skipped cycles striped and marked with a cross, plain-language weather chips, clearer rain and heat settings, closing threshold down to 0.1 W.

## 0.0.5

- Lovelace card: dashboard, zone settings and zone creation, visual editor, light and dark themes.
- WebSocket API: zones created, edited and deleted without reloading.

## 0.0.4

- Weather coefficient: rain expected and fallen, heat bonus, skip threshold, Met.no and Météo-France formats.

## 0.0.3

- Valve-closing check through the plug's power consumption, retries, closing fault.

## 0.0.2

- Several cycles per zone, queue (one zone at a time) or zones in parallel, pause.

## 0.0.1

- First development preview: setup from the UI, one zone and one cycle, manual watering, safety cut-off.
