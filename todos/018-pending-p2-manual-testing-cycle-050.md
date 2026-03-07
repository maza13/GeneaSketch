---
status: pending
priority: p2
issue_id: "018"
tags: [qa, testing, uat]
dependencies: ["010"]
---

# Manual Testing Cycle & UX Polishing

Final validation gate for GeneaSketch 0.5.0 Stable.

## Problem Statement

After the massive architectural shift (GSchema hardening and Legacy Engine removal), we need a comprehensive manual verification to catch edge cases that automated tests might miss, specifically regarding **Visual Engine** parity (DTree D3 rendering) and **App Shell (UI)** responsiveness/visual regressions.

## Recommended Action

1. **Exploratory Testing**
   - Import diverse GEDCOM files.
   - Perform complex edits (multipareja, children with uncertain nature).
   - Check undo/redo reliability.

2. **UX Audit**
   - Verify premium aesthetics (glassmorphism, animations).
   - Ensure `WikiPanel` renders correctly after the engine shift.
   - Check `Error Boundaries` (if implemented in 006) or general app stability.

3. **Performance Check**
   - Verify graph projection speed on large trees.

## Acceptance Criteria

- [ ] Zero critical UI bugs found during the testing cycle.
- [ ] No regression in data persistence (Save/Load).
- [ ] Sign-off for 0.5.0 Stable release.

## Work Log

### 2026-03-03 - Definition
Defined as the final gate for 0.5.0 stability.


### 2026-03-04 - Postergado por repriorización
**By:** Codex

**Actions:**
- Se posterga el ciclo manual 018 para después de resolver 021.
- Estado cambiado a pending según protocolo file-todos (no existe cancelled).


### 2026-03-05 - Reducción de Prioridad
**By:** Antigravity

**Actions:**
- Se redujo la prioridad del ciclo manual de p1 a p2 a petición del usuario para priorizar las tareas de arquitectura en N0008.

