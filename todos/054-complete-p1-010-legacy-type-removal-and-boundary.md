---
status: complete
priority: p1
issue_id: "054"
tags: [cleanup, legacy, boundaries]
dependencies: ["052", "053"]
---

# Legacy Type Removal in Runtime + Boundary Enforcement

## Problem Statement
El runtime principal aún contiene rastros de tipos/llamadas legacy.

## Findings
- Hay migración parcial.
- Se mantiene compat temporal en algunos puntos para evitar ruptura masiva.

## Proposed Solutions
### Option 1: Final hard-cut cleanup (Recommended)
Eliminar compat temporal y restringir legado solo a boundaries permitidos.

## Recommended Action
1. Retirar shim `loadFromImport` cuando 051/052 cierren.
2. Validar grep de runtime libre de contratos legacy.

## Acceptance Criteria
- [x] `src/state src/hooks src/ui src/views src/io/sessionService.ts` sin `GeneaDocument`.
- [x] Sin dependencias legacy fuera de boundaries explícitos.

## Work Log
### 2026-03-04 - Cleanup preparado
**By:** Codex

**Actions:**
- Definida fase de eliminación final de compat temporal.

### 2026-03-04 - Boundary enforcement pass
**By:** Codex

**Actions:**
- Eliminada compatibilidad loadFromImport del runtime.
- Eliminada restauración legacy por document en sesión; restore queda graph-only v7.


### 2026-03-04 - Verificación de boundaries final
**By:** Codex

**Actions:**
- Validado runtime + core crítico sin GeneaDocument por grep.
- Confirmado uso de gschemaToDocument limitado a boundaries permitidos de export/bridge/tests.

