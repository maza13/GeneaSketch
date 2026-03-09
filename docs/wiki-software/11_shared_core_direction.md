# 11 - Shared Core Direction

## Objetivo
Definir la direccion arquitectonica para que GeneaSketch pueda evolucionar hacia un nucleo reutilizable sin extraerlo hoy ni acumular deuda que lo vuelva costoso despues.

Este documento no ordena crear una libreria ahora. Define guardrails para que el desarrollo diario deje natural una futura separacion entre:
- nucleo compartible
- app desktop
- futuros consumidores como una app web o movil

## Norte arquitectonico

La direccion objetivo es esta:

```text
Genraph + interop + proyeccion estable = shared core futuro
State + App Shell + Kindra host + Tauri = app desktop
```

La app desktop sigue siendo el producto principal actual, pero debe comportarse como consumidora del nucleo, no como dueña de su semantica.

Esta direccion no implica que desktop, web y movil deban construirse al mismo tiempo.
La prioridad correcta es:

1. consolidar la app desktop
2. endurecer las fronteras del nucleo compartible
3. abrir despues nuevos hosts como web o movil solo cuando el core ya soporte esa separacion sin contaminarse

## Que debe poder salir a un shared core

Con el estado actual, estas areas deben tratarse desde ya como candidatas naturales a separarse en el futuro:

- `Genraph`
- contratos y helpers de `.gsk`
- bridges/import-export GEDCOM
- validaciones y reglas de integridad
- comandos puros de edicion
- read model, si se estabiliza como frontera compartible y no solo como detalle de UI

Estas areas no deben crecer como parte del futuro shared core:

- React
- Zustand
- Tauri
- App Shell
- paneles, modales y layouts de workspace
- preferencias visuales locales y estado de sesion de la app

## Consumidores futuros previstos

La direccion actual contempla tres clases de consumidor:

- `desktop principal`: producto oficial actual, con acceso a shell nativo y flujos local-first completos
- `web-safe futuro`: consumidor potencial con restricciones propias de navegador, permisos mas limitados y persistencia distinta
- `mobile-safe futuro`: consumidor potencial con constraints de pantalla, filesystem y experiencia offline diferentes

Reglas:

- no asumir que una capacidad valida en desktop debe existir igual en web o movil
- no modelar hoy la app como si esos tres hosts fueran equivalentes
- si una capacidad pudiera servir en todos, debe vivir en el core o en una frontera compartible, no en el shell desktop

## Guardrails de desarrollo

### 1. El core no depende de UI ni plataforma
- Nada en `src/core/**` debe importar de `src/ui`, `src/app-shell`, `src/hooks`, `react`, `zustand` o `src-tauri`.
- Si una feature nueva necesita esos imports, no pertenece al core.

### 2. No mezclar dominio con estado visual
- Los tipos de dominio no deben seguir absorbiendo concerns de vista, paneles, configuracion visual o workspace.
- Si un tipo existe solo para canvas, paneles, overlays o preferencias de la app, debe vivir fuera del dominio compartible.

### 3. El read model no debe volverse un detalle accidental del desktop
- Si una proyeccion puede servir a desktop, web, movil o tooling, debe tratarse como frontera compartible.
- Evitar que el read model se acople a necesidades puntuales del shell o de un panel especifico.

### 4. Las mutaciones reales entran por comandos puros
- Las reglas de edicion del arbol deben vivir en comandos/helpers puros del core.
- Componentes, hooks y slices coordinan flujo; no deben convertirse en la fuente de verdad de las mutaciones.

### 5. Persistencia compartible y persistencia local siguen separadas
- `.gsk` y GEDCOM representan datos compartibles.
- autosave, workspace profile, panel layout, overlays y preferencias visuales son locales de app.
- No mezclar ambas capas en el mismo contrato salvo con transformaciones explicitas.

### 5.1 Persistencia por host
- desktop puede conservar adaptadores nativos, autosave local y flujos de archivo ricos
- web futura necesitara storage y permisos propios del navegador
- movil futuro necesitara otra estrategia de almacenamiento local y exportacion
- esas diferencias deben resolverse en adaptadores o hosts, no filtrarse al dominio

### 6. No duplicar semantica sin una razon explicita
- Si una nueva capacidad del grafo necesita proyeccion y exportacion, evitar implementar la semantica dos veces con reglas distintas.
- Si por ahora hay duplicacion, debe quedar documentado que es temporal y donde esta la fuente semantica dominante.

## Riesgos actuales a vigilar

### GedcomBridge + directProjection
- `src/core/genraph/GedcomBridge.ts` y `src/core/read-model/directProjection.ts` ya concentran semantica parecida.
- El riesgo no es solo tamano; es drift semantico entre exportacion, interoperabilidad y lo que la UI cree que existe.
- Cada cambio nuevo en nombres, eventos, familias, claims o source refs debe revisarse en ambas fronteras con criterio de una sola verdad semantica.

### `src/types/domain.ts`
- Hoy mezcla tipos de documento y grafo con tipos de vista y config local.
- No hace falta reestructurarlo de golpe, pero no debe seguir creciendo sin criterio.
- Regla practica: si un tipo solo sirve para visualizacion, paneles o preferencias del desktop, no debe entrar ahi por defecto.

### Read model, facades y view models
- El riesgo no es solo UI; tambien que read models, facades o view models del desktop empiecen a cargar semantica del producto.
- Si una regla pertenece al dominio, no debe quedar definida solo porque una facade o un panel la necesita.
- Si una proyeccion sirve a desktop, web, movil o tooling, debe estabilizarse como frontera compartible y no como detalle accidental del host actual.

### Desktop-first convertido por accidente en desktop-only
- El objetivo actual es desktop-first, no desktop-locked.
- Cada vez que una feature nueva exija Tauri, Zustand, paneles o estado visual para existir semanticamente, aumenta el costo futuro de web o movil.
- Esa deuda debe detectarse temprano y resolverse en la frontera correcta.

## Lo que no se hara todavia

- No crear un paquete publico.
- No abrir una API remota solo por preparacion futura.
- No mover el repo a monorepo sin necesidad inmediata.
- No extraer carpetas fisicamente solo para "verse mas limpio" si la frontera logica aun no esta cerrada.
- No abrir un frente web completo mientras desktop, read model y fronteras del core sigan inestables.
- No diseñar hoy la UI desktop con constraints de navegador o movil si eso degrada el producto principal.

## Prioridades de migracion recomendadas

Para que esta direccion no se convierta en deuda creciente, el endurecimiento debe seguir este orden:

1. `core semantico`
   - reglas de integridad
   - comandos puros
   - interop GEDCOM y `.gsk`
2. `read model compartible`
   - proyecciones utiles para multiples consumidores
   - evitar acoplarlo a un panel o shell puntual
3. `contratos de host`
   - file system
   - autosave
   - perfiles de workspace
   - capacidades nativas
4. `desktop shell`
   - paneles, modales, overlays, workspace y estado visual
5. `hosts futuros`
   - web-safe
   - mobile-safe

Regla de decision:
- si algo hace falta para que desktop funcione hoy, implementarlo en desktop
- si algo define semantica del arbol o del documento, endurecerlo en core
- si algo cambia por plataforma, aislarlo como adaptador y no como regla de dominio

## Regla operativa para el dia a dia

Mientras sigamos desarrollando:

1. pensar si el cambio pertenece al shared core o a la app desktop
2. si pertenece al core, mantenerlo libre de UI y plataforma
3. si pertenece al desktop, no contaminar el dominio con ese detalle
4. si toca bridge o read model, revisar riesgo de duplicacion semantica
5. si una capacidad futura parece web-safe o mobile-safe, documentar la frontera antes de mezclarla con el shell actual

## Aplicacion explicita al rediseño del shell

La migracion del shell inspirada por la referencia anatomica del plan vive por completo en el host desktop.

Esto incluye:

- layout del shell
- `titlebar`, `toolbar` y `status bar`
- `workspaceWindowState`
- stacking y overlays
- drag y positioning de ventanas internas
- reglas de overflow regional
- `workspaceOverlayHost`

Regla:

- nada de lo anterior debe moverse al `shared core` por conveniencia de implementacion
- si un cambio solo existe para soportar el shell desktop, debe quedarse en `app-shell`, `ui`, `styles` o adaptadores del host
- si una capacidad demuestra semantica compartible, se evalua despues contra los guardrails del core; no se promueve por anticipacion

Referencia cruzada operativa:

- `docs/plans/00_shell-migration-master-plan.md`
- `docs/plans/01_phase-0_governance-and-baseline.md`

## Navegacion
[<- 10_interconexiones](./10_interconexiones.md) | [Siguiente: glosario_usuario ->](./glosario_usuario.md)
