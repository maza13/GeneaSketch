---
status: complete
priority: p1
issue_id: "015"
tags: [gschema, edge-types, strict-lossless, compat]
dependencies: ["013"]
---

# EdgeTypes Canon + Unknown Edge Policy

## Problem Statement

El catalogo canonico de `GSchemaEdgeType` existia, pero faltaba cerrar politica operacional para tipos desconocidos en importacion de paquetes externos, lo que podia causar perdida silenciosa y fragmentacion.

## Findings

- `types.ts` enumera edge types canonicos.
- La wiki listaba tipos, pero no cerraba politica strict/compat para unknown edge types.
- Faltaba codigo/error trazable para snapshot y journal.

## Proposed Solutions

### Option 1: Politica strict/compat explicita (Recommended)
- strict-lossless: rechazo critico (`EDGE_TYPE_UNKNOWN` / `EDGE_TYPE_UNKNOWN_IN_JOURNAL`).
- compat: no aplicar edge, preservar payload en cuarentena (`reason: unknown_edge_type`) y warning.

**Effort:** Medio  
**Risk:** Bajo-Medio

### Option 2: Ignorar desconocidos silenciosamente
- Omitir edge no reconocido sin cuarentena.

**Effort:** Bajo  
**Risk:** Muy alto

## Recommended Action

Aplicar Option 1 en engine + docs + pruebas de import externo.

## Acceptance Criteria

- [x] Regla strict/compat para edge desconocido implementada.
- [x] Codigo de validacion/error `EDGE_TYPE_UNKNOWN` agregado.
- [x] En compat, edge desconocido queda preservado en cuarentena.
- [x] `03_modelo` documenta politica de extensibilidad sin ambiguedad.

## Work Log

### 2026-03-03 - Creacion del TODO fase core

**By:** Codex

**Actions:**
- Registrada fase de interoperabilidad para edge types.
- Dependencia establecida sobre issue 013.

### 2026-03-03 - Implementacion Fase 015 cerrada

**By:** Codex

**Actions:**
- Se agrego helper runtime `EdgeNormalization.ts` con catalogo canonico y detectores de unknown edges/ops.
- `validation.ts` ahora marca `EDGE_TYPE_UNKNOWN` y corta validacion de esa arista.
- `GskPackage.importGskPackage` implementa politica completa:
  - strict: falla por unknown edge en snapshot (`EDGE_TYPE_UNKNOWN`) o journal (`EDGE_TYPE_UNKNOWN_IN_JOURNAL`).
  - compat: quaratina payload y no aplica arista desconocida (snapshot y journal).
- `Journal.ts` ahora reporta `skippedUnknownEdges` y quarantinea `ADD_EDGE` desconocido durante apply/replay.
- Docs sincronizadas en `03_modelo.md` y `04_operaciones.md`.
- Tests agregados para strict/compat en snapshot y journal.

