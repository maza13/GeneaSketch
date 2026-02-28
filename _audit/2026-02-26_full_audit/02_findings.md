# 02_findings.md

## Hallazgos priorizados

---

### GS-AUD-001
- **Severidad:** Alta
- **Categoría:** Correctitud / Estado React
- **Ubicación:** `src/App.tsx:281`, `src/App.tsx:295`, `src/App.tsx:297`, `src/App.tsx:326`
- **Evidencia:** El `useEffect` del listener de teclado usa `exportGsz()` en `Ctrl+S`, pero su arreglo de dependencias solo incluye `[goBack, goForward, fitToScreen]`.
- **Impacto:** Riesgo de stale closure: el atajo puede operar con referencias no actualizadas (documento/config/theme), provocando exportaciones inconsistentes en sesiones largas o tras cambios de estado.
- **Riesgo:** Medio-Alto
- **Recomendación técnica:** Encapsular handlers con `useCallback` y declarar dependencias reales del efecto; alternativamente centralizar atajos en hook dedicado con referencias estables.
- **Esfuerzo:** M

### GS-AUD-002
- **Severidad:** Alta
- **Categoría:** Contrato de datos / UI
- **Ubicación:** `src/state/store.ts:693`, `src/state/store.ts:706`, `src/views/DTreeView.tsx:1410`, `src/views/DTreeView.tsx:1432`
- **Evidencia:** El store guarda timeline overlay con `config.year`, mientras la UI lee `timelineOverlay.config.currentYear`.
- **Impacto:** El badge de simulación puede mostrar año vacío/incorrecto aunque el estado se haya actualizado.
- **Riesgo:** Alto (inconsistencia visible de producto)
- **Recomendación técnica:** Unificar contrato (`year`) y tipar el payload del overlay timeline para evitar divergencia silenciosa.
- **Esfuerzo:** S

### GS-AUD-003
- **Severidad:** Alta
- **Categoría:** Modelo de datos / I/O media
- **Ubicación:** `src/core/edit/commands.ts:142`, `src/core/edit/commands.ts:146`, `src/core/edit/commands.ts:201`, `src/core/edit/commands.ts:204`, `src/ui/PersonEditorPanel.tsx:225`
- **Evidencia:** La foto (`photoDataUrl`) se persiste en `media.fileName`.
- **Impacto:** Mezcla semántica entre ruta de archivo y data URL; complica serialización, aumenta tamaño de documento y puede romper flujos de export/import de media embebida.
- **Riesgo:** Alto
- **Recomendación técnica:** Separar campos (`fileName` para referencia, `dataUrl/bytes` para embebido), migrar payload interno y ajustar serializer/parser.
- **Esfuerzo:** M

### GS-AUD-004
- **Severidad:** Alta
- **Categoría:** Seguridad Desktop
- **Ubicación:** `src-tauri/src/main.rs:5`, `src-tauri/tauri.conf.json:22`
- **Evidencia:** Plugin shell habilitado y CSP nula (`"csp": null`).
- **Impacto:** Superficie de ataque ampliada para app desktop (especialmente ante XSS o contenido no confiable en frontend).
- **Riesgo:** Alto
- **Recomendación técnica:** Definir política CSP explícita y reducir permisos/capabilities de Tauri al mínimo necesario.
- **Esfuerzo:** M

### GS-AUD-005
- **Severidad:** Alta
- **Categoría:** Rendimiento / Escalabilidad UI
- **Ubicación:** `src/views/DTreeView.tsx:223`, `253-254`, `258`, `262`, `333`, `400`, `407-408`, `477-478`, `526-527`, `563-564`, `649-650`
- **Evidencia:** Repetición intensiva de `graph.nodes.find/filter` y `graph.edges.find/filter` dentro de cálculos de overlays y render.
- **Impacto:** Degradación severa con árboles grandes (latencia de interacción, re-render costoso, caída de FPS).
- **Riesgo:** Alto
- **Recomendación técnica:** Preindexar nodos/aristas (`Map`) por id/canonicalId y evitar búsquedas lineales repetidas en loops anidados.
- **Esfuerzo:** M-L

### GS-AUD-006
- **Severidad:** Media
- **Categoría:** Correctitud de parsing / dominio temporal
- **Ubicación:** `src/views/DTreeView.tsx:291`, `294`, `299`, `301`
- **Evidencia:** Extracción de año con `parseInt(b.replace(/\D/g, "").slice(0,4), 10)` en cálculo de promedio familiar.
- **Impacto:** Fechas GED complejas (`BET`, `AFT`, `BEF`, día/mes/año no uniformes) pueden producir años erróneos y conclusiones estadísticas incorrectas.
- **Riesgo:** Medio
- **Recomendación técnica:** Reutilizar el normalizador central (`core/timeline/dateNormalization.ts`) o parser común de fechas GED.
- **Esfuerzo:** S-M

### GS-AUD-007
- **Severidad:** Media
- **Categoría:** UX / Persistencia de estado
- **Ubicación:** `src/state/store.ts:416`, `428-429`
- **Evidencia:** `setDocument` limpia `recentFiles` y `recentPayloads`.
- **Impacto:** Pérdida de historial de recientes al abrir documento; experiencia inconsistente respecto a comportamiento esperado de “recent files”.
- **Riesgo:** Medio
- **Recomendación técnica:** Separar carga de documento de limpieza de recientes; limpiar solo por acción explícita del usuario.
- **Esfuerzo:** S

### GS-AUD-008
- **Severidad:** Media
- **Categoría:** Tipado y robustez
- **Ubicación:** `src/types/domain.ts:143`, `src/views/DTreeView.tsx:55`, `142`, `163`, `384`, `src/core/layout/v2/solver.ts:57`, `87`, `120`, `src/core/inference/dateInference.ts:494-495`
- **Evidencia:** Uso de `config: any` y múltiples `any` en rutas de layout/overlay.
- **Impacto:** Menor capacidad de detección temprana de errores de contrato, refactors más riesgosos.
- **Riesgo:** Medio
- **Recomendación técnica:** Definir tipos discriminados por overlay y eliminar `any` progresivamente en módulos críticos.
- **Esfuerzo:** M

### GS-AUD-009
- **Severidad:** Media
- **Categoría:** Mantenibilidad / Código muerto o duplicado
- **Ubicación:** `src/App.tsx:45`, `src/utils/relations.ts:3`, `src/views/usePanZoom.ts:27`
- **Evidencia:** `resolveFamilyChildAction` duplicada (App + utils); `usePanZoom` exportado sin uso en el proyecto.
- **Impacto:** Divergencia futura de lógica y sobrecarga cognitiva.
- **Riesgo:** Medio
- **Recomendación técnica:** Consolidar helper en un único módulo y eliminar o integrar hook no usado.
- **Esfuerzo:** S

### GS-AUD-010
- **Severidad:** Media
- **Categoría:** Cobertura de pruebas
- **Ubicación:** Módulos críticos sin test nominal directo (`src/core/edit/commands.ts`, `src/core/gedcom/parser.ts`, `src/core/gedcom/serializer.ts`, `src/core/timeline/*`, `src/core/layout/*`, `src/core/inference/dateInference.ts`, etc.)
- **Evidencia:** Listado de brechas detectado en barrido de mapeo core-vs-tests.
- **Impacto:** Riesgo de regresiones en áreas de alto impacto funcional pese a suite verde global.
- **Riesgo:** Medio
- **Recomendación técnica:** Añadir tests de comportamiento por contratos críticos (I/O GED, timeline overlay, edición de relaciones, layout determinístico de casos complejos).
- **Esfuerzo:** M-L

### GS-AUD-011
- **Severidad:** Media
- **Categoría:** Seguridad de cadena de suministro
- **Ubicación:** `raw/npm_audit.json`
- **Evidencia:** `6` vulnerabilidades (`1 alta`, `5 moderadas`), incluyendo `rollup` (alta) y cadena `vitest/vite/vite-node/esbuild`.
- **Impacto:** Riesgo en pipeline local/CI y tooling; potencial exposición durante build/dev.
- **Riesgo:** Medio
- **Recomendación técnica:** Plan de actualización controlada de toolchain (primero parches compatibles, luego major upgrades con pruebas de regresión).
- **Esfuerzo:** M

### GS-AUD-012
- **Severidad:** Baja
- **Categoría:** Calidad de UX textual / Internacionalización
- **Ubicación:** `src/views/DTreeView.tsx:220`, `1099`, `1139`, `1241`, `1242`, `1249`, `1258`, `1265`, `1391`, `1393`; `src/ui/TimelineRightPanel.tsx:217`
- **Evidencia:** Cadenas con mojibake (`Ã`, `â`, `ðŸ`) visibles en UI.
- **Impacto:** Deterioro de confianza y legibilidad para usuarios.
- **Riesgo:** Bajo-Medio
- **Recomendación técnica:** Normalizar encoding UTF-8 y revisar pipeline/editor para evitar doble codificación.
- **Esfuerzo:** S

### GS-AUD-013
- **Severidad:** Baja
- **Categoría:** Higiene de repositorio
- **Ubicación:** raíz del proyecto
- **Evidencia:** `.gitignore missing`
- **Impacto:** Riesgo de versionar artefactos/caches por accidente.
- **Riesgo:** Bajo
- **Recomendación técnica:** Crear `.gitignore` base para Node/Vite/Tauri y artefactos locales.
- **Esfuerzo:** S

### GS-AUD-014
- **Severidad:** Baja
- **Categoría:** Observabilidad / Ruido operacional
- **Ubicación:** `src/App.tsx:667`, `716`; `src/views/DTreeView.tsx:783`
- **Evidencia:** `console.error`/`console.warn` en rutas de operación.
- **Impacto:** Ruido en logs; menor claridad diagnóstica en producción.
- **Riesgo:** Bajo
- **Recomendación técnica:** Encapsular logging bajo capa de telemetría/log-level.
- **Esfuerzo:** S

---

## Cobertura de casos solicitados
1. Atajos y side-effects (`Ctrl+S`, listener deps): cubierto en GS-AUD-001.
2. Contrato timeline (`year` vs `currentYear`): cubierto en GS-AUD-002.
3. Flujo media/fotos: cubierto en GS-AUD-003.
4. Robustez parseo fechas GED: cubierto en GS-AUD-006.
5. Rendimiento overlays/layout: cubierto en GS-AUD-005.
6. Riesgos seguridad Tauri + deps: cubierto en GS-AUD-004 y GS-AUD-011.
7. Brechas de pruebas: cubierto en GS-AUD-010.
