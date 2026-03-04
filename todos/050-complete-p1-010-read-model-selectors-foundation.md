---
status: complete
priority: p1
issue_id: "050"
tags: [gsk-core, read-model, selectors]
dependencies: ["049"]
---

# Read-Model Selectors Foundation

## Problem Statement
La UI depende de proyecciones legacy directas y no existe una capa formal de selectores para consumo estable.

## Findings
- Se creó `src/core/read-model/` con tipos y proyección cacheada.
- La proyección está memoizada por `graphId + journalLength`.

## Proposed Solutions
### Option 1: Selector layer incremental (Recommended)
Usar `projectGraphDocument` como paso inicial y evolucionar a selectores granulares por dominio.

## Recommended Action
1. Consolidar `read-model` como único punto de proyección.
2. Migrar hooks/componentes para consumir `GraphDocument`/DTOs.

## Acceptance Criteria
- [x] Existe `src/core/read-model/`.
- [x] Se usa proyección cacheada para derivar documento runtime.
- [x] Selectores granulares (search/timeline/stats) completados.

## Work Log
### 2026-03-04 - Fundación inicial
**By:** Codex

**Actions:**
- Creado `types.ts`, `selectors.ts`, `cache.ts`, `index.ts`.

### 2026-03-04 - Cierre de selectores granulares
**By:** Codex

**Actions:**
- Implementados selectores granulares: persons, families, stats, timeline y search en read-model.
- Agregado hook useGraphSelectors para consumo uniforme desde estado.
- Agregada prueba src/tests/read-model.selectors.test.ts (2 tests en verde).

