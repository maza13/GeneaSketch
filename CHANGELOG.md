# Historial de Cambios (Changelog)

Todos los cambios notables de GeneaSketch se documentan aqui.

## 3 de marzo de 2026 - 0.4.4 (Beta GSchema, Desktop)

### Para usuarios (resumen rapido)
- Wiki de producto y wiki tecnica normalizadas con enlaces internos consistentes.
- Navegacion del panel Wiki mejorada para enlaces relativos y legacy `/docs/...`.
- Mayor claridad de contratos y glosario para evitar ambiguedades en uso diario.

### Detalle tecnico
- Fast-forward incremental real implementado en recovery de `.gsk`.
- Separacion estricta de changelogs por alcance (formato, software, release global).
- Gates de release alineados con metadata y versiones de manifests.

### Known Issues
- Pendiente ampliar pruebas E2E de navegacion markdown del panel Wiki.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: gschema.

## 2 de marzo de 2026 - 0.4.1 (Hard Cut: GSK-first)

### Para usuarios (resumen rapido)
- `.gsk` queda como formato nativo principal de trabajo.
- `.ged` se mantiene para interoperabilidad.
- Se retira soporte runtime de formatos legacy `.gsz/.gdz`.

### Detalle tecnico
- Normalizacion de metadata de origen (`GSK`/`GED`).
- Endurecimiento de validaciones de sesion.

### Known Issues
- Algunas migraciones de datasets muy antiguos requieren revision manual de warnings.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: gschema.

## 2 de marzo de 2026 - 0.4.0 (GSchema: Cambio de Paradigma)

### Para usuarios (resumen rapido)
- Nuevo motor GSchema basado en grafo y claims.
- Nuevo contenedor `.gsk` con estado, journal y metadatos.
- Migracion transparente desde formatos anteriores.

### Detalle tecnico
- Journal atomico auditable.
- Proyeccion en tiempo real para compatibilidad con UI.

### Known Issues
- Monitorear performance en arboles muy grandes durante operaciones complejas.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: gschema.

## 2 de marzo de 2026 - 0.3.7 (Refactorizacion del Store y Estabilidad)

### Para usuarios (resumen rapido)
- Mayor estabilidad general en carga y navegacion.
- Correcciones de estado y sincronizacion visual.

### Detalle tecnico
- Desacoplamiento del store en slices.
- Baseline QA para evitar regresiones.

### Known Issues
- Pendiente optimizacion de ciertos escenarios de carga pesada.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: core-refactor.

## 28 de febrero de 2026 - 0.3.6 (Buscador Avanzado y Refinamiento IA)

### Para usuarios (resumen rapido)
- Busqueda semantica mejorada y ordenamiento de resultados.
- Refinamiento de nacimiento con asistencia IA.

### Detalle tecnico
- Motor de busqueda desacoplado.
- Mejoras de estados y acciones de limpieza de modo visual.

### Known Issues
- Optimizacion de bundle pendiente en equipos de gama media.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de febrero de 2026 - 0.3.5 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rapido)
- Generador de arboles mock reproducible por semilla.
- Mejor visualizacion de endogamia.

### Detalle tecnico
- Ajustes en generacion pseudoaleatoria y escala visual.

### Known Issues
- Validacion final de build de produccion pendiente en algunos perfiles.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de febrero de 2026 - 0.3.0 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rapido)
- Flujo inicial de asistente IA para proponer cambios auditables.
- Revision previa por lote antes de aplicar.

### Detalle tecnico
- Pipeline de extraccion + resolucion.
- Fallback de proveedores en errores transitorios.

### Known Issues
- Credenciales y disponibilidad de proveedor pueden afectar ejecucion.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.
