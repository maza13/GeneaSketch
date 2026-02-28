import { describe, expect, it } from "vitest";
import { sanitizeMergeDraftSnapshot, validateMergeDraftSnapshot } from "@/core/edit/mergeDraftValidation";
import type { MergeDraftSnapshot } from "@/types/merge-draft";

function validDraft(): MergeDraftSnapshot {
  return {
    contextId: "ctx:test",
    step: "inbox",
    session: {
      mode: "expert_workbench",
      preset: "balanced",
      autoRules: {
        lowAutoScoreMin: 86,
        lowAutoCoverageMin: 0.62,
        lowAutoDeltaMin: 12,
        mediumAutoScoreMin: 86,
        mediumAutoCoverageMin: 0.62,
        mediumAutoDeltaMin: 12
      },
      draft: { contextId: "ctx:test", updatedAt: "2026-02-27T00:00:00.000Z" },
      cases: {
        "@X1@": {
          incomingId: "@X1@",
          baseId: "@B1@",
          riskLevel: "medium",
          priority: 10,
          status: "pending",
          hypothesesTopK: [
            {
              hypothesisType: "CreateNewPerson",
              scoreFinal: 62,
              riskLevel: "medium",
              explain: {
                categoryPoints: { identity: 0, temporal: 0, geography: 0, familyNetwork: 0, documentStructure: 0 },
                subCategoryPoints: { familyParents: 0, familyUnions: 0, familyChildren: 0, familySiblings: 0, familyGrandparents: 0 },
                penalties: [],
                coverage: { comparableSignals: 0, availableSignals: 1, coverageRatio: 0, coveragePenalty: 18 },
                capsApplied: [],
                blockers: [],
                decisionReason: "fallback",
                requiredActions: [{ kind: "create_person", incomingId: "@X1@", preferredId: "@X1@" }]
              }
            }
          ],
          selectedHypothesis: 0,
          requiredActionsPlanned: [{ kind: "create_person", incomingId: "@X1@", preferredId: "@X1@" }],
          requiredActionsApplied: [],
          needsTechnicalConflictReview: false,
          technicalConflictResolved: true,
          selectedCandidate: 0,
          candidates: [
            {
              score: 62,
              confidence: "low",
              riskLevel: "medium",
              blockers: [],
              signals: [],
              qualityFlags: ["synthetic-create"],
              hypothesesTopK: [
                {
                  hypothesisType: "CreateNewPerson",
                  scoreFinal: 62,
                  riskLevel: "medium",
                  explain: {
                    categoryPoints: { identity: 0, temporal: 0, geography: 0, familyNetwork: 0, documentStructure: 0 },
                    subCategoryPoints: { familyParents: 0, familyUnions: 0, familyChildren: 0, familySiblings: 0, familyGrandparents: 0 },
                    penalties: [],
                    coverage: { comparableSignals: 0, availableSignals: 1, coverageRatio: 0, coveragePenalty: 18 },
                    capsApplied: [],
                    blockers: [],
                    decisionReason: "fallback",
                    requiredActions: [{ kind: "create_person", incomingId: "@X1@", preferredId: "@X1@" }]
                  }
                }
              ],
              chosenHypothesis: {
                hypothesisType: "CreateNewPerson",
                scoreFinal: 62,
                riskLevel: "medium",
                explain: {
                  categoryPoints: { identity: 0, temporal: 0, geography: 0, familyNetwork: 0, documentStructure: 0 },
                  subCategoryPoints: { familyParents: 0, familyUnions: 0, familyChildren: 0, familySiblings: 0, familyGrandparents: 0 },
                  penalties: [],
                  coverage: { comparableSignals: 0, availableSignals: 1, coverageRatio: 0, coveragePenalty: 18 },
                  capsApplied: [],
                  blockers: [],
                  decisionReason: "fallback",
                  requiredActions: [{ kind: "create_person", incomingId: "@X1@", preferredId: "@X1@" }]
                }
              },
              requiredActions: [{ kind: "create_person", incomingId: "@X1@", preferredId: "@X1@" }],
              explain: {
                categoryPoints: { identity: 0, temporal: 0, geography: 0, familyNetwork: 0, documentStructure: 0 },
                subCategoryPoints: { familyParents: 0, familyUnions: 0, familyChildren: 0, familySiblings: 0, familyGrandparents: 0 },
                penalties: [],
                coverage: { comparableSignals: 0, availableSignals: 1, coverageRatio: 0, coveragePenalty: 18 },
                capsApplied: [],
                blockers: [],
                decisionReason: "fallback",
                requiredActions: [{ kind: "create_person", incomingId: "@X1@", preferredId: "@X1@" }]
              },
              source: "synthetic-create"
            }
          ]
        }
      },
      orderedCaseIds: ["@X1@"],
      selectedCaseId: "@X1@",
      actionJournal: [],
      suggestedAutoMediumIds: [],
      gates: { unresolvedBlocked: 0, unresolvedTechnical: 0 },
      filters: { search: "", sort: "risk_priority", showLowSection: false },
      derivedStats: {
        totalCases: 1,
        high: 0,
        medium: 1,
        low: 0,
        pending: 1,
        autoApplied: 0,
        manualApplied: 0,
        blockedPending: 0,
        technicalPending: 0,
        mediumSuggested: 0,
        mediumAutoApplied: 0,
        manualOverrides: 0,
        networkConfirmed: 0,
        criticalOverrides: 0,
        autoDeepApplied: 0
      }
    },
    workingDiff: null,
    updatedAt: "2026-02-27T00:00:00.000Z"
  };
}

describe("merge draft validation", () => {
  it("accepts valid draft", () => {
    const draft = validDraft();
    expect(validateMergeDraftSnapshot(draft)).toBe(true);
    const sanitized = sanitizeMergeDraftSnapshot(draft);
    expect(sanitized?.contextId).toBe("ctx:test");
    expect(sanitized?.step).toBe("inbox");
  });

  it("rejects incomplete draft", () => {
    const draft = {
      contextId: "ctx:test",
      step: "inbox",
      session: {},
      workingDiff: null,
      updatedAt: "2026-02-27T00:00:00.000Z"
    };
    expect(validateMergeDraftSnapshot(draft)).toBe(false);
    expect(sanitizeMergeDraftSnapshot(draft)).toBeNull();
  });

  it("sanitizes invalid step to strategy", () => {
    const draft = {
      ...validDraft(),
      step: "broken" as any
    };
    const sanitized = sanitizeMergeDraftSnapshot(draft);
    expect(sanitized?.step).toBe("strategy");
  });
});
