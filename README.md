# GeneaSketch

Aplicacion local-first para visualizacion y edicion genealogica.

## v1.1 implementado

- Nuevo arbol con nodo raiz placeholder editable.
- Edicion de persona: nombre (obligatorio), sexo, estado de vida, nacimiento y defuncion.
- Asistente rapido de parentesco: padre, madre, hijo, pareja, hermano.
- Importacion GEDCOM tolerante (5.5, 5.5.1, 7.0.x) con conversion al modelo interno y warnings.
- Importacion/exportacion `.gdz` y exportacion `.ged`.
- `Ctrl+S` guarda por defecto en GDZ.
- Autosave local y restauracion de sesion.
- Render principal con Cytoscape.js (`Tree` estable, `Fan`/`Network` experimentales).
- Export PDF vector con `cytoscape-pdf-export` (viewport o todo lo visible).

## Ejecutar web

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

## Desktop (Tauri)

### Requisitos

- Rust toolchain (cargo/rustc)
- Dependencias de Tauri para Windows/macOS segun plataforma

### Comandos

```bash
npm run desktop:dev
npm run desktop:build:win
```

## Estructura

- `src/core/edit`: comandos de edicion de arbol/parentescos
- `src/core/gedcom`: parser/serializer GED/GDZ
- `src/core/graph`: expansion visible + metadatos de layout/alias
- `src/state`: store global
- `src/views`: renderers Cytoscape + layouts
- `src/ui`: paneles y formularios
- `src-tauri`: shell desktop
