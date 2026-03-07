---
note_id: "N0016"
kind: "idea"
phase: "active"
active_state: "candidate"
archive_reason: null
complexity: "complex"
connectivity: "interconnected"
horizon: "mid"
title: "Compartir arbol por repositorio temporal como capacidad cercana sin bloquear el hard cut"
source_type: "user_requested"
source_context: null
tags: ["architecture", "sharing", "sync", "local-first", "temporary-repository", "privacy", "security"]
related_notes: ["N0015", "N0014", "N0001", "N0002", "N0003", "N0011"]
related_paths: ["reports/architecture-separation-diagnosis/guided-hard-cut-plan.md", "reports/architecture-separation-diagnosis/executive-summary.md", "reports/architecture-separation-diagnosis/master-system-map.md", "todos/099-complete-p2-post-baseline-architecture-followup.md"]
related_todos: ["099"]
promoted_todos: []
relevance_score: 78
confidence: "high"
priority_hint: "p2"
effort_hint: "m"
created_at: "2026-03-07"
updated_at: "2026-03-07"
last_reviewed_at: null
review_after: null
---



# Compartir arbol por repositorio temporal como capacidad cercana sin bloquear el hard cut

## Context

El arbol compartido con familiares deja de ser una posibilidad remota y pasa a considerarse una capacidad de corto-mediano plazo dentro del contexto de una beta cerrada usada por tres personas. El mecanismo pensado no es colaboracion P2P directa ni nube general, sino intercambio mediante un repositorio temporal donde una app sube y otras descargan.

## Insight

El escenario de repositorio temporal cambia la prioridad del tema: compartir arbol ya no es solo una idea futura, pero tampoco obliga a resolver ahora nube completa, sincronizacion distribuida ni edicion simultanea real.

Lo que si vuelve obligatorio desde ahora es proteger ciertos contratos:

- IDs estables por entidad y por operacion, para intercambio, reconciliacion y trazabilidad.
- Mutaciones auditables y reversibles, idealmente alineadas con journal-only writes.
- Separacion clara entre datos compartidos del arbol y datos locales o sensibles.
- Una superficie de importacion y aplicacion validada para que cambios externos no entren por atajos al runtime.
- Un modelo inicial simple de autoria, permisos y conflictos, aunque la primera version sea owner mas colaboradores sin concurrencia compleja.

El enfoque de repositorio temporal es valioso porque puede servir como primera capacidad real de sharing sin arrastrar todavia discovery de peers, NAT traversal ni complejidad P2P. Si el hard cut limpia bien App Shell, useGskFile y el nudo State Manager-Engine-Read Model, esta idea podria apoyarse despues en una base reutilizable en lugar de convertirse en deuda.

## Proposed Actions

- Mantener esta idea enlazada al plan de hard cut como constraint arquitectonico de corto-mediano plazo, no como feature inmediata.
- Revalidar en Phase 0 que el core preserve IDs estables, write-path auditado, separacion de datos locales y sensibles, y frontera limpia entre package IO y aplicacion runtime.
- Cuando toque planificacion futura, tratar el repositorio temporal como primer mecanismo de sharing y no como decision definitiva sobre nube o P2P.
- Definir mas adelante un modelo minimo de autoria, permisos, conflictos y privacidad para arbol compartido antes de cualquier implementacion.
- Evitar desde ahora que secretos, credenciales o metadata local de usuario queden mezclados dentro del arbol compartible o del paquete exportable.

## Evolution Log

### 2026-03-07 - Entry created

- Source type: user_requested
- Source context: n/a

### 2026-03-07 - Entry updated

- Reason: Complete the note with hard-cut constraints for temporary repository tree sharing
- Updated via notes:update

### 2026-03-07 - Entry updated

- Reason: Replace placeholders with concrete insight and actions for temporary repository tree sharing
- Updated via notes:update

### 2026-03-07 - Completed body after CLI multiline truncation

- Reason: preserve the note in the notes system while filling the intended insight and actions content
- Updated manually after notes:new and notes:update kept truncating multiline body arguments
