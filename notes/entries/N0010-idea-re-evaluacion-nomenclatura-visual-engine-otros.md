---
note_id: "N0010"
kind: "idea"
phase: "active"
active_state: "validated"
complexity: "complex"
connectivity: "interconnected"
horizon: "mid"
title: "Re-evaluacion de nomenclatura de sistemas del proyecto"
source_type: "user_requested"
source_context: null
tags: ["architecture", "naming", "taxonomy", "engine", "visual-engine", "state-manager", "ai"]
related_notes: ["N0011"]
related_paths: ["docs/wiki-software/09_ecosistema_arquitectura.md", "docs/wiki-uxdesign/02_stack_y_arquitectura_ui.md", "todos/097-complete-p1-formalize-visual-engine-vs-ui-distinction.md"]
related_todos: ["097"]
promoted_todos: []
relevance_score: 84
confidence: "high"
priority_hint: "p1"
effort_hint: "m"
created_at: "2026-03-06"
updated_at: "2026-03-06"
last_reviewed_at: "2026-03-06"
review_after: "2026-03-20"
---

# Re-evaluacion de nomenclatura de sistemas del proyecto

## Context

La necesidad real de esta nota no es solo distinguir `Visual Engine` de `App Shell / UI`. El punto de fondo es revisar si los nombres actuales de los sistemas principales del proyecto representan bien su rol, su frontera y su capacidad de evolucion futura.

Los sistemas que hoy interesa revisar conceptualmente incluyen, como minimo:
- GSchema Engine / motor
- Visual Engine
- App Shell / UI
- State Manager
- AI Assistant
- formato `.gsk` / package IO
- read model / projection layer
- Workspace Profile / Knowledge System si se mantienen como bloques

La pregunta no es solo "como llamarlo bonito", sino si la taxonomia actual ayuda o estorba para pensar el sistema como un conjunto de bloques separables. Esto importa especialmente si en el futuro se quiere:
- agregar mas de un Visual Engine
- experimentar con distintas visualizaciones o modos de prueba
- cambiar o duplicar motores
- desacoplar capas para evolucionarlas por separado

## Insight

Esta nota es una exploracion de taxonomia arquitectonica, no una tarea de rename inmediato.

Su valor esta en obligar a responder preguntas como:
- cuales son realmente sistemas independientes y cuales son solo implementaciones actuales
- que nombres describen una capacidad estable y cuales describen una tecnologia accidental del momento
- donde estamos nombrando por implementacion (`DTree V3`, `Zustand`) y donde convendria nombrar por rol (`Visual Engine`, `State Manager`)
- que nombres servirian mejor si manana existe mas de un engine, mas de un renderer o mas de una estrategia de visualizacion

En ese sentido, `097` resolvio una confusion puntual y necesaria, pero no agota esta nota. `097` fijo una frontera minima de lenguaje; esta nota va un nivel mas arriba y pregunta si toda la nomenclatura de sistemas del proyecto esta bien planteada.

## Proposed Actions

- Conservar esta nota como base para una futura auditoria de taxonomia de sistemas.
- Cuando se decida hacer ese analisis, evaluar al menos estas preguntas por cada sistema principal:
  - nombre actual
  - responsabilidad real
  - boundary real
  - nombre por rol vs nombre por implementacion
  - riesgo de que el nombre quede corto si el sistema evoluciona
- Usar esta nota como prerequisito conceptual de `N0011`, porque primero conviene definir que bloques existen y como queremos nombrarlos, antes de mapear profundamente sus interconexiones.
- No promoverla a implementacion inmediata mientras no se abra explicitamente una fase de analisis arquitectonico.

## Evolution Log

### 2026-03-06 - Entry created

- Source type: user_requested
- Source context: n/a

### 2026-03-06 - Entry normalized to schema v2

- Reason: fix invalid metadata/schema and preserve the note as historical conceptual context after TODO 097 completion
- Updated manually with valid frontmatter, required sections, and UTF-8-safe text

### 2026-03-06 - Entry reframed as system taxonomy analysis

- Reason: clarify that the note is about naming the major systems of the project, not only the Visual Engine vs UI distinction
- Updated manually to reflect future-facing taxonomy and boundary analysis
