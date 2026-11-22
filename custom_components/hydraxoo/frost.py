"""Frost warning: remind people to shut outdoor water circuits before frost.

An *episode* starts with the first forecast at or below the threshold and
ends only when the forecast clearly warms up again (threshold + hysteresis),
so a forecast hovering around the threshold does not re-trigger alerts.

Within an episode at most two phone notifications are sent:
1. the alert, when frost is first forecast (deferred to 7:00 at night when
   frost is not expected before 10:00);
2. one reminder about 3 hours before the first frosty hour, unless someone
   confirmed ("done" or watering paused) in the meantime, and only if it
   comes at least 2 hours after the alert.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from typing import Any

from homeassistant.util import dt as dt_util

HYSTERESIS_C = 2.0  # episode ends when the minimum goes above threshold + this
REMINDER_BEFORE = timedelta(hours=3)
MIN_GAP = timedelta(hours=2)  # minimum time between the alert and the reminder
QUIET_START = time(22, 0)
QUIET_END = time(7, 0)

# Actions returned by evaluate()
ALERT = "alert"
REMINDER = "reminder"
THAW = "thaw"  # episode over (a notice is sent only if enabled)


@dataclass
class FrostSettings:
    """General frost-warning settings."""

    enabled: bool = True
    threshold_c: float = 2.0
    thaw_notice: bool = False


@dataclass
class FrostState:
    """Current episode; saved so a restart never re-sends an alert."""

    active: bool = False
    min_c: float | None = None
    frost_at: datetime | None = None  # first forecast hour at/below threshold
    alert_due: datetime | None = None  # when the (possibly deferred) alert is due
    alerted: bool = False
    reminded: bool = False
    acknowledged: bool = False
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serialize for storage."""
        return {
            "active": self.active,
            "min_c": self.min_c,
            "frost_at": self.frost_at.isoformat() if self.frost_at else None,
            "alert_due": self.alert_due.isoformat() if self.alert_due else None,
            "alerted": self.alerted,
            "reminded": self.reminded,
            "acknowledged": self.acknowledged,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> FrostState:
        """Load from storage."""
        data = data or {}

        def when(key: str) -> datetime | None:
            value = data.get(key)
            return dt_util.parse_datetime(value) if value else None

        return cls(
            active=bool(data.get("active", False)),
            min_c=data.get("min_c"),
            frost_at=when("frost_at"),
            alert_due=when("alert_due"),
            alerted=bool(data.get("alerted", False)),
            reminded=bool(data.get("reminded", False)),
            acknowledged=bool(data.get("acknowledged", False)),
        )


def _alert_time(now: datetime, frost_at: datetime) -> datetime:
    """Now, or 7:00 if it is night and frost is not expected before 10:00."""
    local = dt_util.as_local(now)
    if QUIET_END <= local.time() < QUIET_START:
        return now
    morning = local.replace(hour=7, minute=0, second=0, microsecond=0)
    if local.time() >= QUIET_START:
        morning += timedelta(days=1)
    if frost_at - morning >= REMINDER_BEFORE:
        return dt_util.as_utc(morning)
    return now


def evaluate(
    state: FrostState,
    settings: FrostSettings,
    now: datetime,
    forecast: tuple[float, datetime | None] | None,
    relevant: bool,
) -> list[str]:
    """Update the episode and return the notifications to send now.

    `forecast` is (lowest temperature in °C over the next 24 h, first hour at
    or below the threshold), or None if unknown. `relevant` is False when no
    frost-alerted zone has an enabled cycle, or when watering is paused: then
    nothing needs doing, which also counts as a confirmation.
    """
    actions: list[str] = []
    if not settings.enabled:
        if state.active:
            state.__init__()
        return actions
    if forecast is None:
        return actions  # no information: keep the episode as it is
    min_c, frost_at = forecast

    if state.active and min_c > settings.threshold_c + HYSTERESIS_C:
        if state.alerted:
            actions.append(THAW)
        state.__init__()
        return actions

    if not state.active:
        if min_c > settings.threshold_c or frost_at is None or not relevant:
            return actions
        state.active = True
        state.alert_due = _alert_time(now, frost_at)

    state.min_c = min(min_c, state.min_c) if state.min_c is not None else min_c
    if frost_at is not None and (state.frost_at is None or state.frost_at < now):
        state.frost_at = frost_at

    if not relevant:
        state.acknowledged = True
    if state.acknowledged:
        return actions

    if not state.alerted and state.alert_due is not None and now >= state.alert_due:
        state.alerted = True
        # A reminder only makes sense well after the alert: if it would come
        # less than 2 hours later, the alert itself is the last call.
        if state.frost_at is not None and now >= (
            state.frost_at - REMINDER_BEFORE - MIN_GAP
        ):
            state.reminded = True
        actions.append(ALERT)
        return actions
    if (
        state.alerted
        and not state.reminded
        and state.frost_at is not None
        and now >= state.frost_at - REMINDER_BEFORE
        and now < state.frost_at + timedelta(hours=1)
    ):
        state.reminded = True
        actions.append(REMINDER)
    return actions
