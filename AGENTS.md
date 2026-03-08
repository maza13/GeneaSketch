# AGENTS.md - GeneaSketch Agent Guide
This guide is for coding agents working in this repository.
It summarizes build/lint/test commands (including single-test workflows) and code style conventions inferred from the codebase.

## 1) Project Snapshot
- Stack: Tauri desktop shell + React 18 + TypeScript + Vite + Vitest + Zustand.
- Domain: local-first genealogy app with `.gsk` as native package format and GEDCOM interoperability.
- Current subsystem naming:
  - `Genraph` = core engine
  - `Kindra` = visual engine
  - `Kindra v3.1` = current visual runtime
  - `AncestrAI` = AI subsystem
- CI workflow (`.github/workflows/baseline-qa001.yml`) uses Node `24` and runs `npm run build` plus `npm run test:baseline:qa001`.
- TypeScript is strict (`strict`, `noUnusedLocals`, `noUnusedParameters` in `tsconfig.json`).
- Path alias `@/* -> src/*` is configured in `tsconfig.json` and `vite.config.ts`.

## 2) Install
```bash
npm ci
```
Use `npm ci` for deterministic installs.
Use Node `24.x` locally; `.nvmrc` and `.node-version` are the source of truth for runtime alignment.

## 3) Build and Dev Commands
### Web app
```bash
npm run dev
npm run build
npm run preview
```
- `dev`: start Vite dev server.
- `build`: run `tsc -b && vite build`.
- `preview`: serve production bundle.

### Desktop (Tauri)
```bash
npm run desktop:dev
npm run desktop:build:win
```
- `desktop:dev`: run desktop app in dev mode.
- `desktop:build:win`: build Windows installers (`msi,nsis`).

### Optional Rust checks (run in `src-tauri/`)
```bash
cargo check
cargo test
cargo clippy --all-targets --all-features -- -D warnings
```
These are not wired in npm scripts, but are recommended when Rust-side code changes.

## 4) Test Commands
### Run full suite
```bash
npm test
```
Equivalent to `npm run test` (`vitest run`).

### Run a single test file (primary workflow)
```bash
npm test -- src/tests/store.test.ts
```
Equivalent direct Vitest command:
```bash
npx vitest run src/tests/store.test.ts
```

### Run a single test by name
```bash
npm test -- -t "restore normalization"
```

### Run tests in one folder
```bash
npm test -- src/tests/kindra-v31
```

### Project-specific scripts
```bash
npm run test:baseline:qa001
npm run test:ci
npm run check:genraph:internals
npm run plan:kindra-v31:validate
npm run test:perf:layout
npm run test:perf:overlays
npm run test:perf:all
```
- `test:baseline:qa001`: CI baseline set.
- `test:ci`: local CI-equivalent gate (`build` + baseline).
- `check:genraph:internals`: guard against internal property bypass in the Genraph engine.
- `plan:kindra-v31:validate`: validate the Kindra v3.1 control-plan chain.
- `test:perf:*`: targeted perf checks, not full regression. These are intentionally skipped during plain `npm test` and should be run through the dedicated scripts above.

## 5) Lint / Formatting Status
- No `lint` script exists in `package.json`.
- No ESLint/Prettier/Biome config found at repo root.
- Effective quality gate is strict TypeScript compile + tests.

Agent behavior in this repo:
- Keep formatting consistent with surrounding file style.
- Avoid mass-formatting unrelated code.
- Keep diffs small and scoped to requested behavior.

## 6) Code Style Guidelines (Observed)
### Imports
- Prefer `@/` alias for imports rooted in `src`.
- Use relative imports for nearby/local modules.
- Use explicit type imports: `import type { ... }`.
- Keep import ordering stable when editing: external -> alias -> local.

### Types and API surface
- Prefer explicit `type`/`interface` for domain models.
- Keep exported functions fully typed.
- Use literal unions/discriminated unions for mode/state values.
- Avoid `any`; if unavoidable for legacy data, keep scope narrow and guard first.
- Common pattern for unknown data: runtime guards (e.g., `isRecord`, payload validators).

### Naming
- Components/classes: `PascalCase` (e.g., `PanelErrorBoundary`).
- Functions/variables: `camelCase` (e.g., `normalizeProfilePayload`).
- Constants: `UPPER_SNAKE_CASE` for true constants (`DB_NAME`, `STORE_NAME`).
- Test files: `*.test.ts` / `*.test.tsx`, often feature-scoped filenames.

### Formatting
- Semicolons are standard.
- Double quotes are the dominant string/import style.
- Trailing commas are commonly used in multiline literals.
- Indentation is mostly 2 spaces, but some files are mixed; follow local file convention.

### React + Zustand patterns
- Functional components and hooks are default in UI code.
- Zustand store is slice-based (`doc`, `view`, `session`, `ai`).
- Prefer selector-based subscriptions over broad `useAppStore()` reads.
- Use `useMemo`/`useCallback` where referential stability and expensive recomputation matter.

### Error handling
- Integration/persistence boundaries: `try/catch`, `console.warn`, safe fallback.
- Core data-integrity paths: throw explicit, actionable errors.
- UI should degrade gracefully; panel-level failures use an error-boundary pattern.

### Testing patterns
- Use Vitest primitives (`describe`, `it`, `expect`, `beforeEach`, `vi`).
- Prefer deterministic fixtures/helpers over ad-hoc setup.
- Validate behavior and invariants, not internal implementation details.
- Hard-cut migrations should prefer explicit rejection tests for unsupported legacy payloads rather than maintaining silent compatibility.

## 7) UX and Docs Governance
- UX governance contract: `docs/wiki-uxdesign/12_instrucciones_agentes_ia.md`.
- UI token source of truth: `src/styles/tokens.css`.
- For UI/style work, follow wiki-first expectations in `docs/wiki-uxdesign/*`.

## 8) Cursor and Copilot Rules Check
Requested locations were checked:
- `.cursor/rules/`: not found.
- `.cursorrules`: not found.
- `.github/copilot-instructions.md`: not found.

If those files are added later, treat them as high-priority agent instructions and update this AGENTS.md.

## 9) High-Signal Paths
- `src/main.tsx`, `src/App.tsx`
- `src/state/store.ts`, `src/state/slices/*`
- `src/core/genraph/*`, `src/core/genraph/GedcomBridge.ts`
- `src/core/kindra/*`, `src/views/kindra-v31/*`
- `src/tests/*`
- `src/styles/tokens.css`
- `src-tauri/src/main.rs`

Keep changes scoped, verified, and aligned with existing conventions.

