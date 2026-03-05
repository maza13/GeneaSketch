---
note_id: "N0001"
kind: "idea"
phase: "active"
active_state: "on_hold"
archive_reason: null
complexity: "complex"
connectivity: "interconnected"
horizon: "far"
title: "Integración con APIs Genealógicas (FamilySearch/WikiTree)"
source_type: "user_requested"
source_context: null
tags: ["api", "sync", "future-feature"]
related_notes: ["N0002", "N0003", "N0004", "N0005", "N0006"]
related_paths: ["src/core/read-model/selectors.ts", "src/core/gschema/GedcomBridge.ts", "src/state/slices/docSlice.ts"]
related_todos: []
promoted_todos: []
relevance_score: 32
confidence: "high"
priority_hint: "p3"
effort_hint: "l"
created_at: "2026-03-04"
updated_at: "2026-03-05"
last_reviewed_at: "2026-03-05"
review_after: "2026-04-15"
---







# Integración con APIs Genealógicas (FamilySearch/WikiTree)

## Context

El usuario sugirió evaluar la viabilidad de integrar GeneaSketch con APIs de plataformas grandes de genealogía, como WikiTree o FamilySearch.

Actualmente GeneaSketch es un software enfocado en la documentación local y la visualización gráfica de árboles. Integrar estas plataformas cambiaría la dinámica permitiendo importar/exportar personas y eventos, convirtiendo a GeneaSketch en una herramienta de descubrimiento y validación en tiempo real.

Por petición del usuario, se decidió "dejarlo como idea" por ahora, postergando la implementación para el futuro.

## Insight

**Beneficios:**
- Importación masiva de datos y automatización de búsquedas.
- Validación de registros locales contra registros globales.
- Evitación de la duplicación de datos.

**Retos Técnicos Identificados:**
1. **Autenticación (OAuth):** Flujos de autorización desde la app Desktop.
2. **Mapeo de Datos:** Necesidad de crear un adaptador que traduzca el JSON de las APIs al formato interno `GSchema (.gsk)`.
3. **UX (Comparación):** Crear interfaces elegantes para visualizar conflictos, resolver *merges* de datos lado-a-lado (Local vs. Online).
4. **Sincronización:** Priorizar al inicio un flujo de lectura (importación), dado que escribir requiere altos estándares de calidad (especialmente en FamilySearch).

## Proposed Actions

- Mantener esta nota en `notes/` en estado `candidate`.
- Evaluar a futuro las opciones de API pública (WikiTree vs. Programas de Desarrollador de FamilySearch).
- Diseñar la interfaz modular en el código de TypeScript para inyectar diferentes "proveedores de genealogía".

## Evolution Log

### 2026-03-04 - Entry created

- Source: Conversación con el usuario.
- Decisión: Registrado como idea a petición del usuario.

### 2026-03-05 - Entry updated

- Reason: Recalibracion conservadora: idea far/candidate con baja traccion operativa
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: API requests sent externally; long-term track and lower current urgency
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Dependencia estrategica: N0001 depende mas de N0002 que a la inversa
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Dependency map v1: APIs co-depend with versioning and connect to evidence, agent, gamification and capsules
- Updated via notes:update

### 2026-03-05 - Entry updated

- Reason: Pre-0.5 architecture risks recorded: mutation outside journal, private internals access, and UI dependency on legacy projection
- Updated via notes:update
