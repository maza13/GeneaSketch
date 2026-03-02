import { useState, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  aiClearCredentials,
  aiGetCredentialsStatus,
  aiListModels,
  aiSaveCredentials,
  aiValidateCredentials
} from "@/services/aiRuntime";
import { AiUsageDashboard } from "./AiUsageDashboard";
import { createDefaultAiSettings, DEFAULT_CHATGPT_MODEL } from "@/core/ai/defaults";
import {
  AiBirthRefinementLevel,
  AiBirthRefinementNotesScope,
  AiCredentialStatus,
  AiModelCatalogEntry,
  AiProvider,
  AiSettings,
  AiUseCase,
} from "@/types/ai";
import { StandardModal, SectionCard, SectionSubtitle } from "../common/StandardModal";

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
            <span className="expand-hint">{expanded ? "Ver menos" : "Ver mas"}</span>
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
  
  .ai-actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-top: 4px;
  }
  .ai-actions-grid button {
    font-size: 12px;
    padding: 8px 12px;
  }
  .status-badge-container {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--bg-input);
    border: 1px solid var(--line-soft);
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-1);
  }
  .status-badge.ok { border-color: var(--gs-success); color: var(--gs-success); }
  .status-badge.missing { border-color: var(--gs-error); color: var(--gs-error); }
`;

function defaultCredentialStatus(): AiCredentialStatus {
  return {
    hasOpenAiKey: false,
    hasGeminiKey: false
  };
}

function defaultCatalogStatus(): Record<AiProvider, ProviderCatalogStatus> {
  return {
    chatgpt: { state: "idle", message: "Catalogo local activo." },
    gemini: { state: "idle", message: "Catalogo local activo." }
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

type HelpTarget = { targetId: string };

function ContextAnchorHelp({
  targetId,
  title,
  description,
  activeHelpTarget,
  onSetActiveHelp,
  children,
  className,
}: {
  targetId: string;
  title: string;
  description: string;
  activeHelpTarget: HelpTarget | null;
  onSetActiveHelp: (next: HelpTarget | null) => void;
  children: ReactNode;
  className?: string;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const open = activeHelpTarget?.targetId === targetId;

  useLayoutEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
    } else {
      setCoords(null);
    }
  }, [open]);

  return (
    <span
      ref={anchorRef}
      className={className || "context-help-anchor"}
      onMouseEnter={() => onSetActiveHelp({ targetId })}
      onMouseLeave={() => onSetActiveHelp(null)}
      onFocus={() => onSetActiveHelp(null)}
      onBlur={() => onSetActiveHelp(null)}
      onClick={() => onSetActiveHelp(open ? null : { targetId })}
      style={{ position: "relative", display: "inline-flex", cursor: "help" }}
    >
      {children}
      {open &&
        coords &&
        createPortal(
          <div
            className="gs-help-card portal-context-card"
            role="note"
            style={{
              position: "fixed",
              top: coords.top - 12,
              left: coords.left,
              zIndex: 99999,
              transform: "translateX(-50%) translateY(-100%)",
            }}
          >
            <strong>{title}</strong>
            <p>{description}</p>
          </div>,
          document.body
        )}
    </span>
  );
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

type TabType = "general" | "use_cases" | "credentials" | "stats";

export function AiSettingsModal({ open, settings, onSave, onClose, onStatus }: Props) {
  const [draft, setDraft] = useState<AiSettings>(settings);
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [credentialStatus, setCredentialStatus] = useState<AiCredentialStatus>(defaultCredentialStatus());
  const [busy, setBusy] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [catalogStatus, setCatalogStatus] = useState<Record<AiProvider, ProviderCatalogStatus>>(defaultCatalogStatus());
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [activeHelpTarget, setActiveHelpTarget] = useState<HelpTarget | null>(null);

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
        message: `${providerLabel(provider)}: actualizando catalogo...`
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

    // Merge incoming settings with defaults to ensure missing keys (from old configs) don't crash the UI
    setDraft({
      ...createDefaultAiSettings(),
      ...settings,
      useCaseModels: {
        ...createDefaultAiSettings().useCaseModels,
        ...(settings.useCaseModels || {})
      },
      // Ensure specific use cases like birthRefinementModel are also merged
      birthRefinementModel: settings.birthRefinementModel || createDefaultAiSettings().birthRefinementModel,
    });

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
  }, [open, settings, onStatus]);

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
      onStatus(`Validacion fallida (${provider}): ${error instanceof Error ? error.message : String(error)}`);
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

  const tabs = [
    { id: "general", label: "Ajustes", icon: "tune" },
    { id: "use_cases", label: "Modelos", icon: "auto_awesome_motion" },
    { id: "credentials", label: "Conexión", icon: "hub" },
    { id: "stats", label: "Uso", icon: "monitoring" },
  ];

  return (
    <StandardModal
      open={open}
      title="Configuración IA"
      onClose={onClose}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as TabType)}
      footer={
        <>
          <button className="secondary-ghost" onClick={onClose}>Cancelar</button>
          <button className="accent-solid" onClick={handleSaveSettings}>Guardar Cambios</button>
        </>
      }
    >
      <style>{AI_STATUS_STYLE}</style>

      {activeTab === "general" && (
        <>
          <SectionCard title="Modo del Motor" icon="psychology">
            <label className="toggle">
              <input
                type="checkbox"
                checked={draft.deterministicMode}
                onChange={(event) => setDraft((prev) => ({ ...prev, deterministicMode: event.target.checked }))}
              />
              <ContextAnchorHelp
                targetId="general:deterministic"
                title="Modo Determinista (Temperatura 0)"
                description="Obliga al motor a elegir siempre la palabra más probable. Es ideal para extraer fechas y nombres de forma estable, pero hace que las narraciones sean repetitivas y menos 'humanas'."
                activeHelpTarget={activeHelpTarget}
                onSetActiveHelp={setActiveHelpTarget}
              >
                Garantizar consistencia (Cálculo exacto)
              </ContextAnchorHelp>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={draft.fallbackEnabled}
                onChange={(event) => setDraft((prev) => ({ ...prev, fallbackEnabled: event.target.checked }))}
              />
              <ContextAnchorHelp
                targetId="general:fallback"
                title="Motor de Reserva (Fallback)"
                description="Si el proveedor principal (ej. OpenAI) devuelve un error por falta de saldo o caída del servidor, GeneaSketch reintentará la operación automáticamente usando el segundo proveedor (ej. Gemini) para no interrumpir tu trabajo."
                activeHelpTarget={activeHelpTarget}
                onSetActiveHelp={setActiveHelpTarget}
              >
                Alternancia inteligente entre proveedores en caso de error
              </ContextAnchorHelp>
            </label>
          </SectionCard>

          <SectionCard title="Arquitectura de Inferencia" icon="integration_instructions">
            <label>
              <ContextAnchorHelp
                targetId="general:preferred-api"
                title="Capa de Comunicación (OpenAI API)"
                description="'Responses' es el protocolo más reciente que permite recibir datos estructurados directamente del modelo, minimizando errores de formato GEDCOM. 'Chat' es el sistema clásico basado en texto libre."
                activeHelpTarget={activeHelpTarget}
                onSetActiveHelp={setActiveHelpTarget}
                className="gs-section-card-subtitle"
              >
                Infraestructura de Inferencia Preferida
              </ContextAnchorHelp>
              <select
                value={draft.openAiPreferredApi || "auto"}
                onChange={(e) => setDraft(prev => ({ ...prev, openAiPreferredApi: e.target.value as any }))}
              >
                <option value="auto">Auto (Priorizar Capa Moderna)</option>
                <option value="responses">Solo Responses (Nativo Estructurado)</option>
                <option value="chat_completions">Solo Chat (Legacy / Compatible)</option>
              </select>
            </label>
            <label style={{ marginTop: 4 }}>
              <ContextAnchorHelp
                targetId="general:estimator-version"
                title="Lógica de Estimación Cronológica"
                description="V2 utiliza un motor biomecánico que calcula intervalos de tiempo basados en la fertilidad y esperanza de vida histórica. Legacy usa una regla matemática fija de +/- 25 años por generación."
                activeHelpTarget={activeHelpTarget}
                onSetActiveHelp={setActiveHelpTarget}
                className="gs-section-card-subtitle"
              >
                Algoritmo de Cálculo de Fechas
              </ContextAnchorHelp>
              <select
                value={draft.birthEstimatorVersion || "v2"}
                onChange={(e) => setDraft(prev => ({ ...prev, birthEstimatorVersion: e.target.value as any }))}
              >
                <option value="v2">V2 (Fisiología Humana - Precisión Alta)</option>
                <option value="legacy">Legacy (Regla Estadística Simple)</option>
              </select>
            </label>
          </SectionCard>

          <SectionCard title="Diagnóstico" icon="bug_report">
            <label className="toggle">
              <input
                type="checkbox"
                checked={draft.developerBirthRefinementDebug}
                onChange={(e) => setDraft(prev => ({ ...prev, developerBirthRefinementDebug: e.target.checked }))}
              />
              <ContextAnchorHelp
                targetId="general:debug"
                title="Trazabilidad de Ejecución (Debug)"
                description="Habilita la impresión de 'tokens' y tiempos de respuesta en la consola. Solo recomendado si estás experimentando errores técnicos o quieres ver el 'razonamiento' interno de la IA."
                activeHelpTarget={activeHelpTarget}
                onSetActiveHelp={setActiveHelpTarget}
              >
                Visualizar logs de inferencia en tiempo real
              </ContextAnchorHelp>
            </label>
          </SectionCard>
        </>
      )}

      {activeTab === "use_cases" && (
        <>
          <SectionCard title="Motores por Caso de Uso" icon="architecture">
            {(["extraction", "narration"] as AiUseCase[]).map((useCase) => (
              <div key={useCase} style={{ marginBottom: 12 }}>
                <ContextAnchorHelp
                  targetId={`models:${useCase}`}
                  title={useCase === "extraction" ? "Especialista en Datos (Parsing)" : "Escritor Creativo (Narración)"}
                  description={useCase === "extraction"
                    ? "Modelo entrenado para leer manuscritos, actas y documentos antiguos para detectar nombres y fechas sin errores catastróficos."
                    : "Modelo con mayor vocabulario capaz de redactar biografías que suenan naturales, integrando el contexto histórico familiar."}
                  activeHelpTarget={activeHelpTarget}
                  onSetActiveHelp={setActiveHelpTarget}
                  className="gs-section-card-subtitle"
                >
                  {useCase === "extraction" ? "Extracción de registros (Parsing)" : "Generador Narrativo (Biografías)"}
                </ContextAnchorHelp>
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
                    {draft.modelCatalog.chatgpt.map((m) => (
                      <option key={`chat:${m.id}`} value={`chatgpt:${m.id}`}>
                        {m.label} ({m.price ?? "n/a"}/{m.priceOut ?? "n/a"})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Google Gemini">
                    {draft.modelCatalog.gemini.map((m) => (
                      <option key={`gem:${m.id}`} value={`gemini:${m.id}`}>
                        {m.label} ({m.price ?? "n/a"}/{m.priceOut ?? "n/a"})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            ))}
          </SectionCard>

          <SectionCard title="Estimación de Nacimiento" icon="calendar_month">
            {(["simple", "balanced", "complex"] as AiBirthRefinementLevel[]).map((level) => (
              <div key={`birth-level-${level}`} style={{ marginBottom: 16 }}>
                <ContextAnchorHelp
                  targetId={`models:birth:${level}`}
                  title={level === "simple" ? "Estrategia Simple" : level === "balanced" ? "Estrategia Balanceada" : "Estrategia Compleja"}
                  description={level === "simple"
                    ? "Uso mínimo de tokens; ideal para personas con pocos datos o ramas laterales poco conectadas."
                    : level === "balanced"
                      ? "Escanea 2 capas de familia y notas si están habilitadas. Mejor relación calidad/precio."
                      : "Análisis profundo de toda la familia conectada y notas extensas. Máxima confiabilidad para casos difíciles."}
                  activeHelpTarget={activeHelpTarget}
                  onSetActiveHelp={setActiveHelpTarget}
                  className="gs-section-card-subtitle"
                >
                  Modelo de Cálculo ({level === "simple" ? "Simple" : level === "balanced" ? "Balanceado" : "Complejo"})
                </ContextAnchorHelp>

                <select
                  value={`${draft.birthRefinementLevelModels?.[level]?.provider ?? 'chatgpt'}:${draft.birthRefinementLevelModels?.[level]?.model ?? DEFAULT_CHATGPT_MODEL}`}
                  onChange={(e) => {
                    const [provider, model] = e.target.value.split(":") as [AiProvider, string];
                    setDraft(prev => ({
                      ...prev,
                      birthRefinementLevelModels: {
                        ...(prev.birthRefinementLevelModels || {
                          simple: prev.birthRefinementModel,
                          balanced: prev.birthRefinementModel,
                          complex: prev.birthRefinementModel
                        }),
                        [level]: { provider, model }
                      }
                    }));
                  }}
                >
                  <optgroup label="OpenAI">
                    {draft.modelCatalog.chatgpt.map((m) => (
                      <option key={`br-${level}-chat:${m.id}`} value={`chatgpt:${m.id}`}>
                        {m.label} ({m.price ?? "n/a"}/{m.priceOut ?? "n/a"})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Google Gemini">
                    {draft.modelCatalog.gemini.map((m) => (
                      <option key={`br-${level}-gem:${m.id}`} value={`gemini:${m.id}`}>
                        {m.label} ({m.price ?? "n/a"}/{m.priceOut ?? "n/a"})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            ))}

            <SectionSubtitle>Política de Datos</SectionSubtitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={draft.birthRefinementIncludeNotes}
                  onChange={(e) => setDraft(prev => ({ ...prev, birthRefinementIncludeNotes: e.target.checked }))}
                />
                <ContextAnchorHelp
                  targetId="models:birth-notes"
                  title="Inclusión de Notas"
                  description="Permite que el modelo lea notas biográficas para encontrar pistas que ayuden a calcular la fecha de nacimiento."
                  activeHelpTarget={activeHelpTarget}
                  onSetActiveHelp={setActiveHelpTarget}
                >
                  Incluir notas biográficas en el contexto
                </ContextAnchorHelp>
              </label>

              {draft.birthRefinementIncludeNotes && (
                <div style={{ paddingLeft: 24 }}>
                  <SectionSubtitle>Alcance de Notas</SectionSubtitle>
                  <select
                    value={draft.birthRefinementNotesScope || 'focus_only'}
                    onChange={(e) => setDraft(prev => ({ ...prev, birthRefinementNotesScope: e.target.value as AiBirthRefinementNotesScope }))}
                  >
                    <option value="focus_only">Solo persona principal</option>
                    <option value="focus_parents_children">Persona + Padres + Hijos</option>
                  </select>
                </div>
              )}
            </div>
          </SectionCard>
        </>
      )}

      {activeTab === "credentials" && (
        <>
          <SectionCard title="Credenciales de API" icon="key">
            <div className="status-badge-container">
              <div className={`status-badge ${credentialStatus.hasOpenAiKey ? 'ok' : 'missing'}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {credentialStatus.hasOpenAiKey ? 'verified' : 'close'}
                </span>
                OpenAI Key
              </div>
              <div className={`status-badge ${credentialStatus.hasGeminiKey ? 'ok' : 'missing'}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {credentialStatus.hasGeminiKey ? 'verified' : 'close'}
                </span>
                Gemini Key
              </div>
            </div>

            <SectionSubtitle>Actualizar Claves</SectionSubtitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="password"
                placeholder="Nueva OpenAI API Key..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <input
                type="password"
                placeholder="Nueva Gemini API Key..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />
            </div>

            <div className="ai-actions-grid" style={{ marginTop: 12 }}>
              <button className="accent-solid" onClick={handleSaveCredentials} disabled={busy || (!openaiKey && !geminiKey)}>
                Actualizar Credenciales
              </button>
              <button className="secondary-ghost danger" onClick={handleClearCredentials} disabled={busy}>
                Borrar todas
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Estado del Catálogo" icon="cloud_sync">
            <AiStatusItem state={catalogStatus.chatgpt.state} message={catalogStatus.chatgpt.message} />
            <AiStatusItem state={catalogStatus.gemini.state} message={catalogStatus.gemini.message} />

            <div className="ai-actions-grid" style={{ marginTop: 12 }}>
              <button onClick={handleRefreshModels} disabled={refreshingModels}>
                Actualizar Modelos
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="secondary-ghost" style={{ flex: 1 }} onClick={() => handleValidate("chatgpt")} disabled={busy}>Test OpenAI</button>
                <button className="secondary-ghost" style={{ flex: 1 }} onClick={() => handleValidate("gemini")} disabled={busy}>Test Gemini</button>
              </div>
            </div>
          </SectionCard>
        </>
      )}

      {activeTab === "stats" && (
        <AiUsageDashboard settings={draft} />
      )}
    </StandardModal>
  );
}
