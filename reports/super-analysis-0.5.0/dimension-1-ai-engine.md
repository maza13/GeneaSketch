# Super Analysis 0.5.0 - Dimension 1 AI-engine sync

## Scope

Validate whether AI flows are broken by the hardened `GSchemaGraph` / `GskPackage` contracts, especially around journal replay, strict import, and graph reconstruction.

## Inventory

### AI code paths reviewed

- `src/core/ai/apply.ts`
- `src/core/ai/orchestrator.ts`
- `src/core/ai/*`
- `src/services/aiRuntime.ts`
- `src/services/aiUsageService.ts`
- `src/services/aiWebBridge.ts`

### AI test suite executed

- `src/tests/ai.apply-dependencies.test.ts`
- `src/tests/ai.apply-selection.test.ts`
- `src/tests/ai.apply-soft-delete.test.ts`
- `src/tests/ai.birth-context-planner.test.ts`
- `src/tests/ai.birth-range-fusion.test.ts`
- `src/tests/ai.birth-refinement-context.test.ts`
- `src/tests/ai.birth-refinement-facts-ranker.test.ts`
- `src/tests/ai.birth-refinement-prompt.test.ts`
- `src/tests/ai.birth-refinement.test.ts`
- `src/tests/ai.matching-context.test.ts`
- `src/tests/ai.matching.test.ts`
- `src/tests/ai.model-catalog.test.ts`
- `src/tests/ai.orchestrator.test.ts`
- `src/tests/ai.review-state-propagation.test.ts`
- `src/tests/ai.runtime-openai-response-parser.test.ts`
- `src/tests/ai.safety-wizard.test.ts`
- `src/tests/ai.surname-inference.test.ts`

## Evidence

### Static coupling check

- Search for `GSchemaGraph`, `importGskPackage`, `exportGskPackage`, `getJournal()`, `fromData()`, `documentToGSchema`, and `gschemaToDocument` inside `src/core/ai` and `src/services/ai*` returned no direct coupling hits.
- `src/core/ai/apply.ts` operates on `GraphDocument`, not on `GSchemaGraph`.
- `src/core/ai/orchestrator.ts` coordinates providers/prompts and does not touch strict package import or journal replay paths.

### Dynamic validation

- Command: `npx vitest run <all ai*.test.ts files>`
- Result: `17 passed`, `45 passed`
- No AI suite failure reproduced.

### Historical artifact review

- `out.json` records an older failure in `src/tests/gschema.strict.test.ts` for `fails in strict mode when journal replay has a gap in opSeq`.
- That failure is not an AI suite failure.
- The current focused bundle already shows `src/tests/gschema.strict.test.ts` passing, so the artifact is historical and not current release truth.

## Finding

No reproducible AI-engine sync blocker is present in the current codebase.

## Risk classification

- Release impact: none currently observed
- Severity: low
- Confidence: high

## Recommended follow-up

- Keep `090` closed as green audit coverage.
- Use `091` and `094` to continue checking indirect release risk through projection fallback and legacy boundaries.
- If future CI reports an AI failure, treat `out.json`-style artifacts as insufficient without a fresh reproduction.
