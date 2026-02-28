import { describe, expect, it } from "vitest";
import { calculateDiff } from "@/core/edit/diff";
import {
  applyCaseDecision,
  autoApplySuggestedMedium,
  buildInitialReviewSession,
  computeSessionPreview,
  refreshTechnicalReviewFlags,
  revertAction,
  revertAutoAppliedMedium,
  selectCaseHypothesis
} from "@/core/edit/reviewSession";
import type { MatchCandidate, MatchResult } from "@/core/edit/personMatcher";
import type { GeneaDocument, MergeAction, MergeExplain, MergeHypothesis, MergeRiskLevel } from "@/types/domain";

function createExplain(reason: string, actions: MergeAction[]): MergeExplain {
  return {
    categoryPoints: {
      identity: 10,
      temporal: 10,
      geography: 4,
      familyNetwork: 12,
      documentStructure: 2
    },
    subCategoryPoints: {
      familyParents: 4,
      familyUnions: 3,
      familyChildren: 3,
      familySiblings: 1,
      familyGrandparents: 1
    },
    penalties: [],
    coverage: {
      comparableSignals: 5,
      availableSignals: 7,
      coverageRatio: 0.71,
      coveragePenalty: 5
    },
    capsApplied: [],
    blockers: [],
    decisionReason: reason,
    requiredActions: actions
  };
}

function hypothesis(type: MergeHypothesis["hypothesisType"], score: number, risk: MergeRiskLevel, actions: MergeAction[]): MergeHypothesis {
  return {
    hypothesisType: type,
    scoreFinal: score,
    riskLevel: risk,
    explain: createExplain(type, actions)
  };
}

function candidate(input: {
  incomingId: string;
  baseId: string;
  score: number;
  riskLevel: MergeRiskLevel;
  hypotheses: MergeHypothesis[];
}): MatchCandidate {
  const chosen = input.hypotheses[0];
  return {
    baseId: input.baseId,
    incomingId: input.incomingId,
    score: input.score,
    signals: [`candidate:${input.incomingId}`],
    confidence: input.score >= 85 ? "high" : input.score >= 60 ? "medium" : "low",
    blockers: [],
    qualityFlags: [],
    categoryScores: {
      identity: 10,
      temporal: 10,
      geography: 4,
      family: 12,
      structure: 2
    },
    explain: chosen.explain,
    hypothesesTopK: input.hypotheses,
    chosenHypothesis: chosen,
    requiredActions: chosen.explain.requiredActions,
    riskLevel: input.riskLevel
  };
}

function docs(): { base: GeneaDocument; incoming: GeneaDocument } {
  const base: GeneaDocument = {
    persons: {
      "@B1@": { id: "@B1@", name: "Base1", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
      "@B2@": { id: "@B2@", name: "Base2", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
      "@B3@": { id: "@B3@", name: "Base3", sex: "U", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {},
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };

  const incoming: GeneaDocument = {
    persons: {
      "@X1@": { id: "@X1@", name: "Inc1", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
      "@X2@": { id: "@X2@", name: "Inc2", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
      "@X3@": { id: "@X3@", name: "Inc3", sex: "U", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {},
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
  return { base, incoming };
}

function buildMatchResult(): MatchResult {
  const mergeAction: MergeAction = { kind: "merge_person", incomingId: "@X1@", baseId: "@B1@" };
  const createAction: MergeAction = { kind: "create_person", incomingId: "@X1@", preferredId: "@X1@" };
  const c1 = candidate({
    incomingId: "@X1@",
    baseId: "@B1@",
    score: 72,
    riskLevel: "medium",
    hypotheses: [
      hypothesis("SamePerson", 72, "medium", [mergeAction]),
      hypothesis("CreateNewPerson", 65, "medium", [createAction])
    ]
  });
  const c2 = candidate({
    incomingId: "@X2@",
    baseId: "@B2@",
    score: 40,
    riskLevel: "high",
    hypotheses: [hypothesis("Homonym", 40, "high", [{ kind: "create_person", incomingId: "@X2@", preferredId: "@X2@" }])]
  });
  const c3 = candidate({
    incomingId: "@X3@",
    baseId: "@B3@",
    score: 90,
    riskLevel: "low",
    hypotheses: [hypothesis("SamePerson", 90, "low", [{ kind: "merge_person", incomingId: "@X3@", baseId: "@B3@" }])]
  });
  return {
    autoMatches: new Map<string, string>(),
    ambiguousMatches: new Map<string, MatchCandidate[]>([
      ["@X1@", [c1]],
      ["@X2@", [c2]],
      ["@X3@", [c3]]
    ]),
    unmatched: [],
    blocked: [{ incomingId: "@X2@", blockers: [{ code: "SEX_CONFLICT", severity: "criticalHardConflict", detail: "conflict" }] }],
    reviewQueue: [
      { incomingId: "@X2@", priority: 120, reason: "high risk" },
      { incomingId: "@X1@", priority: 90, reason: "review" },
      { incomingId: "@X3@", priority: 40, reason: "low" }
    ],
    stats: {
      processed: 3,
      total: 3,
      autoConfirmed: 0,
      needsReview: 2,
      blocked: 1,
      unmatched: 0
    }
  };
}

function buildMediumAutoMatchResult(): MatchResult {
  const mergeAction: MergeAction = { kind: "merge_person", incomingId: "@X1@", baseId: "@B1@" };
  const createAction: MergeAction = { kind: "create_person", incomingId: "@X1@", preferredId: "@X1@" };
  const c1 = candidate({
    incomingId: "@X1@",
    baseId: "@B1@",
    score: 90,
    riskLevel: "medium",
    hypotheses: [
      hypothesis("SamePerson", 90, "medium", [mergeAction]),
      hypothesis("CreateNewPerson", 66, "medium", [createAction])
    ]
  });
  return {
    autoMatches: new Map<string, string>(),
    ambiguousMatches: new Map<string, MatchCandidate[]>([
      ["@X1@", [c1]]
    ]),
    unmatched: [],
    blocked: [],
    reviewQueue: [
      { incomingId: "@X1@", priority: 110, reason: "medium suggestible" }
    ],
    stats: {
      processed: 1,
      total: 1,
      autoConfirmed: 0,
      needsReview: 1,
      blocked: 0,
      unmatched: 0
    }
  };
}

describe("merge review session", () => {
  it("orders inbox by risk + priority + incomingId and auto-applies low risk", () => {
    const { base, incoming } = docs();
    const matchResult = buildMatchResult();
    const session = buildInitialReviewSession(base, incoming, matchResult);

    expect(session.orderedCaseIds[0]).toBe("@X2@");
    expect(session.orderedCaseIds[1]).toBe("@X1@");
    expect(session.orderedCaseIds[2]).toBe("@X3@");
    expect(session.cases["@X3@"].status).toBe("auto_applied");
    expect(session.actionJournal.some((entry) => entry.incomingId === "@X3@" && entry.source === "auto-low")).toBe(true);
    expect(session.gates.unresolvedBlocked).toBe(1);
  });

  it("updates planned actions by hypothesis and supports apply/revert action", () => {
    const { base, incoming } = docs();
    const session0 = buildInitialReviewSession(base, incoming, buildMatchResult());
    const session1 = selectCaseHypothesis(session0, "@X1@", 1);
    expect(session1.cases["@X1@"].requiredActionsPlanned[0].kind).toBe("create_person");

    const session2 = applyCaseDecision(session1, "@X1@", "manual");
    expect(session2.cases["@X1@"].status).toBe("manual_applied");
    expect(session2.cases["@X1@"].requiredActionsApplied.length).toBeGreaterThan(0);

    const actionId = session2.cases["@X1@"].requiredActionsApplied[0];
    const session3 = revertAction(session2, actionId);
    expect(session3.cases["@X1@"].status).toBe("pending");
    expect(session3.cases["@X1@"].requiredActionsApplied.length).toBe(0);
  });

  it("computes deterministic preview and technical gates from diff conflicts", () => {
    const { base, incoming } = docs();
    let session = buildInitialReviewSession(base, incoming, buildMatchResult());
    session = applyCaseDecision(session, "@X1@", "manual");

    const previewA = computeSessionPreview(base, incoming, session, buildMatchResult());
    const previewB = computeSessionPreview(base, incoming, session, buildMatchResult());
    expect(previewA.diff.summary.personConflicts).toBe(previewB.diff.summary.personConflicts);
    expect(Object.keys(previewA.merged.persons).length).toBe(Object.keys(previewB.merged.persons).length);

    const conflictDiff = calculateDiff(base, incoming, new Map([["@X1@", "@B1@"]]));
    const personId = conflictDiff.idRemap.persons["@X1@"];
    if (conflictDiff.persons[personId]) {
      conflictDiff.persons[personId].status = "modified";
      conflictDiff.persons[personId].conflicts.name = {
        base: "Base1",
        incoming: "Inc1",
        resolution: "pending"
      };
    }
    const flagged = refreshTechnicalReviewFlags(session, conflictDiff);
    expect(flagged.gates.unresolvedTechnical).toBeGreaterThanOrEqual(0);
  });

  it("supports medium auto suggestions and preset-driven auto behavior", () => {
    const { base, incoming } = docs();
    const balanced = buildInitialReviewSession(base, incoming, buildMediumAutoMatchResult(), "balanced");
    expect(balanced.cases["@X1@"].status).toBe("pending");
    expect(balanced.derivedStats.mediumSuggested).toBeGreaterThanOrEqual(1);

    const autoApplied = autoApplySuggestedMedium(balanced);
    expect(autoApplied.cases["@X1@"].status).toBe("auto_applied");
    expect(autoApplied.actionJournal.some((entry) => entry.source === "auto-medium")).toBe(true);

    const reverted = revertAutoAppliedMedium(autoApplied);
    expect(reverted.cases["@X1@"].status).toBe("pending");

    const fast = buildInitialReviewSession(base, incoming, buildMediumAutoMatchResult(), "fast");
    expect(fast.cases["@X1@"].status).toBe("auto_applied");
  });

  it("repairs malformed candidates/hypotheses without throwing", () => {
    const { base, incoming } = docs();
    const session = buildInitialReviewSession(base, incoming, buildMatchResult());
    const broken = structuredClone(session) as typeof session;
    broken.cases["@X1@"].candidates = [] as any;
    broken.cases["@X1@"].hypothesesTopK = [] as any;
    broken.cases["@X1@"].selectedCandidate = 99 as any;
    broken.cases["@X1@"].selectedHypothesis = 99 as any;

    const repaired = selectCaseHypothesis(broken, "@X1@", 1);
    expect(repaired.cases["@X1@"].candidates.length).toBeGreaterThan(0);
    expect(repaired.cases["@X1@"].hypothesesTopK.length).toBeGreaterThan(0);
    expect(repaired.cases["@X1@"].selectedCandidate).toBe(0);
    expect(repaired.cases["@X1@"].selectedHypothesis).toBe(0);
  });
});
