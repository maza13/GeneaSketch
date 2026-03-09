# Phase 3 - Workspace Window Migration

## Objetivo de la fase

Convertir `PersonWorkspacePanelV3` en una ventana interna flotante del shell para el modo `window`, con titlebar propia, tabs superiores, cuerpo central unico y comportamiento consistente de apertura, cierre, restauracion y expansion.

## Por que esta fase va aqui

El expediente solo puede sentirse como una ventana interna creible cuando el shell ya esta delimitado y el `main split` ya tiene jerarquia clara. Esta fase toma la configuracion espacial del mock y la traduce al workspace real del proyecto.

## Estado de entrada esperado

- el shell principal ya tiene bandas estables y no depende de scroll global
- el `main split` ya distingue `left rail`, `canvas` y `right inspector`
- `PersonWorkspacePanelV3` ya es el workspace oficial a nivel de taxonomia

## Cambios que si se hacen

- desacoplar el expediente del patron de modal centrado generico
- definir un estado de ventana interna para el workspace
- adaptar el modo `window` a `titlebar + tabs + contenido`
- integrar los triggers de `abrir`, `cerrar`, `expandir` y `restaurar` dentro del shell
- persistir minimamente persona activa y tab activa

## Cambios que explicitamente no se hacen

- no se convierte todavia el fullscreen en workbench final
- no se introducen sidecars o rails de analisis en el modo `window`
- no se abren paneles nuevos para `claims`, `journal` o IA
- no se mueve logica de persona al shell

## Subfases

### 3.1 Desacoplar el expediente del modal generico

- revisar `StandardModal` y el host del workspace
- separar lo que es modal generico de lo que ahora debe comportarse como ventana interna
- mantener el expediente como misma superficie oficial

### 3.2 Definir estado de ventana interna

- introducir `workspaceWindowState`
- fijar posicion inicial y tamano inicial dentro del `main shell region`
- preparar contratos de restauracion y expansion

### 3.3 Adaptar header, tabs y cuerpo al modo `window`

- dejar un header sobrio con identidad basica
- mantener tabs superiores como navegacion principal
- dejar un cuerpo central unico, sin sidecar ni banda analitica persistente

### 3.4 Integrar apertura, cierre y expandir dentro del shell

- abrir desde inspector o triggers oficiales
- cerrar sin dejar estados legacy colgando
- expandir hacia el mismo expediente en fullscreen
- restaurar a ventana conservando persona y tab activa

## Contratos, tipos o interfaces a tocar

- `PersonWorkspaceViewModel`
  - `layoutMode: "window" | "fullscreen"`
- `workspaceWindowState`
  - `x`
  - `y`
  - `width`
  - `height`
- estado de shell para:
  - `workspaceOpen`
  - persona activa del workspace
  - seccion/tab activa
- si el drag no entra aun, dejar el contrato preparado y documentar limites desde esta fase

## Archivos/sistemas esperados

- `AppShell`
- `ShellAppFrame`
- `PersonWorkspacePanelV3`
- `styles`
- `tests`
- `wiki UX/software`

## Riesgos y decisiones si surge un problema

- si el stack actual no soporta drag sin introducir complejidad alta, la resolucion preferida es fijar tamano/posicion inicial y dejar drag para una subfase corta posterior, sin bloquear la migracion principal
- si `StandardModal` esta demasiado acoplado al patron anterior, se le extrae capacidad reusable minima y el resto queda especifico del workspace
- si aparecen estados legacy de apertura/cierre, se limpian en esta fase y no se arrastran por compat

## Criterios de salida

- el expediente normal ya parece una ventana interna y no un modal centrado clasico
- `abrir expediente` abre el workspace en modo `window`
- `expandir` transforma el mismo expediente en fullscreen
- `restaurar` vuelve a ventana sin perder persona ni tab activa
- el modo `window` no muestra sidecar ni chrome analitico persistente

## Pruebas minimas obligatorias

- abrir expediente desde inspector abre la ventana interna
- cerrar limpia el estado de apertura sin overlays residuales
- expandir y restaurar conservan persona y tab activa
- tabs superiores aparecen solo en `window`
- la ventana no causa scroll global del shell

## Impacto documental

- actualizar la wiki UX para reflejar que el expediente normal ya es una ventana interna flotante del shell
- reflejar la existencia de `layoutMode` y `workspaceWindowState` como concerns de shell

## Deuda prohibida al cerrar la fase

- no dejar el expediente viviendo a medias entre modal generico y ventana interna
- no dejar apertura/cierre duplicados entre estados legacy y V3
- no dejar la persistencia de tab o persona como comportamiento accidental
