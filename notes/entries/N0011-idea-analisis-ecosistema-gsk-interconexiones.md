---
note_id: "N0011"
kind: "idea"
phase: "archived"
active_state: null
archive_reason: "promoted"
complexity: "complex"
connectivity: "interconnected"
horizon: "mid"
title: "Analisis ecosistema GSK: interconexiones y estructura"
source_type: "user_requested"
source_context: null
tags: ["architecture", "ecosystem", "gsk-format", "engine", "visual-engine", "hard-cut"]
related_notes: ["N0007", "N0008", "N0009", "N0010"]
related_paths: ["docs/wiki-software/09_ecosistema_arquitectura.md", "src/hooks/useGskFile.ts", "src/core/gschema/GskPackage.ts", "src/core/read-model/selectors.ts"]
related_todos: ["099", "100", "101", "102", "103", "104"]
promoted_todos: ["100", "101", "102", "103", "104"]
relevance_score: 81
confidence: "medium"
priority_hint: "p2"
effort_hint: "m"
created_at: "2026-03-06"
updated_at: "2026-03-06"
last_reviewed_at: "2026-03-06"
review_after: "2026-03-20"
---

# Analisis ecosistema GSK: interconexiones y estructura

## Context

Existe una duda arquitectonica legitima sobre como se conectan las piezas del ecosistema GSK y donde estan las fronteras reales entre:
- formato `.gsk`
- package IO / carga de archivo
- GSchema Engine
- read model / projection layer
- Visual Engine
- App Shell / UI
- State Manager
- AI Assistant

La pregunta central no es solo "como se lee un archivo", sino que tanto del comportamiento del sistema depende del formato, del motor o de puentes heredados entre capas. Esta nota depende conceptualmente de `N0010`: primero conviene definir que sistemas existen y como se nombran; despues mapear como se interconectan y dependen entre si.

## Insight

Esta idea tiene valor estrategico vigente. Ayuda a ordenar el trabajo que quedo pendiente para `0.6.0`, especialmente en lo relacionado con:
- eliminar fallbacks legacy
- reducir bridges innecesarios entre `GraphDocument` y `GSchemaGraph`
- clarificar que el formato `.gsk` es frontera de persistencia/IO, no el centro semantico de todo el sistema
- documentar el flujo de dependencias para evitar acoplamientos accidentales
- evaluar si en el futuro puede existir mas de un motor, mas de un Visual Engine o varias estrategias de visualizacion sin romper la separacion estructural

Su uso correcto no es como fix inmediato de `0.5.0`, sino como marco de analisis para abrir luego el hard cut y la arquitectura futura.

## Proposed Actions

- Conservar esta nota como insumo directo para [099](c:/My_Projects/GeneaSketch/todos/099-pending-p2-060-hard-cut-preparation.md).
- Derivar desde aqui un mapa explicito de dependencias y un diagrama del flujo:
  - `.gsk -> package IO -> GSchema Engine -> read model -> Visual Engine -> App Shell`
- Verificar que partes son boundaries legitimos y cuales son deuda o coupling temporal.
- Mantener la nota alineada con la taxonomia de `N0010` para no analizar interconexiones sobre nombres ambiguos.

## Promotion Blocks

- System taxonomy baseline
- Dependency flow map
- Format vs engine boundary audit
- Boundary vs coupling classification

## Evolution Log

### 2026-03-06 - Entry created

- Source type: user_requested
- Source context: n/a

### 2026-03-06 - Entry normalized to schema v2

- Reason: fix invalid metadata/schema and preserve the note as an architecture input for TODO 099
- Updated manually with valid frontmatter, required sections, and UTF-8-safe text

### 2026-03-06 - Promoted to TODO

- Created TODO ids: 100, 101, 102, 103, 104
- Mode: complex
- Source: notes:promote via file-todos template

### 2026-03-06 - Promotion basis clarified

- Reason: align the note with N0010 taxonomy and define logical promotion blocks for future promotions
- Updated manually with explicit system boundaries and `## Promotion Blocks`
