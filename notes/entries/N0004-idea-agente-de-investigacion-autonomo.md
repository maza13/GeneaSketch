---
note_id: "N0004"
kind: "idea"
phase: "active"
active_state: "on_hold"
archive_reason: null
complexity: "complex"
connectivity: "interconnected"
horizon: "far"
title: "Agente de Investigación Autónomo"
source_type: "user_requested"
source_context: null
tags: ["ai", "automation", "future-tech"]
related_notes: ["N0001", "N0002", "N0003", "N0006"]
related_paths: []
related_todos: []
promoted_todos: []
relevance_score: 30
confidence: "medium"
priority_hint: "p3"
effort_hint: "l"
created_at: "2026-03-04"
updated_at: "2026-03-05"
last_reviewed_at: "2026-03-05"
review_after: "2026-04-22"
---






# Agente de Investigación Autónomo

## Context

El usuario visualiza un agente basado en Inteligencia Artificial donde se le da un objetivo ("encontrar padres de José, 1870, Sevilla") y este planifica, busca y retorna resultados en un informe.
La idea queda en `candidate` para futuro, considerando el ritmo al que avanza la tecnología de agentes.

## Insight

**Beneficios:**
- Accesibilidad brutal; transforma un proceso analítico complejo en un proceso guiado de "aprobar" resultados, apto para consumo masivo.
- Reduce horas de investigación y extracción de datos a unos minutos.

**Retos Técnicos:**
- Altísima complejidad arquitectónica y dependencia de LLMs para transcribir registros e inferir relaciones correctamente ("Hallucination problem").
- Navegar bases de datos externas de manera autónoma es frágil e impredecible.
- Seguridad y privacidad: El modelo necesita acceso a datos privados del árbol del usuario para cruzar información.

## Proposed Actions

- Documentar posibles enfoques "Local-first" usando modelos empaquetados localmente, que solo actúen sobre documentos que el usuario ya haya descargado, como un primer paso hacia el "Asistente Personal".
- Estudiar la madurez de proyectos de agentes de investigación *o*ut-of-the-box (como *Langchain*/*AutoGPT* adaptados a genealogía).
- **Resolver la obtención de datos**: Integrar con APIs externas (ver [N0001](N0001-idea-integracion-con-apis-genealogicas-familysearchwikitree.md)) para que el agente tenga contexto de búsqueda real.
- **Resolver las alucinaciones del modelo**: Obligar al agente a justificar cada hallazgo usando un modelo de evidencias y provenance estricto (ver [N0003](N0003-idea-provenance-estricta-y-evidence-reasoning.md)).

## Evolution Log

### 2026-03-04 - Entry created

- Source: Conversación con el usuario
- Decision: Guardado como idea candidata estratégica

### 2026-03-05 - Context refresh (analysis)

- Changelog anchor: 4 de marzo de 2026 - Nota de arquitectura (Cierre DTree V3 065-072)
- Updates: review_after null -> 2026-03-26

### 2026-03-05 - Entry updated

- Reason: Recalibracion conservadora: horizonte far + alta incertidumbre tecnica
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Ligada a N0001/API y movida a seguimiento de largo plazo
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Dependency map v1: Agent lane depends on APIs, versioning and evidence, with optional coexistence with gamification
- Updated via notes:update
