---
note_id: "N0009"
kind: "note"
phase: "active"
active_state: "on_hold"
archive_reason: null
complexity: "complex"
connectivity: "interconnected"
horizon: "near"
title: "Riesgo GSK: dependencia UI en proyeccion legacy"
source_type: "user_requested"
source_context: null
tags: ["gsk", "ui", "read-model", "legacy"]
related_notes: ["N0001", "N0002", "N0003", "N0008", "N0007"]
related_paths: ["src/core/read-model/selectors.ts", "src/core/gschema/GedcomBridge.ts", "src/state/slices/docSlice.ts"]
related_todos: []
promoted_todos: []
relevance_score: 74
confidence: "medium"
priority_hint: "p2"
effort_hint: "l"
created_at: "2026-03-05"
updated_at: "2026-03-05"
last_reviewed_at: "2026-03-05"
review_after: "2026-03-19"
---



# Riesgo GSK: dependencia UI en proyeccion legacy

## Context

La UI principal consume proyeccion legacy (`gschemaToDocument`) para mantener compatibilidad. Esta capa alimenta slices/selectores de uso transversal y reduce friccion de migracion, pero abstrae detalles nativos de claims.

El costo de esta estrategia aparece al intentar evolucionar capacidades nativas:
- versionado por operaciones (branch/review/merge a nivel op/claim),
- evidencia estricta (citations/evidenceGate visibles y editables),
- trazabilidad fina por claim.

## Insight

El riesgo es de arquitectura incremental: si la UI sigue acoplada demasiado tiempo al modelo legacy, cada feature avanzada requerira puentes de conversion adicionales.

Esto no bloquea la version 0.5.0, pero si eleva el costo de evolucion en N0002/N0003. Por eso N0009 depende explicitamente de N0008 (encapsulacion) y N0007 (journal-only writes) antes de una migracion UI amplia.

## Proposed Actions

- Cerrar N0008: exponer API publica para registrar INITIAL_IMPORT y eliminar acceso a internals privados.
- Cerrar N0007: asegurar write-path journal-only para evitar estado fuera de opSeq.
- Definir read-model GSchema directo minimo para paneles clave (persona, familia, timeline), en paralelo con proyeccion legacy.
- Implementar migracion por fases con feature flag:
  - fase 1: lectura nativa en panel de detalle de persona,
  - fase 2: timeline/relaciones con claims/citations,
  - fase 3: retiro gradual de acoplamiento legacy en rutas criticas.
- Criterio de salida:
  - 0 mutaciones directas sin journal en flujos UI cubiertos,
  - cobertura funcional de claims/citations/evidenceGate en paneles migrados,
  - paridad de comportamiento validada por tests de regresion UI + gschema/merge.

## Evolution Log

### 2026-03-05 - Entry created

- Source type: user_requested
- Source context: n/a

### 2026-03-05 - Entry updated

- Reason: Not ready to promote: blocked by N0008/N0007 and missing explicit migration exit criteria
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Deep re-analysis v2 with phased migration plan and measurable exit criteria
- Updated manually with detailed technical scope

### 2026-03-05 - Entry updated

- Reason: Deep re-analysis v2: phased migration and dependency chain refined
- Updated via notes:update
