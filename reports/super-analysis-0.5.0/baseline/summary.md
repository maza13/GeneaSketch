# Super Analysis 0.5.0 Baseline

- capturedAt: 2026-03-05T23:01:22.4915981-06:00
- branch: release/pre-0.5.0
- commit: eb59201
- node: v18.13.0
- npm: 8.19.3

## Worktree

- Untracked local file: `PersonDetailPanel_clean.txt`
- New TODO chain currently uncommitted: `088` through `096`

## Command Matrix

### 1. GSchema internals contract

- Command: `npm run check:gschema:internals`
- Result: PASS
- Notes: `No unauthorized internal property accesses found.`

### 2. Focused release-audit bundle

- Command: `npx vitest run src/tests/read-model.selectors.test.ts src/tests/gschema.strict.test.ts src/tests/workspace-profile.integration.test.ts src/tests/wiki.panel-navigation.unit.test.ts src/tests/ai.apply-dependencies.test.ts`
- Result: PASS
- Files: `5 passed`
- Tests: `30 passed`
- Notable stderr: `WikiPanel` emitted one expected warning when resolving a missing link target in the negative-path test.

## Historical Artifact Classification

### `out.json`

- Status: obsolete for current baseline
- Reason: contains an older failed run snapshot that does not match the current focused bundle outcome
- Release impact: none by itself

### `test_output.txt`

- Status: inconclusive / historical
- Reason: large captured output from previous runs; useful as a forensic reference, not as current truth
- Release impact: none unless later dimensions reproduce its failures

### `diff.txt`

- Status: historical reference
- Reason: repository diff/archive artifact, not a current executable signal
- Release impact: none for baseline gating

## Baseline Conclusion

Current baseline is green for the focused release-audit bundle. No immediate blocker is visible from the initial contract checks. The next task should use this pack as the reference point rather than older raw artifacts.
