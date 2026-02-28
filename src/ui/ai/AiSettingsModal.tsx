import { useEffect, useState } from "react";
import { aiClearCredentials, aiGetCredentialsStatus, aiListModels, aiSaveCredentials, aiValidateCredentials } from "@/services/aiRuntime";
import type { AiCredentialStatus, AiModelCatalogEntry, AiProvider, AiSettings, AiUseCase } from "@/types/ai";

type Props = {
  open: boolean;
  settings: AiSettings;
  onSave: (next: AiSettings) => void;
  onClose: () => void;
  onStatus: (message: string) => void;
};

type CatalogRefreshState = "idle" | "loading" | "ok" | "error" | "missing_key";

type ProviderCatalogStatus = {
  state: CatalogRefreshState;
  message: string;
  statusCode?: number;
};

// --- Sub-component for Status Messages ---

function AiStatusItem({ message, state }: { message: string, state: CatalogRefreshState | "credential" }) {
  const [expanded, setExpanded] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message);
  };

  return (
    <div
      className={`ai-status-item ${state} ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="ai-status-item-header">
        <span className="ai-status-text">{message}</span>
        <div className="ai-status-actions">
          <button className="icon-btn" onClick={handleCopy} title="Copiar texto">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          {message.length > 60 && (
            <span className="expand-hint">{expanded ? "Ver menos" : "Ver mÃ¡s"}</span>
          )}
        </div>
      </div>
      {expanded && (
        <div className="ai-status-full-content">
          <code>{message}</code>
        </div>
      )}
    </div>
  );
}

const AI_STATUS_STYLE = `
  .ai-status-item {
    background: var(--bg-btn);
    border: 1px solid var(--line);
    border-radius: var(--gs-radius-sm);
    padding: 8px 12px;
    margin-bottom: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    color: var(--gs-ink-secondary);
  }
  .ai-status-item:hover {
    background: var(--bg-btn-hover);
    border-color: var(--gs-ink-muted);
    color: var(--gs-ink-primary);
  }
  .ai-status-item.error {
    border-left: 4px solid var(--gs-error);
    background: rgba(239, 68, 68, 0.08);
  }
  .ai-status-item.missing_key {
    border-left: 4px solid var(--tree-warning);
    background: rgba(245, 158, 11, 0.08);
  }
  .ai-status-item.ok {
    border-left: 4px solid var(--gs-success);
    background: rgba(20, 184, 166, 0.05);
  }
  .ai-status-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .ai-status-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }
  .ai-status-item.expanded .ai-status-text {
    white-space: normal;
    overflow: visible;
  }
  .ai-status-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .ai-status-item .icon-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--line-soft);
    padding: 5px;
    color: var(--gs-ink-muted);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  .ai-status-item .icon-btn:hover {
    background: var(--gs-accent-gold-soft);
    color: var(--gs-accent-gold);
    border-color: var(--gs-accent-gold);
  }
  .ai-status-full-content {
    margin-top: 12px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    border: 1px solid var(--line-soft);
    font-family: var(--gs-font-mono);
    font-size: 11.5px;
    word-break: break-all;
    max-height: 250px;
    overflow-y: auto;
    color: var(--gs-ink-secondary);
    line-height: 1.4;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
  }
  .expand-hint {
    font-size: 10px;
    color: var(--gs-accent-gold);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  /* Select Dropdown Fix for Dark Mode */
  select {
    background-color: #1e293b !important; /* Force solid dark background */
    color: #f8fafc !important;
    border: 1px solid var(--line) !important;
    cursor: pointer;
    color-scheme: dark;
    width: 100%;
    padding: 8px;
    border-radius: 6px;
  }
  option {
    background-color: #1e293b;
    color: #f8fafc;
    padding: 8px;
  }

  .ai-settings-modal {
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    width: 600px;
    max-width: 95vw;
  }

  .ai-settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    scrollbar-width: thin;
    scrollbar-color: var(--gs-accent-gold-soft) transparent;
  }

  .ai-settings-content::-webkit-scrollbar {
    width: 6px;
  }
  .ai-settings-content::-webkit-scrollbar-thumb {
    background-color: var(--gs-accent-gold-soft);
    border-radius: 10px;
  }

  .settings-section-title {
    margin: 0 0 16px 0;
    font-size: 0.95rem;
    color: var(--gs-accent-gold);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .use-case-card {
    margin-bottom: 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--line-soft);
    padding: 16px;
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .use-case-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: var(--gs-accent-gold-soft);
  }

  .use-case-header {
    margin-bottom: 12px;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--gs-ink-secondary);
  }

  .ai-settings-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
  }

  .ai-settings-actions button {
    font-size: 12px;
    padding: 8px;
  }
`;

function defaultCredentialStatus(): AiCredentialStatus {
  return {
    hasOpenAiKey: false,
    hasGeminiKey: false
  };
}

function defaultCatalogStatus(): Record<AiProvider, ProviderCatalogStatus> {
  return {
    chatgpt: { state: "idle", message: "CatÃ¡logo local activo." },
    gemini: { state: "idle", message: "CatÃ¡logo local activo." }
  };
}

function statusCodeFromMessage(message: string): number | undefined {
  const match = message.match(/HTTP_(\d{3})/);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function providerLabel(provider: AiProvider): string {
  return provider === "chatgpt" ? "OpenAI" : "Gemini";
}

function chooseProviderModel(
  catalog: AiModelCatalogEntry[],
  currentModel: string
): string {
  if (catalog.some((entry) => entry.id === currentModel)) return currentModel;
  const recommended = catalog.find((entry) => entry.recommended)?.id;
  if (recommended) return recommended;
  return catalog[0]?.id ?? currentModel;
}

function mergeCatalogIntoDraft(
  previous: AiSettings,
  provider: AiProvider,
  incoming: AiModelCatalogEntry[],
  forceRecommended = false
): AiSettings {
  if (incoming.length === 0) return previous;
  const pickedModel = forceRecommended
    ? (incoming.find((entry) => entry.recommended)?.id ?? incoming[0]?.id ?? previous.providerModels[provider])
    : chooseProviderModel(incoming, previous.providerModels[provider]);
  const nextCatalog = {
    ...previous.modelCatalog,
    [provider]: incoming
  };
  return {
    ...previous,
    modelCatalog: nextCatalog,
    providerModels: {
      ...previous.providerModels,
      [provider]: pickedModel
    }
  };
}

function formatModelLabel(model: AiModelCatalogEntry, provider?: AiProvider): string {
  const badges: string[] = [];
  if (model.recommended) badges.push("Rec.");
  if (model.isPreview) badges.push("Pre.");

  const providerPrefix = provider === "chatgpt" ? "OpenAI" : (provider === "gemini" ? "Gemini" : "");
  let label = providerPrefix ? `${providerPrefix}: ${model.label}` : model.label;

  if (model.intelligence) {
    const stars = "★".repeat(model.intelligence);
    label += ` ${stars}`;
  }

  if (model.isReasoning) label += " 🧠";

  if (badges.length === 0) return label;
  return `${label} (${badges.join(", ")})`;
}

export function AiSettingsModal({ open, settings, onSave, onClose, onStatus }: Props) {
  const [draft, setDraft] = useState<AiSettings>(settings);
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [credentialStatus, setCredentialStatus] = useState<AiCredentialStatus>(defaultCredentialStatus());
  const [busy, setBusy] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [catalogStatus, setCatalogStatus] = useState<Record<AiProvider, ProviderCatalogStatus>>(defaultCatalogStatus());


  async function refreshProviderCatalog(provider: AiProvider, hasKey: boolean): Promise<void> {
    if (!hasKey) {
      setCatalogStatus((prev) => ({
        ...prev,
        [provider]: {
          state: "missing_key",
          message: `${providerLabel(provider)}: listado en vivo requiere API key.`
        }
      }));
      return;
    }

    setCatalogStatus((prev) => ({
      ...prev,
      [provider]: {
        state: "loading",
        message: `${providerLabel(provider)}: actualizando catÃ¡logo...`
      }
    }));

    const priorStatus = catalogStatus[provider];
    try {
      const response = await aiListModels({ provider });
      const forceRecommendedOnRefresh =
        provider === "gemini" &&
        priorStatus.state === "error" &&
        priorStatus.statusCode === 429;
      setDraft((prev) => mergeCatalogIntoDraft(prev, provider, response.models, forceRecommendedOnRefresh));
      setCatalogStatus((prev) => ({
        ...prev,
        [provider]: {
          state: "ok",
          message: `${providerLabel(provider)}: OK (${response.models.length} modelos)`
        }
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const statusCode = statusCodeFromMessage(message);
      setCatalogStatus((prev) => ({
        ...prev,
        [provider]: {
          state: "error",
          statusCode,
          message: `${providerLabel(provider)}: Error ${statusCode ?? "n/a"}`
        }
      }));
      onStatus(`No se pudo listar modelos ${providerLabel(provider)}: ${message}`);
    }
  }

  async function refreshModelCatalogs(status: AiCredentialStatus): Promise<void> {
    setRefreshingModels(true);
    try {
      await Promise.allSettled([
        refreshProviderCatalog("chatgpt", status.hasOpenAiKey),
        refreshProviderCatalog("gemini", status.hasGeminiKey)
      ]);
    } finally {
      setRefreshingModels(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDraft(settings);
    setOpenaiKey("");
    setGeminiKey("");
    setCatalogStatus(defaultCatalogStatus());

    void (async () => {
      try {
        const status = await aiGetCredentialsStatus();
        if (cancelled) return;
        setCredentialStatus(status);
        await refreshModelCatalogs(status);
      } catch (error) {
        if (cancelled) return;
        onStatus(`No se pudo consultar estado de credenciales: ${error instanceof Error ? error.message : String(error)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, onStatus, settings]);

  if (!open) return null;

  async function handleSaveCredentials() {
    setBusy(true);
    try {
      const status = await aiSaveCredentials({
        openaiApiKey: openaiKey || undefined,
        geminiApiKey: geminiKey || undefined
      });
      setCredentialStatus(status);
      onStatus("Credenciales IA guardadas.");
      setOpenaiKey("");
      setGeminiKey("");
      await refreshModelCatalogs(status);
    } catch (error) {
      onStatus(`No se pudieron guardar credenciales: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleClearCredentials() {
    setBusy(true);
    try {
      const status = await aiClearCredentials();
      setCredentialStatus(status);
      setCatalogStatus({
        chatgpt: {
          state: "missing_key",
          message: "OpenAI: listado en vivo requiere API key."
        },
        gemini: {
          state: "missing_key",
          message: "Gemini: listado en vivo requiere API key."
        }
      });
      onStatus("Credenciales IA limpiadas.");
    } catch (error) {
      onStatus(`No se pudieron limpiar credenciales: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleValidate(provider: AiProvider) {
    setBusy(true);
    try {
      const response = await aiValidateCredentials({
        provider,
        model: draft.providerModels[provider]
      });
      onStatus(`${provider}: ${response.message}`);
    } catch (error) {
      onStatus(`ValidaciÃ³n fallida (${provider}): ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRefreshModels() {
    await refreshModelCatalogs(credentialStatus);
  }

  function handleSaveSettings() {
    onSave(draft);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel ai-settings-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>ConfiguraciÃ³n IA</h3>
          <button onClick={onClose}>Cerrar</button>
        </div>

        <div className="ai-settings-content">
          <div className="builder">
            <h4 className="settings-section-title">Parámetros Globales</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={draft.deterministicMode}
                  onChange={(event) => setDraft((prev) => ({ ...prev, deterministicMode: event.target.checked }))}
                />
                Modo determinista
              </label>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={draft.fallbackEnabled}
                  onChange={(event) => setDraft((prev) => ({ ...prev, fallbackEnabled: event.target.checked }))}
                />
                Fallback automático
              </label>

            </div>

            <div className="settings-section" style={{ marginTop: 24 }}>
              <h4 className="settings-section-title">Modelos por Caso de Uso</h4>

              {draft.useCaseModels && (["extraction", "resolution", "narration"] as AiUseCase[]).map((useCase) => (
                <div key={useCase} className="use-case-card">
                  <div className="use-case-header">
                  {useCase === "extraction" ? "1. Extracción (Parsing)" : useCase === "resolution" ? "2. Resolución (sin uso en V4)" : "3. Asistencia (Narration)"}
                </div>
                  <label style={{ margin: 0 }}>
                    <select
                      value={`${draft.useCaseModels[useCase].provider}:${draft.useCaseModels[useCase].model}`}
                      onChange={(e) => {
                        const [provider, model] = e.target.value.split(":") as [AiProvider, string];
                        setDraft(prev => ({
                          ...prev,
                          useCaseModels: {
                            ...prev.useCaseModels,
                            [useCase]: { provider, model }
                          }
                        }));
                      }}
                    >
                      <optgroup label="OpenAI">
                        {draft.modelCatalog.chatgpt.map((model) => (
                          <option key={`chatgpt:${model.id}`} value={`chatgpt:${model.id}`}>
                            {formatModelLabel(model, "chatgpt")}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Google Gemini">
                        {draft.modelCatalog.gemini.map((model) => (
                          <option key={`gemini:${model.id}`} value={`gemini:${model.id}`}>
                            {formatModelLabel(model, "gemini")}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="builder" style={{ marginTop: 24, borderTop: "1px solid var(--line-soft)", paddingTop: 24 }}>
            <h4 className="settings-section-title">Conectividad y Credenciales</h4>
            <style>{AI_STATUS_STYLE}</style>

            <div className="ai-status-container" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '11px', color: 'var(--gs-ink-muted)' }}>
                <span>OpenAI: <b style={{ color: credentialStatus.hasOpenAiKey ? 'var(--gs-success)' : 'inherit' }}>{credentialStatus.hasOpenAiKey ? "Configurada" : "No configurada"}</b></span>
                <span>Gemini: <b style={{ color: credentialStatus.hasGeminiKey ? 'var(--gs-success)' : 'inherit' }}>{credentialStatus.hasGeminiKey ? "Configurada" : "No configurada"}</b></span>
              </div>

              <AiStatusItem state={catalogStatus.chatgpt.state === "idle" ? "credential" : catalogStatus.chatgpt.state} message={catalogStatus.chatgpt.message} />
              <AiStatusItem state={catalogStatus.gemini.state === "idle" ? "credential" : catalogStatus.gemini.state} message={catalogStatus.gemini.message} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                API Key ChatGPT
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(event) => setOpenaiKey(event.target.value)}
                  placeholder="sk-..."
                />
              </label>

              <label>
                API Key Gemini
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(event) => setGeminiKey(event.target.value)}
                  placeholder="AIza..."
                />
              </label>
            </div>

            <div className="ai-settings-actions">
              <button disabled={busy || refreshingModels} onClick={() => void handleRefreshModels()}>
                {refreshingModels ? "Actualizando..." : "Actualizar modelos"}
              </button>
              <button disabled={busy} onClick={() => void handleSaveCredentials()}>Guardar credenciales</button>
              <button disabled={busy} onClick={() => void handleValidate("chatgpt")}>Test ChatGPT</button>
              <button disabled={busy} onClick={() => void handleValidate("gemini")}>Test Gemini</button>
              <button className="danger" style={{ gridColumn: "span 2" }} disabled={busy} onClick={() => void handleClearCredentials()}>Limpiar credenciales</button>
            </div>
          </div>
        </div>

        <div className="builder-actions" style={{ padding: "16px 20px", borderTop: "1px solid var(--line-soft)" }}>
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={handleSaveSettings}>Guardar ajustes IA</button>
        </div>
      </div>
    </div>
  );
}

