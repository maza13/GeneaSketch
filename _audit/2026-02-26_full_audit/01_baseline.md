# 01_baseline.md

## Estado técnico verificado

### Comandos ejecutados (no destructivos)
Fuente: `raw/command_status.txt`

- `npm exec tsc --noEmit` -> exit code `0`
- `npm test` -> exit code `0`
- `npm audit --json` -> exit code `1`
- `npm outdated --json` -> exit code `1`

### Resultado TypeScript
- Archivo: `raw/tsc.txt`
- Salida: vacía (`0` líneas)
- Interpretación: compilación de tipos sin errores.

### Resultado tests
Archivo: `raw/tests.txt`
- `Test Files: 27 passed (27)`
- `Tests: 67 passed (67)`
- `Duration: 1.96s`

Conclusión: la suite actual está verde en el estado auditado.

## Inventario de tamaño (código fuente)

### Top archivos por tamaño
- `src/views/DTreeView.tsx` (~1410 líneas)
- `src/App.tsx` (~1277 líneas)
- `src/state/store.ts` (~913 líneas)
- `src/core/graph/expand.ts` (~760 líneas)
- `src/ui/ImportReviewPanel.tsx` (~688 líneas)

### Distribución por sección
- `src/core`: ~7434 líneas / 33 archivos
- `src/ui`: ~3384 líneas / 17 archivos
- `src/views`: ~2094 líneas / 5 archivos
- `src/tests`: ~1643 líneas / 29 archivos
- `src/App.tsx`: ~1277 líneas / 1 archivo
- `src/state`: ~913 líneas / 1 archivo

Observación: existe concentración alta de lógica en pocos archivos de frontera (`App`, `DTreeView`, `store`).

## Salud de dependencias
Fuente: `raw/npm_audit.json`, `raw/npm_outdated.json`

### Vulnerabilidades (`npm audit`)
- Total: `6`
- Críticas: `0`
- Altas: `1`
- Moderadas: `5`
- Bajas: `0`

Paquetes afectados:
- `rollup` (alta)
- `vitest`, `vite`, `vite-node`, `esbuild`, `@vitest/mocker` (moderadas/transitivas)

### Desactualizaciones (`npm outdated`)
- `react` 18.3.1 -> latest 19.2.4
- `react-dom` 18.3.1 -> latest 19.2.4
- `vite` 6.4.1 -> latest 7.3.1
- `vitest` 2.1.9 -> latest 4.0.18
- `zustand` 4.5.7 -> latest 5.0.11

## Observaciones estructurales rápidas
- No existe `.gitignore` en la raíz.
- Tauri usa plugin shell y `csp: null`.
- Hay texto mojibake en UI (cadenas mal codificadas en varios puntos).
