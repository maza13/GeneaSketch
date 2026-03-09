# Phase 4 - Fullscreen Workbench Migration

## Objetivo de la fase

Transformar el fullscreen del expediente en un workbench profundo y operativo, con `rail izquierdo`, `contenido central` y `sidecar derecho`, manteniendo el mismo `PersonWorkspacePanelV3` como unica superficie oficial de trabajo profundo por persona.

## Por que esta fase va aqui

El workbench fullscreen debe ser una expansion natural del expediente ya migrado a ventana interna. Si se construye antes, se convierte en otra superficie separada y contradice la direccion UX definida en la wiki.

## Estado de entrada esperado

- el expediente ya existe como `workspace window`
- `layoutMode` y `workspaceWindowState` ya estan definidos
- `abrir`, `cerrar`, `expandir` y `restaurar` ya funcionan sobre la misma superficie

## Cambios que si se hacen

- convertir fullscreen en composicion `rail + centro + sidecar`
- mover la navegacion principal a un rail izquierdo en fullscreen
- reforzar prioridades analiticas de `analysis`, `sources`, `notes`, `timeline`, `audit`
- mostrar `claims` y `journal` como secciones futuras del workspace
- integrar quick actions y contexto lateral sin convertir a AncestrAI en panel dominante

## Cambios que explicitamente no se hacen

- no se crean nuevos paneles externos para `claims`, `journal` o investigacion
- no se reabre una familia separada de editor profundo
- no se reemplaza el canvas como centro conceptual del producto fuera del workspace
- no se modifica semantica del dominio para satisfacer el layout

## Subfases

### 4.1 Rail izquierdo de secciones

- usar las secciones reales del expediente como base del rail
- mantener una taxonomia consistente con el modo `window`
- diferenciar secciones operativas, parciales y futuras sin ocultar deuda funcional

### 4.2 Contenido central por seccion activa

- renderizar la seccion activa con header propio y capacidad de trabajo profundo
- permitir edicion en contexto donde ya exista soporte real
- mantener coherencia entre modo `window` y `fullscreen`

### 4.3 Sidecar derecho analitico

- anadir contexto operativo, accesos rapidos y ayudas de investigacion
- reservar espacio para futuro sin inventar subsistemas ajenos
- mantener el sidecar como soporte del trabajo, no como superficie competidora

### 4.4 Quick actions y carriles futuros

- dar prioridad visual a `analysis`, `sources`, `notes`, `timeline`, `audit`
- dejar `claims` y `journal` visibles como carriles futuros del workbench
- integrar AncestrAI como utility contextual lanzada desde el trabajo profundo

## Contratos, tipos o interfaces a tocar

- `PersonWorkspaceViewModel`
  - `layoutMode`
  - `v3Sections`
  - metadata de workbench
- `v3Sections`
  - `workbenchPriority`
  - `contextRole`
  - `futureAnalysis`
- reglas de render:
  - tabs superiores solo en `window`
  - rail lateral solo en `fullscreen`
  - sidecar solo en `fullscreen`

## Archivos/sistemas esperados

- `PersonWorkspacePanelV3`
- `AppShell`
- `styles`
- `tests`
- `wiki UX/software`

## Riesgos y decisiones si surge un problema

- si una seccion no tiene todavia capacidad real para modo profundo, se muestra como `parcial` o `future` dentro del workspace y no se empuja a un panel paralelo
- si AncestrAI amenaza con ocupar visualmente el lugar del sidecar, la resolucion preferida es mantenerla como modal/utility contextual con buen stacking
- si `claims` o `journal` no tienen contrato de engine listo, se reservan visualmente sin fingir edicion real

## Criterios de salida

- fullscreen ya funciona como workbench y no como modal agrandado
- el rail izquierdo sustituye a las tabs superiores en fullscreen
- el sidecar derecho existe solo en fullscreen y aporta contexto real
- `analysis`, `sources`, `notes`, `timeline` y `audit` tienen prioridad visible
- `claims` y `journal` quedan dentro del workspace como secciones futuras

## Pruebas minimas obligatorias

- fullscreen usa `rail + centro + sidecar`
- window sigue usando tabs superiores y sin sidecar
- expandir y restaurar conservan persona y seccion activa
- coexistencia correcta con `AncestrAI`
- `claims` y `journal` siguen dentro del workspace y no como overlays separados

## Impacto documental

- actualizar la wiki UX para reflejar la division explicita `window dossier` vs `fullscreen workbench`
- documentar el papel de `claims` y `journal` como carriles futuros del workspace

## Implementacion base cerrada

La base de esta fase queda fijada asi:

- `fullscreen` mantiene `StandardModal` solo como host tecnico
- el chrome propio del workbench vive dentro de `PersonWorkspacePanelV3`
- el header del workbench se compacta y deja de competir con el contenido central
- el rail se agrupa por prioridad de trabajo (`analysis`) y por registro base
- el sidecar sigue siendo contextual, no decorativo ni dominante

## Deuda prohibida al cerrar la fase

- no dejar fullscreen como simple variante estirada del modal anterior
- no dejar las tabs superiores activas tambien en fullscreen por compat visual indefinida
- no dejar secciones futuras resueltas como paneles externos provisionales
