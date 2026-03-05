---
note_id: "N0007"
kind: "note"
phase: "archived"
active_state: null
archive_reason: "promoted"
complexity: "complex"
connectivity: "interconnected"
horizon: "near"
title: "Riesgo GSK: mutaciones fuera de journal"
source_type: "user_requested"
source_context: null
tags: ["gsk", "journal", "integrity", "versioning"]
related_notes: ["N0001", "N0002", "N0003", "N0008", "N0009"]
related_paths: ["src/state/slices/docSlice.ts", "src/core/gschema/Journal.ts", "src/core/gschema/GSchemaGraph.ts"]
related_todos: ["079", "080", "081", "082"]
promoted_todos: ["079", "080", "081", "082"]
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

- Paso 1: Inventario y cierre de write paths directos.
  - Ejecutar barrido de mutaciones fuera de API publica en slices/hooks/servicios.
  - Clasificar cada hallazgo como: `eliminar`, `redirigir a API oficial`, `dejar temporalmente con guardrail`.
  - Criterio: lista cerrada de write paths y decision tecnica por cada uno.
- Paso 2: Ruta oficial journalizada para mutaciones de nota.
  - Implementar/usar metodo publico del engine para `updateNoteRecord` (sin acceso a internals privados).
  - Reemplazar mutacion directa en `docSlice` y flujos UI equivalentes.
  - Criterio: toda edicion de nota relevante pasa por una ruta que registra operacion en journal.
- Paso 3: Blindaje de contrato y regresion.
  - Test de contrato: cada mutacion persistida incrementa `journalLength` o deja op verificable.
  - Test de regresion para `updateNoteRecord` y para invalidez de cache de proyeccion (`graphId:journalLength`).
  - Criterio: `gschema.strict` y `gschema.regression` en verde, sin excepciones nuevas.

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

### 2026-03-05 - Entry updated

- Reason: Compact execution design for TODO promotion (3 detailed steps)
- Updated manually before promote

### 2026-03-05 - Promoted to TODO

- Created TODO ids: 079, 080, 081, 082, 083
- Mode: complex
- Source: notes:promote via file-todos template

### 2026-03-05 - Promotion refined

- Reason: reduce execution steps while keeping detailed acceptance criteria
- Active TODO plan consolidated to: 079, 080, 081, 082
