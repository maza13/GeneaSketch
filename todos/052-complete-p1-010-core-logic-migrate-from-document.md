---
status: complete
priority: p1
issue_id: "052"
tags: [core, diagnostics, search, timeline, merge, ai]
dependencies: ["051"]
---

# Core Logic Migration from Legacy Document Contracts

## Problem Statement
Módulos núcleo aún operan sobre contratos legacy de documento para diagnóstico, timeline, búsqueda, merge e IA.

## Findings
- Persisten firmas y algoritmos con contrato legacy en varios módulos core.

## Proposed Solutions
### Option 1: GraphQuery adapters por dominio (Recommended)
Migrar firmas gradualmente a un contexto de consulta graph-first y mantener adaptadores de prueba temporales.

## Recommended Action
1. Priorizar diagnóstico + timeline + búsqueda.
2. Continuar con merge + IA.
3. Eliminar adaptadores legacy al cierre de 054.

## Acceptance Criteria
- [x] Runtime principal deja de depender de contratos legacy en core crítico.
- [x] Pruebas de paridad por dominio en verde.

## Work Log
### 2026-03-04 - Plan de migración definido
**By:** Codex

**Actions:**
- Registrada fase núcleo para desacoplar algoritmos de contratos legacy.

### 2026-03-04 - Migración core crítica completada
**By:** Codex

**Actions:**
- Migrados contratos tipados de GeneaDocument a GraphDocument en módulos core críticos (diagnóstico, kinship, timeline, merge, IA y búsqueda).
- Gate de grep en core crítico en 0 para GeneaDocument.
- Ejecutada matriz de paridad por dominio en verde (69 tests) y suite completa en verde.

