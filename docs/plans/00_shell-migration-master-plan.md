# Plan Maestro - Migracion del shell completo hacia la anatomia del mock

## Resumen

Este paquete documenta la migracion completa del shell de GeneaSketch para copiar y adaptar la configuracion espacial del mock de referencia sin copiar su branding, sus subsistemas ficticios ni sus decisiones visuales ajenas al producto.

La meta es que GeneaSketch adopte una ventana principal mas delimitada y coherente:

- `titlebar`
- `toolbar`
- `left rail`
- `canvas central`
- `right inspector`
- `workspace window`
- `workspace fullscreen/workbench`
- `status bar`

El paquete no reemplaza la wiki. La wiki sigue siendo la fuente de verdad de UX y arquitectura, y estos documentos funcionan como plan operativo de ejecucion.

## Proposito

- Copiar y adaptar la configuracion espacial del mock para toda la app, no solo para el expediente.
- Mantener el producto alineado con la taxonomia UX oficial de GeneaSketch.
- Ejecutar la migracion sin contaminar el `shared core` ni mover semantica de dominio al shell desktop.
- Dejar una ruta de implementacion por fases autocerrables, con `hard cuts` y sin compat temporal indefinida.

## Principios fijos

- `desktop-first`, no `desktop-only`
- el `core` no se toca semanticamente
- la migracion vive en `App Shell`, `facade`, `UI`, `styles`, `tests` y documentacion UX/software
- el canvas de Kindra sigue siendo la superficie principal del producto
- seleccionar persona no significa editar
- el trabajo profundo por persona debe ser intencional
- AncestrAI sigue siendo contextual y no dominante

## Anatomia objetivo

La app completa debe converger a esta organizacion:

1. `titlebar`
2. `toolbar`
3. `left rail`
4. `canvas central`
5. `right inspector`
6. `workspace window`
7. `workspace fullscreen/workbench`
8. `status bar`

## Reglas de activacion UX

- seleccion normal de persona -> `Inspector`
- doble click o accion explicita `abrir expediente` -> `Workspace window`
- accion `expandir` dentro del workspace -> mismo expediente en `fullscreen/workbench`
- `Inspector` no escala a workspace
- `Editor` no vuelve a ser la superficie principal de trabajo profundo
- `AncestrAI` se invoca como utility contextual desde el trabajo real

## Orden de fases

1. `Phase 0 - Governance and Baseline`
2. `Phase 1 - Shell Foundation`
3. `Phase 2 - Main Split Alignment`
4. `Phase 3 - Workspace Window Migration`
5. `Phase 4 - Fullscreen Workbench Migration`
6. `Phase 5 - Hard Cuts and Cleanup`

Regla:

- ninguna fase posterior debe arrancar si la fase previa no cerro sus criterios de salida
- si aparece un bloqueo, se divide internamente la fase actual; no se salta el orden global

## Dependencias entre fases

| Fase | Depende de | Motivo |
| --- | --- | --- |
| 0 | ninguna | fija contrato documental y frontera shell/core |
| 1 | 0 | necesita anatomia objetivo y reglas cerradas |
| 2 | 1 | necesita shell delimitado antes de alinear paneles |
| 3 | 2 | necesita `left + canvas + right` estables antes de introducir ventana interna |
| 4 | 3 | necesita que el workspace normal ya sea el panel correcto |
| 5 | 4 | solo conviene retirar compat cuando el patron final ya exista |

## Hard rules de implementacion

- no debe existir scroll global del viewport en uso normal
- el scroll debe vivir dentro de superficies locales
- no se mueve logica de dominio al shell
- no se crean paneles paralelos para resolver lo que ya pertenece al workspace
- no se dejan dos superficies principales activas para el mismo rol
- `RightPanel` se conserva como `Inspector`
- `PersonWorkspacePanelV3` se conserva como `Workspace` oficial
- cualquier patron UX nuevo que nazca aqui debe actualizar la wiki en el mismo ciclo

## Criterios globales de aceptacion

La migracion completa se considera lista solo si:

- la ventana principal se siente delimitada y sin scroll global indeseado
- el canvas sigue siendo el centro dominante
- el inspector es compacto y de lectura rapida
- el expediente normal se comporta como ventana interna
- el fullscreen se comporta como workbench, no como modal agrandado
- `claims` y `journal` viven dentro del workspace y no como paneles aislados
- AncestrAI coexiste con el trabajo profundo sin dominar la interfaz
- la documentacion UX/software queda alineada con el patron final
- no quedan dos patrones activos para la misma superficie principal

## Riesgos transversales

| Riesgo | Senal temprana | Resolucion preferida |
| --- | --- | --- |
| Contaminacion shell/core | tipos o helpers de shell entrando a `src/core/**` | mover el concern a shell/facade o definir un adaptador |
| Deuda por compat temporal | flags o ramas temporales sobreviven mas de una fase | retirar en la fase siguiente como criterio de salida |
| Duplicidad de superficies | dos paneles hacen trabajo profundo sobre la misma persona | fijar una sola superficie oficial y degradar la otra |
| Regresion de overlay/z-index | modales o IA quedan ocultos debajo del workspace | ajustar stacking con tokens y pruebas de coexistencia |
| Perdida de centralidad del canvas | el shell se vuelve panel-first | reducir chrome lateral y verificar jerarquia visual |
| Drift documental | el codigo empieza a seguir el plan y no la wiki | actualizar wiki y plan en el mismo ciclo |

## Referencias obligatorias

- [AGENTS.md](../../AGENTS.md)
- [12_instrucciones_agentes_ia.md](../wiki-uxdesign/12_instrucciones_agentes_ia.md)
- [14_rediseno_conceptual_interfaz_genealogica.md](../wiki-uxdesign/14_rediseno_conceptual_interfaz_genealogica.md)
- [15_auditoria_superficies_actuales_y_plan_rediseno.md](../wiki-uxdesign/15_auditoria_superficies_actuales_y_plan_rediseno.md)
- [11_shared_core_direction.md](../wiki-software/11_shared_core_direction.md)

## Paquete de fases

- [01_phase-0_governance-and-baseline.md](./01_phase-0_governance-and-baseline.md)
- [02_phase-1_shell-foundation.md](./02_phase-1_shell-foundation.md)
- [03_phase-2_main-split-alignment.md](./03_phase-2_main-split-alignment.md)
- [04_phase-3_workspace-window-migration.md](./04_phase-3_workspace-window-migration.md)
- [05_phase-4_fullscreen-workbench-migration.md](./05_phase-4_fullscreen-workbench-migration.md)
- [06_phase-5_hard-cuts-and-cleanup.md](./06_phase-5_hard-cuts-and-cleanup.md)
