# Windows Build Troubleshooting (GeneaSketch)

## release.meta.json missing or out of sync

Error pattern:
- preflight fails because `technicalVersion` differs from manifests.

Fix:
1. Set `release.meta.json` as source of truth.
2. Sync `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` to exactly the same `x.y.z`.

## MSI prerelease error

Error pattern:
- `optional pre-release identifier in app version must be numeric-only`

Fix:
1. Use `X.Y.Z` for technical version.
2. Keep beta/codename only in `displayLabel`, changelog, tag, About, and distribution filename.

## Changelog gate missing

Error pattern:
- `ensure_changelog_entry.py` reports missing entry for `technicalVersion + displayLabel`.

Fix:
1. Run `ensure_changelog_entry.py` to create template.
2. Complete TODO fields before publishing release notes.

## About metadata gate out of sync

Error pattern:
- `sync_about_release.py --check` fails.

Fix:
1. Run `sync_about_release.py`.
2. Re-run check mode until it passes.

## Cargo file lock (`os error 32`)

Error pattern:
- Failed to write `.rmeta` under `src-tauri/target/release/deps`.

Fix:
1. Retry once.
2. Use alternate target path:
   - `$env:CARGO_TARGET_DIR='C:\My_Projects\GeneaSketch\src-tauri\target-release-temp'`
   - `npm run desktop:build:win`

## UTF-8 BOM parse failure

Error pattern:
- `Unexpected token ... in JSON at position 0`

Fix:
1. Re-save modified JSON/TOML files as UTF-8 without BOM.
2. Re-run build.

## Bundle identifier warning

Warning:
- Bundle identifier ends with `.app`.

Fix:
1. Optional cleanup: use an identifier such as `com.geneasketch.desktop`.
2. This is warning-level unless distribution policy requires strict compliance.
