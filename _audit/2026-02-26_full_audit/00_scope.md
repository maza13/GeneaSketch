# 00_scope.md

## Objetivo
Realizar una auditoría técnica integral de GeneaSketch sin modificar código productivo ni configuración existente.

## Regla de aislamiento
Todo artefacto de auditoría debe quedar dentro de:
- `C:\My_Projects\GeneaSketch\_audit\2026-02-26_full_audit`

No se aplican cambios a:
- `src/**`
- `src-tauri/**`
- `docs/**`
- configuración raíz (`package.json`, `tsconfig*`, `vite.config.ts`, etc.)

## Entregables
- `00_scope.md`
- `01_baseline.md`
- `02_findings.md`
- `03_remediation_plan.md`
- `AUDITORIA_FINAL.md`
- `raw/tsc.txt`
- `raw/tests.txt`
- `raw/npm_audit.json`
- `raw/npm_outdated.json`
- `raw/command_status.txt`

## Alcance auditado
- Arquitectura y estado: `src/App.tsx`, `src/state/store.ts`, `src/views/DTreeView.tsx`
- Dominio:
  - `src/core/edit/*`
  - `src/core/graph/*`
  - `src/core/kinship/*`
  - `src/core/timeline/*`
  - `src/core/diagnostics/*`
  - `src/core/gedcom/*`
- UI y mantenibilidad: `src/ui/*`, `src/views/*`, `src/types/*`
- Desktop y seguridad: `src-tauri/*`
- Dependencias y salud de stack: `npm audit`, `npm outdated`

## Metodología
1. Baseline técnico no destructivo.
2. Revisión por capas (UI/estado/dominio/desktop/dependencias).
3. Hallazgos priorizados por severidad.
4. Recomendaciones accionables con esfuerzo y riesgo.
5. Plan de remediación por fases.

## Formato de severidad
- Crítica
- Alta
- Media
- Baja

## Formato de hallazgo
Cada hallazgo incluye:
- ID
- Severidad
- Categoría
- Ubicación (`archivo:línea`)
- Evidencia
- Impacto
- Riesgo
- Recomendación técnica
- Esfuerzo (`S/M/L`)

## Fecha de auditoría
- 2026-02-26
