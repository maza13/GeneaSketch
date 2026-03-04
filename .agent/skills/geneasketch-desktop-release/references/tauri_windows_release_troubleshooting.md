# Tauri Windows Release Troubleshooting

## 1) MSI rejects prerelease version

Symptom:
- Build fails with: `optional pre-release identifier in app version must be numeric-only...`

Cause:
- MSI requires prerelease part to be numeric-only.

Fix:
1. Use `X.Y.Z` or `X.Y.Z-N` only (for example `0.3.0-1`).
2. Keep non-numeric beta branding as codename in changelog/tag/title.

## 2) File lock in Cargo target (`os error 32`)

Symptom:
- Build fails writing `.rmeta` under `src-tauri/target/release/deps`.

Cause:
- Concurrent process/AV/indexer locks build artifacts.

Fix:
1. Retry once.
2. Build with alternate target dir:
   - `$env:CARGO_TARGET_DIR='C:\\path\\to\\src-tauri\\target-release-temp'; npm run desktop:build:win`

## 3) Unexpected BOM in JSON parse

Symptom:
- Vite/PostCSS fails parsing JSON with `Unexpected token ﻿ in JSON at position 0`.

Cause:
- File saved as UTF-8 with BOM.

Fix:
1. Rewrite affected JSON/TOML as UTF-8 without BOM.
2. Re-run build.

## 4) Bundle identifier warning

Symptom:
- Warning about identifier ending in `.app`.

Cause:
- `identifier` in `tauri.conf.json` ends with `.app`.

Fix:
1. Change to reversed-domain style without `.app` suffix (for example `com.geneasketch.desktop`).
2. Treat as warning unless distribution policy requires strict cleanup.
