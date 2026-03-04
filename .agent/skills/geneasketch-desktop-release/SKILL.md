---
name: geneasketch-desktop-release
description: Windows desktop release workflow for GeneaSketch with deterministic validation and packaging checks.
---

# GeneaSketch Desktop Release

## Workflow
1. Validate versions are synchronized (`package.json`, `tauri.conf`, `Cargo.toml`, `release.meta.json`).
2. Validate release version format:
   - `python .agents/skills/geneasketch-desktop-release/scripts/validate_release_version.py`
3. Ensure root changelog has release entry and parser-friendly public sections.
4. Build:
   - `npm run desktop:build:win`
5. Verify artifacts and report blockers with exact remediation.

## Release-note boundaries
- Root `CHANGELOG.md`: global release notes.
- `docs/wiki-software/CHANGELOG.md`: software/wiki-user notes.
- `docs/wiki-gsk/CHANGELOG.md`: format/schema technical notes.
