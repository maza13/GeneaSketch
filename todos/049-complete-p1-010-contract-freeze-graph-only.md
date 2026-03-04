---
status: complete
priority: p1
issue_id: "049"
tags: [gsk-core, store, api, hard-cut]
dependencies: ["010"]
---

# Contract Freeze: Graph-Only Store API

## Problem Statement
El store mantiene rutas mixtas de carga (`document` y `graph`) y no tiene una señal explícita de invalidación para mutaciones in-place del grafo.

## Findings
- Se introdujo `loadGraph` y `graphRevision` en `DocSlice`.
- Persisten llamadas legacy de compatibilidad (`loadFromImport`) para no romper pruebas/módulos en transición.

## Proposed Solutions
### Option 1: Hard freeze con capa de compat temporal (Recommended)
Congelar la API principal en `loadGraph` y dejar `loadFromImport` como shim interno hasta completar migración total de llamadas.

## Recommended Action
1. Mantener `loadGraph` como contrato oficial.
2. Eliminar llamadas directas legacy en runtime.
3. Mantener shim temporal solo mientras se completa 051/052.

## Acceptance Criteria
- [x] `DocSlice` expone `loadGraph` con `source`.
- [x] `graphRevision` incrementa en mutaciones.
- [x] No quedan llamadas runtime a `loadFromImport`.

## Work Log
### 2026-03-04 - Inicialización fase 049
**By:** Codex

**Actions:**
- Implementado `loadGraph` + `graphRevision`.
- Añadido shim `loadFromImport` temporal para transición.

### 2026-03-04 - Hard-cut store contract final
**By:** Codex

**Actions:**
- Eliminado loadFromImport del contrato DocSlice y de docSlice.ts.
- Validado con rg -n "\\bloadFromImport\\b" src => 0.

