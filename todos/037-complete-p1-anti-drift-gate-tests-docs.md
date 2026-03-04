---
status: complete
priority: p1
issue_id: "037"
tags: [gschema, anti-drift, docs, tests, quality-gate]
dependencies: ["034", "035", "036"]
---

# Gate Anti-Drift Docs-Runtime

## Problem Statement

Sin un gate de paridad docs-runtime, los capitulos wiki pueden volver a divergir de catalogos y comportamiento real aunque los cambios actuales queden correctos.

## Findings

- No existe test dedicado de paridad entre codigos documentados y catalogo runtime.
- El `README` de wiki no explicita mecanismo de anti-drift para `07_error_catalog`.
- El changelog tecnico requiere entrada de cierre de esta fase para trazabilidad.

## Proposed Solutions

### Option 1: agregar tests de paridad + actualizar README/CHANGELOG (Recommended)

**Approach:** incorporar checks automatizados de parity y documentar el gate en wiki.

**Effort:** Medio
**Risk:** Bajo

## Recommended Action

Implementar test de parity doc-runtime, actualizar `README` con regla de mantenimiento y registrar cierre en `docs/wiki-gsk/CHANGELOG.md`.

## Technical Details

**Affected files:**
- `src/tests/wiki.error-catalog-parity-docs.test.ts`
- `docs/wiki-gsk/README.md`
- `docs/wiki-gsk/07_error_catalog.md`
- `docs/wiki-gsk/CHANGELOG.md`

## Acceptance Criteria

- [x] Test de paridad doc-runtime en verde.
- [x] Link-check wiki en verde.
- [x] README documenta regla anti-drift y fuente normativa de errores.
- [x] Changelog tecnico registra cierre de fase.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Definido gate de calidad para evitar regresiones de consistencia documental.
- Preparada lista de archivos para cierre tecnico y trazabilidad.

**Learnings:**
- La verificacion automatica de paridad reduce significativamente el costo de mantenimiento wiki.

---

### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Se implemento gate anti-drift:
  - `src/tests/wiki.error-catalog-parity-docs.test.ts`
  - `src/tests/gedcom.error-catalog-parity.test.ts`
  - `src/tests/wiki.gschema-operations-parity.test.ts`
- Se actualizo documentacion de soporte:
  - `docs/wiki-gsk/README.md` (seccion gate anti-drift)
  - `docs/wiki-gsk/CHANGELOG.md` (entrada wiki `1.6`)
- Verificacion ejecutada:
  - `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/gschema.error-catalog.test.ts src/tests/gedcom.error-catalog-parity.test.ts`
  - `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py`

**Results:**
- Paridad docs-runtime automatizada y en verde.
- Links wiki verificados en verde.
- Cierre documental trazable en changelog tecnico.

**Learnings:**
- El gate de paridad convierte el mantenimiento wiki en una verificacion continua y objetiva.

