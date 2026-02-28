import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeGeneaDocument } from "@/core/diagnostics/analyzer";
import { type DataDiff, type DiffResolution } from "@/core/edit/diff";
import { mergeFocusKey, normalizeMergeFocus, type MergeFocusPayload } from "@/core/edit/mergeFocus";
import { sanitizeMergeDraftSnapshot } from "@/core/edit/mergeDraftValidation";
import { applyDiff, type MergeStats } from "@/core/edit/merge";
import { hasPendingFamilyConflicts, hasPendingPersonConflicts } from "@/core/edit/mergeWorkflow";
import {
  applyCaseDecision,
  applySuggestedMediumAsManual,
  autoApplySuggestedMedium,
  buildInitialReviewSession,
  computeSessionPreview,
  moveCaseSelection,
  refreshTechnicalReviewFlags,
  revertAction,
  revertAutoAppliedMedium,
  selectCaseCandidate,
  selectCaseHypothesis,
  setLowSectionVisibility,
  setReviewSearch,
  setSelectedCase
} from "@/core/edit/reviewSession";
import { findAllMatches, type MatchResult } from "@/core/edit/personMatcher";
import type { GeneaDocument } from "@/types/domain";
import type { MergeDraftSnapshot } from "@/types/merge-draft";
import type { MergeReviewPreset, MergeReviewSession, MergeReviewStep, MergeSessionPreview } from "@/types/merge-review";
import { MergeApplyStep } from "@/ui/merge-review/MergeApplyStep";
import { MergeActionJournalPane } from "@/ui/merge-review/MergeActionJournalPane";
import { MergeCaseDetailPane } from "@/ui/merge-review/MergeCaseDetailPane";
import { MergeInboxPane } from "@/ui/merge-review/MergeInboxPane";
import { MergePreviewStep } from "@/ui/merge-review/MergePreviewStep";
import { MergeTechnicalConflictsStep } from "@/ui/merge-review/MergeTechnicalConflictsStep";
import { MERGE_STRINGS_ES } from "@/ui/merge-review/strings.es";

type Props = {
  baseDoc: GeneaDocument;
  incomingDoc: GeneaDocument;
  initialDraft?: MergeDraftSnapshot | null;
  onDraftChange?: (draft: MergeDraftSnapshot | null) => void;
  onFocusChange?: (focus: MergeFocusPayload | null) => void;
  onApply: (merged: GeneaDocument, stats: MergeStats) => void;
  onClose: () => void;
};

function cloneDiff(diff: DataDiff): DataDiff {
  return structuredClone(diff);
}

function quickHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function documentFingerprint(doc: GeneaDocument): string {
  const personIds = Object.keys(doc.persons).sort((a, b) => a.localeCompare(b));
  const familyIds = Object.keys(doc.families).sort((a, b) => a.localeCompare(b));
  const personSample = personIds
    .slice(0, 60)
    .map((id) => {
      const person = doc.persons[id];
      return `${id}:${person.name}:${person.surname || ""}:${person.sex}:${person.events.length}`;
    })
    .join("|");
  const familySample = familyIds
    .slice(0, 60)
    .map((id) => {
      const family = doc.families[id];
      return `${id}:${family.husbandId || ""}:${family.wifeId || ""}:${family.childrenIds.length}:${family.events.length}`;
    })
    .join("|");
  const payload = `${doc.metadata.sourceFormat}|${doc.metadata.gedVersion}|p${personIds.length}|f${familyIds.length}|${personSample}|${familySample}`;
  return quickHash(payload);
}

function mergeContextId(baseDoc: GeneaDocument, incomingDoc: GeneaDocument): string {
  return quickHash(`${documentFingerprint(baseDoc)}::${documentFingerprint(incomingDoc)}`);
}

function countPendingPersonConflicts(diff: DataDiff): number {
  let count = 0;
  for (const person of Object.values(diff.persons)) {
    if (person.status !== "modified") continue;
    for (const conflict of Object.values(person.conflicts)) {
      if (conflict?.resolution === "pending") count += 1;
    }
    count += person.eventConflicts.filter((eventConflict) => eventConflict.resolution === "pending").length;
  }
  return count;
}

function countPendingFamilyConflicts(diff: DataDiff): number {
  let count = 0;
  for (const family of Object.values(diff.families)) {
    if (family.status !== "modified") continue;
    if (family.conflicts.husbandId?.resolution === "pending") count += 1;
    if (family.conflicts.wifeId?.resolution === "pending") count += 1;
    count += family.conflicts.childrenConflicts.filter((conflict) => conflict.resolution === "pending").length;
    count += family.conflicts.eventConflicts.filter((eventConflict) => eventConflict.resolution === "pending").length;
  }
  return count;
}

function technicalIncomingIdsFromSession(session: MergeReviewSession): Set<string> {
  return new Set(
    Object.values(session.cases)
      .filter((reviewCase) => reviewCase.needsTechnicalConflictReview && reviewCase.status !== "pending")
      .map((reviewCase) => reviewCase.incomingId)
  );
}

function exportMergeAudit(merged: GeneaDocument): void {
  if (!merged.metadata.mergeAudit) return;
  const payload = JSON.stringify(merged.metadata.mergeAudit, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `merge-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function stepLabel(step: MergeReviewStep): string {
  return MERGE_STRINGS_ES.stepLabels[step];
}

function selectedHypothesisForCase(reviewCase: MergeReviewSession["cases"][string]) {
  return reviewCase.hypothesesTopK[reviewCase.selectedHypothesis] || reviewCase.hypothesesTopK[0] || null;
}

export function secondaryIdsFromReviewCase(reviewCase: MergeReviewSession["cases"][string]): string[] {
  const selectedHypothesis = selectedHypothesisForCase(reviewCase);
  if (!selectedHypothesis) return [];
  const secondaryIds = selectedHypothesis.explain.requiredActions
    .filter((action) => action.kind === "merge_person")
    .map((action) => (action.kind === "merge_person" ? action.baseId : ""))
    .filter(Boolean);
  return Array.from(new Set(secondaryIds)).sort((a, b) => a.localeCompare(b));
}

function uniqueSorted(ids: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(ids).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function immediateFamilyIds(doc: GeneaDocument, personId: string | undefined): string[] {
  if (!personId) return [];
  const person = doc.persons[personId];
  if (!person) return [];
  const out = new Set<string>();
  for (const familyId of person.famc) {
    const family = doc.families[familyId];
    if (!family) continue;
    if (family.husbandId) out.add(family.husbandId);
    if (family.wifeId) out.add(family.wifeId);
    for (const childId of family.childrenIds) out.add(childId);
  }
  for (const familyId of person.fams) {
    const family = doc.families[familyId];
    if (!family) continue;
    if (family.husbandId) out.add(family.husbandId);
    if (family.wifeId) out.add(family.wifeId);
    for (const childId of family.childrenIds) out.add(childId);
  }
  out.delete(personId);
  return uniqueSorted(out);
}

function expandOneHop(doc: GeneaDocument, ids: string[]): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    for (const relativeId of immediateFamilyIds(doc, id)) out.add(relativeId);
  }
  return uniqueSorted(out);
}

export function ImportReviewPanel({
  baseDoc,
  incomingDoc,
  initialDraft,
  onDraftChange,
  onFocusChange,
  onApply,
  onClose
}: Props) {
  const contextId = useMemo(() => mergeContextId(baseDoc, incomingDoc), [baseDoc, incomingDoc]);
  const [step, setStep] = useState<MergeReviewStep>("strategy");
  const [preset, setPreset] = useState<MergeReviewPreset>("fast");
  const [mode, setMode] = useState<"auto_deep" | "expert_workbench">("auto_deep");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [session, setSession] = useState<MergeReviewSession | null>(null);
  const [workingDiff, setWorkingDiff] = useState<DataDiff | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const hydratedContextRef = useRef<string | null>(null);
  const lastEmittedFocusKeyRef = useRef<string | null>(null);

  function buildSessionForPreset(nextPreset: MergeReviewPreset, nextMode: "auto_deep" | "expert_workbench" = mode): void {
    try {
      const matches = findAllMatches(baseDoc, incomingDoc, { preset: nextPreset });
      setMatchResult(matches);
      setSession(buildInitialReviewSession(baseDoc, incomingDoc, matches, nextPreset, contextId, nextMode));
      setWorkingDiff(null);
      setPreset(nextPreset);
      setMode(nextMode);
      setFatalError(null);
    } catch (error) {
      console.error("MERGE_RUNTIME_CRASH", error);
      setFatalError(error instanceof Error ? error.message : MERGE_STRINGS_ES.prepareError);
    }
  }

  useEffect(() => {
    if (hydratedContextRef.current === contextId) return;
    const sanitizedDraft = sanitizeMergeDraftSnapshot(initialDraft);
    if (sanitizedDraft && sanitizedDraft.contextId === contextId) {
      try {
        const nextPreset = sanitizedDraft.session.preset ?? "fast";
        const nextMode = sanitizedDraft.session.mode ?? "auto_deep";
        const matches = findAllMatches(baseDoc, incomingDoc, { preset: nextPreset });
        setMatchResult(matches);
        setSession(sanitizedDraft.session);
        setWorkingDiff(sanitizedDraft.workingDiff ? cloneDiff(sanitizedDraft.workingDiff) : null);
        setStep(sanitizedDraft.step);
        setPreset(nextPreset);
        setMode(nextMode);
        setFatalError(null);
        hydratedContextRef.current = contextId;
        return;
      } catch (error) {
        console.error("MERGE_RUNTIME_CRASH", error);
        setFatalError(error instanceof Error ? error.message : MERGE_STRINGS_ES.restoreError);
      }
    }
    if (initialDraft && initialDraft.contextId === contextId && !sanitizedDraft) {
      console.warn("MERGE_DRAFT_INVALID", { reason: "hydrate_failed", contextId });
      const shouldDiscard = window.confirm(MERGE_STRINGS_ES.invalidDraftConfirm);
      if (!shouldDiscard) {
        onFocusChange?.(null);
        lastEmittedFocusKeyRef.current = null;
        onClose();
        hydratedContextRef.current = contextId;
        return;
      }
      onDraftChange?.(null);
      buildSessionForPreset("fast", "auto_deep");
      setStep("strategy");
      hydratedContextRef.current = contextId;
      return;
    }
    if (initialDraft && !sanitizedDraft) {
      console.warn("MERGE_DRAFT_INVALID", { reason: "context_mismatch_or_invalid", contextId });
      onDraftChange?.(null);
    }
    buildSessionForPreset("fast", "auto_deep");
    setStep("strategy");
    hydratedContextRef.current = contextId;
  }, [baseDoc, contextId, incomingDoc, initialDraft, onClose, onDraftChange, onFocusChange]);

  const computedPreview = useMemo(() => {
    if (!session || !matchResult) return null;
    try {
      return computeSessionPreview(baseDoc, incomingDoc, session, matchResult);
    } catch (error) {
      console.error("MERGE_RUNTIME_CRASH", error);
      return null;
    }
  }, [baseDoc, incomingDoc, matchResult, session]);

  const effectivePreview = useMemo(() => {
    if (!computedPreview) return null;
    if (!workingDiff) return computedPreview;
    const applied = applyDiff(baseDoc, workingDiff);
    return {
      diff: workingDiff,
      merged: applied.merged,
      stats: applied.stats
    } as MergeSessionPreview;
  }, [baseDoc, computedPreview, workingDiff]);

  const diagnostics = useMemo(() => {
    if (!effectivePreview) return null;
    return analyzeGeneaDocument(effectivePreview.merged);
  }, [effectivePreview]);

  useEffect(() => {
    if (fatalError) return;
    if (!session || !matchResult || !onDraftChange) return;
    onDraftChange({
      contextId,
      step,
      session,
      workingDiff: workingDiff ? cloneDiff(workingDiff) : null,
      updatedAt: new Date().toISOString()
    });
  }, [contextId, matchResult, onDraftChange, session, step, workingDiff]);

  function emitFocus(nextFocus: MergeFocusPayload | null): void {
    if (!onFocusChange) return;
    const normalized = normalizeMergeFocus(nextFocus);
    const key = mergeFocusKey(normalized);
    if (key === lastEmittedFocusKeyRef.current) return;
    lastEmittedFocusKeyRef.current = key;
    onFocusChange(normalized);
  }

  useEffect(() => {
    if (fatalError) return;
    if (!session || !onFocusChange) return;
    const selectedId = session.selectedCaseId;
    if (!selectedId) {
      emitFocus(null);
      return;
    }
    const reviewCase = session.cases[selectedId];
    if (!reviewCase) {
      emitFocus(null);
      return;
    }
    const primaryIds = [reviewCase.incomingId, reviewCase.baseId].filter(Boolean) as string[];
    const actionSecondary = secondaryIdsFromReviewCase(reviewCase);
    const incomingLevel1 = immediateFamilyIds(incomingDoc, reviewCase.incomingId);
    const baseLevel1 = immediateFamilyIds(baseDoc, reviewCase.baseId);
    const secondaryLevel1Ids = uniqueSorted([...actionSecondary, ...incomingLevel1, ...baseLevel1]);
    const incomingLevel2 = expandOneHop(incomingDoc, incomingLevel1);
    const baseLevel2 = expandOneHop(baseDoc, baseLevel1);
    const secondaryLevel2Ids = uniqueSorted([...incomingLevel2, ...baseLevel2].filter((id) => !primaryIds.includes(id) && !secondaryLevel1Ids.includes(id)));
    const secondaryIds = uniqueSorted([...secondaryLevel1Ids, ...secondaryLevel2Ids]);
    emitFocus({ primaryIds, secondaryIds, secondaryLevel1Ids, secondaryLevel2Ids });
  }, [baseDoc, incomingDoc, onFocusChange, session, step]);

  useEffect(() => {
    if (fatalError) return;
    if (!session) return;
    const sourceDiff = workingDiff || computedPreview?.diff;
    if (!sourceDiff) return;
    const refreshed = refreshTechnicalReviewFlags(session, sourceDiff);
    if (refreshed.gates.unresolvedTechnical !== session.gates.unresolvedTechnical) {
      setSession(refreshed);
      return;
    }
    for (const incomingId of Object.keys(session.cases)) {
      if (refreshed.cases[incomingId]?.technicalConflictResolved !== session.cases[incomingId]?.technicalConflictResolved) {
        setSession(refreshed);
        return;
      }
    }
  }, [computedPreview?.diff, session, workingDiff]);

  useEffect(() => {
    if (fatalError) return;
    if (!session || (step !== "inbox" && step !== "case_workbench")) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (event.key === "j") {
        event.preventDefault();
        setSession((prev) => (prev ? moveCaseSelection(prev, 1) : prev));
      } else if (event.key === "k") {
        event.preventDefault();
        setSession((prev) => (prev ? moveCaseSelection(prev, -1) : prev));
      } else if ((event.key === "1" || event.key === "2" || event.key === "3") && session.selectedCaseId) {
        event.preventDefault();
        const hypothesisIndex = Number(event.key) - 1;
        setSession((prev) => (prev ? selectCaseHypothesis(prev, session.selectedCaseId!, hypothesisIndex) : prev));
      } else if (event.key === "Enter" && session.selectedCaseId) {
        event.preventDefault();
        setSession((prev) => (prev ? applyCaseDecision(prev, session.selectedCaseId!, "manual") : prev));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, step]);

  if (fatalError) {
    return (
      <div className="modal-overlay" onClick={() => { onFocusChange?.(null); onClose(); }}>
        <div className="modal-panel" style={{ width: 700 }} onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <h3>{MERGE_STRINGS_ES.errorTitle}</h3>
            <button onClick={() => { onFocusChange?.(null); onClose(); }}>Cerrar</button>
          </div>
          <div className="merge-inbox-empty" style={{ marginTop: 12 }}>
            {MERGE_STRINGS_ES.cannotPrepareReview}
          </div>
          <div className="modal-line warning" style={{ marginTop: 12 }}>
            {fatalError}
          </div>
          <div className="builder-actions" style={{ justifyContent: "flex-end", marginTop: 20 }}>
            <button className="primary" onClick={() => { onDraftChange?.(null); onFocusChange?.(null); onClose(); }}>
              {MERGE_STRINGS_ES.closeAndClearDraft}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !matchResult || !computedPreview || !effectivePreview || !diagnostics) return null;

  const technicalIncomingIds = technicalIncomingIdsFromSession(session);
  const activeDiff = workingDiff || cloneDiff(computedPreview.diff);
  const unresolvedPerson = countPendingPersonConflicts(activeDiff);
  const unresolvedFamily = countPendingFamilyConflicts(activeDiff);

  function prepareTechnicalStep(nextSession: MergeReviewSession): void {
    const preview = computeSessionPreview(baseDoc, incomingDoc, nextSession, matchResult || undefined);
    const nextDiff = cloneDiff(preview.diff);
    setWorkingDiff(nextDiff);
    setSession(refreshTechnicalReviewFlags(nextSession, nextDiff));
    setStep("technical_conflicts");
  }

  function goNextFromTechnical(): void {
    if (!workingDiff) return;
    if (hasPendingPersonConflicts(workingDiff) || hasPendingFamilyConflicts(workingDiff)) return;
    setSession((prev) => (prev ? refreshTechnicalReviewFlags(prev, workingDiff) : prev));
    setStep("preview");
  }

  function goBack(): void {
    if (step === "inbox") setStep("strategy");
    else if (step === "case_workbench") setStep("inbox");
    else if (step === "technical_conflicts") setStep("case_workbench");
    else if (step === "preview") setStep("technical_conflicts");
    else if (step === "apply") setStep("preview");
  }

  function handleApplyMerge(): void {
    if (!session || !effectivePreview || !diagnostics) return;
    if (session.gates.unresolvedBlocked > 0 || session.gates.unresolvedTechnical > 0) return;
    if (diagnostics.counts.error > 0) return;
    onDraftChange?.(null);
    onFocusChange?.(null);
    onApply(effectivePreview.merged, effectivePreview.stats);
  }

  function updatePersonFieldResolution(personId: string, field: "name" | "surname" | "sex" | "lifeStatus", resolution: DiffResolution): void {
    setWorkingDiff((prev) => {
      if (!prev) return prev;
      const next = cloneDiff(prev);
      const person = next.persons[personId];
      if (!person) return prev;
      if (field === "name" && person.conflicts.name) {
        person.conflicts.name = { ...person.conflicts.name, resolution };
      } else if (field === "surname" && person.conflicts.surname) {
        person.conflicts.surname = { ...person.conflicts.surname, resolution };
      } else if (field === "sex" && person.conflicts.sex) {
        person.conflicts.sex = { ...person.conflicts.sex, resolution };
      } else if (field === "lifeStatus" && person.conflicts.lifeStatus) {
        person.conflicts.lifeStatus = { ...person.conflicts.lifeStatus, resolution };
      } else {
        return prev;
      }
      return next;
    });
  }

  function updatePersonEventResolution(personId: string, index: number, resolution: DiffResolution): void {
    setWorkingDiff((prev) => {
      if (!prev) return prev;
      const next = cloneDiff(prev);
      const person = next.persons[personId];
      if (!person || !person.eventConflicts[index]) return prev;
      person.eventConflicts[index] = { ...person.eventConflicts[index], resolution };
      return next;
    });
  }

  function updateFamilySpouseResolution(familyId: string, kind: "husband" | "wife", resolution: DiffResolution): void {
    setWorkingDiff((prev) => {
      if (!prev) return prev;
      const next = cloneDiff(prev);
      const family = next.families[familyId];
      if (!family) return prev;
      if (kind === "husband" && family.conflicts.husbandId) {
        family.conflicts.husbandId = { ...family.conflicts.husbandId, resolution };
      }
      if (kind === "wife" && family.conflicts.wifeId) {
        family.conflicts.wifeId = { ...family.conflicts.wifeId, resolution };
      }
      return next;
    });
  }

  function updateFamilyChildResolution(familyId: string, index: number, resolution: DiffResolution): void {
    setWorkingDiff((prev) => {
      if (!prev) return prev;
      const next = cloneDiff(prev);
      const family = next.families[familyId];
      if (!family || !family.conflicts.childrenConflicts[index]) return prev;
      family.conflicts.childrenConflicts[index] = { ...family.conflicts.childrenConflicts[index], resolution };
      return next;
    });
  }

  function updateFamilyEventResolution(familyId: string, index: number, resolution: DiffResolution): void {
    setWorkingDiff((prev) => {
      if (!prev) return prev;
      const next = cloneDiff(prev);
      const family = next.families[familyId];
      if (!family || !family.conflicts.eventConflicts[index]) return prev;
      family.conflicts.eventConflicts[index] = { ...family.conflicts.eventConflicts[index], resolution };
      return next;
    });
  }

  function resolveAllPersonConflicts(resolution: DiffResolution): void {
    setWorkingDiff((prev) => {
      if (!prev) return prev;
      const next = cloneDiff(prev);
      for (const person of Object.values(next.persons)) {
        if (person.status !== "modified") continue;
        (["name", "surname", "sex", "lifeStatus"] as const).forEach((field) => {
          if (person.conflicts[field]) person.conflicts[field]!.resolution = resolution;
        });
        person.eventConflicts = person.eventConflicts.map((eventConflict) => ({ ...eventConflict, resolution }));
      }
      return next;
    });
  }

  function resolveAllFamilyConflicts(resolution: DiffResolution): void {
    setWorkingDiff((prev) => {
      if (!prev) return prev;
      const next = cloneDiff(prev);
      for (const family of Object.values(next.families)) {
        if (family.status !== "modified") continue;
        if (family.conflicts.husbandId) family.conflicts.husbandId.resolution = resolution;
        if (family.conflicts.wifeId) family.conflicts.wifeId.resolution = resolution;
        family.conflicts.childrenConflicts = family.conflicts.childrenConflicts.map((childConflict) => ({ ...childConflict, resolution }));
        family.conflicts.eventConflicts = family.conflicts.eventConflicts.map((eventConflict) => ({ ...eventConflict, resolution }));
      }
      return next;
    });
  }

  const steps: MergeReviewStep[] = ["strategy", "inbox", "case_workbench", "technical_conflicts", "preview", "apply"];

  return (
    <div className="modal-overlay" onClick={() => { onFocusChange?.(null); onClose(); }}>
      <div
        className="modal-panel merge-v22-panel"
        style={{ width: "min(1360px, 96vw)", maxHeight: "92vh" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Fusion Asistida V4</h3>
          <button onClick={() => { onFocusChange?.(null); onClose(); }}>Cerrar</button>
        </div>

        <div className="merge-v22-steps">
          {steps.map((item, index) => (
            <div key={item} className={`merge-step-pill${step === item ? " is-active" : ""}`}>
              {index + 1}. {stepLabel(item)}
            </div>
          ))}
        </div>

        {step === "strategy" && (
          <div className="merge-preview-step">
            <div className="merge-pane-header">
              <div className="merge-pane-title">Estrategia de fusion</div>
            </div>
            <div className="merge-case-grid" style={{ marginBottom: 10 }}>
              {(["auto_deep", "expert_workbench"] as const).map((item) => (
                <label key={item} className="merge-radio-row">
                  <input
                    type="radio"
                    checked={mode === item}
                    onChange={() => {
                      setMode(item);
                      buildSessionForPreset(preset, item);
                    }}
                  />
                  <span>{item === "auto_deep" ? "Auto profundo" : "Banco experto"}</span>
                  <span className="merge-radio-row__meta">
                    {item === "auto_deep"
                      ? "Automatiza coincidencias de red y deja excepciones para revision."
                      : "Revision detallada caso por caso con control manual."}
                  </span>
                </label>
              ))}
            </div>
            <div className="merge-case-grid">
              {(["strict", "balanced", "fast"] as const).map((item) => (
                <label key={item} className="merge-radio-row">
                  <input
                    type="radio"
                    checked={preset === item}
                    onChange={() => {
                      buildSessionForPreset(item);
                    }}
                  />
                  <span>{item === "strict" ? "Estricto" : item === "balanced" ? "Balanceado" : "Rapido"}</span>
                  <span className="merge-radio-row__meta">
                    {item === "strict" ? "Auto solo bajo." : item === "balanced" ? "Auto bajo + medio sugerido." : "Auto bajo + medio agresivo."}
                  </span>
                </label>
              ))}
            </div>
            <div className="merge-v22-footer-note">
              Total casos: {session.derivedStats.totalCases} | Confirmados por red: {session.derivedStats.networkConfirmed} | Overrides criticos: {session.derivedStats.criticalOverrides}
            </div>
          </div>
        )}

        {step === "inbox" && (
          <div className="merge-preview-step">
            <MergeInboxPane
              session={session}
              mode={mode}
              incomingDoc={incomingDoc}
              onSelectCase={(incomingId) => setSession((prev) => (prev ? setSelectedCase(prev, incomingId) : prev))}
              onSearchChange={(search) => setSession((prev) => (prev ? setReviewSearch(prev, search) : prev))}
              onToggleLowSection={(visible) => setSession((prev) => (prev ? setLowSectionVisibility(prev, visible) : prev))}
            />
            <div className="merge-technical-controls">
              <button onClick={() => setSession((prev) => (prev ? autoApplySuggestedMedium(prev) : prev))}>
                Auto-aplicar sugeridos medios ({session.derivedStats.mediumSuggested})
              </button>
              <button onClick={() => setSession((prev) => (prev ? revertAutoAppliedMedium(prev) : prev))}>
                Revertir auto de medios
              </button>
              <button onClick={() => setSession((prev) => (prev ? applySuggestedMediumAsManual(prev) : prev))}>
                Mandar sugeridos a manual
              </button>
            </div>
          </div>
        )}

        {step === "case_workbench" && (
          <div className="merge-v22-grid">
            <MergeInboxPane
              session={session}
              mode={mode}
              incomingDoc={incomingDoc}
              onSelectCase={(incomingId) => setSession((prev) => (prev ? setSelectedCase(prev, incomingId) : prev))}
              onSearchChange={(search) => setSession((prev) => (prev ? setReviewSearch(prev, search) : prev))}
              onToggleLowSection={(visible) => setSession((prev) => (prev ? setLowSectionVisibility(prev, visible) : prev))}
            />
            <MergeCaseDetailPane
              session={session}
              incomingDoc={incomingDoc}
              baseDoc={baseDoc}
              onSelectCandidate={(incomingId, candidateIndex) =>
                setSession((prev) => (prev ? selectCaseCandidate(prev, incomingId, candidateIndex) : prev))
              }
              onSelectHypothesis={(incomingId, hypothesisIndex) =>
                setSession((prev) => (prev ? selectCaseHypothesis(prev, incomingId, hypothesisIndex) : prev))
              }
              onApplyDecision={(incomingId) =>
                setSession((prev) => (prev ? applyCaseDecision(prev, incomingId, "manual") : prev))
              }
              onTreatAsNewPerson={(incomingId) => {
                setSession((prev) => {
                  if (!prev) return prev;
                  const reviewCase = prev.cases[incomingId];
                  const createIndex = reviewCase.candidates.findIndex((candidate) => candidate.source === "synthetic-create");
                  const candidateIndex = createIndex >= 0 ? createIndex : reviewCase.candidates.length - 1;
                  const selected = selectCaseCandidate(prev, incomingId, candidateIndex);
                  return applyCaseDecision(selected, incomingId, "manual");
                });
              }}
              onOpenTechnical={(incomingId) => {
                const updated = applyCaseDecision(session, incomingId, "manual");
                prepareTechnicalStep(updated);
              }}
            />
            <MergeActionJournalPane
              session={session}
              onRevertAction={(actionId) => setSession((prev) => (prev ? revertAction(prev, actionId) : prev))}
            />
          </div>
        )}

        {step === "technical_conflicts" && workingDiff && (
          <MergeTechnicalConflictsStep
            diff={workingDiff}
            technicalIncomingIds={technicalIncomingIds}
            onResolveAllPerson={resolveAllPersonConflicts}
            onResolveAllFamily={resolveAllFamilyConflicts}
            onPersonFieldResolution={updatePersonFieldResolution}
            onPersonEventResolution={updatePersonEventResolution}
            onFamilySpouseResolution={updateFamilySpouseResolution}
            onFamilyChildResolution={updateFamilyChildResolution}
            onFamilyEventResolution={updateFamilyEventResolution}
          />
        )}

        {step === "preview" && (
          <MergePreviewStep
            diff={effectivePreview.diff}
            preview={effectivePreview}
            diagnostics={diagnostics}
            onExportAudit={() => exportMergeAudit(effectivePreview.merged)}
          />
        )}

        {step === "apply" && (
          <MergeApplyStep
            preview={effectivePreview}
            diagnostics={diagnostics}
            unresolvedBlocked={session.gates.unresolvedBlocked}
            unresolvedTechnical={session.gates.unresolvedTechnical}
            onApply={handleApplyMerge}
          />
        )}

        <div className="merge-v22-footer">
          <button onClick={goBack} disabled={step === "strategy"}>
            Atras
          </button>
          {step === "strategy" && (
            <button className="primary" onClick={() => setStep("inbox")}>
              Continuar a bandeja
            </button>
          )}
          {step === "inbox" && (
            <button
              className="primary"
              onClick={() => {
                if (mode === "auto_deep") {
                  prepareTechnicalStep(session);
                  return;
                }
                setStep("case_workbench");
              }}
            >
              {mode === "auto_deep" ? "Continuar a conflictos tecnicos" : "Continuar a banco de casos"}
            </button>
          )}
          {step === "case_workbench" && (
            <button className="primary" onClick={() => prepareTechnicalStep(session)} disabled={session.gates.unresolvedBlocked > 0}>
              Continuar a conflictos tecnicos
            </button>
          )}
          {step === "technical_conflicts" && (
            <button
              className="primary"
              onClick={goNextFromTechnical}
              disabled={hasPendingPersonConflicts(activeDiff) || hasPendingFamilyConflicts(activeDiff)}
            >
              Continuar a vista previa
            </button>
          )}
          {step === "preview" && (
            <button className="primary" onClick={() => setStep("apply")}>
              Continuar a aplicar
            </button>
          )}
        </div>
        <div className="merge-v22-footer-note">
          Bloqueados: {session.gates.unresolvedBlocked} | Tecnicos pendientes: {session.gates.unresolvedTechnical} | Pendientes persona: {unresolvedPerson} | Pendientes familia: {unresolvedFamily}
        </div>
      </div>
    </div>
  );
}

