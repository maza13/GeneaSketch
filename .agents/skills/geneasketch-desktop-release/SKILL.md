---
name: geneasketch-desktop-release
description: Plan and execute GeneaSketch desktop releases on Windows with Tauri. Use when preparing a beta/stable build, updating release versions and changelog, validating MSI/NSIS packaging constraints, running `desktop:build:win`, and diagnosing release blockers such as invalid prerelease formats, file locks, or encoding issues.
---

# GeneaSketch Desktop Release

## Overview

Use this skill to ship a Windows desktop release for GeneaSketch with deterministic checks:
- keep release versions consistent across JS/Tauri/Rust manifests,
- enforce MSI-compatible version format,
- prepare hybrid changelog notes (user + technical + known issues),
- run and diagnose `npm run desktop:build:win`.

## Workflow

### 1. Preflight version validation

1. Read:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
2. Ensure all three versions are identical.
3. Validate MSI-compatible prerelease format with:
   - `python .agents/skills/geneasketch-desktop-release/scripts/validate_release_version.py`
4. If product needs a non-numeric beta name (for example `ai-assistant`), keep it as codename in changelog/tag/title, not inside MSI version string.

### 2. Changelog update

1. Add new top section in `CHANGELOG.md` with:
   - release heading and date,
   - user summary,
   - technical summary,
   - known issues and workaround,
   - compatibility notes.
2. Keep language concise and actionable.

### 3. Build and packaging

1. Run `npm run desktop:build:win`.
2. If Windows file lock (`os error 32`) appears in `target/release/deps`, retry with alternate target dir:
   - `$env:CARGO_TARGET_DIR='C:\\...\\src-tauri\\target-release-temp'; npm run desktop:build:win`
3. Confirm installer generation for both `msi` and `nsis`.

### 4. Failure diagnosis and fixes

Use `references/tauri_windows_release_troubleshooting.md` for common blockers:
- invalid MSI prerelease identifier,
- UTF-8 BOM in JSON/TOML causing build parser failures,
- file lock contention in cargo target.

### 5. Release output

Always deliver:
1. updated version values and files touched,
2. changelog summary text,
3. build status (success/failure),
4. blockers with exact command-level remediation.

## Resources

- `scripts/validate_release_version.py`: checks version consistency and MSI compatibility.
- `references/tauri_windows_release_troubleshooting.md`: quick fixes for recurrent Windows/Tauri release failures.
