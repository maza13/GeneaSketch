---
note_id: "N0007"
kind: "note"
phase: "active"
active_state: "candidate"
archive_reason: null
complexity: "complex"
connectivity: "interconnected"
horizon: "near"
title: "Riesgo GSK: mutaciones fuera de journal"
source_type: "user_requested"
source_context: null
tags: ["gsk", "journal", "integrity", "versioning"]
related_notes: ["N0001", "N0002", "N0003", "N0008", "N0009"]
related_paths: ["src/state/slices/docSlice.ts", "src/core/gschema/Journal.ts", "src/core/gschema/GSchemaGraph.ts"]
related_todos: []
promoted_todos: []
relevance_score: 82
confidence: "medium"
priority_hint: "p1"
effort_hint: "m"
created_at: "2026-03-05"
updated_at: "2026-03-05"
last_reviewed_at: "2026-03-05"
review_after: "2026-03-12"
---


# Riesgo GSK: mutaciones fuera de journal

## Context

Se detecto al menos un write path que muta estado de grafo sin registrar operacion en el journal. El caso visible esta en `src/state/slices/docSlice.ts` (actualizacion de texto de nota por mutacion directa del nodo).

Esto contradice el contrato .gsk documentado en `docs/wiki-gsk/02_formato.md` y `docs/wiki-gsk/04_operaciones.md`: el snapshot (`graph.json`) es canon de carga normal, pero el journal (`journal.jsonl`) es canon de auditoria/recuperacion y debe reflejar toda mutacion persistida.

Adicionalmente, la capa de proyeccion usa `graphId:journalLength` como clave de cache. Si hay write sin incremento de `journalLength`, la UI puede mantener proyeccion stale aunque el estado interno haya cambiado.

## Insight

El problema no es solo de trazabilidad historica: impacta coherencia operativa.

- Recovery: ante snapshot invalido, el replay puede perder cambios fuera de journal.
- Determinismo: dos estados con mismo journal pueden divergir si hubo writes directos.
- Evolucion a versionado real: cualquier branch/merge por operaciones requiere completitud del journal; sin eso, la base de versionado queda incompleta.

## Proposed Actions

- Inventariar writes fuera de API publica (`rg` sobre mutaciones directas en nodos/aristas/claims en slices/hooks).
- Encapsular update de notas en una ruta journalizada (GraphMutations o metodo publico del engine) y eliminar mutacion directa.
- Agregar test de contrato: cada mutacion persistida debe incrementar `journalLength` o registrar op nueva verificable.
- Agregar regresion para `updateNoteRecord` y cualquier flujo UI equivalente.
- Definir criterio de salida:
  - 0 write paths directos fuera de journal en flujos de edicion.
  - tests `gschema.strict` y `gschema.regression` en verde sin excepciones nuevas.
  - cache de proyeccion invalida correctamente tras mutaciones de nota.

## Evolution Log

### 2026-03-05 - Entry created

- Source type: user_requested
- Source context: n/a

### 2026-03-05 - Entry updated

- Reason: Deep re-analysis v2 with concrete failure modes and acceptance criteria
- Updated manually with detailed technical scope

### 2026-03-05 - Entry updated

- Reason: Deep re-analysis v2: dependencies clarified and acceptance gates tightened
- Updated via notes:update
