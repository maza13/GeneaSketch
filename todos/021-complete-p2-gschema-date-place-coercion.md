---
status: complete
priority: p2
issue_id: "021"
tags: [core-engine, gschema, dates, places, robustness]
dependencies: []
---

# Robust Coercion of Informal Dates and Places

## Problem Statement
GEDCOM files often contain "informal" or non-standard date strings or places that lack the standard `PLAC` hierarchy. If the bridge cannot formalize these, they may be lost or result in broken UI elements (like a Timeline that says "Invalid Date").

## Findings
- The current bridge expects strict GEDCOM date formats for `EVENT_DATE` claims.
- Place handling requires `GeoRef` structures or standard strings.

## Proposed Solutions

### Option 1: Strict Validation (Current)
Ignore or quarantine non-standard strings.
- **Pros:** Keeps data clean.
- **Cons:** Users lose contextual information.

### Option 2: Graceful Coercion (Recommended)
Store non-standard strings in a fallback `raw` claim or as a generic `NOTE` attached to the event, ensuring the UI can still display the user's intended text.

## Recommended Action
1. Auditar en GedcomBridge.ts todos los puntos donde fecha/lugar no estándar se descartan o normalizan agresivamente.
2. Definir contrato de fallback para fechas/lugares informales (raw + render-safe para timeline/UI).
3. Implementar coerción reversible en bridge y serialización, sin perder texto original.
4. Añadir tests de regresión para entradas informales (parse/import/render/export).

## Acceptance Criteria
- [x] Failure points for non-standard dates/places identified.
- [x] Fallback mechanism implemented in `GedcomBridge.ts`.
- [x] Timeline panel displays informal date strings correctly.

## Work Log

### 2026-03-03 - Item Discovery
**By:** Claude Code (Antigravity)
**Actions:** Highlighted the risk of silent data loss for informal dates/places.


### 2026-03-04 - Promovido a plan activo
**By:** Codex

**Actions:**
- Repriorizado como foco actual del trabajo.
- Estado cambiado a ready para ejecución.
- Recommended Action concretado en pasos implementables.

### 2026-03-04 - Implementación y cierre técnico de 021
**By:** Codex

**Actions:**
- Estandarizado bridge export/import con contrato lossless de informalidad:
  - `ParsedDate.raw`/`isInformal` como fuente para export de eventos.
  - `GeoRef.placeRaw` extraído de forma robusta en personas y uniones.
  - Regla de espejo opcional a NOTE inline para fechas informales ambiguas (sin año explícito): `GSK_RAW_DATE ...`.
- Corregido export de lugares en eventos de unión (`MARR`/`DIV`) para evitar pérdida por cast incorrecto a `string`.
- Ajustado timeline core para no tapar fechas informales del usuario con inferencia automática:
  - En nacimientos, inferencia solo si no existe ninguna señal de fecha.
- Ajustada UI timeline:
  - Lista agrupa no ordenables bajo sección `Undated`.
  - `PersonalTimeline` deja de descartar eventos `undated` y los muestra al final en bloque `Undated`.
- Añadidas pruebas:
  - `src/tests/gschema.golden.test.ts` (export de fecha/lugar informal en uniones + mirror note opcional).
  - `src/tests/timeline.informal.test.ts` (normalización y presencia de eventos informales no ordenables en timeline).
- Validación ejecutada:
  - `npx vitest run src/tests/gschema.golden.test.ts src/tests/timeline.informal.test.ts` ✅
  - `npm run build` ✅

