import { useMemo, useState } from "react";
import { useAppStore } from "@/state/store";
import { AiAssistantModal } from "@/ui/ai/AiAssistantModal";
import { AiSettingsModal } from "@/ui/ai/AiSettingsModal";
import type { AiInputContext } from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

export function App() {
  const {
    document,
    selectedPersonId,
    aiSettings,
    setAiSettings,
    applyDiagnosticDocument
  } = useAppStore();

  const [status, setStatus] = useState("Listo");
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [aiAssistantContext, setAiAssistantContext] = useState<AiInputContext | null>(null);

  const selectedLabel = useMemo(() => {
    if (!document || !selectedPersonId) return "Sin seleccion";
    const p = document.persons[selectedPersonId];
    if (!p) return selectedPersonId;
    return `${p.name || ""}${p.surname ? ` ${p.surname}` : ""}`.trim();
  }, [document, selectedPersonId]);

  function openGlobalAiAssistant() {
    if (!document) return;
    setAiAssistantContext({ kind: "global" });
    setShowAiAssistant(true);
  }

  function openLocalAiAssistant() {
    if (!document || !selectedPersonId) return;
    setAiAssistantContext({ kind: "local", anchorPersonId: selectedPersonId });
    setShowAiAssistant(true);
  }

  function applyAiBatch(nextDoc: GeneaDocument, summary: string) {
    applyDiagnosticDocument(nextDoc);
    setStatus(summary);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-color)", color: "var(--text-color)", padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>GeneaSketch</h1>
          <div style={{ opacity: 0.8, marginTop: 4 }}>Persona seleccionada: {selectedLabel}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={openGlobalAiAssistant}>Asistente IA global</button>
          <button onClick={openLocalAiAssistant} disabled={!selectedPersonId}>Asistente IA local</button>
          <button onClick={() => setShowAiSettings(true)}>Config IA</button>
        </div>
      </header>

      <section style={{ border: "1px solid var(--border-color-dim)", borderRadius: 10, padding: 14 }}>
        <strong>Estado:</strong> {status}
      </section>

      <AiAssistantModal
        open={showAiAssistant}
        context={aiAssistantContext}
        document={document}
        settings={aiSettings}
        onClose={() => setShowAiAssistant(false)}
        onStatus={setStatus}
        onApplyBatch={applyAiBatch}
        onOpenSettings={() => setShowAiSettings(true)}
      />

      <AiSettingsModal
        open={showAiSettings}
        settings={aiSettings}
        onSave={(next) => {
          setAiSettings(next);
          setStatus("Ajustes IA guardados.");
        }}
        onClose={() => setShowAiSettings(false)}
        onStatus={setStatus}
      />
    </div>
  );
}
