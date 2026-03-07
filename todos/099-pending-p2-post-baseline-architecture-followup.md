---
protocol_version: 2
task_type: "umbrella"
status: "pending"
priority: "p2"
issue_id: "099"
title: "Architecture separation diagnosis and guided hard-cut planning"
tags: ["architecture", "diagnosis", "systems", "boundaries", "coupling", "followup"]
dependencies: ["100"]
child_tasks: ["108", "109", "110", "111", "112", "113"]
related_tasks: ["097:precedent", "100:precedent", "098:parallel", "048:context"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-07"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---

# Architecture separation diagnosis and guided hard-cut planning

Turn the completed architecture baseline from `100` into an evidence-driven diagnosis package that defines what must be separated, in what order, and under what gates before any real hard cut is opened.

## Problem Statement

The ecosystem analysis from `100` established the taxonomy, dependency flow, format-vs-engine boundary, and coupling classification of the project. What is still missing is a second-layer diagnostic pass that converts that baseline into an implementation-safe map of the real system, a concrete coupling audit, and a guided hard-cut plan that can later be executed without guesswork.

### Context

- Current behavior:
  - `100` through `104` already define the architecture baseline, but remain one level too abstract for direct separation work.
  - The runtime still contains orchestration-heavy hotspots in root app flow, file IO orchestration, store-engine coupling, and read-model bridging.
- Expected behavior:
  - The project should gain a code-anchored diagnosis packet that makes future separation work explicit, ordered, and gate-driven.
- Where this appears:
  - `src/App.tsx`
  - `src/hooks/useGskFile.ts`
  - `src/state/slices/docSlice.ts`
  - `src/core/read-model/*`
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`
  - `todos/100-complete-p2-gsk-ecosystem-architecture-analysis.md`
  - `docs/wiki-software/09_ecosistema_arquitectura.md`

### Why This Matters

- Impact:
  - Creates a stable substrate for future architecture work instead of rediscovering boundaries while refactoring.
  - Reduces the chance of inheriting structural debt into later feature work.
- Cost of not doing it:
  - Future separation attempts will rely on intuition, partial memory, or ad hoc exploration of mixed responsibilities.
  - The team may open a hard cut too early or in the wrong order.

## Findings

- `100` already answers the baseline taxonomy and interconnection questions from `N0010` and `N0011`.
- The current repo shape confirms that the main problem is no longer missing architectural language, but mixed operational boundaries in a few key orchestration paths.
- A new architecture phase should consume the baseline, not reopen it.
- A guided hard-cut plan is valid only if it is derived from a map, an audit, and explicit hotspot/risk classification.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Reopen `099` as an active umbrella that coordinates a diagnostic chain for master mapping, coupling audit, hotspot classification, sequence comparison, guided hard-cut planning, and final packet consolidation.
- Pros:
  - Converts the architecture baseline into execution-grade evidence.
  - Preserves a single umbrella of record for this phase.
  - Keeps the future hard cut evidence-driven instead of speculative.
- Cons:
  - Produces a broader chain of analysis tasks before any refactor can begin.
- Effort: M
- Risk: Medium

## Recommended Action

Open a second-layer architecture diagnosis under this umbrella. The child chain must produce:
- a master system map anchored to actual code;
- a runtime boundary and coupling audit with severity/risk;
- a hotspot classification layer;
- a comparison of separation sequences;
- a guided hard-cut secondary plan;
- and a final diagnosis packet under `reports/architecture-separation-diagnosis/`.

### Execution Plan

1. Materialize the child chain `108` through `113` with explicit dependencies and scope boundaries.
2. Build the master system map and use it as the substrate for the coupling audit.
3. Convert the audit into hotspot/risk classifications and compare possible separation sequences.
4. Produce a guided hard-cut secondary plan that remains diagnostic, not yet executable.
5. Consolidate everything into a final diagnosis packet and close this umbrella only when the packet exists and all child tasks are complete.

## Orchestration Guide

### Hard Dependencies

- `100` must remain complete and acts as the architecture baseline of record.

### Child Execution Order

1. `108` - establish the master system map anchored in code.
2. `109` - audit runtime boundaries and coupling against that map.
3. `110` - classify the operational hotspots and risk profile.
4. `111` - compare candidate separation sequences and choose one.
5. `112` - write the guided hard-cut secondary plan from the selected sequence.
6. `113` - consolidate the final diagnosis packet and architecture recommendation.

### Related Context

- `097:precedent` because it formalized the Visual Engine vs App Shell distinction used by the current taxonomy.
- `100:precedent` because it is the baseline architecture analysis this chain must consume rather than repeat.
- `098:parallel` because current-phase cleanup may continue independently while this diagnosis runs.
- `048:context` because hard-cut concerns remain historically relevant, but this chain must not execute them yet.

### Exit Rule

- Close this umbrella only after `108` through `113` are complete, the packet under `reports/architecture-separation-diagnosis/` exists, and the final diagnosis explicitly answers what should be separated, in what order, with what risk, and under what gates.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] `099` is converted into a v2 architecture umbrella with child tasks `108` through `113`.
- [ ] The chain explicitly treats `100` as baseline and does not reopen the baseline taxonomy work.
- [ ] The required outputs include master map, coupling audit, hotspot classification, diagnosis, and guided hard-cut secondary plan.
- [ ] The final packet is defined to live under `reports/architecture-separation-diagnosis/`.
- [ ] Work log updated.

## Work Log

### 2026-03-06 - Reframed after baseline consolidation

**By:** Codex

**Status Transition:**
- from: pending
- to: pending

**Actions:**
- Rewrote this task so it no longer pushes immediate `0.6.0` hard-cut planning.
- Removed the derived child tasks because they were too early for the current project phase.
- Repositioned this task as passive architecture follow-up after the completed ecosystem baseline.
- Converted it from `umbrella` to passive `leaf`, because the protocol only treats umbrellas as executable coordinators with real child tasks.

**Evidence:**
- Artifacts/paths:
  - `todos/099-pending-p2-post-baseline-architecture-followup.md`
  - `todos/100-complete-p2-gsk-ecosystem-architecture-analysis.md`
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`

### 2026-03-07 - Reopened as architecture diagnosis umbrella

**By:** Codex

**Status Transition:**
- from: pending
- to: pending

**Actions:**
- Reconverted `099` from passive leaf to active umbrella v2.
- Added child tasks `108` through `113` for mapping, audit, hotspot classification, separation sequence analysis, guided hard-cut planning, and final diagnosis consolidation.
- Reframed the task around evidence-driven separation safety rather than passive future follow-up.

**Evidence:**
- Artifacts/paths:
  - `todos/099-pending-p2-post-baseline-architecture-followup.md`
  - `todos/108-pending-p2-master-system-map.md`
  - `todos/109-pending-p2-runtime-boundary-and-coupling-audit.md`
  - `todos/110-pending-p2-hotspot-risk-classification.md`
  - `todos/111-pending-p2-separation-sequence-options.md`
  - `todos/112-pending-p2-guided-hard-cut-secondary-plan.md`
  - `todos/113-pending-p2-final-diagnosis-packet.md`

## Notes

This umbrella is diagnostic by design. It must not be used to start runtime refactors directly, and it must not create a second umbrella automatically from the guided hard-cut output.
