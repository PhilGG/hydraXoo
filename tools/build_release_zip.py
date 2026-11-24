"""Build the release ZIP the Marketplace installs (hacs.json: zip_release).

The Marketplace extracts the ZIP straight into custom_components/hydraxoo/,
so the ZIP holds the integration's files at its root (manifest.json, ...),
not the folder itself. Usage: python tools/build_release_zip.py [version]
With a version (e.g. 0.2.1 or v0.2.1) it checks manifest.json matches it.
"""

from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "custom_components" / "hydraxoo"
OUTPUT = ROOT / "dist" / "hydraxoo.zip"
SKIP_DIRS = {"__pycache__"}
SKIP_SUFFIXES = {".pyc", ".pyo"}


def build(version: str | None = None, output: Path = OUTPUT) -> Path:
    manifest = json.loads((SOURCE / "manifest.json").read_text("utf-8"))
    if version is not None and manifest["version"] != version.removeprefix("v"):
        raise SystemExit(
            f"manifest.json says {manifest['version']}, release is {version}"
        )
    output.parent.mkdir(parents=True, exist_ok=True)
    files = sorted(
        path
        for path in SOURCE.rglob("*")
        if path.is_file()
        and not SKIP_DIRS.intersection(path.relative_to(SOURCE).parts)
        and path.suffix not in SKIP_SUFFIXES
        and path.name != ".DS_Store"
    )
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.relative_to(SOURCE).as_posix())
    with zipfile.ZipFile(output) as archive:
        names = archive.namelist()
    for required in ("manifest.json", "__init__.py", "frontend/hydraxoo-card.js"):
        if required not in names:
            raise SystemExit(f"{required} missing from the ZIP")
    print(f"{output.name}: {len(names)} files, version {manifest['version']}")
    return output


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else None)
