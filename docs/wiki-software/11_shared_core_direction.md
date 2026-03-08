# 11 - Shared Core Direction

## Objetivo
Definir la direccion arquitectonica para que GeneaSketch pueda evolucionar hacia un nucleo reutilizable sin extraerlo hoy ni acumular deuda que lo vuelva costoso despues.

Este documento no ordena crear una libreria ahora. Define guardrails para que el desarrollo diario deje natural una futura separacion entre:
- nucleo compartible
- app desktop
- futuros consumidores como una app movil

## Norte arquitectonico

La direccion objetivo es esta:

```text
Genraph + interop + proyeccion estable = shared core futuro
State + App Shell + Kindra host + Tauri = app desktop
```

La app desktop sigue siendo el producto principal actual, pero debe comportarse como consumidora del nucleo, no como dueña de su semantica.

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

## Guardrails de desarrollo

### 1. El core no depende de UI ni plataforma
- Nada en `src/core/**` debe importar de `src/ui`, `src/app-shell`, `src/hooks`, `react`, `zustand` o `src-tauri`.
- Si una feature nueva necesita esos imports, no pertenece al core.

### 2. No mezclar dominio con estado visual
- Los tipos de dominio no deben seguir absorbiendo concerns de vista, paneles, configuracion visual o workspace.
- Si un tipo existe solo para canvas, paneles, overlays o preferencias de la app, debe vivir fuera del dominio compartible.

### 3. El read model no debe volverse un detalle accidental del desktop
- Si una proyeccion puede servir a desktop, movil o tooling, debe tratarse como frontera compartible.
- Evitar que el read model se acople a necesidades puntuales del shell o de un panel especifico.

### 4. Las mutaciones reales entran por comandos puros
- Las reglas de edicion del arbol deben vivir en comandos/helpers puros del core.
- Componentes, hooks y slices coordinan flujo; no deben convertirse en la fuente de verdad de las mutaciones.

### 5. Persistencia compartible y persistencia local siguen separadas
- `.gsk` y GEDCOM representan datos compartibles.
- autosave, workspace profile, panel layout, overlays y preferencias visuales son locales de app.
- No mezclar ambas capas en el mismo contrato salvo con transformaciones explicitas.

### 6. No duplicar semantica sin una razon explicita
- Si una nueva capacidad del grafo necesita proyeccion y exportacion, evitar implementar la semantica dos veces con reglas distintas.
- Si por ahora hay duplicacion, debe quedar documentado que es temporal y donde esta la fuente semantica dominante.

## Riesgos actuales a vigilar

### GedcomBridge + directProjection
- `src/core/genraph/GedcomBridge.ts` y `src/core/read-model/directProjection.ts` ya concentran semantica parecida.
- El riesgo no es solo tamano; es drift semantico entre exportacion/interoperabilidad y lo que la UI cree que existe.
- Cada cambio nuevo en nombres, eventos, familias, claims o source refs debe revisarse en ambas fronteras con criterio de una sola verdad semantica.

### `src/types/domain.ts`
- Hoy mezcla tipos de documento/grafo con tipos de vista/config local.
- No hace falta reestructurarlo de golpe, pero no debe seguir creciendo sin criterio.
- Regla practica: si un tipo solo sirve para visualizacion, paneles o preferencias del desktop, no debe entrar ahi por defecto.

## Lo que no se hara todavia

- No crear un paquete publico.
- No abrir una API remota solo por preparacion futura.
- No mover el repo a monorepo sin necesidad inmediata.
- No extraer carpetas fisicamente solo para "verse mas limpio" si la frontera logica aun no esta cerrada.

## Regla operativa para el dia a dia

Mientras sigamos desarrollando:

1. pensar si el cambio pertenece al shared core o a la app desktop
2. si pertenece al core, mantenerlo libre de UI/plataforma
3. si pertenece al desktop, no contaminar el dominio con ese detalle
4. si toca bridge/read-model, revisar riesgo de duplicacion semantica

## Navegacion
[<- 10_interconexiones](./10_interconexiones.md) | [Siguiente: glosario_usuario ->](./glosario_usuario.md)
