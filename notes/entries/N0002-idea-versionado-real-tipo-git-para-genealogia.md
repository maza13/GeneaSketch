---
note_id: "N0002"
kind: "idea"
phase: "active"
active_state: "candidate"
archive_reason: null
complexity: "complex"
connectivity: "interconnected"
horizon: "mid"
title: "Versionado real tipo Git para genealogía"
source_type: "user_requested"
source_context: null
tags: ["core", "data-model", "killer-feature"]
related_notes: ["N0001", "N0003", "N0004", "N0005", "N0006"]
related_paths: ["src/core/gschema/GSchemaGraph.ts", "src/core/gschema/Journal.ts", "src/core/gschema/JournalMerge.ts", "src/core/gschema/GskPackage.ts", "src/state/slices/docSlice.ts", "src/core/gschema/GedcomBridge.ts", "docs/wiki-gsk/02_formato.md", "docs/wiki-gsk/04_operaciones.md"]
related_todos: []
promoted_todos: []
relevance_score: 68
confidence: "high"
priority_hint: "p2"
effort_hint: "l"
created_at: "2026-03-04"
updated_at: "2026-03-05"
last_reviewed_at: "2026-03-05"
review_after: "2026-03-20"
---









# Versionado real tipo Git para genealogía

## Context

El usuario propuso integrar un historial granular por entidad (persona/relación/evento/fuente), que permita crear "ramas" para explorar diferentes hipótesis de investigación, y luego hacer "merge" o revertir cambios.
Se acordó registrar esta idea en el sistema de notas para considerarla a futuro.

## Insight

**Beneficios (Impacto Masivo):**
- Resuelve la incertidumbre en la investigación, permitiendo crear ramas de "hipótesis", por ejemplo: "Rama donde Pedro y Juan son hermanos" vs "Rama donde son primos", probar con evidencia y consolidar la rama ganadora con un "merge".
- Ningún software local o web lo resuelve de manera "Git-like" para usuarios estándar.
- Ofrece revertir errores fácilmente en el árbol ("Undo/Revert temporal").

**Retos Técnicos:**
- Complejidad alta en el motor `GSchema` (`.gsk`), requiere transicionar de estados mutables a estados inmutables / *event sourcing*.
- Interfaz gráfica (UI) para resolver conflictos ("merge conflicts") que sea amigable y no asuste a un usuario no programador.

## Proposed Actions

- Evaluar factibilidad de *Event Sourcing* para la siguiente iteración mayor del esquema `GSchema`.
- Diseñar y prototipar un panel visual tipo "Árbol de Historial de Entidad".
- Mantener en estado `candidate` hasta la próxima reunión de roadmap técnico.

## Evolution Log

### 2026-03-04 - Entry created

- Source: Conversación con el usuario
- Decision: Guardado como idea candidata

### 2026-03-05 - Context refresh (deep-analysis)

- Changelog anchor: 4 de marzo de 2026 - Nota de arquitectura (Cierre DTree V3 065-072)
- Updates: relevance_score 90 -> 100

### 2026-03-05 - Entry updated

- Reason: Recalibracion conservadora: impacto alto pero aun sin definicion ejecutable ni vinculos
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Adjusted to lower urgency while API-related strategy is still maturing
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Versionado sigue siendo prioridad media y base local/importada sin bloquearse por APIs
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Dependency map v1: Versioning is primary foundation with medium horizon and supports all capability tracks
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Deep architecture check: .gsk+journal base is solid; prioritize branchable versioning design without major rewrite
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Versioning risk log: enforce journal-only writes, remove private internals coupling, and prepare direct GSchema read-model for branch workflows
- Updated via notes:update
