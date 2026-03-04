---
status: complete
priority: p1
issue_id: "016"
tags: [gschema, quarantine, strict-lossless, integrity]
dependencies: ["013"]
---

# Quarantine Mirror Parity (`graph.json.quarantine` vs `quarantine.json`)

## Problem Statement

Ya existe la distincion de canon (`graph.json.quarantine`) y espejo (`quarantine.json`), pero faltaba cerrar la regla formal de paridad exacta y la accion por modo cuando difieren.

## Findings

- Docs declaran `graph.json.quarantine` como fuente canonica.
- Import validaba presencia parcial, pero no imponia paridad exacta determinista con codigos claros.
- Riesgo de divergencia entre mirror y canon en paquetes de terceros.

## Proposed Solutions

### Option 1: Paridad exacta con politica strict/compat (Recommended)
- Comparacion canonica de coleccion de entradas.
- strict-lossless: mismatch => error critico.
- compat: warning + prevalece `graph.json.quarantine`.

**Effort:** Medio  
**Risk:** Bajo

### Option 2: Validar solo existencia
- Mantener regla de presencia sin paridad exacta.

**Effort:** Bajo  
**Risk:** Medio-Alto (inconsistencias no detectadas)

## Recommended Action

Aplicar Option 1 e introducir codigos trazables:
- `QUARANTINE_MIRROR_MISMATCH`
- `QUARANTINE_MIRROR_MISSING`

## Acceptance Criteria

- [x] Definicion de espejo exacto documentada en `02_formato` y `03_modelo`.
- [x] Import verifica paridad canonica entre ambas fuentes.
- [x] strict-lossless falla en mismatch; compat repara con warning.
- [x] Codigos de warning/error trazables agregados.

## Work Log

### 2026-03-03 - Creacion del TODO fase core

**By:** Codex

**Actions:**
- Definido objetivo de paridad strict-lossless.
- Dependencia establecida sobre issue 013.

### 2026-03-03 - Implementacion Fase 016 cerrada

**By:** Codex

**Actions:**
- Se implemento comparacion canonica deterministica para `graph.json.quarantine` vs `quarantine.json` en `GskPackage.ts`.
- Se agrego politica por modo:
  - strict: error critico con codigos `QUARANTINE_MIRROR_MISSING` y `QUARANTINE_MIRROR_MISMATCH`.
  - compat: warning trazable y prevalencia de `graph.json.quarantine`.
- Se agregaron tests:
  - strict: falla por mirror faltante y por mirror divergente.
  - compat: warning por mismatch y fuente de verdad efectiva en `graph`.
- Se actualizaron docs `02_formato.md` y `03_modelo.md` con regla de espejo exacto y politicas de modo.
