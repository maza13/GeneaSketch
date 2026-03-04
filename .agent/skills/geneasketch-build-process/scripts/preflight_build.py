#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
PACKAGE_JSON = ROOT / "package.json"
TAURI_CONF = ROOT / "src-tauri" / "tauri.conf.json"
CARGO_TOML = ROOT / "src-tauri" / "Cargo.toml"
RELEASE_META = ROOT / "release.meta.json"
SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+$")


def read_json_version(path: Path) -> str:
    data = json.loads(path.read_text(encoding="utf-8"))
    return str(data["version"])


def read_release_meta(path: Path) -> dict[str, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    required = ["technicalVersion", "channel", "codename", "displayLabel", "releaseTag"]
    for key in required:
        if key not in data or not str(data[key]).strip():
            raise RuntimeError(f"release.meta.json missing required key: {key}")
    return {
        "technicalVersion": str(data["technicalVersion"]),
        "channel": str(data["channel"]),
        "codename": str(data["codename"]),
        "displayLabel": str(data["displayLabel"]),
        "releaseTag": str(data["releaseTag"]),
    }


def read_cargo_version(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("version"):
            return line.split("=", 1)[1].strip().strip('"')
    raise RuntimeError("Cargo version not found")


def check_semver(version: str) -> tuple[bool, str]:
    if not SEMVER_RE.match(version):
        return False, "Technical version must be strictly X.Y.Z (no beta/codename suffix)."
    return True, "Technical version format is valid (X.Y.Z)."


def main() -> int:
    files = [RELEASE_META, PACKAGE_JSON, TAURI_CONF, CARGO_TOML]
    missing = [str(p) for p in files if not p.exists()]
    if missing:
        print("ERROR: Missing required files:")
        for p in missing:
            print(f"  - {p}")
        return 1

    meta = read_release_meta(RELEASE_META)
    technical_version = meta["technicalVersion"]

    ok, msg = check_semver(technical_version)
    if not ok:
        print(f"ERROR: {msg}")
        print(f"release.meta.json technicalVersion: {technical_version}")
        return 1

    versions = {
        "package.json": read_json_version(PACKAGE_JSON),
        "src-tauri/tauri.conf.json": read_json_version(TAURI_CONF),
        "src-tauri/Cargo.toml": read_cargo_version(CARGO_TOML),
    }

    unique_versions = set(versions.values())
    if len(unique_versions) != 1:
        print("ERROR: Version mismatch across manifests:")
        for name, value in versions.items():
            print(f"  - {name}: {value}")
        return 1

    manifest_version = unique_versions.pop()
    if manifest_version != technical_version:
        print("ERROR: technicalVersion does not match manifests.")
        print(f"  - release.meta.json: {technical_version}")
        for name, value in versions.items():
            print(f"  - {name}: {value}")
        return 1

    if technical_version.split(".")[0].isdigit() and int(technical_version.split(".")[0]) < 1 and meta["channel"] != "beta":
        print("ERROR: channel must be 'beta' while major version is < 1.")
        print(f"  - technicalVersion: {technical_version}")
        print(f"  - channel: {meta['channel']}")
        return 1

    print(f"OK: release.meta.json loaded ({meta['displayLabel']})")
    print(f"OK: All manifests aligned at technical version {manifest_version}")
    print(f"OK: {msg}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
