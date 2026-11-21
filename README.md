<p align="center"><img src="custom_components/hydraxoo/brand/icon.png" width="128" alt=""></p>

# hydraXoo

*[Version française](README.fr.md)*

Free and open-source zone-based irrigation for Home Assistant, configured entirely from the user interface — no YAML.

> **Status: early development (0.0.x).** Zones, cycles, queue, pause, manual watering, safety cut-off, valve-closing check, weather adjustment and the Lovelace card work. More languages and the first public release are coming.

## What it does

- Each **zone** drives an existing `switch` entity (Z-Wave, Zigbee, Wi-Fi plug, relay…).
- Each zone has as many **cycles** as needed, each with its own start time, duration and days of the week, and its own on/off switch.
- **One zone at a time** (default) or **zones in parallel**. With one zone at a time, a watering that comes up while another zone is watering waits in a **queue** and starts as soon as the valve before it is closed.
- **Pause** watering until resumed or for a number of days. Manual watering still works during a pause.
- **Weather adjustment**: the watering time is multiplied by a coefficient recalculated right before each start, from the rain expected, the rain fallen and the heat (details below).
- **Water now** for the base duration or a chosen duration, and **stop** at any time.
- **Safety cut-off**: a valve is always closed after the zone's maximum run time, even if it was switched on outside hydraXoo.
- **Valve-closing check** (optional, with a power sensor): after each closing, hydraXoo checks that the power has dropped. If not, it switches the valve on and off again, up to 5 times; then the zone is put in fault, a notification is shown (and sent with high priority to the phones chosen in **Configure › General settings › Mobile notifications**) and the zone stops watering until the fault is acknowledged. The consumption is also **watched at all times**: if a plug that is switched off starts drawing power (stuck valve, plug back online after a restart…), the same check runs.
- **Restart safety**: a valve found open when Home Assistant starts is closed; the interrupted cycle is not restarted and an event reports it.

## Installation

Requires Home Assistant 2026.3 or newer.

1. In Home Assistant, open **Settings › Marketplace**.
2. Select **Add from link**, enter `PhilGG/hydraXoo` and select **Add**.
3. Open hydraXoo in the Marketplace, install it, then restart Home Assistant.
4. hydraXoo is usually offered for setup right after the restart. If not, go to **Settings › Devices & services › Add integration** and choose **hydraXoo**.
5. Use the integration's **Configure** button to add zones and cycles, and to choose the watering order.

## The card

hydraXoo ships its own dashboard card: nothing else to install. After installing or updating, refresh your browser.

Add it from the dashboard editor (**Add card › hydraXoo**) or in YAML:

```yaml
type: custom:hydraxoo-card
title: Watering        # optional
compact: false         # optional: hides the timeline and the cycle lists
zones: []              # optional: zone ids to show, all when empty
```

- **Dashboard**: weather banner (today's coefficient and why), last valve-closing check, 24-hour timeline, one card per zone (switch, next watering, today's cycles with base and adjusted durations, **Water now** with a chosen duration, **Edit**).
- **Zone settings**: valve and closing check, cycles (on/off, time, duration −/+, days, add, delete), weather rule, **Save**. Changes apply at once.
- **New zone**: name, icon, receives rain or not, valve switch and power sensor, then cycles.

Editing is available to administrators. Light and dark themes follow Home Assistant.

## Entities

General (device **hydraXoo**):

| Entity | Type | Description |
| --- | --- | --- |
| Watering paused | `switch` | When on, no cycle is started; `until` attribute when the pause ends by itself |
| Queue | `sensor` | Number of waterings waiting, listed in the `items` attribute |

Per zone:

| Entity | Type | Description |
| --- | --- | --- |
| Zone enabled | `switch` | When off, the zone's cycles are not started |
| Watering | `binary_sensor` | On while hydraXoo has the valve open |
| Next watering | `sensor` (timestamp) | Next scheduled start; base and adjusted duration as attributes |
| Time remaining | `sensor` (duration) | Time left in the current watering |
| Weather coefficient | `sensor` (%) | Percentage applied to the base duration; reasons (rain fallen, rain expected, temperature, warnings) as attributes |
| Closing fault | `binary_sensor` (problem) | On when the valve could not be closed; last check details as attributes |

## Services

| Service | Fields |
| --- | --- |
| `hydraxoo.run_zone` | `zone` (device), `duration` (minutes, optional) |
| `hydraxoo.stop_zone` | `zone` (device) |
| `hydraxoo.stop_all` | — (also empties the queue) |
| `hydraxoo.pause` | `days` (optional; empty = until resumed) |
| `hydraxoo.resume` | — |
| `hydraxoo.acknowledge_fault` | `zone` (device) |

## Events

| Event | Data |
| --- | --- |
| `hydraxoo_cycle_started` | `zone_id`, `zone_name`, `source` (`schedule`/`manual`), `duration_min`, `cycle_id`, and for cycles `base_duration_min`, `coefficient_pct` |
| `hydraxoo_cycle_skipped` | `zone_id`, `zone_name`, `cycle_id`, `reason` (`paused`, `zone_disabled`, `stopped`, `fault`, `weather`), `weather` (details) |
| `hydraxoo_safety_retry` | `zone_id`, `zone_name`, `attempt`, `max_attempts`, `power_w` |
| `hydraxoo_safety_failed` | `zone_id`, `zone_name`, `attempts`, `power_w` |
| `hydraxoo_cycle_finished` | `zone_id`, `zone_name`, `reason` (`completed`, `manual_stop`, `max_runtime`, `external`, `restart`, `unload`), … |

## Weather adjustment

Choose a weather entity (and optionally a cumulative rain gauge) in **Configure › General settings**. Each zone has its own rule (**Edit a zone › Zone settings › Weather rule**, or the **Weather** section of the card):

- **Rain expected** over the next 24 h (from `weather.get_forecasts`, hourly if available, otherwise daily) at or above the **skip threshold** (5 mm): the cycle is skipped.
- Otherwise **coefficient = 1 − (rain fallen, weighted + rain expected) ÷ threshold**, kept between 0 and 100 %. Rain fallen in the last 24 h counts fully, from 24 to 48 h for half.
- **Heat bonus** (disabled by default): +X % when the highest temperature expected reaches a threshold.
- The result is kept between the zone's minimum and maximum (0–150 %), and the duration is rounded to the minute. 0 % skips the cycle.
- **Rain fallen** comes from the rain gauge if you set one; otherwise it is estimated by recording, each hour, the forecast rain for that hour.
- **Weather unavailable**: 100 % and a warning.
- **Zones sheltered from rain** (greenhouse, covered area: *Receives rain* off) ignore the rain, but the heat bonus still applies to them.

Tested with the Met.no and Météo-France formats; providers that give daily forecasts only, or no rain amounts, are handled (100 % with a warning in the latter case). Manual watering is never adjusted.

## Valve-closing check: setting up your plug

The check reads the power reported by the plug (sensor in W). Many plugs only report their consumption **periodically** or **after a minimum change** (for example every 60 s or ±5 W). If the reading after closing is older than the closing order, hydraXoo waits up to 60 s for a fresh one.

For a reliable check:

1. In the plug's settings (Z-Wave JS: device configuration), lower the power **reporting interval** and the **minimum change** that triggers a report, as far as the plug allows.
2. In hydraXoo (**Configure › Edit a zone › Zone settings › Closing check**), set the **check delay** a little longer than the plug's reporting interval.
3. Set the **threshold** between the plug's own idle consumption and the valve's consumption (a solenoid valve typically draws 2–8 W).

If the sensor is unavailable, the closing is not checked (no retry) and a warning is logged.

## Development

Everything runs in Docker; nothing else is needed on your machine.

```bash
./dev build   # build the development image
./dev test    # run the tests
./dev lint    # check code style
./dev card    # type-check, test and build the Lovelace card (Node runs in Docker too)
```

The card sources are in `frontend/` (TypeScript + Lit). `custom_components/hydraxoo/frontend/hydraxoo-card.js` is generated by `./dev card`: do not edit it.

## License

[MIT](LICENSE)
