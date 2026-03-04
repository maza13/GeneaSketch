# GeneaSketch Master Backlog & Roadmap

## 🎯 Current Focus: GSchema 0.4.0 Finalization
The project is transitioning to a structured task management system in the `todos/` directory using the `file-todos` skill.

### Active Queue (Source of Truth: `todos/`)
Prioridad operativa (Ciclo 0.5.0):
1. `020` (`pending`, `p2`): Soporte para Prefijos, Sufijos y Títulos (NPFX, NSFX, TITL).
2. `021` (`pending`, `p2`): Coerción robusta de Fechas y Lugares informales.
3. `010` (`ready`, `p1`): Eliminación total del motor legado.
4. `018` (`ready`, `p1`): Ciclo de pruebas manuales y pulido UX.
5. `006` (`pending`, `p2`): Error boundaries (opcional para 0.4.x/0.5.0).

---

## 📅 Roadmap

### 0.4.0 - Paradigma GSchema (Hardened) ✅
- ✅ Contract Freeze & Wiki First (Issue D1)
- ✅ Deterministic Journal & Hashing (Issue D2)
- ✅ Lossless Quarantine (AST) (Issue D3)
- ✅ First-class Citations (Issue D1)
- ✅ Final Integration in DocSlice (Issue 001)
- ✅ Refactor de App.tsx (Issue 002)
- ✅ Wiki GFM Standardization (Issue 004)
- ✅ Project Root Hygiene (Issue 005)
- ✅ Performance & State Audit (Issue 003)

### 0.5.0 - Collaboration & Scale [STABLE TARGET]
1. `010` (`ready`, `p1`): Total removal of Legacy Engine (Cleanup)
2. `018` (`ready`, `p1`): Manual Testing Cycle & UX Polishing (Final Gate)
3. `009` (`pending`, `p2`): CRDT Sync offline-first (Architecture)
4. Advanced Evidence Gate visualization

### 0.6.0+ - AI & Intelligence
- Automated evidence inference pipeline
- Predictive genealogy assistant

---

## 🛠️ Task Management
We use the **file-todos** system.
- Files: `todos/{ID}-{status}-{priority}-{desc}.md`
- Statuses: `pending`, `ready`, `complete`
- Source of truth for operational status: YAML frontmatter in `todos/`
- `docs/TODO.md` is for roadmap/reference; execution is in `todos/`
- Protocolo operativo:
  - `pending`: item descubierto, requiere triage/definicion de accion.
  - `ready`: aprobado para implementacion inmediata.
  - `complete`: cerrado con evidencia (work log + checks ejecutados).
  - Regla: no ejecutar trabajo nuevo fuera de `todos/`; `docs/TODO.md` solo resume estado global.

*Historical Reference:*
- [0.4.0 Hardening Detailed Log](/docs/archive/0.4.0_HARDENING_DETAILED.md)
- [GSCHEMA_EVOLUTION_PLAN.md](/.agents/GSCHEMA_EVOLUTION_PLAN.md)

---

## 🛡️ Recinto de Operaciones Finalizadas
Las fases detalladas de endurecimiento (D1-D3, E1-E4, y Saneamiento Operacional) han sido archivadas en `docs/archive/0.4.0_HARDENING_DETAILED.md`.
