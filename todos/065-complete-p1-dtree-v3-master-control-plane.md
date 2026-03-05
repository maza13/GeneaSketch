---
status: complete
priority: p1
issue_id: "065"
tags: [dtree-v3, master-plan, layout, overlays, performance, governance]
dependencies: ["064"]
---

# DTree V3 Master Control Plane

## Problem Statement

La evolucion de `DTreeView` requiere un plan unico de control para evitar retrabajo, regresiones en overlays genealogicos y drift entre runtime, tests y documentacion tecnica.

## Findings

- `src/views/DTreeView.tsx` concentra la logica de render + overlays + hover/context cards.
- `src/core/layout/index.ts` fuerza `vnext` y no respeta el selector de engine.
- Overlays criticos (`kinship`, `heatmap`, `lineage`, `timeline`, `layer-*`) estan activos y acoplados al componente principal.
- Existe base de pruebas estable en layout/store/kinship para usar como gate.

## Proposed Solutions

### Option 1: Master task + fases secuenciales con gates (Recommended)

**Approach:** usar este todo como tablero principal para coordinar fases 0..6, dependencias, SLO y cierre de fallback.

**Pros:**
- Reduce decisiones dispersas.
- Evita implementacion en paralelo sin criterio comun.
- Permite cortes de release seguros por fase.

**Cons:**
- Requiere disciplina de actualizacion de work log y matrices.

**Effort:** Medium  
**Risk:** Medium

## Recommended Action

Usar este issue como control plane obligatorio para `066..072`, con cierre solo cuando:
1. V3 tenga paridad funcional en overlays.
2. SLO moderado este cumplido.
3. fallback temporal sea retirado.

## Technical Details

### Phase Matrix

| Issue | Fase | Objetivo | Priority | Dependencies |
| :--- | :--- | :--- | :---: | :--- |
| 065 | General | Control plane y criterios globales | p1 | [064] |
| 066 | Fase 0 | Baseline + SLO + benchmark harness | p1 | [065] |
| 067 | Fase 1 | Extraccion de OverlayPipeline | p1 | [066] |
| 068 | Fase 2 | LayoutGateway + contrato real de engine | p1 | [066] |
| 069 | Fase 3 | DTreeViewV3 base y rollout por defecto | p1 | [067,068] |
| 070 | Fase 4 | Migracion prioritaria Parentesco + Heatmap | p1 | [069] |
| 071 | Fase 5 | Migracion overlays restantes | p1 | [070] |
| 072 | Fase 6 | Limpieza final y retiro fallback | p1 | [071] |

### API/Type Change Matrix

| Cambio | Owner task |
| :--- | :--- |
| `renderVersion` en `ViewConfig.dtree` | 069 |
| `computeLayout` respeta `layoutEngine` | 068 |
| `LayoutDiagnostics.effectiveEngine/timingsMs` | 068 |
| `OverlayResolver` por tipo | 067 |

### Critical Path

1. `066` define baseline y SLO.
2. `067` y `068` pueden correr en paralelo despues de `066`.
3. `069` arranca solo cuando `067` y `068` cierran.
4. `070` depende de `069` (prioridad funcional).
5. `071` depende de `070`.
6. `072` depende de `071` y cierra la migracion completa.

### Governance Rules

1. Cada issue hijo debe actualizar su Work Log con fecha, comandos corridos y evidencia.
2. Ningun issue puede marcarse `complete` sin checklist de `Acceptance Criteria` en verde.
3. Cualquier cambio de alcance debe registrarse primero en `065` antes de editar fases hijas.
4. Si un gate de performance falla, se bloquea avance al siguiente issue hasta correccion.

### In Scope / Out of Scope

**In Scope**
- Arquitectura de vista/layout/overlays para V3.
- Contratos de diagnostico de engine y performance.
- Paridad funcional y retiro de fallback.

**Out of Scope**
- Reescritura de parser GED/GSK.
- Cambios de producto no vinculados a render y overlays.
- Rediseno visual integral del shell.

## Contract/Wiki Sync

- Documentar arquitectura y rollout en `docs/wiki-uxdesign/`.
- Registrar decisiones de engine/diagnosticos en docs tecnicas de layout.
- Changelog interno de arquitectura en `CHANGELOG.md` al cierre de 072.

## Verification Commands

- `Get-ChildItem todos | Where-Object { $_.Name -match '^(065|066|067|068|069|070|071|072)-' }`
- `npm run test -- src/tests/layout src/tests/store.test.ts src/tests/kinship.nomenclature.test.ts`
- `npm run build`

## Acceptance Criteria

- [x] Matriz de fases y dependencias vigente.
- [x] Criterios de salida funcional + performance definidos y trazables.
- [x] Cada fase tiene comandos de verificacion explicitos.
- [x] Work log actualizado al cierre de cada issue hijo.
- [x] Cierre solo con `072` completo.
- [x] Critical path y governance rules aplicadas sin desviaciones no registradas.

## Work Log

### 2026-03-04 - Task created

**By:** Codex

**Actions:**
- Created master control plane for DTree V3 migration with rollout defaults and SLO gates.
- Added critical path, governance rules, and scope boundaries to make execution decision-complete.

### 2026-03-04 - Control plane made operational

**By:** Codex

**Actions:**
- Added governance doc `docs/wiki-uxdesign/13_dtree-v3-control-plane.md` and linked it from wiki index.
- Added automated chain validator `tools/dtree-v3/validate-todo-chain.mjs`.
- Added script `plan:dtree-v3:validate` in `package.json`.
- Executed `npm run plan:dtree-v3:validate` with pass result for chain `065..072`.

### 2026-03-04 - Control plane closed after 072 hard-cut

**By:** Codex

**Actions:**
- Confirmed closure of issue chain `066..072`, including hard-cut retirement in `072`.
- Verified chapter gates in green at closure:
  - `npm run test`
  - `npm run build`
  - `npm run test:perf:layout`
  - `npm run test:perf:overlays`
  - `npm run plan:dtree-v3:validate`
- Confirmed final architecture contracts:
  - Render runtime: V3-only (legacy V2 path removed).
  - Layout runtime: vnext-only (no v2 fallback path).
  - Persistence: migrated and write-back normalized for legacy inputs.
- Recorded post-cut monitoring cycle completion in `072` work log and closed master issue.

**Evidence:**
- Full suite: `120` files / `405` tests pass.
- Build: pass.
- TODO chain validator: pass.
- Revision base: `2d0d03a`.
