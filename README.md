<p align="center"><img src="custom_components/hydraxoo/brand/icon.png" width="128" alt=""></p>

# hydraXoo

*[Version française](README.fr.md)*

Free and open-source zone-based irrigation for Home Assistant, configured entirely from the user interface — no YAML.

> **Status: early development (0.0.x).** Zones, cycles, queue, pause, manual watering and the safety cut-off work. Weather adjustment, the valve-closing check and the Lovelace card are coming.

## What it does

- Each **zone** drives an existing `switch` entity (Z-Wave, Zigbee, Wi-Fi plug, relay…).
- Each zone has as many **cycles** as needed, each with its own start time, duration and days of the week, and its own on/off switch.
- **One zone at a time** (default) or **zones in parallel**. With one zone at a time, a watering that comes up while another zone is watering waits in a **queue** and starts as soon as the valve before it is closed.
- **Pause** watering until resumed or for a number of days. Manual watering still works during a pause.
- **Water now** for the base duration or a chosen duration, and **stop** at any time.
- **Safety cut-off**: a valve is always closed after the zone's maximum run time, even if it was switched on outside hydraXoo.
- **Restart safety**: a valve found open when Home Assistant starts is closed; the interrupted cycle is not restarted and an event reports it.

## Installation

Requires Home Assistant 2026.3 or newer.

1. In Home Assistant, open **Settings › Marketplace**.
2. Select **Add from link**, enter `PhilGG/hydraXoo` and select **Add**.
3. Open hydraXoo in the Marketplace, install it, then restart Home Assistant.
4. hydraXoo is usually offered for setup right after the restart. If not, go to **Settings › Devices & services › Add integration** and choose **hydraXoo**.
5. Use the integration's **Configure** button to add zones and cycles, and to choose the watering order.

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
| Next watering | `sensor` (timestamp) | Next scheduled start, planned duration as attribute |
| Time remaining | `sensor` (duration) | Time left in the current watering |

## Services

| Service | Fields |
| --- | --- |
| `hydraxoo.run_zone` | `zone` (device), `duration` (minutes, optional) |
| `hydraxoo.stop_zone` | `zone` (device) |
| `hydraxoo.stop_all` | — (also empties the queue) |
| `hydraxoo.pause` | `days` (optional; empty = until resumed) |
| `hydraxoo.resume` | — |

## Events

| Event | Data |
| --- | --- |
| `hydraxoo_cycle_started` | `zone_id`, `zone_name`, `source` (`schedule`/`manual`), `duration_min`, `cycle_id` |
| `hydraxoo_cycle_skipped` | `zone_id`, `zone_name`, `cycle_id`, `reason` (`paused`, `zone_disabled`, `stopped`) |
| `hydraxoo_cycle_finished` | `zone_id`, `zone_name`, `reason` (`completed`, `manual_stop`, `max_runtime`, `external`, `restart`, `unload`), … |

## Development

Everything runs in Docker; nothing else is needed on your machine.

```bash
./dev build   # build the development image
./dev test    # run the tests
./dev lint    # check code style
```

## License

[MIT](LICENSE)
