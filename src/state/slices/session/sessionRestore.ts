import { SESSION_SNAPSHOT_SCHEMA_VERSION, SessionService } from "@/io/sessionService";
import { ensureExpanded } from "@/state/helpers/graphHelpers";
import { GenraphGraph } from "@/core/genraph";
import { sanitizeMergeDraftSnapshot } from "@/core/edit/mergeDraftValidation";
import { normalizeKindraConfig } from "@/core/kindra/kindraConfig";
import { projectGraphDocument } from "@/core/read-model/selectors";
import type { SessionSlice } from "@/state/types";
import type { ActiveOverlay, SessionSnapshot, ViewConfig } from "@/types/domain";
import type { GraphDocument } from "@/core/read-model/types";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import { createDefaultViewConfig, normalizeVisualConfig } from "@/state/workspaceDefaults";
import { buildAutosessionSnapshot, hasActiveSessionState } from "./sessionSnapshot";
import type { SessionGet, SessionSet } from "./shared";

function applyCleanReadyState(set: SessionSet) {
  set({ restoreAvailable: false, restoreNoticeVisible: false, isRestoring: false, bootStatus: "ready" });
}

export function normalizeTimelineOverlay(overlay: ActiveOverlay): ActiveOverlay {
  if (overlay.type !== "timeline") return overlay;
  const config = overlay.config || {};
  const year = typeof config.year === "number" ? config.year : config.currentYear;
  return {
    ...overlay,
    config: {
      ...config,
      year,
      currentYear: undefined,
    },
  };
}

export function normalizeRestoredViewConfig(viewConfig: unknown, document: GraphDocument | null): ViewConfig | null {
  if (!viewConfig || typeof viewConfig !== "object") {
    const firstPersonId = Object.keys(document?.persons || {})[0] || "";
    return createDefaultViewConfig(firstPersonId);
  }

  const firstPersonId = Object.keys(document?.persons || {})[0] || "";
  const defaults = createDefaultViewConfig(firstPersonId);
  const nextViewConfig = viewConfig as Record<string, any>;
  const legacyIncludeSpouses = nextViewConfig.include?.spouses;
  const overlays = Array.isArray(nextViewConfig?.kindra?.overlays)
    ? nextViewConfig.kindra.overlays.map((overlay: ActiveOverlay) => normalizeTimelineOverlay(overlay))
    : [];
  const rightStack = nextViewConfig.rightStack || {};
  const detailsMode =
    rightStack.detailsMode ||
    (typeof rightStack.detailsExpanded === "boolean" ? (rightStack.detailsExpanded ? "expanded" : "compact") : undefined) ||
    defaults.rightStack?.detailsMode;
  const timelineMode =
    rightStack.timelineMode ||
    (typeof rightStack.timelineExpanded === "boolean" ? (rightStack.timelineExpanded ? "expanded" : "compact") : undefined) ||
    defaults.rightStack?.timelineMode;

  return {
    ...defaults,
    ...nextViewConfig,
    focusPersonId: nextViewConfig.focusPersonId || firstPersonId || null,
    homePersonId: nextViewConfig.homePersonId || firstPersonId || "",
    depth: {
      ...defaults.depth,
      ...(nextViewConfig.depth || {}),
    },
    showSpouses:
      typeof nextViewConfig.showSpouses === "boolean"
        ? nextViewConfig.showSpouses
        : typeof legacyIncludeSpouses === "boolean"
          ? legacyIncludeSpouses
          : defaults.showSpouses,
    shellPanels: { ...defaults.shellPanels, ...(nextViewConfig.shellPanels || {}) },
    leftSections: { ...defaults.leftSections, ...(nextViewConfig.leftSections || {}) },
    timeline: { ...defaults.timeline, ...(nextViewConfig.timeline || {}) },
    rightStack: {
      ...defaults.rightStack,
      ...rightStack,
      detailsMode,
      timelineMode,
      detailsAutoCompactedByTimeline: !!rightStack.detailsAutoCompactedByTimeline,
    },
    kindra: {
      ...normalizeKindraConfig(nextViewConfig.kindra),
      overlays,
    },
  };
}

export function applyRestoredSnapshot(
  set: SessionSet,
  get: SessionGet,
  restored: SessionSnapshot,
  showNotice: boolean,
): void {
  const restoredGraph = restored.graph ? GenraphGraph.fromData(restored.graph.data, restored.graph.journal) : null;
  if ((restored.schemaVersion ?? 0) < SESSION_SNAPSHOT_SCHEMA_VERSION && !restoredGraph) {
    applyCleanReadyState(set);
    return;
  }
  const projectedDoc = projectGraphDocument(restoredGraph);
  const normalizedViewConfig = normalizeRestoredViewConfig(restored.viewConfig, projectedDoc);
  const selectedPersonId = normalizedViewConfig?.focusPersonId || Object.keys(projectedDoc?.persons || {})[0] || null;
  const mergeDraft = sanitizeMergeDraftSnapshot(restored.mergeDraft) ?? null;
  get().loadGraph({ graph: restoredGraph, source: "session" });
  set({
    viewConfig: normalizedViewConfig,
    visualConfig: normalizeVisualConfig(restored.visualConfig),
    expandedGraph: ensureExpanded(projectedDoc, normalizedViewConfig),
    selectedPersonId,
    focusHistory: restored.focusHistory || [],
    focusIndex: restored.focusIndex ?? -1,
    recentFiles: restored.recentFiles || [],
    recentPayloads: restored.recentPayloads || {},
    mergeDraft,
    aiSettings: normalizeRestoredAiSettings(restored.aiSettings),
    restoreAvailable: false,
    restoreNoticeVisible: showNotice,
    isRestoring: false,
    bootStatus: "ready",
  });
}

function normalizeRestoredAiSettings(incoming: unknown) {
  const defaults = createDefaultAiSettings();
  if (!incoming || typeof incoming !== "object") return defaults;
  const patch = incoming as Record<string, any>;
  return {
    ...defaults,
    ...patch,
    providerModels: {
      ...defaults.providerModels,
      ...(patch.providerModels || {}),
    },
    useCaseModels: {
      ...defaults.useCaseModels,
      ...(patch.useCaseModels || {}),
    },
    birthRefinementLevelModels: {
      ...defaults.birthRefinementLevelModels,
      ...(patch.birthRefinementLevelModels || {}),
    },
    birthRefinementIncludeNotesByLevel: {
      ...defaults.birthRefinementIncludeNotesByLevel,
      ...(patch.birthRefinementIncludeNotesByLevel || {}),
    },
    birthRefinementNotesScopeByLevel: {
      ...defaults.birthRefinementNotesScopeByLevel,
      ...(patch.birthRefinementNotesScopeByLevel || {}),
    },
    birthEstimatorVersion: "v2" as const,
  };
}

export function createSessionPersistenceActions(
  set: SessionSet,
  get: SessionGet,
): Pick<
  SessionSlice,
  "saveAutosessionNow" | "bootstrapSession" | "checkRestoreAvailability" | "restoreSession" | "clearSession" | "dismissRestoreNotice"
> {
  return {
    saveAutosessionNow: async () => {
      const state = get();
      const activeState = hasActiveSessionState(state);
      if (state.isRestoring && !activeState) return;
      if (state.isRestoring && activeState) {
        set({ isRestoring: false });
      }
      await SessionService.saveAutosession(buildAutosessionSnapshot(get()));
    },

    bootstrapSession: async () => {
      try {
        set({ bootStatus: "checking", isRestoring: true });
        const restored = await SessionService.restoreAutosession();
        if (!restored) {
          applyCleanReadyState(set);
          return;
        }
        set({ bootStatus: "restoring" });
        applyRestoredSnapshot(set, get, restored, true);
      } catch (error) {
        console.warn("[sessionSlice] bootstrapSession failed; starting clean", error);
        applyCleanReadyState(set);
      }
    },

    checkRestoreAvailability: async () => {
      const restored = await SessionService.restoreAutosession();
      const hasSession = !!restored;
      set({ restoreAvailable: hasSession });
      if (!hasSession) set({ isRestoring: false });
    },

    restoreSession: async () => {
      try {
        const restored = await SessionService.restoreAutosession();
        if (!restored) {
          set({ restoreAvailable: false, restoreNoticeVisible: false });
          return;
        }
        applyRestoredSnapshot(set, get, restored, false);
      } catch (error) {
        console.warn("[sessionSlice] restoreSession failed; clearing restore state", error);
        set({ restoreAvailable: false, restoreNoticeVisible: false });
      } finally {
        set({ isRestoring: false, bootStatus: "ready" });
      }
    },

    clearSession: async () => {
      await SessionService.clearAutosession();
      applyCleanReadyState(set);
    },

    dismissRestoreNotice: () => set({ restoreNoticeVisible: false }),
  };
}
