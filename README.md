# GeneaSketch

GeneaSketch es una app genealogica `local-first` para escritorio, centrada en trabajo sobre `.gsk` como formato nativo, interoperabilidad con `.ged` y edicion visual directa del arbol.

Estado actual:
- release visible: `0.4.5`
- canal: `beta`
- visual engine oficial: `Kindra`
- implementacion visual actual: `Kindra v3.1`
- formato nativo: `.gsk`
- interoperabilidad: importacion GEDCOM `5.5`, `5.5.1` y `7.0.x`

## Lo que ya hace bien

- Abrir, editar y guardar arboles genealogicos como `.gsk`
- Importar `.ged` con warnings y normalizacion al modelo interno
- Exportar `.ged`
- Mantener journal, autosave local y restauracion de sesion
- Editar personas, relaciones y familias desde paneles de trabajo
- Revisar merges/importaciones antes de aplicar cambios
- Usar `AncestrAI` con revision por lote y undo del ultimo batch
- Visualizar el arbol a traves de `Kindra` (implementacion actual `Kindra v3.1`)
- Exportar PDF y raster desde el arbol visible

## Ejecutar

Instalacion:

```bash
npm ci
```

Node soportado para desarrollo y CI: `24.x`.
Si usas `nvm` o un gestor compatible, la raiz del repo incluye `.nvmrc` y `.node-version`.

Web:

```bash
npm run dev
npm run build
npm run preview
```

Desktop (Tauri):

```bash
npm run desktop:dev
npm run desktop:build:win
```

## Tests

Suite completa:

```bash
npm test
```

Gate principal local:

```bash
npm run test:ci
```

Ejemplos utiles:

```bash
npm test -- src/tests/store.test.ts
npm test -- src/tests/workspace-profile.integration.test.ts
npm run test:perf:all
```

Nota:
- `npm test` corre la suite funcional/general.
- `test:perf:*` corre checks de performance dedicados y no forma parte de la suite general por defecto.

## Arquitectura breve

La separacion principal actual del sistema es:

```text
.gsk / GED -> IO -> Genraph Engine -> Read Model -> Kindra / App Shell
Workspace Profile -> State Manager / App Shell
AncestrAI / Import Review -> mutation contracts auditables
```

Puntos estructurales importantes:
- `Genraph Engine` es el nucleo canonico
- el `Read Model` alimenta la shell y la visualizacion
- `Kindra` es el nombre oficial del subsystema visual
- `Kindra v3.1` es la implementacion visual actual dentro de `Kindra`
- `AncestrAI` es el nombre oficial del subsystema de asistencia y automatizacion
- `App Shell` consume subfacades y view models derivados
- estado local/privado del workspace permanece separado del arbol compartible

## Estructura del repositorio

- `src/core/genraph`: API publica e implementacion actual del motor, journal, validacion y migraciones
- `src/core/kindra`: configuracion y contratos del visual engine
- `src/core/read-model`: proyeccion del grafo a documento consumible
- `src/core/edit`: comandos, merges, revision e importacion
- `src/app-shell`: facade y componentes de composicion del shell
- `src/state`: store Zustand y slices
- `src/ui`: paneles, modales y componentes de interfaz
- `src/views/kindra-v31`: runtime visual actual de `Kindra v3.1`
- `src-tauri`: shell desktop

## Notas

- Los formatos runtime legacy `.gsz/.gdz` ya no forman parte del camino principal.
- El producto sigue en beta y prioriza estabilidad del modelo, auditabilidad y claridad arquitectonica antes que feature sprawl.
