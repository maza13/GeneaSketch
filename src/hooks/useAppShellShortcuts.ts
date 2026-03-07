import { useEffect, useRef } from "react";
import { createGlobalShortcutHandler, type ShortcutActions } from "@/utils/globalShortcuts";
import type { ColorThemeConfig } from "@/types/editor";
import type { GraphDocument } from "@/core/read-model/types";
import type { ViewConfig } from "@/types/domain";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

type AppShellShortcutParams = {
  colorTheme: ColorThemeConfig;
  document: GraphDocument | null;
  selectedPersonId: string | null;
  viewConfig: ViewConfig | null;
  saveGsk: (theme: ColorThemeConfig) => Promise<void>;
  openFilePicker: () => void;
  goBack: () => void;
  goForward: () => void;
  fitToScreen: () => void;
  focusPersonInCanvas: (personId: string) => void;
  onOpenAiSettings: () => void;
  toggleShellPanel: (side: "left" | "right") => void;
  setTimelinePanelOpen: (open: boolean) => void;
  onEscape: () => void;
  onFocusSearch: () => void;
};

export function useAppShellShortcuts(params: AppShellShortcutParams) {
  const shortcutActionsRef = useRef<ShortcutActions>({
    onEscape: () => {},
    focusSearch: () => {},
    save: () => {},
    open: () => {},
    goBack: () => {},
    goForward: () => {},
    fitToScreen: () => {},
    centerFocus: () => {},
    openAiSettings: () => {},
    toggleLeftPanel: () => {},
    toggleRightPanel: () => {},
    toggleTimelinePanel: () => {},
  });

  useEffect(() => {
    shortcutActionsRef.current = {
      onEscape: params.onEscape,
      focusSearch: params.onFocusSearch,
      save: () => params.saveGsk(params.colorTheme),
      open: params.openFilePicker,
      goBack: params.goBack,
      goForward: params.goForward,
      fitToScreen: params.fitToScreen,
      centerFocus: () => {
        const targetId = params.selectedPersonId || (params.document ? Object.keys(params.document.persons)[0] : null);
        if (targetId) params.focusPersonInCanvas(targetId);
      },
      openAiSettings: params.onOpenAiSettings,
      toggleLeftPanel: () => params.toggleShellPanel("left"),
      toggleRightPanel: () => params.toggleShellPanel("right"),
      toggleTimelinePanel: () => params.setTimelinePanelOpen(!(params.viewConfig?.timelinePanelOpen ?? false)),
    };
  }, [params]);

  useEffect(() => {
    const handler = createGlobalShortcutHandler(shortcutActionsRef, isTypingTarget);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
