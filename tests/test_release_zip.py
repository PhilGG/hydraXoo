"""The release ZIP must install exactly the integration's files."""

from __future__ import annotations

import importlib.util
import json
import zipfile
from pathlib import Path

import pytest

ROOT = Path(__file__).parent.parent
SOURCE = ROOT / "custom_components" / "hydraxoo"
spec = importlib.util.spec_from_file_location(
    "build_release_zip", ROOT / "tools" / "build_release_zip.py"
)
build_release_zip = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_release_zip)


def test_hacs_json_points_to_the_zip() -> None:
    hacs = json.loads((ROOT / "hacs.json").read_text())
    assert hacs["zip_release"] is True
    assert hacs["filename"] == "hydraxoo.zip"


def test_zip_extracts_to_the_integration_folder(tmp_path: Path) -> None:
    """Extracted like the Marketplace does: into custom_components/hydraxoo."""
    archive = build_release_zip.build(output=tmp_path / "hydraxoo.zip")
    target = tmp_path / "custom_components" / "hydraxoo"
    with zipfile.ZipFile(archive) as zip_file:
        zip_file.extractall(target)
    expected = {
        p.relative_to(SOURCE).as_posix()
        for p in SOURCE.rglob("*")
        if p.is_file()
        and "__pycache__" not in p.parts
        and p.suffix != ".pyc"
        and p.name != ".DS_Store"
    }
    extracted = {
        p.relative_to(target).as_posix() for p in target.rglob("*") if p.is_file()
    }
    assert extracted == expected
    assert (target / "manifest.json").read_bytes() == (
        SOURCE / "manifest.json"
    ).read_bytes()
    assert (target / "frontend" / "hydraxoo-card.js").exists()


def test_version_must_match_the_release(tmp_path: Path) -> None:
    version = json.loads((SOURCE / "manifest.json").read_text())["version"]
    build_release_zip.build(f"v{version}", output=tmp_path / "ok.zip")
    with pytest.raises(SystemExit):
        build_release_zip.build("v99.0.0", output=tmp_path / "bad.zip")
