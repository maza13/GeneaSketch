# Phase 1 - Shell Foundation

## Objetivo de la fase

Reorganizar la ventana principal para que la app adopte una estructura de shell clara y delimitada: `titlebar`, `toolbar`, `main shell region` y `status bar`. Esta fase prepara el terreno para el resto de la migracion sin reconfigurar todavia el comportamiento profundo del expediente.

## Por que esta fase va aqui

El shell completo debe quedar estable antes de recolocar paneles o transformar el expediente en una ventana interna. Si se intenta migrar el workspace primero, se corre el riesgo de incrustarlo sobre una base inestable y repetir deuda de layout.

## Estado de entrada esperado

- la fase 0 ya dejo fija la anatomia y la frontera shell/core
- el shell actual todavia combina menu superior y chrome en una sola banda
- la app ya tiene paneles laterales y canvas, pero no responde todavia de forma explicita a la configuracion espacial objetivo

## Cambios que si se hacen

- separar `titlebar` de `toolbar`
- estabilizar el `main shell region`
- introducir o consolidar una `status bar` inferior consistente
- cerrar el scroll global del viewport
- preparar `AppShell` para hospedar overlays y ventanas internas sin romper la estructura global

## Cambios que explicitamente no se hacen

- no se redefine todavia el papel profundo del `RightPanel`
- no se migra el expediente a ventana interna
- no se rediseña el fullscreen workbench
- no se alteran contratos del dominio ni del read model

## Subfases

### 1.1 Separar `titlebar` de `toolbar`

- mover el contexto de archivo, marca y chrome superior a una banda propia
- dejar las acciones operativas globales en una `toolbar` separada
- evitar que la topbar siga funcionando como contenedor de todo

### 1.2 Estabilizar `main shell region`

- definir un contenedor central unico para `left rail + canvas + right stack`
- cerrar alturas y anchos del shell
- asegurar que el canvas llena el espacio restante y no compite con bandas superiores o inferiores

### 1.3 Introducir `status bar` consistente

- fijar una banda inferior compacta con estado de documento, motor y contexto
- evitar que el footer se convierta en un panel cargado o en un log visual

### 1.4 Cerrar scroll global del viewport

- forzar `html`, `body`, root y contenedores de shell a no producir scroll total en uso normal
- dejar el scroll dentro de regiones locales cuando haga falta

## Contratos, tipos o interfaces a tocar

- `AppShell` debe aceptar una composicion explicita con `topbar`, `toolbar`, `main`, `footer/status`
- `ShellAppFrame` debe actuar como compositor del shell y no como simple pegamento visual
- `TopMenuBar` debe dejar de ser la unica banda superior
- si hace falta, crear view models de shell para `titlebar` y `toolbar`, siempre en `app-shell/facade`, nunca en `core`

## Archivos/sistemas esperados

- `AppShell`
- `ShellAppFrame`
- `TopMenuBar`
- `styles`
- `tests`
- `wiki UX/software`

## Riesgos y decisiones si surge un problema

- si separar `titlebar` y `toolbar` rompe demasiadas acciones existentes, se prioriza mantener el contrato funcional y degradar visualmente una de las bandas solo dentro de esta fase, pero con destino ya documentado
- si aparece scroll global por dependencias heredadas, la resolucion preferida es cerrar primero los contenedores raiz y luego redistribuir scroll local por superficie
- si el footer actual depende de layout ad hoc, se normaliza en esta fase y no se arrastra la excepcion

## Criterios de salida

- la app ya se siente como una ventana completa delimitada
- existen `titlebar`, `toolbar`, `main shell region` y `status bar` como bandas distinguibles
- no hay scroll global indeseado del viewport en uso normal
- el shell puede alojar futuras ventanas internas sin rehacerse otra vez

## Pruebas minimas obligatorias

- render del shell completo con las cuatro bandas
- ausencia de scroll global del viewport
- persistencia de layout principal al cambiar paneles u overlays existentes
- smoke test de que canvas y paneles actuales siguen montando correctamente

## Impacto documental

- actualizar la wiki UX si la separacion `titlebar/toolbar/status bar` introduce un patron nuevo no descrito
- reflejar que el shell pasa a ser una ventana delimitada y no un viewport con scroll continuo

## Deuda prohibida al cerrar la fase

- no dejar `TopMenuBar` haciendo al mismo tiempo de titlebar y toolbar por compat temporal indefinida
- no dejar excepciones de overflow global como solucion permanente
- no dejar el `status bar` como footer ambiguo sin rol claro
