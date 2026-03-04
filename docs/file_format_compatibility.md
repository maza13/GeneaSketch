# File Format Compatibility

## Supported Inputs
- `.ged` (plain GEDCOM text)
- `.gsk` (native GeneaSketch package)

## Internal Canonical Target
- For merged documents, the canonical output metadata is:
  - `sourceFormat = GSK`
  - `gedVersion = 7.0.x`

## GED Version Policy
- Accepted source versions:
  - `5.5`
  - `5.5.1`
  - `7.0.x`
  - `unknown` (imported in tolerant mode with warnings)
- Merge output is always normalized to `7.0.x`.

## Provenance Rules
- Each import/merge should preserve or append `importProvenance` entries:
  - `fileName?`
  - `sourceFormat`
  - `sourceGedVersion`
  - `importedAt` (ISO date-time)

## Notes
- `.gdz` and `.gsz` are retired in runtime (hard cut).
- `.gsk` is the native working format for the project.

## GED Export Targets
- `GED 7.0.3` (default)
- `GED 5.5.1` (legacy compatibility mode)

### Legacy Export Warnings
When exporting to `5.5.1`, the app may emit warnings for:
- dropped unmapped events (`OTHER`),
- implicit `DEAT` when a person is marked deceased but has no `DEAT` event,
- non-portable metadata/extensions that are not representable in plain GED.
