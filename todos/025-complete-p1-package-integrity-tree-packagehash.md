---
status: complete
priority: p1
issue_id: "025"
tags: [gschema, integrity, packagehash, tamper]
dependencies: ["022", "023", "024"]
---

# Integridad Completa de Paquete (`packageHash`)

## Problem Statement

La integridad actual cubre parcialmente `graph`/`journal`, no el paquete completo.

## Findings

- `manifest`, `quarantine` y media quedan fuera de hash normativo global.
- No hay arbol de entradas verificables.
- Riesgo de tampering parcial no detectado.

## Proposed Solutions

### Option 1: `integrity.entries[]` + `packageHash` (Recommended)

**Approach:** declarar entradas por `path` y calcular hash total sobre preimagen canonica.

**Effort:** Medio-Alto  
**Risk:** Medio

## Recommended Action

Definir `integrity.entries[]` ordenado y `packageHash` derivado de JCS sobre dichas entradas.

## Technical Details

**Affected files:**
- `src/core/gschema/types.ts`
- `src/core/gschema/GskPackage.ts`
- `src/tests/gschema.package-integrity.test.ts` (nuevo)
- `docs/wiki-gsk/02_formato.md`

## Acceptance Criteria

- [x] Toda alteracion de artefacto relevante invalida integridad.
- [x] Politica strict/audit falla duro ante mismatch.
- [x] `compat` conserva warning trazable.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Se definio modelo de integridad por entradas para anti-tampering completo.

**Learnings:**
- El hash total necesita excluir su propio campo para evitar recursion.



### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- integrity.entries + packageHash implementados con verificacion por modo.
- Se actualizaron codigo, pruebas y documentacion asociada al issue.
- Se ejecuto validacion tecnica con vitest y checks de enlaces wiki.

**Results:**
- Acceptance criteria completados y verificados en esta iteracion.
- Estado del issue actualizado a complete.

**Learnings:**
- La trazabilidad por tarea reduce drift entre contrato wiki y runtime.


