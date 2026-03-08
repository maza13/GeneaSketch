import { useRef } from "react";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useAppShellController } from "@/hooks/useAppShellController";
import { useFileLoadRuntime } from "@/hooks/useFileLoadRuntime";
import { useGskFile } from "@/hooks/useGskFile";
import type { ShellFacadeRuntimeParams } from "./runtimeTypes";

export function useShellRuntimeRefsAndServices(params: Omit<ShellFacadeRuntimeParams, "recentFiles" | "leftCollapsed" | "rightCollapsed">) {
  const openFileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const clearMergeFocusOverlayRef = useRef<() => void>(() => {});
  const openLocalAiAssistantRef = useRef<(id: string) => void>(() => {});
  const setStatusRef = useRef<(status: string) => void>(() => {});
  const fileLoadRuntime = useFileLoadRuntime(() => clearMergeFocusOverlayRef.current());

  const shellController = useAppShellController({
    document: params.document,
    viewConfig: params.viewConfig,
    selectedPersonId: params.selectedPersonId,
    clearOverlayType: params.actions.clearOverlayType,
    setOverlay: params.actions.setOverlay,
    inspectPerson: params.actions.inspectPerson,
    setSelectedPerson: params.actions.setSelectedPerson,
    fitToScreen: params.actions.fitToScreen,
    setStatus: (status) => setStatusRef.current(status),
    applyProjectedDocument: params.actions.applyProjectedDocument,
    toggleKindraNodeCollapse: params.actions.toggleKindraNodeCollapse,
    setFocusFamilyId: params.actions.setFocusFamilyId,
    openLocalAiAssistant: (personId) => openLocalAiAssistantRef.current(personId),
  });

  const gsk = useGskFile(graphSvgRef, shellController.colorTheme, fileLoadRuntime);
  setStatusRef.current = gsk.setStatus;

  const ai = useAiAssistant({
    document: params.document,
    applyDocumentChange: (nextDoc, source) => params.actions.applyProjectedDocument(nextDoc, source),
    setStatus: gsk.setStatus,
  });

  openLocalAiAssistantRef.current = ai.openLocalAiAssistant;
  clearMergeFocusOverlayRef.current = shellController.clearMergeFocusOverlay;

  return {
    refs: {
      openFileInputRef,
      importFileInputRef,
      graphSvgRef,
    },
    shellController,
    fileLoadRuntime,
    gsk,
    ai,
  };
}
