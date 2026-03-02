# TODO Estructurado de Pendientes - GeneaSketch

Fuente de verdad para pendientes de release, integracion tecnica y el "Paradigm Shift" 0.4.0.

## 🚀 Prioridad Inmediata: GSchema 0.1.0 (Update 0.4.0)

### GS-001
- ID: GS-001
- Titulo: Revisión final y aprobación del Implementation Plan 0.4.0
- Contexto: El store ya está desacoplado (INT-005). Necesitamos el OK final en el diseño de GSchema.
- Accion concreta: Revisar `implementation_plan.md` y `gschema_0.1.x_tech_spec.md`.
- Prioridad: Alta
- Estado: Pendiente
- Relacion con release: si, 0.4.0

### INT-001 (Core Inference)
- ID: INT-001
- Titulo: Estabilizar pipeline de inferencia con GSchema
- Contexto: Adaptar el motor de inferencia V2 para trabajar sobre el nuevo formato de grafos/claims.
- Accion concreta: Terminar refinamiento de mensajes de evidencia y ocultar redundancias.
- Prioridad: Alta
- Estado: En curso
- Relacion con release: si, 0.4.0

### QA-004 (Arquitectura)
- ID: QA-004
- Titulo: Limpieza de implementaciones redundantes de grafos
- Contexto: Eliminar `src/core/genegraph` y unificar todo bajo el nuevo GSchema.
- Accion concreta: Auditar y borrar código muerto tras la transición.
- Prioridad: Media
- Estado: Pendiente
- Relacion con release: si, 0.4.0

---

## 🛠️ Integración UI/Frontend

### INT-002
- ID: INT-002
- Titulo: Consolidar PersonDetailShell
- Contexto: Retirar rutas antiguas y dejar el shell modular como único punto de entrada.
- Accion concreta: Completar wiring de secciones y auditoría.
- Prioridad: Alta
- Estado: Pendiente
- Relacion con release: si, 0.3.7+

### INT-003
- ID: INT-003
- Titulo: SuggestionInput Unificado
- Contexto: Estandarizar props y comportamiento en todos los editores.
- Accion concreta: Definir contrato único.
- Prioridad: Media
- Estado: Pendiente

---

## ✅ Histórico de Completados (Reciente)

- **INT-005**: Desacoplado `store.ts`. Slices creados, lógica extraída a `GeneaEngine` y `UiEngine`. ✅
- **FIX**: Corregida regresión de carga de archivos (init `viewConfig`). ✅
- **QA-001**: Baseline estabilizado y Gate de CI activo (`baseline-qa001.yml`). ✅
- **REL-001**: Deuda de changelog 0.3.1-0.3.6 cerrada. ✅
- **REL-002**: Normalización de encoding UTF-8 completada. ✅

---

## 📦 Inventario de Archivos Untracked (A integrar en 0.4.0)

- `src/core/graph/locationMarkers.ts` (Consolidar en core)
- `src/core/inference/birthRangeLocalV2.ts` (Core motor)
- `src/ui/person/BirthRangeApplyConfirmPanel.tsx` (UI nueva)
- `src/tests/inference.*.test.ts` (Mover a baseline final)
- `src/tests/person-events-*.test.ts` (UI baseline)

---
*Nota: Este archivo se limpia periódicamente para mantener el foco en la siguiente gran entrega.*
