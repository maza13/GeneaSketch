# N0007 - Inventario inicial de write paths directos

Fecha: 2026-03-05
Scope: `src/state`, `src/ui`, `src/hooks`, `src/core/edit`, `src/core/engine`

## Hallazgos

| ID | Ruta | Linea | Tipo | Clasificacion | Nota |
|---|---|---:|---|---|---|
| WP-001 | `src/state/slices/docSlice.ts` | 192 | Mutacion directa de nodo GSchema (`(node as any).text = text`) | redirigir a API oficial | Riesgo principal: cambia estado sin registrar op en journal. |
| WP-002 | `src/core/edit/commands.ts` | 695 | Mutacion directa de `GeneaDocument.notes` legacy | guardrail temporal | No toca GSchema directo, pero debe revisarse para evitar rutas paralelas no journalizadas. |

## No hallazgos en scope UI/State

- No se detectaron otras mutaciones directas de nodos/aristas/claims GSchema en `src/state`, `src/ui` o `src/hooks` fuera de `WP-001`.

## Comandos de evidencia

```bash
rg -n "gschemaGraph\.node\(|\.node\(graphUid\)|\.node\(" src/state src/ui src/hooks
rg -n "\(node as any\)\.text|\.text\s*=\s*text|updateNoteRecord\s*:\s*\(" src
rg -n "updateNoteRecord|journalLength|Journal|GraphMutations|applyReplay|nodes\.set|claims\.set|edges\.set" src
```
