---
status: complete
priority: p1
issue_id: "017"
tags: [gschema, tests, docs-sync, wiki-first]
dependencies: ["014", "015", "016"]
---

# GSK Precision Integration: Tests + Docs Sync

## Problem Statement

Las fases 013-016 cambian invariantes estructurales del core GSK; sin una fase integradora de pruebas + sincronizacion documental, hay alto riesgo de regresion o desalineacion wiki-codigo.

## Findings

- Las areas criticas cruzan tipos, validacion, bridge y documentacion tecnica.
- Reglas strict/compat requieren cobertura explicita en tests de import/export.
- `wiki-first` exige cierre documental en el mismo ciclo que runtime.

## Proposed Solutions

### Option 1: Fase integradora obligatoria (Recommended)
- Anadir suite de escenarios minimos pactados.
- Cerrar actualizacion documental sincronizada.
- Ejecutar checks tecnicos y links como gate final.

**Effort:** Medio-Alto  
**Risk:** Bajo (con cobertura completa)

### Option 2: Cierre distribuido por cada issue
- Cada fase valida parcialmente.

**Effort:** Medio  
**Risk:** Medio-Alto (huecos entre fases)

## Recommended Action

Aplicar Option 1 como gate final:
1. Consolidar tests de 013-016.
2. Cerrar docs `02/03/04/05` en espejo con codigo.
3. Ejecutar verificacion tecnica completa.

## Cobertura criterio -> evidencia

1. ParentChild sin `unionUid`:
- strict fail: `src/tests/gschema.strict.test.ts` (`fails in strict mode when ParentChild is missing unionUid`).
- compat repair union sintetica deterministica: `src/tests/gschema.regression.test.ts` (`repairs missing ParentChild.unionUid in compat mode with deterministic synthetic union`).

2. Multipareja/hijos por union:
- reconstruccion determinista por union: `src/tests/gschema.golden.test.ts` (`should preserve children per union in multi-union round trip` y `should write unionUid in ParentChild edges during document->gschema projection`).

3. `nature/certainty` + GEDCOM bidireccional:
- mapeo PEDI/QUAY import y export: `src/tests/gedcom.test.ts`.
- roundtrip + degradacion `STE -> UNKNOWN`: `src/tests/gedcom.test.ts` (`roundtrips ParentChild UNKNOWN/uncertain...`, `degrades STE to PEDI UNKNOWN...`).

4. Edge desconocido:
- strict fail snapshot/journal: `src/tests/gschema.strict.test.ts`.
- compat quarantine + skip apply: `src/tests/gschema.regression.test.ts`.

5. Quarantine mirror:
- strict fail missing/mismatch: `src/tests/gschema.strict.test.ts`.
- compat warning + canon desde graph: `src/tests/gschema.regression.test.ts`.

6. Sync documental:
- `docs/wiki-gsk/02_formato.md`: codigos `QUARANTINE_MIRROR_*`.
- `docs/wiki-gsk/03_modelo.md`: edge types + quarantine mirror policy.
- `docs/wiki-gsk/04_operaciones.md`: `EDGE_TYPE_UNKNOWN` / `EDGE_TYPE_UNKNOWN_IN_JOURNAL`.
- `docs/wiki-gsk/05_interoperabilidad_gedcom.md`: `PARENT_CHILD_MISSING_UNION`, mapeos PEDI/QUAY, degradacion `STE`.

## Acceptance Criteria

- [x] Casos minimos cubiertos:
  - ParentChild sin `unionUid`: strict fail, compat union sintetica.
  - Multipareja/hijos por union: reconstruccion determinista.
  - `nature/certainty` roundtrip GEDCOM.
  - Edge desconocido: strict fail, compat quarantine + warning.
  - Mismatch cuarentena: strict fail, compat canon desde graph.
- [x] `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts` en verde.
- [x] `npx vitest run src/tests/gedcom.test.ts` y `src/tests/ged.export-legacy.test.ts` en verde.
- [x] `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py` en verde.
- [x] Wiki GSK alineada con comportamiento final.

## Work Log

### 2026-03-03 - Creacion del TODO fase integradora

**By:** Codex

**Actions:**
- Definido gate final de calidad para cerrar fases 013-016.
- Dependencias cruzadas configuradas (`014`, `015`, `016`).

### 2026-03-03 - Cierre integrador 017 completado

**By:** Codex

**Actions:**
- Auditoria de cobertura criterio->evidencia completada para fases 013-016.
- Verificacion de sincronia docs para `02_formato`, `03_modelo`, `04_operaciones`, `05_interoperabilidad_gedcom`.
- Gate tecnico ejecutado y en verde:
  - `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts src/tests/gedcom.test.ts`
  - `npx vitest run src/tests/ged.export-legacy.test.ts`
  - `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py`
- Marcado estado final del issue: `complete`.
