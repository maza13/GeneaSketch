---
status: complete
priority: p1
issue_id: "022"
tags: [gschema, integrity, canonical-json, rfc8785]
dependencies: []
---

# JSON Canonicalization RFC8785 (JCS)

## Problem Statement

La integridad actual depende de hashes sobre bytes de serializacion no normada globalmente. Distintos runtimes pueden generar JSON semanticamente equivalente con bytes diferentes.

## Findings

- `graphHash` y `journalHash` se calculan sobre serializacion actual, no sobre canon RFC8785.
- El contrato actual menciona bytes exactos, pero no canon de serializacion total.
- Esto introduce riesgo de falsos negativos cross-runtime.

## Proposed Solutions

### Option 1: Adoptar RFC8785 (Recommended)

**Approach:** agregar canon JCS reusable y usarlo como base de hashing de integridad.

**Pros:**
- Determinismo entre runtimes.
- Base solida para `packageHash`.

**Cons:**
- Requiere migracion de hashes legacy.

**Effort:** Medio  
**Risk:** Bajo

### Option 2: Canon custom ad-hoc

**Approach:** reglas manuales de orden de claves y normalizacion.

**Pros:**
- Menor dependencia conceptual externa.

**Cons:**
- Mayor riesgo de drift y bugs de borde.

**Effort:** Medio  
**Risk:** Medio

## Recommended Action

Implementar `src/core/gschema/canonicalJson.ts` con canon RFC8785 para objetos GSK y usarlo para hashing en nuevos campos de integridad, preservando lectura legacy.

## Technical Details

**Affected files:**
- `src/core/gschema/canonicalJson.ts` (nuevo)
- `src/core/gschema/GskPackage.ts`
- `src/core/gschema/Journal.ts`
- `src/tests/gschema.canonicalization.test.ts` (nuevo)

## Acceptance Criteria

- [x] Existe modulo de canon JSON RFC8785 reutilizable.
- [x] Hashing de integridad nuevo usa bytes UTF-8 canonicos.
- [x] Carga de paquetes legacy sigue funcionando.
- [x] Test de determinismo cross-serialization en verde.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Se definio el alcance de canon JSON y su dependencia cero.
- Se establecio que esta tarea desbloquea catalogo y paquete integral.

**Learnings:**
- Sin canon global, cualquier estrategia de package integrity queda fragil.



### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Modulo canonical JSON RFC8785/JCS implementado y hashing canonico habilitado.
- Se actualizaron codigo, pruebas y documentacion asociada al issue.
- Se ejecuto validacion tecnica con vitest y checks de enlaces wiki.

**Results:**
- Acceptance criteria completados y verificados en esta iteracion.
- Estado del issue actualizado a complete.

**Learnings:**
- La trazabilidad por tarea reduce drift entre contrato wiki y runtime.


