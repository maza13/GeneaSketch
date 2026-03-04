---
name: geneasketch-build-process
description: Standardized desktop release process with strict version and gate validation.
---

# GeneaSketch Build Process

## Required release gates (in order)
1. `python .agents/skills/geneasketch-build-process/scripts/preflight_build.py`
2. `python .agents/skills/geneasketch-build-process/scripts/ensure_changelog_entry.py`
3. `python .agents/skills/geneasketch-build-process/scripts/sync_about_release.py`
4. `python .agents/skills/geneasketch-build-process/scripts/sync_about_release.py --check`
5. `npm run desktop:build:win`
6. `python .agents/skills/geneasketch-build-process/scripts/verify_build_artifacts.py`

## Hard prerequisite
All technical versions must match before any build:
- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `release.meta.json`

## Changelog policy
- `CHANGELOG.md` root is source for public About changelog parsing.
- Entries must include user-facing section headings compatible with parser.
