---
status: complete
priority: p1
issue_id: "053"
tags: [session, persistence, v7, hard-cut]
dependencies: ["049"]
---

# Session/Recent v7 Clean Cut

## Problem Statement
Persistencia de sesión y recientes usaba `document` como payload principal.

## Findings
- `SessionService` fue movido a `schemaVersion=7` mínimo.
- `SessionSnapshot` y recientes ahora soportan `graph + journal`.

## Proposed Solutions
### Option 1: Snapshot graph-only con descarte legacy (Recommended)
Persistir exclusivamente grafo/journal y descartar snapshots incompatibles.

## Recommended Action
1. Mantener hard-cut en `SessionService`.
2. Completar migración de consumo en runtime y tests restantes.

## Acceptance Criteria
- [x] `SESSION_LEGACY_MIN_SCHEMA_VERSION = 7`.
- [x] `saveAutosession` persiste `graph+journal`.
- [x] `session.service.test.ts` en verde.

## Work Log
### 2026-03-04 - Implementación v7
**By:** Codex

**Actions:**
- Migrado snapshot a `graph+journal`.
- Ajustadas pruebas de servicio de sesión.

### 2026-03-04 - Clean-cut enforced at restore path
**By:** Codex

**Actions:**
- Eliminado fallback de restore por document en sessionSlice (solo graph+journal).
- SessionSnapshot tipado a schemaVersion: 7 (sin campo document).


### 2026-03-04 - Verificación final de persistencia v7
**By:** Codex

**Actions:**
- Confirmado restore graph-only sin fallback legacy por document.
- SessionService y tests de sesión/recentes en verde después del hard-cut.

