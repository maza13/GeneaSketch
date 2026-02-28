import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNewTree } from "@/core/edit/commands";
import { SessionService } from "@/io/sessionService";
import { useAppStore } from "@/state/store";
import type { MergeDraftSnapshot } from "@/types/merge-draft";
import type { SessionSnapshot } from "@/types/domain";

let restoreValue: SessionSnapshot | null = null;

function buildDocWithTwoPersons() {
  const doc = createNewTree();
  doc.persons["@I1@"].name = "Root";
  doc.persons["@I1@"].isPlaceholder = false;
  doc.persons["@I2@"] = {
    id: "@I2@",
    name: "Anchor",
    sex: "U",
    lifeStatus: "alive",
    events: [],
    famc: [],
    fams: [],
    mediaRefs: [],
    sourceRefs: []
  };
  return doc;
}

function buildValidMergeDraft(): MergeDraftSnapshot {
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
      draft: {
        contextId: "ctx:test",
        updatedAt: "2026-02-27T00:00:00.000Z"
      },
      cases: {
        "@X1@": {
          incomingId: "@X1@",
          baseId: "@B1@",
          riskLevel: "medium",
          priority: 100,
          status: "pending",
          hypothesesTopK: [
            {
              hypothesisType: "SamePerson",
              baseId: "@B1@",
              scoreFinal: 88,
              riskLevel: "medium",
              explain: {
                categoryPoints: { identity: 10, temporal: 10, geography: 8, familyNetwork: 12, documentStructure: 4 },
                subCategoryPoints: { familyParents: 4, familyUnions: 3, familyChildren: 3, familySiblings: 1, familyGrandparents: 1 },
                penalties: [],
                coverage: { comparableSignals: 5, availableSignals: 7, coverageRatio: 0.71, coveragePenalty: 5 },
                capsApplied: [],
                blockers: [],
                decisionReason: "ok",
                requiredActions: [{ kind: "merge_person", incomingId: "@X1@", baseId: "@B1@" }]
              }
            }
          ],
          selectedHypothesis: 0,
          requiredActionsPlanned: [{ kind: "merge_person", incomingId: "@X1@", baseId: "@B1@" }],
          requiredActionsApplied: [],
          needsTechnicalConflictReview: true,
          technicalConflictResolved: false,
          selectedCandidate: 0,
          candidates: [
            {
              baseId: "@B1@",
              score: 88,
              confidence: "high",
              riskLevel: "medium",
              blockers: [],
              signals: [],
              qualityFlags: [],
              hypothesesTopK: [
                {
                  hypothesisType: "SamePerson",
                  baseId: "@B1@",
                  scoreFinal: 88,
                  riskLevel: "medium",
                  explain: {
                    categoryPoints: { identity: 10, temporal: 10, geography: 8, familyNetwork: 12, documentStructure: 4 },
                    subCategoryPoints: { familyParents: 4, familyUnions: 3, familyChildren: 3, familySiblings: 1, familyGrandparents: 1 },
                    penalties: [],
                    coverage: { comparableSignals: 5, availableSignals: 7, coverageRatio: 0.71, coveragePenalty: 5 },
                    capsApplied: [],
                    blockers: [],
                    decisionReason: "ok",
                    requiredActions: [{ kind: "merge_person", incomingId: "@X1@", baseId: "@B1@" }]
                  }
                }
              ],
              chosenHypothesis: {
                hypothesisType: "SamePerson",
                baseId: "@B1@",
                scoreFinal: 88,
                riskLevel: "medium",
                explain: {
                  categoryPoints: { identity: 10, temporal: 10, geography: 8, familyNetwork: 12, documentStructure: 4 },
                  subCategoryPoints: { familyParents: 4, familyUnions: 3, familyChildren: 3, familySiblings: 1, familyGrandparents: 1 },
                  penalties: [],
                  coverage: { comparableSignals: 5, availableSignals: 7, coverageRatio: 0.71, coveragePenalty: 5 },
                  capsApplied: [],
                  blockers: [],
                  decisionReason: "ok",
                  requiredActions: [{ kind: "merge_person", incomingId: "@X1@", baseId: "@B1@" }]
                }
              },
              requiredActions: [{ kind: "merge_person", incomingId: "@X1@", baseId: "@B1@" }],
              explain: {
                categoryPoints: { identity: 10, temporal: 10, geography: 8, familyNetwork: 12, documentStructure: 4 },
                subCategoryPoints: { familyParents: 4, familyUnions: 3, familyChildren: 3, familySiblings: 1, familyGrandparents: 1 },
                penalties: [],
                coverage: { comparableSignals: 5, availableSignals: 7, coverageRatio: 0.71, coveragePenalty: 5 },
                capsApplied: [],
                blockers: [],
                decisionReason: "ok",
                requiredActions: [{ kind: "merge_person", incomingId: "@X1@", baseId: "@B1@" }]
              },
              source: "match-candidate"
            }
          ]
        }
      },
      orderedCaseIds: ["@X1@"],
      selectedCaseId: "@X1@",
      actionJournal: [],
      suggestedAutoMediumIds: ["@X1@"],
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
        mediumSuggested: 1,
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

beforeEach(() => {
  vi.restoreAllMocks();
  restoreValue = null;

  vi.spyOn(SessionService, "saveAutosession").mockResolvedValue();
  vi.spyOn(SessionService, "clearAutosession").mockResolvedValue();
  vi.spyOn(SessionService, "restoreAutosession").mockImplementation(async () => restoreValue);

  useAppStore.setState((s) => ({
    ...s,
    document: null,
    viewConfig: null,
    expandedGraph: { nodes: [], edges: [] },
    selectedPersonId: null,
    focusHistory: [],
    focusIndex: -1,
    fitNonce: 0,
    restoreAvailable: false,
    parseErrors: [],
    parseWarnings: [],
    mergeDraft: null
  }));
});

describe("store explicit id actions", () => {
  it("updatePersonById updates the target person even when not selected", () => {
    const doc = buildDocWithTwoPersons();
    useAppStore.getState().setDocument(doc);

    expect(useAppStore.getState().selectedPersonId).toBe("@I1@");

    useAppStore.getState().updatePersonById("@I2@", { name: "Updated Anchor" });

    const state = useAppStore.getState();
    expect(state.document?.persons["@I2@"].name).toBe("Updated Anchor");
    expect(state.document?.persons["@I1@"].name).toBe("Root");
    expect(state.selectedPersonId).toBe("@I1@");
  });

  it("addRelationFromAnchor attaches relation to anchor id even if another person is selected", () => {
    const doc = buildDocWithTwoPersons();
    useAppStore.getState().setDocument(doc);

    expect(useAppStore.getState().selectedPersonId).toBe("@I1@");

    useAppStore.getState().addRelationFromAnchor("@I2@", "child", { name: "Child Of Anchor" });

    const state = useAppStore.getState();
    const newPersonId = state.selectedPersonId;
    expect(newPersonId).toBe("@I3@");

    const created = state.document?.persons[newPersonId!];
    expect(created).toBeDefined();
    expect(created?.famc.length).toBe(1);

    const familyId = created?.famc[0] as string;
    const fam = state.document?.families[familyId];
    expect(fam?.husbandId).toBe("@I2@");
    expect(fam?.childrenIds.includes(newPersonId!)).toBe(true);
  });
});

describe("legacy restore normalization", () => {
  it("maps include.spouses to showSpouses and fills missing depth fields", async () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;

    restoreValue = {
      schemaVersion: 1,
      document: doc,
      viewConfig: {
        mode: "tree",
        preset: "hourglass",
        focusPersonId: "@I1@",
        focusFamilyId: null,
        homePersonId: "@I1@",
        depth: {
          ancestors: 2,
          descendants: 1,
          unclesGreatUncles: 0,
          siblingsNephews: 0,
          unclesCousins: 0
        },
        include: {
          spouses: false
        },
        rightPanelView: "details" as const,
        timeline: { scope: "visible" as const, view: "list" as const, scaleZoom: 1, scaleOffset: 0 }
      } as unknown as SessionSnapshot["viewConfig"],
      focusHistory: ["@I1@"],
      focusIndex: 0
    };

    await useAppStore.getState().restoreSession();

    const viewConfig = useAppStore.getState().viewConfig;
    expect(viewConfig).not.toBeNull();
    expect(viewConfig?.showSpouses).toBe(false);
    expect(viewConfig?.depth.unclesGreatUncles).toBe(0);
    expect(viewConfig?.depth.siblingsNephews).toBe(0);
    expect(viewConfig?.depth.unclesCousins).toBe(0);
    expect(useAppStore.getState().document?.persons["@I1@"].sex).toBe("U");
    expect(useAppStore.getState().document?.persons["@I1@"].lifeStatus).toBe("alive");
  });

  it("backfills missing sex/lifeStatus in legacy snapshots", async () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    const legacyDoc = structuredClone(doc) as unknown as SessionSnapshot["document"];
    if (legacyDoc?.persons?.["@I1@"]) {
      delete (legacyDoc.persons["@I1@"] as { sex?: string }).sex;
      delete (legacyDoc.persons["@I1@"] as { lifeStatus?: string }).lifeStatus;
    }

    restoreValue = {
      schemaVersion: 1,
      document: legacyDoc,
      viewConfig: {
        mode: "tree",
        preset: "hourglass",
        focusPersonId: "@I1@",
        focusFamilyId: null,
        homePersonId: "@I1@",
        depth: {
          ancestors: 2,
          descendants: 1,
          unclesGreatUncles: 0,
          siblingsNephews: 0,
          unclesCousins: 0
        },
        showSpouses: true,
        rightPanelView: "details",
        timeline: {
          scope: "visible",
          view: "list",
          scaleZoom: 1,
          scaleOffset: 0
        }
      },
      focusHistory: ["@I1@"],
      focusIndex: 0
    };

    await useAppStore.getState().restoreSession();
    expect(useAppStore.getState().document?.persons["@I1@"].sex).toBe("U");
    expect(useAppStore.getState().document?.persons["@I1@"].lifeStatus).toBe("alive");
  });

  it("normalizes legacy timeline overlays using currentYear into year", async () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;

    restoreValue = {
      schemaVersion: 1,
      document: doc,
      viewConfig: {
        mode: "tree",
        preset: "hourglass",
        focusPersonId: "@I1@",
        focusFamilyId: null,
        homePersonId: "@I1@",
        depth: {
          ancestors: 2,
          descendants: 1,
          unclesGreatUncles: 0,
          siblingsNephews: 0,
          unclesCousins: 0
        },
        showSpouses: true,
        rightPanelView: "details",
        timeline: {
          scope: "visible",
          view: "list",
          scaleZoom: 1,
          scaleOffset: 0
        },
        dtree: {
          isVertical: true,
          layoutEngine: "v2",
          collapsedNodeIds: [],
          overlays: [
            {
              id: "legacy-timeline",
              type: "timeline",
              priority: 100,
              config: {
                currentYear: 1988,
                livingIds: ["@I1@"],
                deceasedIds: []
              }
            }
          ]
        }
      } as unknown as SessionSnapshot["viewConfig"],
      focusHistory: ["@I1@"],
      focusIndex: 0
    };

    await useAppStore.getState().restoreSession();

    const timelineOverlay = useAppStore
      .getState()
      .viewConfig?.dtree?.overlays.find((overlay) => overlay.type === "timeline");
    expect(timelineOverlay).toBeDefined();
    expect(timelineOverlay?.config.year).toBe(1988);
    expect(timelineOverlay?.config.currentYear).toBeUndefined();
  });

  it("restores merge draft snapshot when present", async () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;

    restoreValue = {
      schemaVersion: 4,
      document: doc,
      viewConfig: {
        mode: "tree",
        preset: "hourglass",
        focusPersonId: "@I1@",
        focusFamilyId: null,
        homePersonId: "@I1@",
        depth: {
          ancestors: 2,
          descendants: 1,
          unclesGreatUncles: 0,
          siblingsNephews: 0,
          unclesCousins: 0
        },
        showSpouses: true,
        rightPanelView: "details",
        timeline: {
          scope: "visible",
          view: "list",
          scaleZoom: 1,
          scaleOffset: 0
        }
      },
      focusHistory: ["@I1@"],
      focusIndex: 0,
      mergeDraft: buildValidMergeDraft()
    };

    await useAppStore.getState().restoreSession();
    expect(useAppStore.getState().mergeDraft?.contextId).toBe("ctx:test");
    expect(useAppStore.getState().mergeDraft?.step).toBe("inbox");
  });

  it("drops invalid merge draft snapshot during restore", async () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;

    restoreValue = {
      schemaVersion: 4,
      document: doc,
      viewConfig: {
        mode: "tree",
        preset: "hourglass",
        focusPersonId: "@I1@",
        focusFamilyId: null,
        homePersonId: "@I1@",
        depth: {
          ancestors: 2,
          descendants: 1,
          unclesGreatUncles: 0,
          siblingsNephews: 0,
          unclesCousins: 0
        },
        showSpouses: true,
        rightPanelView: "details",
        timeline: {
          scope: "visible",
          view: "list",
          scaleZoom: 1,
          scaleOffset: 0
        }
      },
      focusHistory: ["@I1@"],
      focusIndex: 0,
      mergeDraft: {
        contextId: "ctx:test",
        step: "inbox",
        session: {} as any,
        workingDiff: null,
        updatedAt: "2026-02-27T00:00:00.000Z"
      } as any
    };

    await useAppStore.getState().restoreSession();
    expect(useAppStore.getState().mergeDraft).toBeNull();
  });
});

describe("timeline contract", () => {
  it("setTimelineStatus persists canonical year config", () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    useAppStore.getState().setDocument(doc);

    useAppStore.getState().setTimelineStatus(["@I1@"], [], 1995);

    const timelineOverlay = useAppStore
      .getState()
      .viewConfig?.dtree?.overlays.find((overlay) => overlay.type === "timeline");
    expect(timelineOverlay).toBeDefined();
    expect(timelineOverlay?.config.year).toBe(1995);
    expect(timelineOverlay?.config.currentYear).toBeUndefined();
    expect(timelineOverlay?.config.livingIds).toEqual(["@I1@"]);
  });

  it("setOverlay is no-op when overlay payload is unchanged", () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    useAppStore.getState().setDocument(doc);

    const overlay = {
      id: "merge-focus-review",
      type: "merge_focus" as const,
      priority: 95,
      config: { primaryIds: ["@I1@"], secondaryIds: [] as string[] }
    };

    useAppStore.getState().setOverlay(overlay);
    const firstRef = useAppStore.getState().viewConfig?.dtree?.overlays;
    useAppStore.getState().setOverlay(overlay);
    const secondRef = useAppStore.getState().viewConfig?.dtree?.overlays;

    expect(secondRef?.length).toBe(1);
    expect(secondRef).toBe(firstRef);
  });

  it("saveAutosessionNow excludes merge_focus from snapshot overlays", async () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    useAppStore.getState().setDocument(doc);

    useAppStore.getState().setOverlay({
      id: "merge-focus-review",
      type: "merge_focus",
      priority: 95,
      config: { primaryIds: ["@I1@"], secondaryIds: [] }
    });
    useAppStore.getState().setOverlay({
      id: "timeline-simulation",
      type: "timeline",
      priority: 100,
      config: { year: 1995, livingIds: ["@I1@"], deceasedIds: [] }
    });

    await useAppStore.getState().saveAutosessionNow();
    const calls = vi.mocked(SessionService.saveAutosession).mock.calls;
    const lastSnapshot = calls[calls.length - 1]?.[0] as SessionSnapshot | undefined;
    const overlayTypes = lastSnapshot?.viewConfig?.dtree?.overlays.map((overlay) => overlay.type) || [];
    expect(overlayTypes.includes("merge_focus")).toBe(false);
    expect(overlayTypes.includes("timeline")).toBe(true);
  });

  it("clearOverlayType is no-op when that type is not present", () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    useAppStore.getState().setDocument(doc);

    const before = useAppStore.getState().viewConfig?.dtree?.overlays;
    useAppStore.getState().clearOverlayType("merge_focus");
    const after = useAppStore.getState().viewConfig?.dtree?.overlays;
    expect(after).toBe(before);
    expect(after).toEqual([]);
  });

  it("removeOverlay is no-op when id does not exist", () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    useAppStore.getState().setDocument(doc);

    const before = useAppStore.getState().viewConfig?.dtree?.overlays;
    useAppStore.getState().removeOverlay("missing-id");
    const after = useAppStore.getState().viewConfig?.dtree?.overlays;
    expect(after).toBe(before);
    expect(after).toEqual([]);
  });
});
