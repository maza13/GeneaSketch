---
status: complete
priority: p1
issue_id: "027"
tags: [gschema, compat, repair, journal, provenance]
dependencies: ["023"]
---

# Reparaciones Compat Auditables (`REPAIR_*`)

## Problem Statement

En `compat`, se reparan estructuras (union sintetica/relink) sin operaciones explicitas en journal, reduciendo trazabilidad.

## Findings

- La reparacion actual produce warnings pero no eventos journal dedicados.
- Falta marca formal de sintetico y metodo de reparacion.

## Proposed Solutions

### Option 1: introducir operaciones `REPAIR_*` (Recommended)

**Approach:** registrar cada reparacion compat con tipo canonico y metadata sintetica.

**Effort:** Medio-Alto  
**Risk:** Medio

## Recommended Action

Agregar tipos `REPAIR_*` en operaciones y registrar: creacion de union, edges member sinteticos y relink de parentchild.

## Technical Details

**Affected files:**
- `src/core/gschema/types.ts`
- `src/core/gschema/Journal.ts`
- `src/core/gschema/GskPackage.ts`
- `src/core/gschema/FamilyNormalization.ts`
- `src/tests/gschema.compat-repair.test.ts` (nuevo)

## Acceptance Criteria

- [x] Toda reparacion compat queda en journal con op explicita.
- [x] Cada op incluye marca sintetica/provenance.method.
- [x] Replay/import/export preserva trazabilidad.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Se definio alcance de operaciones de reparacion y puntos de enganche.

**Learnings:**
- Sin `REPAIR_*`, la topologia final puede parecer evidencia primaria.



### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Operaciones REPAIR_* implementadas para reparaciones compat auditables.
- Se actualizaron codigo, pruebas y documentacion asociada al issue.
- Se ejecuto validacion tecnica con vitest y checks de enlaces wiki.

**Results:**
- Acceptance criteria completados y verificados en esta iteracion.
- Estado del issue actualizado a complete.

**Learnings:**
- La trazabilidad por tarea reduce drift entre contrato wiki y runtime.


