"""Every language file must have exactly the same keys as English."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

TRANSLATIONS = Path(__file__).parent.parent / "custom_components/hydraxoo/translations"


def _keys(data: dict, prefix: str = "") -> set[str]:
    keys: set[str] = set()
    for key, value in data.items():
        path = f"{prefix}{key}"
        if isinstance(value, dict):
            keys |= _keys(value, f"{path}.")
        else:
            keys.add(path)
    return keys


REFERENCE = _keys(json.loads((TRANSLATIONS / "en.json").read_text("utf-8")))


@pytest.mark.parametrize(
    "path", sorted(p for p in TRANSLATIONS.glob("*.json") if p.name != "en.json")
)
def test_same_keys_as_english(path: Path) -> None:
    """Missing or extra keys are listed in the failure message."""
    keys = _keys(json.loads(path.read_text("utf-8")))
    assert keys == REFERENCE, {
        "missing": sorted(REFERENCE - keys),
        "extra": sorted(keys - REFERENCE),
    }


def _leaves(data: dict, prefix: str = "") -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in data.items():
        path = f"{prefix}{key}"
        if isinstance(value, dict):
            out |= _leaves(value, f"{path}.")
        else:
            out[path] = value
    return out


PLACEHOLDER = re.compile(r"\{(\w+)\}")
EN_LEAVES = _leaves(json.loads((TRANSLATIONS / "en.json").read_text("utf-8")))


@pytest.mark.parametrize(
    "path", sorted(p for p in TRANSLATIONS.glob("*.json") if p.name != "en.json")
)
def test_same_placeholders_as_english(path: Path) -> None:
    """{zone}, {power}… must survive translation, or messages break."""
    leaves = _leaves(json.loads(path.read_text("utf-8")))
    wrong = {
        key: text
        for key, text in leaves.items()
        if set(PLACEHOLDER.findall(text)) != set(PLACEHOLDER.findall(EN_LEAVES[key]))
    }
    assert wrong == {}
