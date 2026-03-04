#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
TARGET_ROOT = ROOT / "src-tauri"
RELEASE_META = ROOT / "release.meta.json"


def collect(pattern: str) -> list[Path]:
    return sorted(TARGET_ROOT.glob(pattern))


def load_technical_version() -> str:
    data = json.loads(RELEASE_META.read_text(encoding="utf-8"))
    return str(data["technicalVersion"])


def has_version(path: Path, version: str) -> bool:
    return re.search(rf"_{re.escape(version)}_", path.name) is not None


def main() -> int:
    if not RELEASE_META.exists():
        print(f"ERROR: Missing {RELEASE_META}")
        return 1
    version = load_technical_version()

    msi = collect("target*/release/bundle/msi/*.msi")
    nsis = collect("target*/release/bundle/nsis/*.exe")
    msi_current = [p for p in msi if has_version(p, version)]
    nsis_current = [p for p in nsis if has_version(p, version)]

    print("Build artifacts:")
    print(f"  MSI (all): {len(msi)}")
    for p in msi:
        print(f"    - {p}")

    print(f"  NSIS (all): {len(nsis)}")
    for p in nsis:
        print(f"    - {p}")

    print(f"  MSI (current {version}): {len(msi_current)}")
    print(f"  NSIS (current {version}): {len(nsis_current)}")

    if not msi_current or not nsis_current:
        print("ERROR: Missing MSI or NSIS artifact for current technical version.")
        return 1

    print("OK: MSI and NSIS artifacts found for current technical version.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
