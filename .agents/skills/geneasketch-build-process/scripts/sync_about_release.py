#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
RELEASE_META = ROOT / "release.meta.json"
RELEASE_INFO_TS = ROOT / "src" / "config" / "releaseInfo.ts"
CHANGELOG = ROOT / "CHANGELOG.md"
PUBLIC_CHANGELOG_TS = ROOT / "src" / "config" / "changelogPublic.ts"


def load_meta() -> dict[str, str]:
    data = json.loads(RELEASE_META.read_text(encoding="utf-8"))
    return {
        "technicalVersion": str(data["technicalVersion"]),
        "channel": str(data["channel"]),
        "codename": str(data["codename"]),
        "displayLabel": str(data["displayLabel"]),
        "releaseTag": str(data["releaseTag"]),
    }


def expected_release_info_ts(meta: dict[str, str]) -> str:
    return (
        'export type ReleaseChannel = "beta" | "stable";\n\n'
        "export type ReleaseInfo = {\n"
        "  technicalVersion: string;\n"
        "  channel: ReleaseChannel;\n"
        "  codename: string;\n"
        "  displayLabel: string;\n"
        "  releaseTag: string;\n"
        "};\n\n"
        "export const RELEASE_INFO: ReleaseInfo = {\n"
        f'  technicalVersion: "{meta["technicalVersion"]}",\n'
        f'  channel: "{meta["channel"]}",\n'
        f'  codename: "{meta["codename"]}",\n'
        f'  displayLabel: "{meta["displayLabel"]}",\n'
        f'  releaseTag: "{meta["releaseTag"]}"\n'
        "};\n"
    )


def _normalize_line(line: str) -> str:
    return line.replace("\ufeff", "").rstrip("\n")


def _is_public_section(title: str) -> bool:
    lower = title.lower()
    if "detalle tecnico" in lower:
        return False
    if "known issues" in lower:
        return False
    if "compatibilidad" in lower:
        return False
    if "para usuarios" in lower:
        return True
    if "nuevo" in lower or "mejorado" in lower or "corregido" in lower or "tambien incluye" in lower:
        return True
    return False


def parse_public_changelog(content: str) -> list[dict[str, object]]:
    lines = [_normalize_line(line) for line in content.splitlines()]
    entries: list[dict[str, object]] = []

    current: dict[str, object] | None = None
    current_section: str | None = None

    for line in lines:
        if line.startswith("## "):
            if current is not None:
                entries.append(current)
            heading = line[3:].strip()
            version_match = re.search(r"\b(\d+\.\d+\.\d+)\b", heading)
            current = {
                "heading": heading,
                "technicalVersion": version_match.group(1) if version_match else None,
                "userChanges": [],
            }
            current_section = None
            continue

        if current is None:
            continue

        if line.startswith("### "):
            current_section = line[4:].strip()
            continue

        if not current_section or not _is_public_section(current_section):
            continue

        if line.startswith("- ") or line.startswith("* "):
            item = line[2:].strip()
            if not item:
                continue
            if "[todo]" in item.lower():
                continue
            changes = current["userChanges"]
            assert isinstance(changes, list)
            changes.append(item)

    if current is not None:
        entries.append(current)

    cleaned: list[dict[str, object]] = []
    for entry in entries:
        changes = entry.get("userChanges")
        if not isinstance(changes, list):
            continue
        if len(changes) == 0:
            continue
        cleaned.append(entry)

    return cleaned


def expected_public_changelog_ts(entries: list[dict[str, object]]) -> str:
    payload = json.dumps(entries, ensure_ascii=False, indent=2)
    return (
        "export type PublicChangelogEntry = {\n"
        "  heading: string;\n"
        "  technicalVersion?: string | null;\n"
        "  userChanges: string[];\n"
        "};\n\n"
        f"export const PUBLIC_CHANGELOG: PublicChangelogEntry[] = {payload} as PublicChangelogEntry[];\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync release metadata and public changelog into About UI config.")
    parser.add_argument("--check", action="store_true", help="Validate only; do not modify files.")
    args = parser.parse_args()

    if not RELEASE_META.exists():
        print(f"ERROR: Missing {RELEASE_META}")
        return 1
    if not CHANGELOG.exists():
        print(f"ERROR: Missing {CHANGELOG}")
        return 1

    meta = load_meta()
    expected_release = expected_release_info_ts(meta)
    changelog_entries = parse_public_changelog(CHANGELOG.read_text(encoding="utf-8"))
    expected_public = expected_public_changelog_ts(changelog_entries)

    current_release = RELEASE_INFO_TS.read_text(encoding="utf-8") if RELEASE_INFO_TS.exists() else ""
    current_public = PUBLIC_CHANGELOG_TS.read_text(encoding="utf-8") if PUBLIC_CHANGELOG_TS.exists() else ""

    if args.check:
        if current_release != expected_release:
            print("ERROR: src/config/releaseInfo.ts is out of sync with release.meta.json")
            return 1
        if current_public != expected_public:
            print("ERROR: src/config/changelogPublic.ts is out of sync with CHANGELOG.md")
            return 1
        print("OK: About release info and public changelog are in sync.")
        return 0

    RELEASE_INFO_TS.parent.mkdir(parents=True, exist_ok=True)
    RELEASE_INFO_TS.write_text(expected_release, encoding="utf-8")
    PUBLIC_CHANGELOG_TS.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_CHANGELOG_TS.write_text(expected_public, encoding="utf-8")
    print("OK: src/config/releaseInfo.ts synchronized.")
    print("OK: src/config/changelogPublic.ts synchronized.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
