import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { AppState } from "./types";
import { createDocSlice } from "./slices/docSlice";
import { createViewSlice } from "./slices/viewSlice";
import { createSessionSlice } from "./slices/sessionSlice";
import { createAiSlice } from "./slices/aiSlice";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import { UiEngine } from "@/core/engine/UiEngine";

export const useAppStore = create<AppState>()(
    devtools(
        (...a) => ({
            ...createDocSlice(...a),
            ...createViewSlice(...a),
            ...createSessionSlice(...a),
            ...createAiSlice(...a),
        }),
        { name: "GeneaSketchStore" }
    )
);

// Initialize some defaults that might not be in slices or need cross-slice coordination
useAppStore.setState({
    aiSettings: createDefaultAiSettings(),
    visualConfig: UiEngine.createDefaultVisualConfig()
});

// Re-export types for convenience
export * from "./types";
export { ensureExpanded } from "./helpers/graphHelpers";
