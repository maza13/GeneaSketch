# Genraph Evolution Plan - Baseline Vigente

## Principios rectores
1. Wiki-first: contrato en `docs/wiki-gsk/*` antes o junto al cambio de engine.
2. Canon de datos: `graph.json`.
3. Journal: auditoria y recovery, no canon en carga normal.
4. Recovery oficial:
   - Fast-forward incremental cuando snapshot esta atrasado.
   - Replay completo solo para snapshot invalido/ilegible.
5. Quarantine lossless obligatorio cuando `graph.quarantine.length > 0`.
6. Timestamps normativos:
   - `createdAt`: ISO-8601
   - `timestamp`: epoch seconds
7. Operaciones canonicas en docs y codigo (`SET_PREF_CLAIM`, `RETRACT_CLAIM`).

## Politica de changelog
- `docs/wiki-gsk/CHANGELOG.md`: contrato formato + wiki tecnica.
- `docs/wiki-software/CHANGELOG.md`: UX/producto/documentacion usuario.
- `CHANGELOG.md`: release global publica y About parser source.

## Disciplina de versionado
- Schema `.gsk` vigente: `0.3.1`.
- Sin bump de schema para hardening no estructural.
- SemVer real en comparacion de versiones (no string compare lexicografica).

## Verificacion minima post-cambio
- `npx vitest run src/tests/genraph.golden.test.ts src/tests/genraph.strict.test.ts src/tests/genraph.regression.test.ts`
- `npx vitest run src/tests/gedcom.test.ts src/tests/ged.export-legacy.test.ts`
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py`
- Si hay impacto release: preflight + sync_about_release --check

## Cierre integrador 013-017 (2026-03-03)
- Estado: completado.
- Gate ejecutado en verde: GSK core + GEDCOM full + link-check.
- Resultado: invariantes strict/compat y wiki tecnica sincronizados sin huecos operativos.
