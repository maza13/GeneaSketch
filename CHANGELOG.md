# Historial de Cambios (Changelog)

Todos los cambios notables de GeneaSketch se documentan aqui.

## 7 de marzo de 2026 - 0.4.6 (Beta Rebrand, Hard Cut Close)

### Para usuarios (resumen rapido)
- La app cierra oficialmente la etapa de hard cut con una taxonomia mas clara: `Genraph`, `Kindra`, `Kindra v3.1` y `AncestrAI`.
- La shell queda mas ordenada y estable para seguir construyendo nuevas capacidades sin arrastrar naming legacy.
- La version visible y la metadata de desktop/release quedan sincronizadas en `0.4.6`.

### Detalle tecnico
- Se cierra el rebranding interno y visible de los subsistemas clave, retirando naming legacy activo en shell, runtime visual y metadata de release.
- `useAppShellFacade`, controller y session quedan mas delgados y repartidos por responsabilidad, con contratos estables y menos acoplamiento interno.
- Se sincronizan manifests web/desktop, release metadata, changelog publico y referencias visibles de version para consolidar `0.4.6`.

### Known Issues
- El nombre principal de la app `GeneaSketch` sigue intacto y podra reevaluarse en una fase posterior, separada del hard cut tecnico.
- El trabajo siguiente deberia volver a capacidades/producto; no se recomienda abrir otra ronda grande de refactor estructural inmediata.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: rebrand.

## 7 de marzo de 2026 - 0.4.5 (Beta GSchema, Shell Composition and Docs Sync)

### Para usuarios (resumen rapido)
- La shell queda mas ordenada internamente sin cambiar flujos visibles de uso.
- La documentacion principal ahora refleja mejor el estado real de la app y del formato nativo `.gsk`.
- Se agrega una capa de tests para proteger la frontera entre `App Shell`, facade y features complejas.

### Detalle tecnico
- `App.tsx` se reduce a composition root y reparte canvas, overlays de workspace y overlays globales en hosts separados.
- Se endurece el seam de shell con tests para workbenches, facade contract y boundary guard estructural.
- `README` y referencias visibles de version/wiki se sincronizan con `0.4.5`, `DTree V3` y la ruta `GSK-first`.

### Known Issues
- La superficie first-class para claims/citations/evidence sigue diferida y documentada como deuda posterior.
- El bundle web sigue siendo grande para produccion y mantiene advertencias de chunk en build.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: gschema.

## 6 de marzo de 2026 - 0.4.5 (Beta GSchema, Foundation Close, Desktop)

### Para usuarios (resumen rapido)
- Mayor estabilidad y consistencia del motor genealogico bajo el modelo directo.
- Mejor respuesta del arbol y del buscador en escenarios densos.
- Base arquitectonica y nomenclatura mas claras para separar motor, visualizacion y shell.

### Detalle tecnico
- Cierre del Super Analisis 0.5.0 con fixes de paridad `direct` vs `legacy`, normalizacion de `fastTrack` y optimizacion de performance densa.
- Cierre del cleanup postship inmediato: integridad de texto runtime, decision explicita sobre UX de evidencia y retiro del riesgo de flicker no reproducido.
- Consolidacion de taxonomia e interconexiones del proyecto (`097`, `100`-`104`) y endurecimiento del protocolo V2 de TODOs y de la promocion de notas a tareas.

### Known Issues
- La superficie first-class para claims/citations/evidence sigue diferida y documentada como deuda posterior.
- El follow-up arquitectonico posterior (`099`) permanece intencionalmente fuera de este checkpoint.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: gschema.

## 4 de marzo de 2026 - Nota de arquitectura (Cierre DTree V3 065-072)

### Para usuarios (resumen rapido)
- El render genealogico queda consolidado en la ruta V3.
- Se elimina la ruta de contingencia V2 para reducir complejidad operativa.
- La app mantiene apertura de datos legacy con migracion tolerante en segundo plano.

### Detalle tecnico
- Hard-cut runtime: `DTreeView` legacy retirado; `App` monta `DTreeViewV3` en camino unico.
- Hard-cut contrato dtree/layout: fuera `renderVersion`, `layoutEngine` queda vnext-only, sin fallback `v2 -> vnext`.
- Persistencia versionada con migracion de lectura y write-back:
  - Session snapshot `schemaVersion 7 -> 8`
  - Workspace profile `schemaVersion 1 -> 2`
- Limpieza UX de referencias V2 en menu/ayuda y validacion de cadena TODO `065..072`.

### Estado de gates
- `npm run test`: verde.
- `npm run build`: verde.
- `npm run test:perf:layout`: verde.
- `npm run test:perf:overlays`: verde.
- `npm run plan:dtree-v3:validate`: verde.

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
