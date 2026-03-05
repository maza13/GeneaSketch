---
note_id: "N0003"
kind: "idea"
phase: "active"
active_state: "candidate"
archive_reason: null
complexity: "complex"
connectivity: "interconnected"
horizon: "near"
title: "Provenance estricta y Evidence Reasoning"
source_type: "user_requested"
source_context: null
tags: ["ui", "research-focus", "gps"]
related_notes: ["N0001", "N0002", "N0004", "N0005", "N0006"]
related_paths: ["src/core/gschema/types.ts", "src/core/gschema/validation.ts", "src/core/gschema/GedcomBridge.ts", "src/core/gschema/GraphMutations.ts", "src/core/read-model/selectors.ts", "docs/wiki-gsk/03_modelo.md"]
related_todos: []
promoted_todos: []
relevance_score: 63
confidence: "high"
priority_hint: "p2"
effort_hint: "l"
created_at: "2026-03-04"
updated_at: "2026-03-05"
last_reviewed_at: "2026-03-05"
review_after: "2026-03-20"
---







# Provenance estricta y Evidence Reasoning

## Context

El usuario planteó elevar el estándar de prueba documental integrando un flujo procesal: "Claim -> Evidencia -> Evaluación de Confiabilidad -> Conclusión", con interfaces para resolver contradicciones (ej: 2 nacimientos distintos).
Se decidió conservar en las notas del proyecto para diseño de arquitectura futuro.

## Insight

**Beneficios:**
- Aporta rigor metodológico, implementando tácitamente el *Genealogical Proof Standard (GPS)* dentro de GeneaSketch.
- Fomenta la investigación rigurosa, atrayendo a genealogistas profesionales o aficionados muy involucrados.
- Un panel tipo "Caso de Investigación" donde se contraponen pruebas de fuentes opuestas sería una experiencia de usuario estelar.

**Retos Técnicos:**
- Complejidad en UX: Diseñar una UI pesada que maneje las diferentes entidades y reclamos en conflicto de forma clara y sin abrumar.
- Reestructurar el panel de fuentes para que no sea solo un anexo, sino que permita asociar fragmentos de texto o imágenes a reclamos (claims) específicos.

## Proposed Actions

- Diseñar conceptualmente un "Panel de Resolución de Conflictos / Decisiones" (Mockup UI).
- Realizar revisión de literatura sobre cómo el GPS recomienda estructurar la evidencia ponderada.
- Mantener la idea estancada en modo `candidate` hasta abordar mejoras al sistema de fuentes.

## Evolution Log

### 2026-03-04 - Entry created

- Source: Conversación con el usuario
- Decision: Guardado como idea candidata

### 2026-03-05 - Context refresh (analysis)

- Changelog anchor: 4 de marzo de 2026 - Nota de arquitectura (Cierre DTree V3 065-072)
- Updates: horizon mid -> near

### 2026-03-05 - Entry updated

- Reason: Recalibracion conservadora: idea near pero aun vaga y sin plan accionable
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Dependency map v1: Evidence depends on APIs and versioning and enables trustworthy advanced features
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Deep architecture check: evidence model exists in claims/citations; need stricter write-path and validation gates
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Evidence risk log: strict citations/evidenceGate require journal-safe writes and less legacy projection dependency
- Updated via notes:update
