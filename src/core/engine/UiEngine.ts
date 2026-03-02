import type {
    VisualConfig,
    ViewConfig
} from "@/types/domain";
import type { AiSettings, AiModelCatalogEntry } from "@/types/ai";
import { createDefaultAiSettings } from "@/core/ai/defaults";

export const UiEngine = {
    createDefaultVisualConfig(): VisualConfig {
        return {
            nodePositions: {},
            gridEnabled: false,
            gridSize: 20,
            canonicalOverrides: {}
        };
    },

    createDefaultViewConfig(homePersonId: string = ""): ViewConfig {
        return {
            mode: "tree",
            preset: "family_origin",
            focusPersonId: homePersonId || null,
            focusFamilyId: null,
            homePersonId: homePersonId,
            rightPanelView: "details",
            timelinePanelOpen: false,
            showSpouses: true,
            depth: {
                ancestors: 3,
                descendants: 2,
                unclesGreatUncles: 0,
                siblingsNephews: 1,
                unclesCousins: 0
            },
            shellPanels: {
                leftCollapsed: false,
                rightCollapsed: false
            },
            leftSections: {
                layersOpen: true,
                treeConfigOpen: true,
                canvasToolsOpen: false
            },
            timeline: {
                scope: "visible",
                view: "list",
                scaleZoom: 1,
                scaleOffset: 0
            },
            dtree: {
                isVertical: true,
                layoutEngine: "vnext",
                collapsedNodeIds: [],
                overlays: []
            }
        };
    },

    normalizeVisualConfig(value: VisualConfig | null | undefined): VisualConfig {
        if (!value) return this.createDefaultVisualConfig();
        return {
            nodePositions: value.nodePositions || {},
            gridEnabled: !!value.gridEnabled,
            gridSize: value.gridSize || 20,
            canonicalOverrides: value.canonicalOverrides || {}
        };
    },

    normalizeAiSettings(prev: AiSettings, patch: Partial<AiSettings>): AiSettings {
        if (!prev) return createDefaultAiSettings();
        return {
            ...prev,
            ...patch
        };
    },

    chooseProviderModel(catalog: AiModelCatalogEntry[], current: string): string {
        const found = catalog.find(m => m.id === current);
        if (found) return current;
        return catalog[0]?.id || current;
    }
};
