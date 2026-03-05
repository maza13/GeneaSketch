---
note_id: "N0008"
kind: "note"
phase: "archived"
active_state: null
archive_reason: "promoted"
complexity: "complex"
connectivity: "interconnected"
horizon: "near"
title: "Riesgo GSK: acoplamiento a internals privados"
source_type: "user_requested"
source_context: null
tags: ["gsk", "internals", "journal", "architecture"]
related_notes: ["N0002", "N0003", "N0007", "N0009"]
related_paths: ["src/core/gschema/GedcomBridge.ts", "src/core/gschema/Journal.ts", "src/core/gschema/GSchemaGraph.ts"]
related_todos: ["074", "075", "076", "077", "078"]
promoted_todos: ["074", "075", "076", "077", "078"]
relevance_score: 80
confidence: "medium"
priority_hint: "p1"
effort_hint: "m"
created_at: "2026-03-05"
updated_at: "2026-03-05"
last_reviewed_at: "2026-03-05"
review_after: "2026-03-12"
---



# Riesgo GSK: acoplamiento a internals privados

## Context

En el flujo de import existen accesos directos a internals (`_journal`, `_nextOpSeq`) mediante casts estructurales para registrar `INITIAL_IMPORT`. Tambien hay capa de replay/aplicacion que opera sobre internals de `GSchemaGraph`.

Aunque funciona hoy, este patron evita la API publica del engine y acopla comportamiento a la representacion interna concreta del grafo.

## Insight

El riesgo principal es de mantenibilidad y seguridad de contrato:

- Refactors del engine (por ejemplo para branches/changesets o politicas nuevas de opSeq) pueden romper import/replay sin errores obvios de compilacion.
- Se dificulta garantizar invariantes transversales (updatedAt, monotonia opSeq, hooks de validacion).
- Se incrementa la probabilidad de deuda circular: nuevas features tendran que conocer internals en vez de depender de API estable.

## Proposed Actions

- Exponer metodo publico explicito para `INITIAL_IMPORT` (sin acceso a `_journal`/`_nextOpSeq`).
- Encapsular apply/replay de journal en API oficial del engine (o facade interna controlada) y reducir casts a una frontera unica.
- Agregar chequeo estatico en CI para detectar accesos a `_journal`/`_nextOpSeq` fuera de modulos autorizados.
- Reforzar tests de monotonia/gap-less `opSeq` en import, replay y fast-forward.
- Definir criterio de salida:
  - no hay escrituras a internals privados fuera de la frontera autorizada.
  - import/replay operan por API estable.
  - suite gschema strict/golden/regression pasa sin bypasses.

## Evolution Log

### 2026-03-05 - Entry created

- Source type: user_requested
- Source context: n/a

### 2026-03-05 - Entry updated

- Reason: Deep re-analysis v2 with encapsulation strategy and exit criteria
- Updated manually with detailed technical scope

### 2026-03-05 - Entry updated

- Reason: Deep re-analysis v2: encapsulation scope and coupling risks refined
- Updated via notes:update

### 2026-03-05 - Promoted to TODO

- Created TODO ids: 074, 075, 076, 077, 078
- Mode: complex
- Source: notes:promote via file-todos template
