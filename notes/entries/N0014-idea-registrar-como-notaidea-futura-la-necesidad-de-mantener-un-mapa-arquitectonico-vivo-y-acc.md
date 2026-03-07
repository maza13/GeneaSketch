---
note_id: "N0014"
kind: "idea"
phase: "archived"
active_state: null
archive_reason: "obsolete"
complexity: "complex"
connectivity: "interconnected"
horizon: "far"
title: "Mapa arquitectonico vivo por etapas para la separacion guiada"
source_type: "auto_inferred"
source_context: "Post cierre de 099 y 108-113; necesidad de preservar visibilidad arquitectonica continua durante la futura separacion por fases."
tags: ["architecture", "mapping", "wiki", "guided-hard-cut", "documentation"]
related_notes: ["N0011", "N0015"]
related_paths: ["reports/architecture-separation-diagnosis/master-system-map.md", "reports/architecture-separation-diagnosis/guided-hard-cut-plan.md", "reports/architecture-separation-diagnosis/executive-summary.md", "docs/wiki-software/09_ecosistema_arquitectura.md"]
related_todos: ["099"]
promoted_todos: []
relevance_score: 70
confidence: "high"
priority_hint: "p2"
effort_hint: "m"
created_at: "2026-03-07"
updated_at: "2026-03-07"
last_reviewed_at: "2026-03-07"
review_after: null
---


# Mapa arquitectonico vivo por etapas para la separacion guiada

## Context

El diagnostico de separacion arquitectonica ya dejo un mapa maestro util, pero ese artefacto representa el estado previo al hard cut guiado. Si el proyecto entra despues a la fase de separacion, trabajar solo con el mapa diagnostico inicial volveria a introducir ceguera operativa.

Hace falta conservar esta idea como parte del propio plan: mantener un mapa arquitectonico vivo y accesible durante cada etapa de la separacion para reflejar el estado real de fronteras, conexiones y hotspots despues de cada fase relevante.

Ademas del estado actual, el plan necesita conservar el mapa base inicial como referencia historica y puede necesitar tambien un mapa objetivo de referencia. Tener los tres permitiria comparar de donde se partio, donde esta realmente el sistema en cada paso y hacia que arquitectura se quiere llegar.

## Insight

El valor no esta solo en tener "un mapa", sino en usarlo como instrumento operativo del plan y no solo como documentacion historica.

El conjunto de mapas debe poder cumplir tres funciones complementarias:

- **Mapa base inicial**: preservar el estado de partida validado por el diagnostico para futuras referencias, comparaciones y trazabilidad de decisiones.
- **Mapa actual vivo**: mostrar el estado real del sistema en cada etapa del plan, incluyendo fronteras vigentes, conexiones activas, hotspots y zonas todavia mezcladas.
- **Mapa objetivo**: servir como referencia de llegada para saber hacia que arquitectura se quiere mover el sistema y comparar desviaciones entre estado actual y estado deseado.

Eso permitiria:

- saber en cada fase cual es la situacion arquitectonica real sin releer todo el codigo;
- conservar una referencia clara del punto de partida para entender cuanto cambio realmente el sistema;
- decidir mejor que sistemas se tocan, cuales no y como se conectan;
- usar el mapa como guia para seguir diseÃ±ando o modificando sistemas despues del plan;
- apoyar futuras extensiones o integraciones con una referencia clara de impacto y conexiones.

## Proposed Actions

- Retomar esta idea como parte del plan derivado del diagnostico y definir el formato del mapa vivo por fase.
- Definir explicitamente el esquema de tres mapas coordinados: mapa base inicial, mapa actual vivo por fase y mapa objetivo.
- Vincular cada etapa futura del hard cut con una actualizacion del mapa operativo correspondiente para reflejar el estado real alcanzado.
- Usar el sistema de mapas dentro del plan como referencia de control para comparar origen, estado actual y objetivo, no solo como entregable documental.
- Integrar el mapa consolidado final a la wiki del software o a otro punto de consulta permanente cuando el estado resultante sea suficientemente estable.
- Mantener esta nota enlazada con el plan de reentrada y con el paquete diagnostico base.

## Evolution Log

### 2026-03-07 - Entry created

- Source type: auto_inferred
- Source context: Post cierre de 099 y 108-113; necesidad de preservar visibilidad arquitectonica continua durante la futura separacion por fases.

### 2026-03-07 - References and protocol fields normalized

- Reason: align the note with the notes protocol by adding concrete references, related notes, and a real architectural insight/action set

### 2026-03-07 - Clarified as operational plan map plus possible target map

- Se hizo explicito que el mapa debe servir dentro del propio plan, no solo despues.
- Se agrego el doble papel posible: mapa actual vivo y mapa objetivo de referencia.
- Se aclaro que el mapa debe ayudar a seguir el estado real de cada fase y comparar progreso contra la arquitectura deseada.

### 2026-03-07 - Expanded to three-map model

- Se agrego el mapa base inicial como referencia historica y de trazabilidad.
- La nota ahora define tres vistas complementarias: origen, estado actual por fase y objetivo.
- Se hizo explicito que el plan debe poder comparar avance real contra el punto de partida y contra la arquitectura deseada.

### 2026-03-07 - Entry archived

- Archive reason: obsolete
- Summary: archived by notes:archive
