#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
RELEASE_META = ROOT / "release.meta.json"
CHANGELOG = ROOT / "CHANGELOG.md"


def load_meta() -> dict[str, str]:
    data = json.loads(RELEASE_META.read_text(encoding="utf-8"))
    return {
        "technicalVersion": str(data["technicalVersion"]),
        "channel": str(data["channel"]),
        "codename": str(data["codename"]),
        "displayLabel": str(data["displayLabel"]),
        "releaseTag": str(data["releaseTag"]),
    }


def entry_exists(content: str, technical_version: str, display_label: str) -> bool:
    pattern = re.compile(
        rf"^## .*\b{re.escape(technical_version)}\b.*{re.escape(display_label)}",
        re.MULTILINE,
    )
    return bool(pattern.search(content))


def build_entry(meta: dict[str, str]) -> str:
    today = date.today().strftime("%d de %B de %Y")
    return (
        f"## {today} - {meta['technicalVersion']} ({meta['displayLabel']}, Desktop)\n\n"
        "### Para usuarios (resumen rapido)\n"
        "- [TODO] Resumen funcional para usuarios familiares.\n"
        "- [TODO] Que cambia en su flujo diario.\n\n"
        "### Detalle tecnico\n"
        "- [TODO] Cambios tecnicos principales.\n"
        "- [TODO] Riesgos y validaciones ejecutadas.\n\n"
        "### Known Issues\n"
        "- [TODO] Limitaciones conocidas y workaround.\n\n"
        "### Compatibilidad\n"
        "- Desktop (Tauri) Windows.\n"
        f"- Canal visible: {meta['channel']}.\n"
        f"- Codename: {meta['codename']}.\n\n"
    )


def insert_entry(content: str, entry: str) -> str:
    marker = "## "
    idx = content.find(marker)
    if idx == -1:
        return content.rstrip() + "\n\n" + entry
    return content[:idx] + entry + content[idx:]


def main() -> int:
    if not RELEASE_META.exists():
        print(f"ERROR: Missing {RELEASE_META}")
        return 1
    if not CHANGELOG.exists():
        print(f"ERROR: Missing {CHANGELOG}")
        return 1

    meta = load_meta()
    content = CHANGELOG.read_text(encoding="utf-8")
    if entry_exists(content, meta["technicalVersion"], meta["displayLabel"]):
        print("OK: Changelog entry already exists for current release metadata.")
        return 0

    print("WARN: Changelog entry missing for current release metadata.")
    print("INFO: Creating a hybrid template entry (product-changelog hook behavior).")
    updated = insert_entry(content, build_entry(meta))
    CHANGELOG.write_text(updated, encoding="utf-8")
    print("OK: Changelog template entry created. Complete TODO items before publishing.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

