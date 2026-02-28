# Executive Brief (1 página)

## Contexto
GeneaSketch está funcional y estable en pruebas (`67/67`), pero la auditoría detecta riesgos de **consistencia de estado**, **modelo de datos**, **seguridad desktop** y **rendimiento** que pueden convertirse en incidentes de producto cuando crezca el uso o el tamaño de los árboles.

## Prioridades ejecutivas (Top 5)
1. **Contrato timeline inconsistente (`year` vs `currentYear`)**
- Impacto: UI muestra estado incorrecto.
- Acción: unificar contrato y tipado del overlay timeline.
- Horizonte: inmediato (Fase 0).

2. **Riesgo de stale closure en atajo `Ctrl+S`**
- Impacto: exportaciones potencialmente inconsistentes tras cambios de estado.
- Acción: estabilizar handlers (`useCallback`/hook de atajos) y dependencias reales.
- Horizonte: inmediato (Fase 0).

3. **Modelo media ambiguo (`photoDataUrl` en `fileName`)**
- Impacto: fragilidad en import/export, tamaño de documento y mantenimiento.
- Acción: separar semántica de referencia (`fileName`) y contenido (`dataUrl/bytes`) + migración.
- Horizonte: corto plazo (Fase 1).

4. **Superficie de seguridad amplia en desktop (Tauri)**
- Impacto: mayor exposición ante XSS/abuso de permisos (`shell` + `csp: null`).
- Acción: CSP explícita + mínimo privilegio en capacidades.
- Horizonte: corto plazo (Fase 1/Fase 3).

5. **Cuello de botella de rendimiento en `DTreeView`**
- Impacto: degradación fuerte con árboles grandes (latencia/fps).
- Acción: preindexar nodos/aristas y eliminar búsquedas lineales repetidas.
- Horizonte: mediano plazo (Fase 2).

## Estado actual (snapshot)
- TypeScript: **sin errores**.
- Tests: **27 archivos / 67 pruebas en verde**.
- Dependencias: **6 vulnerabilidades** (`1` alta, `5` moderadas).

## Plan de ejecución recomendado
### 0-7 días
- Corregir contrato timeline.
- Corregir listener de atajos.
- Arreglar textos mojibake visibles.

### 1-3 semanas
- Refactor del modelo de media + compatibilidad.
- Estandarización de parseo GED de fechas.
- Evitar limpieza de `recentFiles` al abrir documento.

### 3-6 semanas
- Refactor de rendimiento en `DTreeView`.
- Tipado fuerte de overlays (eliminar `config: any`).
- Consolidar utilidades duplicadas y retirar código no usado.

### 6+ semanas
- Hardening Tauri (CSP/capabilities).
- Upgrade controlado de toolchain (vite/vitest/rollup/react según estrategia).

## KPI de éxito (medibles)
- 0 inconsistencias visuales de timeline en pruebas funcionales.
- 0 fallos de exportación por estado stale en atajos.
- Reducción de latencia de render/interacción en árboles grandes.
- 0 vulnerabilidades altas en auditoría de dependencias.
- Reducción sostenida de `any` en rutas críticas.

## Riesgo de no actuar
- Incidentes de consistencia visibles para usuario.
- Deuda acumulada en import/export de media difícil de migrar después.
- Riesgo de seguridad evitable en distribución desktop.
- Degradación de experiencia en datasets reales grandes.
