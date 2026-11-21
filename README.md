<p align="center"><img src="custom_components/hydraxoo/brand/icon.png" width="128" alt=""></p>

# hydraXoo

*[Version française](README.fr.md)*

Free and open-source zone-based irrigation for Home Assistant, configured entirely from the user interface — no YAML.

> **Status: early development (0.0.x).** Zones, cycles, queue, pause, manual watering, the safety cut-off and the valve-closing check work. Weather adjustment and the Lovelace card are coming.

## What it does

- Each **zone** drives an existing `switch` entity (Z-Wave, Zigbee, Wi-Fi plug, relay…).
- Each zone has as many **cycles** as needed, each with its own start time, duration and days of the week, and its own on/off switch.
- **One zone at a time** (default) or **zones in parallel**. With one zone at a time, a watering that comes up while another zone is watering waits in a **queue** and starts as soon as the valve before it is closed.
- **Pause** watering until resumed or for a number of days. Manual watering still works during a pause.
- **Water now** for the base duration or a chosen duration, and **stop** at any time.
- **Safety cut-off**: a valve is always closed after the zone's maximum run time, even if it was switched on outside hydraXoo.
- **Valve-closing check** (optional, with a power sensor): after each closing, hydraXoo checks that the power has dropped. If not, it switches the valve on and off again, up to 5 times; then the zone is put in fault, a notification is shown and the zone stops watering until the fault is acknowledged.
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
| `hydraxoo_cycle_started` | `zone_id`, `zone_name`, `source` (`schedule`/`manual`), `duration_min`, `cycle_id` |
| `hydraxoo_cycle_skipped` | `zone_id`, `zone_name`, `cycle_id`, `reason` (`paused`, `zone_disabled`, `stopped`, `fault`) |
| `hydraxoo_safety_retry` | `zone_id`, `zone_name`, `attempt`, `max_attempts`, `power_w` |
| `hydraxoo_safety_failed` | `zone_id`, `zone_name`, `attempts`, `power_w` |
| `hydraxoo_cycle_finished` | `zone_id`, `zone_name`, `reason` (`completed`, `manual_stop`, `max_runtime`, `external`, `restart`, `unload`), … |

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
```

## License

[MIT](LICENSE)
