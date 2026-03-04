---
status: complete
priority: p1
issue_id: "010"
tags: [cleanup, legacy, engine]
dependencies: ["001"]
---

# Total removal of Legacy Engine

Complete the decoupling of the UI from the legacy `GeneaDocument` structure and remove the redundant state.

## Problem Statement

The application currently maintains a dual-state architecture:
1. `gschema`: The new, canonical Graph-based state.
2. `document`: The legacy JSON-based state, kept for backward compatibility and during the transition.

With Issue `001` completed, all mutations now flow through the Graph. Keeping the legacy state consumes memory and adds complexity (projection overhead).

## Recommended Action

1. **Phase 1: Deprecation check**
   - Ensure no UI components are reading directly from `state.document`.
   - Audit `DocSlice.ts` for remaining legacy calls.

2. **Phase 2: State Removal**
   - Remove `document` from `DocState` interface.
   - Delete `gschemaToDocument` projection logic.
   - Remove `document` initialization from `DocSlice`.

3. **Phase 3: Typings Cleanup**
   - Remove legacy `GeneaDocument`, `Person`, `Family` types if they are no longer used anywhere else (e.g., old exports).

## Acceptance Criteria

- [x] Clean build with no references to `state.document`.
- [x] `DocSlice` state only contains `gschema`.
- [x] Application starts and loads files correctly using only the `gschema` engine.

## Work Log

### 2026-03-03 - Definition
Defined as the primary task for 0.5.0 stability.


### 2026-03-04 - Hard-cut execution restarted (phase split 049-055)

**By:** Codex

**Actions:**
- Split issue 010 into executable phased todos (049-055) with explicit dependencies and acceptance gates.
- Implemented initial phases: graph-only loading path, session snapshot v7, recent payload v2, and runtime migration scaffolding.
- Validated build and targeted tests (`store`, `store.recent-files`, `session.service`).

### 2026-03-04 - Reinicio implementacion hard-cut

**By:** Codex

**Actions:**
- Corregido fallo SSR en StandardModal (document is not defined) para tests sin DOM.
- Removido shim loadFromImport del store (contrato graph-only efectivo).
- Session snapshot fijado a v7 graph-only, sin restore por document.
- Gates completos en verde (npm run build, npm test, grep hard-cut).

### 2026-03-04 - Cierre oficial de la épica 010

**By:** Codex

**Actions:**
- Bloque 049-055 completado y marcado como complete.
- Contrato de runtime consolidado en graph-only (sin loadFromImport y sin restore legacy por document).
- Validación final en verde: npm run build, npm test, grep hard-cut y grep core crítico.

