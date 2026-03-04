---
status: complete
priority: p2
issue_id: "028"
tags: [gschema, security, manifest, contract]
dependencies: ["023", "025"]
---

# Contrato Operativo de Seguridad (Reservado Explicito)

## Problem Statement

Los campos `signature` y `encryption` existen, pero sin contrato operativo completo, generando ambiguedad.

## Findings

- Se exporta `none`, pero sin especificar alcance/algoritmo/formato validable.
- Riesgo de falsa sensacion de seguridad e incompatibilidades futuras.

## Proposed Solutions

### Option 1: declarar `security` reservado en 0.4.0 (Recommended)

**Approach:** mover a bloque formal `security` y normar que en 0.4.0 solo `mode: none` esta implementado.

**Effort:** Medio  
**Risk:** Bajo

## Recommended Action

Introducir bloque `security` versionado y politica por modo para valores no soportados.

## Technical Details

**Affected files:**
- `src/core/gschema/types.ts`
- `src/core/gschema/GskPackage.ts`
- `docs/wiki-gsk/02_formato.md`
- `src/tests/gschema.security-contract.test.ts` (nuevo)

## Acceptance Criteria

- [x] Runtime y docs alineados en estado reservado/no implementado.
- [x] Valores no soportados: strict/audit error, compat warning.
- [x] Lectura legacy `signature/encryption` preservada.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Se definio estrategia de transicion sin prometer seguridad inexistente.

**Learnings:**
- Claridad contractual es critica antes de habilitar criptografia real.



### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Bloque security normativo implementado; modos no soportados controlados.
- Se actualizaron codigo, pruebas y documentacion asociada al issue.
- Se ejecuto validacion tecnica con vitest y checks de enlaces wiki.

**Results:**
- Acceptance criteria completados y verificados en esta iteracion.
- Estado del issue actualizado a complete.

**Learnings:**
- La trazabilidad por tarea reduce drift entre contrato wiki y runtime.


