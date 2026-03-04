---
status: complete
priority: p1
issue_id: "034"
tags: [gschema, error-catalog, gedcom, docs, tests]
dependencies: []
---

# Catalogo Unico Completo Runtime + Wiki

## Problem Statement

El catalogo de errores de la wiki y del runtime no cubre todos los codigos emitidos por importacion GSK y flujo GEDCOM parser/serializer, lo que permite drift entre codigo, tests y documentacion.

## Findings

- `07_error_catalog.md` no lista todos los codigos ya presentes en `errorCatalog.ts`.
- Parser y serializer GEDCOM emiten codigos con literales independientes.
- Falta un test de paridad especifico para codigos GEDCOM vs catalogo central.

## Proposed Solutions

### Option 1: centralizar codigos en `errorCatalog.ts` + tests de paridad (Recommended)

**Approach:** ampliar catalogo con metadatos normativos por contexto, reutilizar constantes en parser/serializer y validar paridad con tests.

**Effort:** Medio
**Risk:** Bajo

## Recommended Action

Actualizar `errorCatalog.ts` con cobertura completa, eliminar literales GEDCOM en runtime y sincronizar `07_error_catalog.md` con test de paridad dedicado.

## Technical Details

**Affected files:**
- `src/core/gschema/errorCatalog.ts`
- `src/core/gedcom/parser.ts`
- `src/core/gedcom/serializer.ts`
- `docs/wiki-gsk/07_error_catalog.md`
- `src/tests/gschema.error-catalog.test.ts`
- `src/tests/gedcom.error-catalog-parity.test.ts`

## Acceptance Criteria

- [x] Todos los codigos emitidos por GSK + GEDCOM existen en catalogo central.
- [x] Parser y serializer GEDCOM no usan literales de codigo fuera de constantes.
- [x] `07_error_catalog.md` refleja 1:1 el catalogo runtime.
- [x] Tests especificos de catalogo pasan en verde.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Formalizada tarea de cobertura total para catalogo runtime + wiki.
- Definidas rutas de implementacion y verificacion para parser/serializer GEDCOM.

**Learnings:**
- El drift aparece cuando los codigos no se centralizan como constantes reusables.

---

### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Se amplio `src/core/gschema/errorCatalog.ts` con cobertura total de codigos GSK + GEDCOM y metadatos `scope/context`.
- Se centralizaron codigos GED en runtime usando `ERROR_CODES` en:
  - `src/core/gedcom/parser.ts`
  - `src/core/gedcom/serializer.ts`
- Se sincronizo documentacion integral del catalogo:
  - `docs/wiki-gsk/07_error_catalog.md`
- Se fortalecieron tests:
  - `src/tests/gschema.error-catalog.test.ts`
  - `src/tests/gedcom.error-catalog-parity.test.ts`
- Verificacion ejecutada:
  - `npx vitest run src/tests/gschema.error-catalog.test.ts src/tests/gedcom.error-catalog-parity.test.ts`

**Results:**
- Catalogo runtime y wiki quedaron alineados sin codigos faltantes.
- Parser/serializer dejaron de usar literales de `code`.
- Suite de catalogo en verde.

**Learnings:**
- Definir codigos como constantes compartidas reduce regresiones de drift documental.

