# 03_remediation_plan.md

## Estrategia general
Aplicar mejoras en fases para minimizar regresión: primero correcciones de alto impacto/alta confianza, luego refactors estructurales y finalmente hardening y calidad continua.

## Fase 0 (inmediata, 1-2 días)
Objetivo: corregir inconsistencias críticas visibles sin cambios arquitectónicos grandes.

1. Unificar contrato de timeline overlay
- Estandarizar en `year` (o `currentYear`) en store + UI.
- Añadir tipado específico de configuración timeline.
- Criterio de aceptación: badge muestra año correcto en todos los modos.

2. Corregir dependencias del listener de atajos
- Estabilizar handlers con `useCallback` o referencia mutable segura.
- Criterio: `Ctrl+S` exporta estado vigente tras cambios múltiples de documento/config.

3. Mitigar mojibake
- Normalizar cadenas dañadas en UI.
- Criterio: textos sin caracteres corruptos en paneles/overlays.

## Fase 1 (corto plazo, 3-5 días)
Objetivo: reducir riesgo funcional y deuda de modelo.

1. Separar modelo de media
- No usar `fileName` para data URL.
- Introducir contrato claro: `fileName` (ruta), `dataUrl/bytes` (contenido embebido).
- Migración defensiva para datos existentes.

2. Revisar parseo de fechas ad hoc
- Sustituir parseos locales por normalizador común.
- Criterio: estadísticas y resúmenes coherentes con formatos GED variados.

3. Evitar limpieza de recientes en `setDocument`
- Mantener recientes salvo acción explícita.
- Criterio: historial persiste entre aperturas.

## Fase 2 (mediano plazo, 1-2 semanas)
Objetivo: escalar rendimiento y robustez de tipos.

1. Optimización de `DTreeView`
- Preindexar nodos/aristas (mapas por id/canonicalId).
- Reducir `find/filter` repetidos en overlays.
- Criterio: interacción fluida en árboles grandes (benchmark interno).

2. Fortalecer tipado de overlays
- Reemplazar `config: any` por unión discriminada.
- Eliminar `any` en rutas críticas (`DTreeView`, `solver`, `dateInference`).
- Criterio: reducción significativa de anys + errores de contrato detectados en compilación.

3. Consolidar utilidades duplicadas / código muerto
- Unificar `resolveFamilyChildAction`.
- Integrar o retirar `usePanZoom`.

## Fase 3 (hardening, 1 semana)
Objetivo: seguridad y sostenibilidad operativa.

1. Hardening Tauri
- Definir CSP explícita.
- Limitar shell plugin mediante capacidades mínimas.
- Criterio: superficie de permisos reducida y documentada.

2. Actualización controlada de dependencias
- Resolver vulnerabilidades (`rollup`, cadena `vitest/vite`).
- Ejecutar matriz de validación (build, tests, smoke desktop).

3. Higiene de repositorio
- Crear `.gitignore` y checklist de artefactos.

## Plan de pruebas recomendado
- Unitarias: overlay timeline, parser/serializer GED, media mapping.
- Integración: abrir/importar/fusionar/exportar con datos reales.
- Regresión UI: overlays de parentesco, heatmap, timeline simulado.
- No funcionales: performance de render en árbol grande, smoke test desktop.

## Riesgo y priorización
- Máxima prioridad: GS-AUD-001, 002, 003, 004, 005.
- Prioridad media: GS-AUD-006 a 011.
- Prioridad baja: GS-AUD-012 a 014.
