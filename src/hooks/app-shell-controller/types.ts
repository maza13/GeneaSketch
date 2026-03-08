import type { GraphDocument, GraphSource } from "@/core/read-model/types";
import type { ActiveOverlay, OverlayType, PendingRelationType, ViewConfig } from "@/types/domain";
import type { ColorThemeConfig } from "@/types/editor";

const THEME = {
  dark: { personNode: "#1e293b", text: "#f8fafc", edges: "#475569" },
  light: { personNode: "#ffffff", text: "#0f172a", edges: "#94a3b8" },
} as const;

export const DEFAULT_COLOR_THEME: ColorThemeConfig = {
  background: "transparent",
  personNode: THEME.dark.personNode,
  text: THEME.dark.text,
  edges: THEME.dark.edges,
  nodeFontSize: 18,
  edgeThickness: 2.5,
  nodeWidth: 210,
  nodeHeight: 92,
};

export const SHELL_THEME_PRESETS = THEME;

export type ThemeMode = "dark" | "light";
export type MenuLayout = "frequency" | "role" | "hybrid";
export type PickerState = {
  anchorId: string;
  type: PendingRelationType | "kinship";
};

export type AppShellControllerParams = {
  document: GraphDocument | null;
  viewConfig: ViewConfig | null;
  selectedPersonId: string | null;
  clearOverlayType: (type: OverlayType) => void;
  setOverlay: (overlay: ActiveOverlay) => void;
  inspectPerson: (personId: string) => void;
  setSelectedPerson: (personId: string) => void;
  fitToScreen: () => void;
  setStatus: (status: string) => void;
  applyProjectedDocument: (doc: GraphDocument, source: GraphSource) => void;
  toggleKindraNodeCollapse: (id: string) => void;
  setFocusFamilyId: (id: string | null) => void;
  openLocalAiAssistant: (id: string) => void;
};
