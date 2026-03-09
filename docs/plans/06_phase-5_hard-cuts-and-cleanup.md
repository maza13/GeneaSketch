# Phase 5 - Hard Cuts and Cleanup

## Objetivo de la fase

Cerrar la migracion eliminando patrones viejos, compat temporal y chrome residual, dejando una sola anatomia oficial del shell y un solo patron vivo por cada superficie principal.

## Por que esta fase va aqui

Hasta que el patron final del shell y del workspace no existe, retirar compat seria prematuro. Pero una vez que el `window dossier` y el `fullscreen workbench` ya funcionan, prolongar ramas viejas solo aumenta deuda y ambiguedad de producto.

## Estado de entrada esperado

- el shell completo ya sigue la configuracion espacial objetivo
- el `main split` ya esta alineado
- el expediente normal ya es ventana interna
- fullscreen ya es workbench real
- la wiki ya refleja el patron final o esta lista para su ajuste final en el mismo ciclo

## Cambios que si se hacen

- retirar compat temporal y banderas transitorias
- cerrar rutas visuales duplicadas
- normalizar estilos y tokens
- endurecer pruebas de layout, scroll y coexistencia
- dejar documentacion final coherente con el sistema ya consolidado
- retirar el workspace legacy del contrato activo del shell y de la facade
- dejar `PersonWorkspacePanelV3` como unica ruta oficial de expediente
- mantener solo compat acotada de restauracion para snapshots viejos

## Cambios que explicitamente no se hacen

- no se abre una nueva ronda de rediseno mayor
- no se agregan nuevas familias de paneles
- no se reintroducen flows legacy por seguridad visual
- no se toca el `core` salvo que aparezca una violacion documental clara de frontera

## Subfases

### 5.1 Retirar compat temporal

- eliminar flags, ramas y estados creados solo para convivencia de migracion
- cerrar rutas de apertura que apunten a superficies ya retiradas
- dejar una sola ruta oficial por trigger UX
- retirar `features.personWorkspace` del contrato principal
- dejar `workspacePersonIdV3` como unica ruta activa de apertura/cierre del expediente

### 5.2 Cerrar rutas visuales duplicadas

- retirar patrones anteriores del expediente que sigan activos
- degradar o marcar como legacy las superficies que ya no son principales
- evitar que el usuario pueda llegar a dos experiencias profundas equivalentes
- marcar [PersonWorkspacePanel.tsx](/C:/My_Projects/GeneaSketch/src/ui/PersonWorkspacePanel.tsx) como referencia legacy `do-not-wire`

### 5.3 Normalizar estilos y tokens

- unificar chrome, spacing, z-index y reglas de overflow
- eliminar excepciones CSS temporales nacidas durante la migracion
- asegurar que el shell completo responde a tokens y no a parches hardcoded

### 5.4 Endurecer tests y documentacion final

- consolidar pruebas contractuales del shell y del workspace
- cerrar actualizaciones finales de wiki
- dejar el paquete `docs/plans` como referencia historica operativa de la migracion completada

## Contratos, tipos o interfaces a tocar

- eliminar props, estados o flags temporales ya sin uso
- consolidar contratos finales de `AppShell`, `RightPanel` y `PersonWorkspacePanelV3`
- dejar `PersonDetailPanel` claramente degradado o legacy si ya no es la via principal de trabajo profundo
- mantener `workspaceWindowState` y `layoutMode` solo si siguen siendo parte real del patron final
- retirar `personWorkspace` de `ShellFeaturesFacade`
- dejar `ShellWorkspaceWindowHost` consumiendo solo `personWorkspaceV3`
- encapsular `timelineMode` solo dentro de `sessionRestore` como mapping legado

## Archivos/sistemas esperados

- `AppShell`
- `ShellAppFrame`
- `RightPanel`
- `PersonWorkspacePanelV3`
- `styles`
- `tests`
- `wiki UX/software`

## Riesgos y decisiones si surge un problema

- si una compat temporal parece necesaria para no romper un flujo, la regla es demostrar con prueba por que debe sobrevivir; si no se puede justificar, se elimina
- si una superficie vieja sigue siendo necesaria, debe quedar explicitamente degradada y no competir con la superficie oficial
- si aparecen estilos heredados imposibles de normalizar rapido, se prioriza retirar los parches mas peligrosos de overflow, stacking y anchura antes que pulir detalles cosmeticos
- si aparecen snapshots viejos con `rightStack.timelineMode`, la resolucion preferida es normalizarlos en `sessionRestore` y no reabrir ese estado en el shell activo

## Criterios de salida

- no quedan dos patrones vivos para la misma superficie principal
- no quedan flags temporales sin fecha de retiro
- el shell, el inspector y el workspace final ya son los patrones oficiales
- las pruebas cubren layout, coexistencia y scroll del patron final
- la documentacion coincide con el sistema consolidado
- la facade ya no expone `personWorkspace`
- el host interno del expediente ya no admite fallback al workspace anterior

## Pruebas minimas obligatorias

- smoke test del shell completo
- pruebas de no scroll global del viewport
- pruebas de coexistencia `canvas + inspector`, `canvas + workspace window`, `workspace fullscreen + AncestrAI`
- pruebas de triggers oficiales: seleccionar, abrir expediente, expandir, restaurar, cerrar
- pruebas de ausencia de rutas legacy visibles como flujo principal
- prueba contractual de ausencia de `features.personWorkspace`
- prueba de restauracion: snapshots antiguos se normalizan, pero el estado resultante usa el modelo actual

## Impacto documental

- cierre final de actualizaciones en `docs/wiki-uxdesign/*` y `docs/wiki-software/*` si aplica
- mantenimiento del plan maestro y fases como historial operativo del cambio
- registrar que el workspace legacy queda solo como referencia historica y no como ruta activa del shell

## Deuda prohibida al cerrar la fase

- no dejar dos workspaces principales activos
- no dejar `RightPanel` mezclado otra vez con funciones de editor profundo
- no dejar `PersonWorkspacePanel` o patrones equivalentes visibles por accidente
- no dejar CSS temporal de overflow o z-index como solucion permanente
- no dejar `personWorkspaceV3.viewModel ?? personWorkspace.viewModel` ni rutas equivalentes de fallback
