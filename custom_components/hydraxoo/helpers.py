"""Small helpers shared by the setup screens and the card API."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.util import slugify


def notify_options(hass: HomeAssistant) -> list[dict[str, str]]:
    """notify services, phones of the companion app first, by their name.

    The app names each phone's service "mobile_app_" + the slugified device
    name: map it back to the name chosen on the phone ("iPhone de Phil").
    """
    phones = {
        f"mobile_app_{slugify(name)}": name
        for entry in hass.config_entries.async_entries("mobile_app")
        if (name := entry.data.get("device_name") or entry.title)
    }
    names = [
        name
        for name in hass.services.async_services_for_domain("notify")
        if name not in ("persistent_notification", "send_message")
    ]
    names.sort(key=lambda n: (n not in phones, not n.startswith("mobile_app_"), n))
    return [{"value": n, "label": phones.get(n, f"notify.{n}")} for n in names]
