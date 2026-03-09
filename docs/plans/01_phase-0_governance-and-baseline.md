# Phase 0 - Governance and Baseline

## Objetivo de la fase

Cerrar el contrato documental, arquitectonico y UX antes de tocar el shell a gran escala. Esta fase no existe para redisenar visualmente la app; existe para dejar fijo que se va a construir, donde vive, que no se va a tocar y bajo que reglas se va a ejecutar la migracion.

## Por que esta fase va aqui

Sin esta fase, cualquier rediseno posterior corre el riesgo de mezclar decisiones de layout con decisiones de producto o arquitectura. Tambien evita que el mock se copie de forma superficial y rompa la taxonomia ya acordada por la wiki.

## Estado de entrada esperado

- existe la wiki UX con capitulos 12, 14 y 15 como base de verdad
- existe la direccion de `shared core` en software wiki
- el shell actual sigue mezclando topbar, paneles y overlays con una anatomia menos delimitada que la deseada
- ya existe un `PersonWorkspacePanelV3`, pero la migracion completa del shell todavia no esta documentada como paquete operativo

## Cambios que si se hacen

- consolidar el marco documental obligatorio para la migracion
- fijar la anatomia objetivo del shell completo
- fijar la frontera `desktop shell` vs `shared core`
- fijar reglas operativas de scroll, overlays y coexistencia de superficies
- dejar un plan maestro y fases ejecutables sin decisiones abiertas

## Cambios que explicitamente no se hacen

- no se reestructura `AppShell`
- no se cambian componentes UI
- no se tocan estilos de produccion
- no se migra el expediente a ventana interna todavia
- no se endurecen contratos de runtime fuera de la documentacion

## Subfases

### 0.1 Consolidar el marco documental

- releer `AGENTS.md`
- releer los capitulos UX 12, 14 y 15
- releer `11_shared_core_direction.md`
- fijar que este plan vive como complemento operativo y no como sustituto de la wiki

### 0.2 Fijar anatomia objetivo

- dejar definida la estructura `titlebar + toolbar + left rail + canvas + right inspector + workspace window + fullscreen workbench + status bar`
- dejar claro que el mock solo aporta configuracion espacial
- fijar que el canvas sigue siendo la superficie principal

### 0.3 Fijar frontera shell/core

- enumerar que parte de la migracion pertenece a `desktop shell`
- enumerar que concerns no deben entrar al `core`
- documentar que `workspaceWindowState`, stacking, drag, scroll y layout son problemas del shell, no del dominio

### 0.4 Fijar reglas de scroll, overlays y superficies

- definir que no debe existir scroll global del viewport
- definir que cada superficie scrollable debe hacerlo localmente
- definir reglas de activacion entre inspector, workspace, editor y utilities

## Contratos, tipos o interfaces a tocar

Esta fase no modifica codigo, pero debe dejar cerrados estos contratos conceptuales:

- `AppShell` como host de `titlebar`, `toolbar`, `main region`, `footer/status bar` y `workspace overlay host`
- `PersonWorkspaceViewModel` con `layoutMode: "window" | "fullscreen"`
- `workspaceWindowState` como estado local del shell desktop
- taxonomia oficial:
  - `Inspector = RightPanel`
  - `Editor = PersonDetailPanel`
  - `Workspace = PersonWorkspacePanelV3`
  - `Analysis Controls = LeftPanel`

## Archivos/sistemas esperados

- `AppShell`
- `ShellAppFrame`
- `TopMenuBar`
- `RightPanel`
- `PersonWorkspacePanelV3`
- `styles`
- `tests`
- `wiki UX/software`

## Riesgos y decisiones si surge un problema

- si aparece contradiccion entre mock y wiki UX, gana la wiki UX
- si una decision parece empujar semantica al shell, se documenta como bloqueo y se corrige antes de seguir
- si hay duda sobre si algo pertenece al `core` o al shell, por defecto se trata como shell hasta que se demuestre que define semantica del documento
- si el mock exige una superficie no existente en GeneaSketch, se adapta a una superficie real y no se inventa un subsistema nuevo

## Criterios de salida

- existe un plan maestro enlazando todas las fases
- la anatomia final de la app esta descrita sin ambiguedad
- la frontera shell/core esta escrita en terminos operativos
- las reglas de activacion y scroll quedan cerradas
- la wiki relevante esta identificada como lectura obligatoria para las fases siguientes

## Pruebas minimas obligatorias

- verificacion documental de consistencia entre este plan y la wiki
- verificacion de enlaces internos del paquete `docs/plans`
- chequeo de que todas las fases usan la misma taxonomia de superficies

## Impacto documental

- crea la base documental de la migracion
- prepara futuras actualizaciones a `docs/wiki-uxdesign/15_...`
- refuerza la aplicacion practica de `docs/wiki-software/11_shared_core_direction.md`

## Deuda prohibida al cerrar la fase

- no dejar fases sin criterio de salida
- no dejar superficies sin rol definido
- no dejar la frontera shell/core en lenguaje ambiguo
- no dejar el mock como referencia informal sin traduccion a GeneaSketch
