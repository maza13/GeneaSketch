import { useState, useCallback } from "react";
import type { GraphDocument } from "@/core/read-model/types";
import type { AiInputContext } from "@/types/ai";

export type AiAssistantParams = {
    document: GraphDocument | null;
    applyDiagnosticDocument: (doc: GraphDocument) => void;
    setStatus: (msg: string) => void;
};

export function useAiAssistant(p: AiAssistantParams) {
    const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
    const [showAiSettingsModal, setShowAiSettingsModal] = useState(false);
    const [aiContext, setAiContext] = useState<AiInputContext | null>(null);
    const [aiUndoSnapshot, setAiUndoSnapshot] = useState<GraphDocument | null>(null);

    const openGlobalAiAssistant = useCallback(() => {
        if (!p.document) return;
        setAiContext({ kind: "global" });
        setShowAiAssistantModal(true);
    }, [p.document]);

    const openLocalAiAssistant = useCallback((anchorPersonId: string) => {
        if (!p.document || !p.document.persons[anchorPersonId]) return;
        setAiContext({ kind: "local", anchorPersonId });
        setShowAiAssistantModal(true);
    }, [p.document]);

    const applyAiBatch = useCallback((nextDoc: GraphDocument, summary: string) => {
        if (p.document) setAiUndoSnapshot(structuredClone(p.document));
        p.applyDiagnosticDocument(nextDoc);
        p.setStatus(summary);
    }, [p.document, p.applyDiagnosticDocument, p.setStatus]);

    const undoAiBatch = useCallback(() => {
        if (!aiUndoSnapshot) return;
        p.applyDiagnosticDocument(aiUndoSnapshot);
        setAiUndoSnapshot(null);
        p.setStatus("Lote IA revertido.");
    }, [aiUndoSnapshot, p.applyDiagnosticDocument, p.setStatus]);

    return {
        showAiAssistantModal,
        setShowAiAssistantModal,
        showAiSettingsModal,
        setShowAiSettingsModal,
        aiContext,
        setAiContext,
        aiUndoSnapshot,
        openGlobalAiAssistant,
        openLocalAiAssistant,
        applyAiBatch,
        undoAiBatch
    };
}
