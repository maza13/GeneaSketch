---
note_id: "N0005"
kind: "idea"
phase: "active"
active_state: "candidate"
archive_reason: null
complexity: "complex"
connectivity: "interconnected"
horizon: "far"
title: "Cápsulas de Tiempo Legado Digital"
source_type: "user_requested"
source_context: null
tags: ["emotion", "monetization", "legado"]
related_notes: ["N0001", "N0002", "N0003", "N0006"]
related_paths: []
related_todos: []
promoted_todos: []
relevance_score: 42
confidence: "high"
priority_hint: "p3"
effort_hint: "l"
created_at: "2026-03-04"
updated_at: "2026-03-05"
last_reviewed_at: "2026-03-05"
review_after: null
---




# Cápsulas de Tiempo (Legado Digital)

## Context

El usuario planteó la idea de crear "Cápsulas", paquetes de contenido del árbol con una pre-condición de apertura (una fecha futura). Esto mueve a GeneaSketch de ser una app de memoria al pasado a ser un testamento interactivo al futuro.

## Insight

**Beneficios:**
- Conexión emocional profunda: Transforma la genealogía a algo relevante y tangible para nuevas generaciones que generalmente aborrecen revisar nombres antiguos.
- Potencial gigantesco de monetización o atractivo de nicho ("El cofre del abuelo").

**Retos Técnicos:**
- Arquitectura Desktop: GeneaSketch es offline/Desktop, por lo tanto, no tenemos un servicio en la nube gestionado que abra el enlace pasados `X` años por defecto.
- Custodia: Necesitaríamos empaquetar cápsulas con cifrado robusto y crear una aplicación móvil o subservicio que verifique la fecha en el calendario antes de desencriptar.

## Proposed Actions

- Explorar enfoques offline: "Cápsula Encapsulada Cifrada", donde el usuario guarda el archivo `.capsule` y este internamente chequea `Date.now()` vs servidor NTP (para evitar fraude de adelantar el reloj).
- Diseñar la UI del creador de cápsulas (selección de personas, documentos, multimedia).

## Evolution Log

### 2026-03-04 - Entry created

- Source: Conversación con el usuario
- Decision: Guardado como idea candidata

### 2026-03-05 - Entry updated

- Reason: Recalibracion conservadora: concepto exploratorio de largo plazo
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Dependency map v1: Capsules partially depend on foundation tracks, with stronger links to product experience
- Updated via notes:update
