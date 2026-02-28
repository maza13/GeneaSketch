#!/usr/bin/env python3
"""
Validate GeneaSketch desktop release versions for Windows MSI/NSIS builds.

Checks:
1. package.json, tauri.conf.json, and Cargo.toml share the same version.
2. Version matches X.Y.Z or X.Y.Z-N (N numeric <= 65535) for MSI compatibility.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
PACKAGE_JSON = ROOT / "package.json"
TAURI_CONF = ROOT / "src-tauri" / "tauri.conf.json"
CARGO_TOML = ROOT / "src-tauri" / "Cargo.toml"

SEMVER_MSI_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:-(\d+))?$")


def read_package_version(path: Path) -> str:
    return json.loads(path.read_text(encoding="utf-8"))["version"]


def read_tauri_version(path: Path) -> str:
    return json.loads(path.read_text(encoding="utf-8"))["version"]


def read_cargo_version(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("version"):
            _, value = line.split("=", 1)
            return value.strip().strip('"')
    raise RuntimeError(f"Could not find version in {path}")


def validate_msi_version(version: str) -> tuple[bool, str]:
    match = SEMVER_MSI_RE.match(version)
    if not match:
        return (
            False,
            "Version must match X.Y.Z or X.Y.Z-N where N is numeric for MSI.",
        )
    prerelease = match.group(4)
    if prerelease is not None and int(prerelease) > 65535:
        return False, "Prerelease numeric identifier must be <= 65535 for MSI."
    return True, "MSI-compatible version format."


def main() -> int:
    versions = {
        "package.json": read_package_version(PACKAGE_JSON),
        "src-tauri/tauri.conf.json": read_tauri_version(TAURI_CONF),
        "src-tauri/Cargo.toml": read_cargo_version(CARGO_TOML),
    }

    unique = set(versions.values())
    if len(unique) != 1:
        print("ERROR: Version mismatch detected:")
        for file_name, version in versions.items():
            print(f"  - {file_name}: {version}")
        return 1

    version = unique.pop()
    ok, message = validate_msi_version(version)
    if not ok:
        print(f"ERROR: {message}")
        print(f"Current version: {version}")
        return 1

    print(f"OK: Version is consistent across manifests: {version}")
    print(f"OK: {message}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

