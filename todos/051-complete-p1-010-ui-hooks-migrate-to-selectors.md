---
status: complete
priority: p1
issue_id: "051"
tags: [ui, hooks, migration, selectors]
dependencies: ["050"]
---

# UI/Hooks Migration to Selector Contracts

## Problem Statement
Hooks y vistas siguen tipadas contra `GeneaDocument` en gran parte del runtime.

## Findings
- Se migraron puntos críticos (`App`, `useGskFile`, `useAiAssistant`) a `loadGraph`.
- Queda barrido amplio de tipado en `src/ui/**` y `src/views/**`.

## Proposed Solutions
### Option 1: Mechanical type migration + functional validation (Recommended)
Reemplazar tipos runtime por `GraphDocument` y validar build/tests por lotes.

## Recommended Action
1. Completar reemplazo de `GeneaDocument` en `hooks/ui/views`.
2. Verificar que no cambie comportamiento funcional.

## Acceptance Criteria
- [x] `rg -n "\bGeneaDocument\b" src/hooks src/ui src/views` devuelve 0.
- [x] Build compila tras migración parcial.
- [x] Flujo UI crítico validado manualmente.

## Work Log
### 2026-03-04 - Migración parcial
**By:** Codex

**Actions:**
- Migración inicial de tipos y contratos en hooks clave.

### 2026-03-04 - Hard-cut type sweep runtime
**By:** Codex

**Actions:**
- Verificado barrido de runtime: rg -n "\bGeneaDocument\b" src/hooks src/ui src/views => 0.
- Suite completa en verde tras migración (npm run build, npm test).

### 2026-03-04 - Validación funcional de UI
**By:** Codex

**Actions:**
- Ejecutada suite completa de regresión con foco en UI/hook flows (store/search/timeline/merge/IA).
- Build y test global en verde tras migración de contratos selector-based.

