---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p2"
issue_id: "114"
title: "Corregir ergonomia y persistencia git en notes system y update flows del TODO system"
tags: ["notes", "todos", "git", "automation", "note:N0013"]
dependencies: []
child_tasks: []
related_tasks: []
owner: "codex"
created_at: "2026-03-07"
updated_at: "2026-03-07"
target_date: null
risk_level: "medium"
estimated_effort: "l"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "fix(notes): make notes mutations and todo prepare commit safely"
closed_at: "2026-03-07"
---



# Corregir ergonomia y persistencia git en notes system y update flows del TODO system

Corregir primero el `notes system` y despues los flujos de actualizacion del `TODO system` para que ambos tengan naming consistente, metadata estable y persistencia git confiable.

## Problem Statement

El sistema de notas arrastra deuda operativa en varias areas: asignacion de nombres/slugs de archivos, consistencia de titulos, normalizacion de metadata y otros detalles ergonomicos del flujo de captura/actualizacion. Ademas, los flujos `notes:new`, `notes:update` y `notes:promote` no garantizan stage/commit automatico y confiable cuando crean o modifican notas, actualizan el registry o generan una o varias entradas TODO. El problema no termina en notas: el `TODO system` tambien sigue sin una politica equivalente para cambios intermedios o actualizaciones de tareas fuera de `todo:close`, por ejemplo cuando una tarea se edita o cuando `todo:prepare` muta archivos.

### Context

- Current behavior:
  - `tools/notes/cli.mjs` crea y actualiza notas, pero no cierra esos cambios con una frontera git explicita.
  - `notes:promote` crea TODOs, archiva la nota y actualiza el registry, pero no asegura un commit transaccional del conjunto.
  - En `tools/todos`, solo `todo:close` tiene un contrato fuerte de stage/commit; otras mutaciones siguen siendo no transaccionales.
- Expected behavior:
  - Los comandos que crean o mutan estado persistente en notes/TODOs deben decidir de forma explicita si dejan cambios sin commit o si ejecutan una persistencia git segura y trazable.
  - Los comandos que tocan varias superficies relacionadas deben evitar estados parciales.
- Where this appears:
  - `tools/notes/cli.mjs`
  - `tools/todos/prepare.mjs`
  - `tools/todos/common.mjs`
  - `tools/todos/close.mjs`

### Why This Matters

- Impact:
  - El sistema pierde trazabilidad y deja deuda operacional cada vez que una mutacion valida queda fuera de commit.
  - Notas y TODOs quedan desalineados con la promesa de automatizacion del repo.
- Cost of not doing it:
  - Seguiran apareciendo cambios parciales, registry desincronizado y promotion flows poco confiables.
  - El usuario tendra que seguir cerrando manualmente lo que el sistema dice automatizar.

## Findings

- `tools/notes/cli.mjs` no define hoy un helper compartido para preflight git, stage selectivo, rollback ni commit seguro.
- `notes:promote` es el caso mas delicado porque muta varias superficies: nota fuente, `notes/index/registry.json` y uno o varios archivos en `todos/`.
- El `TODO system` ya resolvio el cierre seguro en `todo:close`, asi que conviene reutilizar ese patron en vez de inventar una segunda politica incompatible.
- El gap de TODO no es el cierre final, sino las mutaciones intermedias: actualizacion de tareas y comandos que reescriben archivos pero no consolidan commit.
- La correccion debe empezar por notas, como pediste, y despues extender el mismo contrato a TODOs para no bifurcar reglas.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Crear primero un contrato transaccional para `notes:new`, `notes:update` y `notes:promote`, y despues aplicar la misma politica al `TODO system` fuera de `todo:close`.
- Pros:
  - Resuelve primero la superficie hoy mas inconsistente.
  - Permite reutilizar el aprendizaje y helpers del fix reciente en `todo:close`.
  - Evita que notes y TODOs diverjan en comportamiento git.
- Cons:
  - Amplia el alcance original de `114`.
  - Requiere tocar dos CLIs y agregar tests de integracion para ambos.
- Effort: L
- Risk: Medium

### Option 2

- Approach:
  - Corregir solo `notes system` y dejar el problema del TODO update flow para otra task.
- Pros:
  - Menor alcance inmediato.
  - Menos cambios de una sola vez.
- Cons:
  - Mantiene inconsistencia contractual entre sistemas.
  - Deja abierto un bug que ya confirmaste en el flujo de TODOs.
- Effort: M
- Risk: Medium

## Recommended Action

Ejecutar `114` como una correccion por fases y con una sola politica de persistencia git. La secuencia sera: endurecer `notes system`, extraer o reutilizar helpers transaccionales, y luego cerrar el hueco equivalente en el `TODO system` para updates/mutaciones no cubiertas por `todo:close`.

### Execution Plan

1. Auditar `tools/notes/cli.mjs` y enumerar todos los comandos que mutan estado persistente.
2. Corregir naming/slugs/titulos/metadata del notes system donde hoy produce resultados pobres o inconsistentes.
3. Diseñar e implementar un helper compartido de persistencia git para notes:
   - preflight de rutas,
   - stage selectivo,
   - commit con mensaje coherente,
   - rollback de archivos si `git add` o `git commit` falla.
4. Aplicar ese helper a `notes:new`, `notes:update` y `notes:promote`, incluyendo:
   - nota/archivo creado o actualizado,
   - `notes/index/registry.json`,
   - TODOs generados por `notes:promote`.
5. Auditar el `TODO system` fuera de `todo:close` y definir que mutaciones deben adoptar el mismo contrato:
   - preparacion de umbrellas,
   - futuras actualizaciones guiadas de TODOs,
   - cualquier comando que reescriba archivos en `todos/`.
6. Reusar el patron de `todo:close` para que el `TODO system` tambien tenga preflight, stage explicito y rollback en mutaciones intermedias.
7. Agregar tests de integracion para ambos sistemas cubriendo:
   - alta,
   - update,
   - promotion,
   - mutacion de TODO,
   - fallo de stage,
   - fallo de commit,
   - no dejar archivos parcialmente mutados.
8. Actualizar la documentacion/skills de notes y TODOs para reflejar el nuevo contrato operativo.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] Core result is implemented
- [x] Verification executed
- [x] Work log updated
- [x] Traceability linked to note N0013
- [x] `notes:new`, `notes:update` y `notes:promote` quedan cubiertos por el alcance corregido
- [x] La promocion de notas contempla stage/commit correcto de los TODOs generados
- [x] El `TODO system` incorpora el mismo contrato para mutaciones no cubiertas por `todo:close`
- [x] Notes y TODOs comparten una politica coherente de preflight, stage y rollback
- [x] Los tests cubren fallos de stage/commit y evitan estados parciales en ambos sistemas

## Work Log

### 2026-03-07 - Task created from notes:promote

- Source note: N0013
- Promotion mode: simple

### 2026-03-07 - Scope expanded and execution plan clarified

**By:** Codex

**Status Transition:**
- from: pending
- to: pending

**Actions:**
- Incorporated the confirmed bug that notes mutations do not auto-commit reliably on create, update, and promote.
- Extended the task scope to include the analogous TODO update/mutation gap outside `todo:close`.
- Rewrote the task as a phased implementation plan that starts with notes and then aligns the TODO system.

**Evidence:**
- Artifacts/paths:
  - `todos/114-pending-p2-deuda-del-sistema-de-notas-revisar-y-corregir-pr.md`
  - `tools/notes/cli.mjs`
  - `tools/todos/prepare.mjs`
  - `tools/todos/close.mjs`

## Notes

The implementation order is explicit: notes first, TODO mutation flows second.

### 2026-03-07 - Implemented transactional persistence for notes and TODO prepare

**By:** Codex

**Status Transition:**
- from: pending
- to: pending

**Actions:**
- Added shared git persistence helper with preflight, selective stage, commit, and rollback on failure.
- Applied automatic transactional commit behavior to `notes:new`, `notes:update`, `notes:archive`, `notes:capture`, and `notes:promote`.
- Improved note/TODO slug truncation to avoid awkward cutoffs when filenames are limited.
- Extended the same persistence contract to `todo:prepare`.
- Added regression tests for notes create/update/promote and TODO prepare, including simulated commit rollback.
- Updated notes and TODO skill docs to reflect the new operational contract.

**Evidence:**
- Command: `npm test -- src/tests/todo.protocol-v2.test.ts`
- Result: pass (18/18)
- Artifacts/paths:
  - `tools/shared/gitPersistence.mjs`
  - `tools/notes/cli.mjs`
  - `tools/todos/prepare.mjs`
  - `src/tests/todo.protocol-v2.test.ts`
  - `.agents/skills/project-notes-manager/SKILL.md`
  - `.agent/skills/project-notes-manager/SKILL.md`
  - `.agents/skills/file-todos/SKILL.md`
  - `.agent/skills/file-todos/SKILL.md`

### 2026-03-07 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: pending
- to: complete

**Actions:**
- Implemented transactional persistence for notes mutations and todo prepare, aligned slug ergonomics, added rollback coverage, and updated operational docs.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/114-complete-p2-deuda-del-sistema-de-notas-revisar-y-corregir-pr.md

**Next Recommendation (generated at closure):**
- No direct dependent task found.
- Recommended next unblocked task: 018 (p2).
