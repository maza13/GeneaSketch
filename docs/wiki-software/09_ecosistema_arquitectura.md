# 09 - Ecosistema y arquitectura de bloques

Este documento resume la separacion de responsabilidades en GeneaSketch y evita mezclar formato, motor, proyeccion, visualizacion y shell de aplicacion.

## Nota de transicion de nombres

- antes `GSchema Engine`, ahora `Genraph Engine`
- antes el subsystema visual se referenciaba por su implementacion `Kindra v3.1`; ahora el nombre oficial del subsystema es `Kindra`
- antes `AI Assistant`, ahora `AncestrAI`

## Mapa de bloques arquitectonicos

### 1. Genraph Engine
- Que es: el motor semantico del grafo en memoria.
- Responsabilidad: mantener invariantes, journal y consistencia del estado.
- No hace: UI, layout ni persistencia de preferencias.

### 2. GSK Package IO
- Que es: la frontera de persistencia del formato `.gsk`.
- Responsabilidad: importar/exportar el paquete, manifest y journal.
- No hace: definir semantica del motor.

### 3. GEDCOM IO
- Que es: la frontera de interoperabilidad GEDCOM.
- Responsabilidad: parseo, serializacion y compatibilidad de intercambio.
- No hace: dominar el runtime interno del producto.

### 4. Read Model
- Que es: la proyeccion del estado del grafo hacia una forma consumible por UI, AI y herramientas.
- Responsabilidad: exponer documentos y selectors consistentes.
- No hace: render ni persistencia.

### 5. Kindra
- Que es: el subsystema visual oficial de GeneaSketch.
- Implementacion actual: `Kindra v3.1`.
- Responsabilidad: proyectar el read model en una vista interactiva.
- No hace: controlar paneles, modales o chrome de la app.

### 6. App Shell
- Que es: la UI de controles, paneles y navegacion que rodea a Kindra.
- Responsabilidad: shell, paneles, modales, header y flujos de interaccion.
- No hace: reemplazar al motor ni al sistema de layout.

### 7. State Manager
- Que es: la coordinacion reactiva del estado de sesion.
- Implementacion actual: store con slices.
- Responsabilidad: sincronizar seleccion, vista, hidratacion y coordinacion entre bloques.

### 8. AncestrAI
- Que es: la capa de asistencia y automatizacion basada en AI.
- Responsabilidad: extraer, refinar, revisar y proponer cambios auditables.
- No hace: saltarse las fronteras estables del motor o del read model.

### 9. Workspace Profile
- Que es: preferencias locales por grafo fuera del `.gsk`.
- Responsabilidad: tema, configuracion visual, modo de lectura y preferencias persistidas.

### 10. Knowledge System
- Que es: wiki y documentacion integrada en la app.
- Responsabilidad: ayuda operativa y tecnica alineada al estado actual del proyecto.

---

## Distincion critica

| Termino | Proposito | Si se elimina |
| --- | --- | --- |
| Kindra | Renderizar y ordenar el arbol genealogico. | El motor sigue vivo, pero no hay vista navegable del arbol. |
| App Shell | Controlar la aplicacion y editar datos. | El arbol puede seguir visible, pero la experiencia de uso queda incompleta. |

---

## Flujo simplificado de dependencias

```text
.gsk / GED -> IO -> bridges -> Genraph Engine -> Read Model -> Kindra / App Shell
                                      |-> State Manager
                                      |-> AncestrAI
Workspace Profile -> State Manager / App Shell
Knowledge System -> App Shell
```

## Reglas practicas

1. No usar `UI` como nombre canonico para todo el sistema visual.
2. Hablar de `Kindra` cuando el tema sea el subsystema visual oficial; usar `visual engine` solo como categoria general.
3. Hablar de `App Shell` cuando el tema sea paneles, navegacion, modales o chrome.
4. Hablar de `Read Model` como frontera entre el motor y consumidores.
5. Tratar `.gsk` como frontera de persistencia, no como centro semantico del producto.

## Relacion con la base arquitectonica

Este documento es un resumen operativo. La base mas completa de taxonomia e interconexiones vive en:
- `notes/entries/N0010-idea-re-evaluacion-nomenclatura-visual-engine-otros.md`
- `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`
- `todos/100` a `104`

La direccion para evolucionar hacia un shared core reusable sin abrir una extraccion prematura vive en:
- [11_shared_core_direction](./11_shared_core_direction.md)
- Su lectura es obligatoria antes de cambios que puedan afectar fronteras entre core, read model, visual engine y app shell.
- Ese documento tambien fija la postura `desktop-first`, las fronteras para futuros hosts `web-safe` y `mobile-safe`, y el orden recomendado de endurecimiento entre core, read model y shell.

---

## Navegacion
[<- 08_atajos_y_productividad](./08_atajos_y_productividad.md) | [Siguiente: 10_interconexiones ->](./10_interconexiones.md)

