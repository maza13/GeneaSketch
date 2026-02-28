---
name: geneasketch-build-process
description: Execute and standardize the GeneaSketch desktop release build process on Windows with strict technical versioning (`x.y.z`) and separate visible release labels (`beta + codename`). Use when preparing beta/stable desktop builds, validating changelog/about gates, generating MSI/NSIS artifacts, and producing distribution-labeled installer copies.
---

# Geneasketch Build Process

## Overview

This skill enforces a repeatable release-build workflow with a strict split between:
- technical version (`x.y.z`) used by manifests/installers,
- visible release label used by changelog/tag/About/distribution filename.

## Workflow

### 1) Preflight validation (required)

Run:

```bash
python .agents/skills/geneasketch-build-process/scripts/preflight_build.py
```

This validates:
- `release.meta.json` exists and is complete,
- technical version is strictly `x.y.z`,
- manifests are aligned with `release.meta.json`,
- while major version `< 1`, channel is `beta`.

### 2) Changelog gate (required)

Run:

```bash
python .agents/skills/geneasketch-build-process/scripts/ensure_changelog_entry.py
```

Behavior:
- verifies changelog entry for `technicalVersion + displayLabel`,
- if missing, creates a hybrid template entry (product-changelog hook behavior),
- blocks release completion until TODO fields are finalized.

### 3) Sync About release metadata (required)

Run:

```bash
python .agents/skills/geneasketch-build-process/scripts/sync_about_release.py
python .agents/skills/geneasketch-build-process/scripts/sync_about_release.py --check
```

This keeps `src/config/releaseInfo.ts` aligned with `release.meta.json`.
Also syncs `src/config/changelogPublic.ts` from `CHANGELOG.md` (public/user-facing sections only), used by the in-app About modal.

Release gate expectation for About:
- About must remain general to the full app (`About GeneaSketch`), not feature-scoped.
- About must show public changelog items (exclude technical/internal sections).
- `sync_about_release.py --check` must pass before build artifacts are considered valid.

### 4) Build execution

Run:

```bash
npm run desktop:build:win
```

If Windows file-lock errors appear in Cargo artifacts (`os error 32`), rerun with alternate target dir:

```powershell
$env:CARGO_TARGET_DIR='C:\My_Projects\GeneaSketch\src-tauri\target-release-temp'
npm run desktop:build:win
```

### 5) Artifact verification (strict by current version)

Run:

```bash
python .agents/skills/geneasketch-build-process/scripts/verify_build_artifacts.py
```

Expected result:
- at least one `.msi` for current technical version,
- at least one `.exe` (NSIS) for current technical version.

### 6) Visible distribution filenames

Run:

```bash
python .agents/skills/geneasketch-build-process/scripts/rename_distribution_artifacts.py
```

This creates distribution copies in `release-dist/` with visible label naming, without changing installer internal metadata.

### 7) Troubleshooting

For recurring failures, read:

- `references/windows-build-troubleshooting.md`

Use exact remediation steps from that file in user-facing diagnosis.

## Output contract

When using this skill, always report:
1. `release.meta.json` values used (`technicalVersion`, `channel`, `displayLabel`, `releaseTag`).
2. Manifest versions and whether they match.
3. Changelog gate result (found/created).
4. About sync/check result.
   - include confirmation that `changelogPublic.ts` is synced and contains public notes.
5. Build command executed.
6. Version-matched artifact paths discovered.
7. Distribution-labeled output paths.
8. Blocking errors and exact fix steps.
