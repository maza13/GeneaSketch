---
status: complete
priority: p1
issue_id: "013"
tags: [gschema, core-contract, family-model, determinism]
dependencies: []
---

# Child-Union Canonical Linkage (`ParentChild.unionUid`)

## Problem Statement

El core permitia `ParentChild` sin `unionUid` (campo opcional), lo que introducia ambiguedad en escenarios con multiples uniones y afectaba reconstruccion familiar determinista y export GEDCOM fiel (`FAM/CHIL/FAMC`).

## Findings

- `ParentChild.unionUid` existia en tipos pero era opcional.
- `validation.ts` solo validaba union cuando `unionUid` estaba presente.
- `GedcomBridge` ya usaba `unionUid` cuando lo conocia, pero el contrato no obligaba su presencia canonica.

## Proposed Solutions

### Option 1: Obligatoriedad canonica + union sintetica (Recommended)
- Hacer `unionUid` obligatorio para `ParentChild` en datos canonicos.
- Cuando no exista union explicita, crear `Union` sintetica (`unionType: "UNM"`).

**Effort:** Medio  
**Risk:** Medio (migracion de snapshots legacy)

### Option 2: Mantener opcional y resolver en export
- Mantener `unionUid?` y heuristicas tardias para GEDCOM export.

**Effort:** Bajo  
**Risk:** Alto (no determinismo y divergencias inter-software)

## Recommended Action

Aplicar Option 1 con transicion compat:
1. Validacion strict: error si falta `unionUid`.
2. Compat: autogenerar union sintetica y warning.
3. Documentar explicitamente en wiki-gsk.

## Acceptance Criteria

- [x] Regla canonica definida: no hay `ParentChild` canonico sin `unionUid`.
- [x] Codigo de validacion para union faltante agregado (`PARENT_CHILD_MISSING_UNION`).
- [x] Modo compat crea union sintetica `UNM` cuando falta contexto.
- [x] Docs (`03_modelo`, `05_interoperabilidad`) sincronizadas con la regla.

## Work Log

### 2026-03-03 - Creacion del TODO fase core

**By:** Codex

**Actions:**
- Registrado el riesgo estructural y la estrategia recomendada.
- Dependencias definidas para encadenar fases posteriores.

### 2026-03-03 - Implementacion Fase 1 cerrada

**By:** Codex

**Actions:**
- `ParentChildEdge.unionUid` endurecido a obligatorio en `src/core/gschema/types.ts`.
- `validation.ts` ahora emite `PARENT_CHILD_MISSING_UNION` y mantiene validaciones de union/miembro.
- `GskPackage.importGskPackage` aplica politica por modo:
  - strict: error critico si faltan `unionUid`.
  - compat: reparacion determinista con `ensureParentChildUnionLinks`.
- `GedcomBridge.gschemaToDocument` normaliza en copia de trabajo para export determinista de snapshots legacy.
- `GraphMutations` completa `ParentChild` con `nature` y `certainty`.
- Tests agregados:
  - strict fail por `PARENT_CHILD` sin `unionUid`.
  - compat repair con union sintetica determinista.
- Wiki sincronizada (`03_modelo`, `05_interoperabilidad`) con invariante child-union y politica strict/compat.

