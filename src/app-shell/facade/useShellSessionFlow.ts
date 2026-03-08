import { useEffect, useMemo, useRef } from "react";
import type { GenraphGraph } from "@/core/genraph";
import type { GraphDocument } from "@/core/read-model/types";
import { hasMeaningfulTree } from "@/hooks/useGskFile";
import { hasMeaningfulDocument } from "./facadeBuilders";

type BootStatus = "checking" | "restoring" | "ready";

type Params = {
  bootStatus: BootStatus;
  restoreNoticeVisible: boolean;
  document: GraphDocument | null;
  genraphGraph: GenraphGraph | null;
  bootstrapSession: () => Promise<void>;
  dismissRestoreNotice: () => void;
  clearSession: () => Promise<void>;
  createNewTreeDoc: () => void;
  setSelectedPerson: (personId: string | null) => void;
  fitToScreen: () => void;
  openPersonEditor: (personId: string) => void;
  setStatus: (status: string) => void;
};

export function useShellSessionFlow(params: Params) {
  const initializedRef = useRef(false);
  const hasActiveTree = useMemo(
    () => hasMeaningfulTree(params.genraphGraph) || hasMeaningfulDocument(params.document),
    [params.document, params.genraphGraph],
  );

  useEffect(() => {
    void params.bootstrapSession();
  }, [params.bootstrapSession]);

  useEffect(() => {
    if (params.bootStatus !== "ready" || initializedRef.current) return;
    if (params.document || params.genraphGraph) {
      initializedRef.current = true;
      return;
    }

    initializedRef.current = true;
    params.createNewTreeDoc();
    params.setSelectedPerson("@I1@");
    params.setStatus("Nueva sesion creada. Completa la persona central para empezar.");
    setTimeout(() => {
      params.fitToScreen();
      params.openPersonEditor("@I1@");
    }, 0);
  }, [
    params.bootStatus,
    params.createNewTreeDoc,
    params.document,
    params.fitToScreen,
    params.genraphGraph,
    params.openPersonEditor,
    params.setSelectedPerson,
    params.setStatus,
  ]);

  async function startFreshSession(): Promise<void> {
    const confirmDialog = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
    const shouldWarn = params.restoreNoticeVisible || hasActiveTree;

    if (shouldWarn) {
      const confirmed = confirmDialog?.(
        "Se eliminara la sesion actual/autosalvada y ya no podra restaurarse. Deseas iniciar una nueva sesion?",
      ) ?? false;
      if (!confirmed) {
        params.setStatus("Nueva sesion cancelada.");
        return;
      }
    }

    await params.clearSession();
    params.dismissRestoreNotice();
    params.createNewTreeDoc();
    params.setSelectedPerson("@I1@");
    params.setStatus("Nueva sesion creada. Completa la persona central para empezar.");
    setTimeout(() => {
      params.fitToScreen();
      params.openPersonEditor("@I1@");
    }, 0);
  }

  return {
    startFreshSession,
    restoreBanner: {
      visible: params.restoreNoticeVisible,
      message: "Sesion restaurada automaticamente.",
      onDismiss: params.dismissRestoreNotice,
      onStartFresh: startFreshSession,
    },
  };
}

