#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
RELEASE_META = ROOT / "release.meta.json"
SRC_TAURI = ROOT / "src-tauri"
DIST_DIR = ROOT / "release-dist"


def load_meta() -> dict[str, str]:
    data = json.loads(RELEASE_META.read_text(encoding="utf-8"))
    return {
        "technicalVersion": str(data["technicalVersion"]),
        "displayLabel": str(data["displayLabel"]),
        "releaseTag": str(data["releaseTag"]),
    }


def safe_label(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_")


def collect(pattern: str) -> list[Path]:
    return sorted(SRC_TAURI.glob(pattern))


def version_match(path: Path, version: str) -> bool:
    return f"_{version}_" in path.name


def copy_with_visible_name(src: Path, target_name: str) -> Path:
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    dst = DIST_DIR / target_name
    shutil.copy2(src, dst)
    return dst


def main() -> int:
    if not RELEASE_META.exists():
        print(f"ERROR: Missing {RELEASE_META}")
        return 1

    meta = load_meta()
    version = meta["technicalVersion"]
    label = safe_label(meta["displayLabel"])

    msi = [p for p in collect("target*/release/bundle/msi/*.msi") if version_match(p, version)]
    nsis = [p for p in collect("target*/release/bundle/nsis/*.exe") if version_match(p, version)]
    if not msi or not nsis:
        print("ERROR: Missing version-matched artifacts. Run build first.")
        return 1

    msi_src = msi[-1]
    nsis_src = nsis[-1]
    msi_name = f"GeneaSketch_{label}_v{version}_x64_en-US.msi"
    nsis_name = f"GeneaSketch_{label}_v{version}_x64-setup.exe"

    msi_dst = copy_with_visible_name(msi_src, msi_name)
    nsis_dst = copy_with_visible_name(nsis_src, nsis_name)

    print("OK: Distribution copies generated.")
    print(f"  - {msi_dst}")
    print(f"  - {nsis_dst}")
    print(f"  - tag: {meta['releaseTag']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

