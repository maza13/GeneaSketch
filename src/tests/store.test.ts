import { beforeEach, describe, expect, it, vi } from "vitest";
import { documentToGSchema, gschemaToDocument } from "@/core/gschema/GedcomBridge";
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

function loadDoc(doc: any) {
  const version = doc?.metadata?.gedVersion?.startsWith("7") ? "7.0.x" : "5.5.1";
  useAppStore.getState().loadGraph({ graph: documentToGSchema(doc, version).graph, source: "ged" });
}

function snapshotGraph(doc: any) {
  const version = doc?.metadata?.gedVersion?.startsWith("7") ? "7.0.x" : "5.5.1";
  const graph = documentToGSchema(doc, version).graph;
  return {
    data: graph.toData(),
    journal: [...graph.getJournal()]
  };
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
    gschemaGraph: null,
    viewConfig: null,
    expandedGraph: { nodes: [], edges: [] },
    selectedPersonId: null,
    focusHistory: [],
    focusIndex: -1,
    fitNonce: 0,
    restoreAvailable: false,
    isRestoring: false,
    parseErrors: [],
    parseWarnings: [],
    mergeDraft: null
  }));
});

describe("store explicit id actions", () => {
  it("updatePersonById updates the target person even when not selected", () => {
    const doc = buildDocWithTwoPersons();
    loadDoc(doc);

    expect(useAppStore.getState().selectedPersonId).toBe("@I1@");

    useAppStore.getState().updatePersonById("@I2@", { name: "Updated Anchor" });

    const state = useAppStore.getState();
    expect((state.gschemaGraph ? gschemaToDocument(state.gschemaGraph!) : undefined)?.persons["@I2@"].name).toBe("Updated Anchor");
    expect((state.gschemaGraph ? gschemaToDocument(state.gschemaGraph!) : undefined)?.persons["@I1@"].name).toBe("Root");
    expect(state.selectedPersonId).toBe("@I1@");
  });

  it("addRelationFromAnchor attaches relation to anchor id even if another person is selected", () => {
    const doc = buildDocWithTwoPersons();
    loadDoc(doc);

    expect(useAppStore.getState().selectedPersonId).toBe("@I1@");

    useAppStore.getState().addRelationFromAnchor("@I2@", "child", { name: "Child Of Anchor" });

    const state = useAppStore.getState();
    const newPersonId = state.selectedPersonId;
    expect(newPersonId).toBeDefined();
    expect(newPersonId).not.toBeNull();
    const created = (state.gschemaGraph ? gschemaToDocument(state.gschemaGraph!) : undefined)?.persons[newPersonId!];
    expect(created).toBeDefined();
    expect(created?.famc.length).toBe(1);

    const familyId = created?.famc[0] as string;
    const fam = (state.gschemaGraph ? gschemaToDocument(state.gschemaGraph!) : undefined)?.families[familyId];
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
      schemaVersion: 7,
      graph: snapshotGraph(doc),
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
    expect((useAppStore.getState().gschemaGraph ? gschemaToDocument(useAppStore.getState().gschemaGraph!) : undefined)?.persons["@I1@"].sex).toBe("U");
    expect((useAppStore.getState().gschemaGraph ? gschemaToDocument(useAppStore.getState().gschemaGraph!) : undefined)?.persons["@I1@"].lifeStatus).toBe("alive");
  });

  it("normalizes missing sex/lifeStatus to valid runtime values", async () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    const legacyDoc = structuredClone(doc) as any;
    if (legacyDoc?.persons?.["@I1@"]) {
      delete (legacyDoc.persons["@I1@"] as { sex?: string }).sex;
      delete (legacyDoc.persons["@I1@"] as { lifeStatus?: string }).lifeStatus;
    }

    restoreValue = {
      schemaVersion: 7,
      graph: snapshotGraph(legacyDoc),
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
    const restored = (useAppStore.getState().gschemaGraph ? gschemaToDocument(useAppStore.getState().gschemaGraph!) : undefined)?.persons["@I1@"];
    expect(["M", "F", "U"]).toContain(restored?.sex);
    expect(["alive", "deceased"]).toContain(restored?.lifeStatus);
  });

  it("normalizes legacy timeline overlays using currentYear into year", async () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;

    restoreValue = {
      schemaVersion: 7,
      graph: snapshotGraph(doc),
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
      schemaVersion: 7,
      graph: snapshotGraph(doc),
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
      schemaVersion: 7,
      graph: snapshotGraph(doc),
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

  it("backfills ai useCase birth_refinement when missing in legacy settings", async () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;

    restoreValue = {
      schemaVersion: 7,
      graph: snapshotGraph(doc),
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
        timeline: { scope: "visible", view: "list", scaleZoom: 1, scaleOffset: 0 }
      },
      focusHistory: ["@I1@"],
      focusIndex: 0,
      aiSettings: {
        useCaseModels: {
          extraction: { provider: "chatgpt", model: "gpt-5-nano" },
          resolution: { provider: "gemini", model: "gemini-2.5-flash" },
          narration: { provider: "chatgpt", model: "gpt-5-nano" }
        }
      } as any
    };

    await useAppStore.getState().restoreSession();
    expect(useAppStore.getState().aiSettings.useCaseModels.birth_refinement).toBeDefined();
    expect(useAppStore.getState().aiSettings.useCaseModels.birth_refinement.provider).toBe("chatgpt");
    expect(useAppStore.getState().aiSettings.birthEstimatorVersion).toBe("v2");
    expect(useAppStore.getState().aiSettings.birthRefinementLevelModels?.simple.model).toBe("gpt-5-nano");
    expect(useAppStore.getState().aiSettings.birthRefinementLevelModels?.balanced.model).toBe("gpt-5-nano");
    expect(useAppStore.getState().aiSettings.birthRefinementLevelModels?.complex.model).toBe("gpt-5-nano");
    expect(useAppStore.getState().aiSettings.birthRefinementIncludeNotesByLevel?.simple).toBe(false);
    expect(useAppStore.getState().aiSettings.birthRefinementIncludeNotesByLevel?.balanced).toBe(true);
    expect(useAppStore.getState().aiSettings.birthRefinementNotesScopeByLevel?.balanced).toBe("focus_only");
  });
});

describe("session autosave/restore robustness", () => {
  it("does not save autosession while restoring without active state", async () => {
    useAppStore.setState({ gschemaGraph: null, viewConfig: null, isRestoring: true });

    await useAppStore.getState().saveAutosessionNow();

    expect(vi.mocked(SessionService.saveAutosession)).not.toHaveBeenCalled();
    expect(useAppStore.getState().isRestoring).toBe(true);
  });

  it("unlocks restore gate and saves autosession when active state exists", async () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    loadDoc(doc);
    useAppStore.setState({ isRestoring: true });

    await useAppStore.getState().saveAutosessionNow();

    expect(vi.mocked(SessionService.saveAutosession)).toHaveBeenCalledOnce();
    expect(useAppStore.getState().isRestoring).toBe(false);
  });

  it("restoreSession releases lock and clears restore state when service throws", async () => {
    vi.mocked(SessionService.restoreAutosession).mockRejectedValueOnce(new Error("restore failed"));
    useAppStore.setState({ isRestoring: true, restoreAvailable: true });

    await useAppStore.getState().restoreSession();

    expect(useAppStore.getState().isRestoring).toBe(false);
    expect(useAppStore.getState().restoreAvailable).toBe(false);
  });
});

describe("timeline contract", () => {
  it("initializes left panel sections defaults in viewConfig", () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    loadDoc(doc);

    const sections = useAppStore.getState().viewConfig?.leftSections;
    expect(sections?.layersOpen).toBe(true);
    expect(sections?.treeConfigOpen).toBe(true);
    expect(sections?.canvasToolsOpen).toBe(false);
  });

  it("toggleLeftSection only changes target section", () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    loadDoc(doc);

    const before = useAppStore.getState().viewConfig?.leftSections;
    useAppStore.getState().toggleLeftSection("canvasTools");
    const after = useAppStore.getState().viewConfig?.leftSections;
    expect(after?.layersOpen).toBe(before?.layersOpen);
    expect(after?.treeConfigOpen).toBe(before?.treeConfigOpen);
    expect(after?.canvasToolsOpen).toBe(!before?.canvasToolsOpen);
  });

  it("setTimelineStatus persists canonical year config", () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    loadDoc(doc);

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
    loadDoc(doc);

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
    loadDoc(doc);

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
    loadDoc(doc);

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
    loadDoc(doc);

    const before = useAppStore.getState().viewConfig?.dtree?.overlays;
    useAppStore.getState().removeOverlay("missing-id");
    const after = useAppStore.getState().viewConfig?.dtree?.overlays;
    expect(after).toBe(before);
    expect(after).toEqual([]);
  });

  it("maps legacy rightStack booleans to mode-based rightStack on restore", async () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;

    restoreValue = {
      schemaVersion: 7,
      graph: snapshotGraph(doc),
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
        rightPanelView: "timeline",
        timelinePanelOpen: true,
        rightStack: {
          detailsExpanded: false,
          timelineExpanded: true
        } as unknown as any,
        timeline: {
          scope: "visible",
          view: "list",
          scaleZoom: 1,
          scaleOffset: 0
        }
      } as unknown as SessionSnapshot["viewConfig"],
      focusHistory: ["@I1@"],
      focusIndex: 0
    };

    await useAppStore.getState().restoreSession();
    const stack = useAppStore.getState().viewConfig?.rightStack;
    expect(stack?.detailsMode).toBe("compact");
    expect(stack?.timelineMode).toBe("expanded");
  });

  it("auto-compacts details when timeline opens and restores details when timeline closes", () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    loadDoc(doc);

    useAppStore.getState().setTimelinePanelOpen(true);
    let stack = useAppStore.getState().viewConfig?.rightStack;
    expect(stack?.detailsMode).toBe("compact");
    expect(stack?.timelineMode).toBe("expanded");
    expect(stack?.detailsAutoCompactedByTimeline).toBe(true);

    useAppStore.getState().setTimelineStatus(["@I1@"], [], 1995);
    expect(
      useAppStore
        .getState()
        .viewConfig?.dtree?.overlays.some((overlay) => overlay.type === "timeline")
    ).toBe(true);

    useAppStore.getState().setTimelinePanelOpen(false);
    stack = useAppStore.getState().viewConfig?.rightStack;
    expect(stack?.timelineMode).toBe("compact");
    expect(stack?.detailsMode).toBe("expanded");
    expect(stack?.detailsAutoCompactedByTimeline).toBe(false);
    expect(
      useAppStore
        .getState()
        .viewConfig?.dtree?.overlays.some((overlay) => overlay.type === "timeline")
    ).toBe(false);
  });

  it("clearVisualModes keeps focus/selection while clearing overlays and timeline", () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    doc.persons["@I2@"] = {
      id: "@I2@",
      name: "Second",
      sex: "U",
      lifeStatus: "alive",
      events: [],
      famc: [],
      fams: [],
      mediaRefs: [],
      sourceRefs: []
    };
    loadDoc(doc);
    useAppStore.getState().inspectPerson("@I2@");
    useAppStore.getState().setTimelinePanelOpen(true);
    useAppStore.getState().setTimelineStatus(["@I1@"], [], 1995);
    useAppStore.getState().setOverlay({
      id: "warnings",
      type: "layer",
      priority: 40,
      config: { layerId: "layer-warnings" }
    });
    useAppStore.getState().setFocusFamilyId("@F999@");

    const before = useAppStore.getState();
    useAppStore.getState().clearVisualModes();
    const after = useAppStore.getState();

    expect(after.selectedPersonId).toBe(before.selectedPersonId);
    expect(after.viewConfig?.focusPersonId).toBe(before.viewConfig?.focusPersonId);
    expect(after.viewConfig?.timelinePanelOpen).toBe(false);
    expect(after.viewConfig?.focusFamilyId).toBeNull();
    expect(after.viewConfig?.dtree?.overlays).toEqual([]);
  });

  it("clearVisualModes restores details to expanded when auto-compacted by timeline", () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    loadDoc(doc);
    useAppStore.getState().setTimelinePanelOpen(true);
    const stackBefore = useAppStore.getState().viewConfig?.rightStack;
    expect(stackBefore?.detailsMode).toBe("compact");
    expect(stackBefore?.detailsAutoCompactedByTimeline).toBe(true);

    useAppStore.getState().clearVisualModes();
    const stackAfter = useAppStore.getState().viewConfig?.rightStack;
    expect(stackAfter?.timelineMode).toBe("compact");
    expect(stackAfter?.detailsMode).toBe("expanded");
    expect(stackAfter?.detailsAutoCompactedByTimeline).toBe(false);
  });

  it("clearVisualModes is idempotent", () => {
    const doc = createNewTree();
    doc.persons["@I1@"].name = "Root";
    doc.persons["@I1@"].isPlaceholder = false;
    loadDoc(doc);

    useAppStore.getState().clearVisualModes();
    const firstRef = useAppStore.getState().viewConfig;
    useAppStore.getState().clearVisualModes();
    const secondRef = useAppStore.getState().viewConfig;
    expect(secondRef).toBe(firstRef);
  });
});


