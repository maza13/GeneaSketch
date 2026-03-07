---
note_id: "N0015"
kind: "note"
phase: "active"
active_state: "candidate"
archive_reason: null
complexity: "complex"
connectivity: "interconnected"
horizon: "mid"
title: "Retomar el plan de separacion y preparacion para la nube, descentralizacion y APIs externas"
source_type: "auto_inferred"
source_context: "Post cierre de 099; expansion de vision estratégica hacia modelos descentralizados (P2P), Local-First y conectividad con ecosistemas externos (APIs)."
tags: ["architecture", "followup", "cloud-ready", "p2p", "local-first", "sync", "api-connectivity"]
related_notes: ["N0001", "N0002", "N0003", "N0004", "N0005", "N0011", "N0014"]
related_paths: ["reports/architecture-separation-diagnosis/separation-options.md", "reports/architecture-separation-diagnosis/guided-hard-cut-plan.md", "reports/architecture-separation-diagnosis/executive-summary.md", "reports/architecture-separation-diagnosis/findings.json", "todos/099-complete-p2-post-baseline-architecture-followup.md"]
related_todos: ["099"]
promoted_todos: []
relevance_score: 90
confidence: "high"
priority_hint: "p2"
effort_hint: "m"
created_at: "2026-03-07"
updated_at: "2026-03-07"
last_reviewed_at: null
review_after: null
---

# Retomar el plan de separacion y preparacion para la nube, descentralizacion y APIs externas

## Context

El diagnostico arquitectonico ya quedo consolidado. Sin embargo, este plan no solo busca "limpiar" el codigo, sino preparar a GeneaSketch para horizontes de conectividad total y modelos de datos distribuidos. Esto incluye la nube tradicional, pero tambien esquemas **descentralizados (P2P/Local-First)** y la integracion con el ecosistema genealogico global (APIs externas).

## Insight

Para que GeneaSketch sea un sistema resiliente y abierto, el plan de separacion debe garantizar que el nucleo soporte multiples metodos de sincronizacion y consulta:

- **Sincronización Descentralizada (Local-First)**: Soporte para que familias compartan datos directamente entre sus computadoras sin depender de un servidor central. Esto requiere que el Journal sea capaz de fusionar cambios de manera deterministica (Pilar de N0002 y N0003).
- **Conectividad con APIs Externas**: El aislamiento de la capa de I/O (Fase 1 y 2) permite que conectores para **FamilySearch, WikiTree o Ancestry** (N0001) se inyecten como proveedores de datos sin alterar la logica del motor.
- **Identidad y Proveniencia Global**: Reforzar el uso de IDs unicos y proveniencia estricta (N0003) para que al mezclar datos de diferentes fuentes (P2P o APIs), el sistema sepa siempre el origen y la fiabilidad de cada Claim.
- **Agnosticismo de Transporte**: El motor procesa "Journal Operations". No debe importarle si estas llegaron por un archivo `.gsk`, por un WebSocket de una app movil, por un protocolo P2P o por una respuesta JSON de una API externa.

## Strategic Scenarios

El plan debe blindar la arquitectura para:
- **Cloud Storage**: Backup y guardado tradicional.
- **Arboles Compartidos P2P**: Sincronizacion entre pares (familia) donde todos poseen el "save" y lo mantienen vivo colectivamente.
- **Ecosistema Global**: Consulta y extraccion de datos desde FamilySearch/WikiTree directamente al grafo local (N0001).
- **App Movil de Campo**: Captura ligera desconectada que se sincroniza al volver al escritorio.

## Proposed Actions

- **Review Estratégico**: Vincular cada fase del "Guided Hard Cut" con los requerimientos de las notas N0001-N0005.
- **Validacion de Seams**: Asegurar que los puntos de corte (Seams) en `App.tsx` y `useGskFile.ts` incluyan ganchos (hooks) para inyectar proveedores de red o de API en el futuro.
- **Preservar el Journal**: No permitir ninguna mutacion que no pase por el Journal, ya que esta es la unica garantia de exito para la descentralizacion futura.

## Evolution Log

### 2026-03-07 - Updated with Decentralization and API Connectivity

- Expansion hacia modelos P2P y Local-First (sincronizacion compartida sin servidor central).
- Vinculacion explicita con las ideas de integracion de APIs externas (N0001-N0005).
- Ajuste de tags y notas relacionadas para reflejar la interconectividad total del proyecto.
