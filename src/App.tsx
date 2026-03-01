import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractSubTree, type ExtractDirection } from "@/core/edit/generators";
import { mergeFocusKey, normalizeMergeFocus, type MergeFocusPayload } from "@/core/edit/mergeFocus";
import { parseGsk, type GskMetadata } from "@/core/gskFormat";
import { TreeGenerator, type GeneratorScenario } from "@/core/testing/generator";
import { FileIOService } from "@/io/fileIOService";
import { useAppStore } from "@/state/store";
import type { AiInputContext } from "@/types/ai";
import type { Family, GedExportVersion, GeneaDocument, PendingRelationType, SourceGedVersion } from "@/types/domain";
import type { ColorThemeConfig, NodeInteraction, PersonEditorState } from "@/types/editor";
import { createGlobalShortcutHandler, type ShortcutActions } from "@/utils/globalShortcuts";
import { exportSvgAsPdf, exportSvgAsRaster } from "@/utils/svgExport";
import { downloadBlob } from "@/utils/download";
import { DTreeView } from "@/views/DTreeView";
import { DiagnosticPanel } from "@/views/DiagnosticPanel";
import { GlobalStatsPanel } from "@/views/GlobalStatsPanel";
import { PersonStatsPanel } from "@/views/PersonStatsPanel";
import { AboutReleaseModal } from "@/ui/AboutReleaseModal";
import { BranchExtractionModal } from "@/ui/BranchExtractionModal";
import { ColorThemeMenu } from "@/ui/ColorThemeMenu";
import { ImportReviewPanel } from "@/ui/ImportReviewPanel";
import { LeftPanel } from "@/ui/LeftPanel";
import { MergeReviewErrorBoundary } from "@/ui/MergeReviewErrorBoundary";
import { MockToolsPanel } from "@/ui/MockToolsPanel";
import { NodeActionMenu, type NodeActionMenuItem } from "@/ui/NodeActionMenu";
import { PersonDetailPanel } from "@/ui/PersonDetailPanel";
import { PersonEditorPanel } from "@/ui/PersonEditorPanel";
import { PersonPickerModal } from "@/ui/PersonPickerModal";
import { RightPanel } from "@/ui/RightPanel";
import { StatusBar } from "@/ui/StatusBar";
import { TimelineRightPanel } from "@/ui/TimelineRightPanel";
import { TopMenuBar, type MenuGroup } from "@/ui/TopMenuBar";
import { SearchCenterPanel } from "@/ui/search/SearchCenterPanel";
import { AiAssistantModal } from "@/ui/ai/AiAssistantModal";
import { AiSettingsModal } from "@/ui/ai/AiSettingsModal";
import { FamilySearchPanel } from "@/ui/external/FamilySearchPanel";
import { buildLayoutClassName } from "@/ui/shell/layoutClass";

const THEME = {
    dark: { personNode: "#1e293b", text: "#f8fafc", edges: "#475569" },
    light: { personNode: "#ffffff", text: "#0f172a", edges: "#94a3b8" }
} as const;

const DEFAULT_COLOR_THEME: ColorThemeConfig = {
    background: "transparent",
    personNode: THEME.dark.personNode,
    text: THEME.dark.text,
    edges: THEME.dark.edges,
    nodeFontSize: 18,
    edgeThickness: 2.5,
    nodeWidth: 210,
    nodeHeight: 92
};

type ThemeMode = "dark" | "light";

type PdfExportState = {
    scope: "viewport" | "full";
    paperSize: "LETTER" | "LEGAL" | "TABLOID" | "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "CUSTOM";
    orientation: "PORTRAIT" | "LANDSCAPE";
    margin: number;
    scale: number;
    customWidth: number;
    customHeight: number;
};

type PickerState = {
    anchorId: string;
    type: PendingRelationType | "kinship";
};

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

function hasMeaningfulTree(document: GeneaDocument | null): boolean {
    if (!document) return false;
    const personIds = Object.keys(document.persons);
    if (personIds.length > 1 || Object.keys(document.families).length > 0) return true;
    if (personIds.length === 0) return false;
    const root = document.persons[personIds[0]];
    return !(root?.isPlaceholder && root.name === "(Sin nombre)");
}

function relationTargetFromFamily(family: Family): { anchorId: string; relationType: PendingRelationType } | null {
    if (family.husbandId) return { anchorId: family.husbandId, relationType: "child" };
    if (family.wifeId) return { anchorId: family.wifeId, relationType: "child" };
    if (family.childrenIds[0]) return { anchorId: family.childrenIds[0], relationType: "sibling" };
    return null;
}

function mergeProvenance(document: GeneaDocument, fileName: string, sourceVersion: SourceGedVersion): GeneaDocument {
    return {
        ...document,
        metadata: {
            ...document.metadata,
            importProvenance: [
                ...(document.metadata.importProvenance || []),
                {
                    fileName,
                    sourceFormat: document.metadata.sourceFormat,
                    sourceGedVersion: sourceVersion,
                    importedAt: new Date().toISOString()
                }
            ]
        }
    };
}

function parseSerializedMeta(gskMeta: GskMetadata | null | undefined): GskMetadata | null {
    if (!gskMeta) return null;
    return parseGsk(JSON.stringify(gskMeta));
}

function ShellSideToggle({ side, collapsed, onClick }: { side: "left" | "right"; collapsed: boolean; onClick: () => void }) {
    const isLeft = side === "left";
    return (
        <button
            className={`shell-panel-toggle shell-panel-toggle--${side}`}
            onClick={onClick}
            title={`${collapsed ? "Mostrar" : "Ocultar"} panel ${isLeft ? "izquierdo" : "derecho"}`}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                {isLeft ? (
                    collapsed
                        ? <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                        : <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                    collapsed
                        ? <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        : <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                )}
            </svg>
        </button>
    );
}

export function App() {
    const openFileInputRef = useRef<HTMLInputElement>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const graphSvgRef = useRef<SVGSVGElement | null>(null);
    const mergeFocusKeyRef = useRef<string | null>(null);
    const shortcutActionsRef = useRef<ShortcutActions>({
        onEscape: () => { },
        focusSearch: () => { },
        save: () => { },
        open: () => { },
        goBack: () => { },
        goForward: () => { },
        fitToScreen: () => { },
        openAiSettings: () => { },
        toggleLeftPanel: () => { },
        toggleRightPanel: () => { },
        toggleTimelinePanel: () => { }
    });

    const [status, setStatus] = useState("Listo");
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [showColorThemeMenu, setShowColorThemeMenu] = useState(false);
    const [showPdfExport, setShowPdfExport] = useState(false);
    const [branchAnchorId, setBranchAnchorId] = useState<string | null>(null);
    const [colorTheme, setColorTheme] = useState<ColorThemeConfig>(DEFAULT_COLOR_THEME);
    const [picker, setPicker] = useState<PickerState | null>(null);
    const [pendingKinshipSourceId, setPendingKinshipSourceId] = useState<string | null>(null);
    const [pdfOptions, setPdfOptions] = useState<PdfExportState>({
        scope: "viewport",
        paperSize: "A4",
        orientation: "LANDSCAPE",
        margin: 36,
        scale: 1,
        customWidth: 842,
        customHeight: 595
    });
    const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
    const [exportWarnings, setExportWarnings] = useState<string[]>([]);

    const [personEditor, setPersonEditor] = useState<PersonEditorState>(null);
    const [detailPersonId, setDetailPersonId] = useState<string | null>(null);
    const [nodeMenu, setNodeMenu] = useState<NodeInteraction | null>(null);
    const [showPersonStatsPersonId, setShowPersonStatsPersonId] = useState<string | null>(null);
    const [showGlobalStatsPanel, setShowGlobalStatsPanel] = useState(false);

    const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
    const [showAiSettingsModal, setShowAiSettingsModal] = useState(false);
    const [aiContext, setAiContext] = useState<AiInputContext | null>(null);
    const [aiUndoSnapshot, setAiUndoSnapshot] = useState<GeneaDocument | null>(null);

    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showFamilySearchPanel, setShowFamilySearchPanel] = useState(false);
    const [showMockTools, setShowMockTools] = useState(false);
    const [importIncomingDoc, setImportIncomingDoc] = useState<GeneaDocument | null>(null);
    const [showSearchPanel, setShowSearchPanel] = useState(false);

    const {
        document,
        viewConfig,
        visualConfig,
        expandedGraph,
        selectedPersonId,
        fitNonce,
        restoreAvailable,
        parseErrors,
        parseWarnings,
        recentFiles,
        mergeDraft,
        aiSettings,
        setDocument,
        createNewTreeDoc,
        setSelectedPerson,
        updatePersonById,
        updateFamilyById,
        addRelationFromAnchor,
        createStandalonePerson,
        createPersonRecord,
        linkExistingRelation,
        unlinkRelation,
        setPreset,
        setDepth,
        setInclude,
        toggleShellPanel,
        toggleLeftSection,
        setLeftSectionState,
        setTimelinePanelOpen,
        toggleRightStackSection,
        setTimelineScope,
        setTimelineView,
        setTimelineScaleZoom,
        setTimelineScaleOffset,
        setTimelineStatus,
        clearNodePositions,
        setGridEnabled,
        setDTreeOrientation,
        setDTreeLayoutEngine,
        toggleDTreeNodeCollapse,
        setOverlay,
        clearOverlayType,
        clearVisualModes,
        goBack,
        goForward,
        fitToScreen,
        setParseErrors,
        setParseWarnings,
        addRecentFile,
        applyDiagnosticDocument,
        clearRecentFiles,
        openRecentFile,
        setMergeDraft,
        clearMergeDraft,
        setAiSettings,
        checkRestoreAvailability,
        restoreSession,
        clearSession,
        setFocusFamilyId,
        inspectPerson,
        saveAutosessionNow
    } = useAppStore();

    const visiblePersonIds = useMemo(() => {
        const ids = new Set<string>();
        for (const node of expandedGraph.nodes) {
            if (node.type !== "person" && node.type !== "personAlias") continue;
            const canonicalId = node.canonicalId || node.id;
            if (document?.persons[canonicalId]) ids.add(canonicalId);
        }
        return Array.from(ids);
    }, [expandedGraph.nodes, document]);

    const {
        leftCollapsed,
        rightCollapsed
    } = viewConfig?.shellPanels || { leftCollapsed: false, rightCollapsed: false };

    const timelineOpen = viewConfig?.timelinePanelOpen ?? false;
    const { detailsMode, timelineMode } = viewConfig?.rightStack || { detailsMode: "expanded", timelineMode: "compact" };

    // Plan V6.7: Auto-guardado persistente (debounced)
    useEffect(() => {
        if (!document) return;
        console.log("[Autosave] Triggering debounce timer...", {
            hasDoc: !!document,
            leftCol: leftCollapsed,
            rightCol: rightCollapsed
        });
        const timer = setTimeout(() => {
            console.log("[Autosave] Calling saveAutosessionNow...");
            void saveAutosessionNow();
        }, 1500);
        return () => clearTimeout(timer);
    }, [document, viewConfig, visualConfig, aiSettings, saveAutosessionNow, leftCollapsed, rightCollapsed]);

    useEffect(() => {
        checkRestoreAvailability();
    }, [checkRestoreAvailability]);

    useEffect(() => {
        window.document.documentElement.setAttribute("data-theme", themeMode);
        setColorTheme((current) => {
            const preset = themeMode === "light" ? THEME.light : THEME.dark;
            return { ...current, personNode: preset.personNode, text: preset.text, edges: preset.edges };
        });
    }, [themeMode]);

    const clearMergeFocusOverlay = useCallback(() => {
        mergeFocusKeyRef.current = null;
        clearOverlayType("merge_focus");
    }, [clearOverlayType]);

    const saveGsz = useCallback(async () => {
        if (!document) return;
        const metadata: GskMetadata = {
            schemaVersion: 0.1,
            viewConfig: viewConfig ?? undefined,
            visualConfig,
            colorTheme
        };
        const blob = await FileIOService.exportGsz(document, "embed", metadata);
        downloadBlob(blob, "geneasketch-export.gsz");
        setStatus("Exportado GSZ");
    }, [document, viewConfig, visualConfig, colorTheme]);

    useEffect(() => {
        shortcutActionsRef.current = {
            onEscape: () => {
                setNodeMenu(null);
                setShowSearchPanel(false);
            },
            focusSearch: () => {
                setShowSearchPanel(true);
                const search = window.document.getElementById("search-center-input") as HTMLInputElement | null;
                search?.focus();
            },
            save: () => saveGsz(),
            open: () => openFileInputRef.current?.click(),
            goBack: () => goBack(),
            goForward: () => goForward(),
            fitToScreen: () => fitToScreen(),
            openAiSettings: () => setShowAiSettingsModal(true),
            toggleLeftPanel: () => toggleShellPanel("left"),
            toggleRightPanel: () => toggleShellPanel("right"),
            toggleTimelinePanel: () => setTimelinePanelOpen(!(viewConfig?.timelinePanelOpen ?? false))
        };
    }, [saveGsz, goBack, goForward, fitToScreen, toggleShellPanel, viewConfig?.timelinePanelOpen, setTimelinePanelOpen]);

    useEffect(() => {
        const handler = createGlobalShortcutHandler(shortcutActionsRef, isTypingTarget);
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    function openPersonEditor(personId: string) {
        if (!document) return;
        const person = document.persons[personId];
        if (!person) return;
        setPersonEditor({ type: "edit", personId, person });
    }

    function openAddRelationEditor(anchorId: string, relationType: PendingRelationType) {
        if (!document) return;
        const anchorPerson = document.persons[anchorId];
        if (!anchorPerson) return;
        setPersonEditor({ type: "add_relation", anchorId, anchorPerson, relationType });
    }

    function openGlobalAiAssistant() {
        if (!document) return;
        setAiContext({ kind: "global" });
        setShowAiAssistantModal(true);
    }

    function openLocalAiAssistant(anchorPersonId: string) {
        if (!document || !document.persons[anchorPersonId]) return;
        setAiContext({ kind: "local", anchorPersonId });
        setShowAiAssistantModal(true);
    }

    function applyAiBatch(nextDoc: GeneaDocument, summary: string) {
        if (document) setAiUndoSnapshot(structuredClone(document));
        applyDiagnosticDocument(nextDoc);
        setStatus(summary);
    }

    function undoAiBatch() {
        if (!aiUndoSnapshot) return;
        applyDiagnosticDocument(aiUndoSnapshot);
        setAiUndoSnapshot(null);
        setStatus("Lote IA revertido.");
    }

    const handleTimelineHighlight = (payload: { sourceItemId: string; primaryPersonId: string | null; secondaryPersonIds: string[] } | null) => {
        if (!payload) {
            clearOverlayType("timeline");
            return;
        }
        setOverlay({
            id: "timeline-simulation",
            type: "timeline",
            priority: 100,
            config: {
                sourceItemId: payload.sourceItemId,
                primaryId: payload.primaryPersonId,
                secondaryIds: payload.secondaryPersonIds
            }
        });
    };

    function focusPersonInCanvas(personId: string) {
        setSelectedPerson(personId);
        setNodeMenu(null);
        setTimeout(() => fitToScreen(), 0);
    }

    function selectPersonSoft(personId: string) {
        inspectPerson(personId);
        setNodeMenu(null);
    }

    const handleNodeClick = (interaction: NodeInteraction) => {
        if (pendingKinshipSourceId) {
            if (interaction.nodeKind === "person") {
                setOverlay({
                    id: "kinship-standard",
                    type: "kinship",
                    priority: 90,
                    config: { person1Id: pendingKinshipSourceId, person2Id: interaction.nodeId }
                });
                setStatus("Calculando parentesco...");
            }
            setPendingKinshipSourceId(null);
            return;
        }

        const heatmapOverlay = viewConfig?.dtree?.overlays.find((overlay) => overlay.type === "heatmap");
        if (heatmapOverlay && interaction.nodeKind === "person") {
            setOverlay({
                ...heatmapOverlay,
                config: { ...heatmapOverlay.config, targetId: interaction.nodeId }
            });
            inspectPerson(interaction.nodeId);
            return;
        }

        if (interaction.nodeKind === "person") {
            inspectPerson(interaction.nodeId);
        }
        setNodeMenu(interaction);
    };

    const handleNodeContextMenu = (interaction: NodeInteraction) => {
        if (interaction.nodeKind === "person") inspectPerson(interaction.nodeId);
        setNodeMenu(interaction);
    };

    async function parseInputFile(file: File) {
        const lower = file.name.toLowerCase();
        if (lower.endsWith(".gdz")) return FileIOService.importZippedGeneaAnyVersion(file, "gdz");
        if (lower.endsWith(".gsz")) return FileIOService.importZippedGeneaAnyVersion(file, "gsz");
        if (lower.endsWith(".ged")) return FileIOService.importGedAnyVersion(file);
        return null;
    }

    function applyLoadedDocument(nextDoc: GeneaDocument, fileName: string, sourceVersion: SourceGedVersion, gskMeta?: GskMetadata | null) {
        setDocument(nextDoc);
        const parsedMeta = parseSerializedMeta(gskMeta);
        if (parsedMeta?.colorTheme) {
            setColorTheme((current) => ({ ...current, ...parsedMeta.colorTheme }));
        }
        setStatus(`Cargado: ${fileName} (${sourceVersion})`);
    }

    async function openAndReplace(file: File) {
        setStatus(`Abriendo ${file.name}...`);
        try {
            if (hasMeaningfulTree(document)) {
                const ok = window.confirm("¿Seguro que deseas cerrar el árbol actual y abrir uno nuevo? Se perderán cambios no guardados.");
                if (!ok) {
                    setStatus("Apertura cancelada.");
                    return;
                }
            }

            const parsed = await parseInputFile(file);
            if (!parsed) {
                setParseErrors(["Solo se soportan .ged, .gdz y .gsz"]);
                setStatus("Formato no soportado.");
                return;
            }

            setParseWarnings(parsed.warnings.map((warning) => `${warning.code}: ${warning.message}`));
            if (parsed.errors.length || !parsed.document) {
                setParseErrors(parsed.errors.map((error) => `L${error.line} ${error.entity ? `[${error.entity}] ` : ""}${error.message}`));
                setStatus("Error de importación GED/GDZ/GSZ.");
                return;
            }

            setParseErrors([]);
            const enrichedDoc = mergeProvenance(parsed.document, file.name, parsed.sourceVersion ?? "unknown");
            applyLoadedDocument(enrichedDoc, file.name, parsed.sourceVersion ?? "unknown", parsed.gskMeta || null);
            addRecentFile({ name: file.name, kind: "open" }, enrichedDoc);
        } catch (error) {
            setStatus(`Error crítico: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async function importForMerge(file: File) {
        if (!document || !hasMeaningfulTree(document)) {
            await openAndReplace(file);
            return;
        }
        setStatus(`Importando ${file.name}...`);
        const parsed = await parseInputFile(file);
        if (!parsed || !parsed.document) {
            setStatus("Error al importar o formato no soportado.");
            return;
        }
        const incoming = mergeProvenance(parsed.document, file.name, parsed.sourceVersion ?? "unknown");
        setImportIncomingDoc(incoming);
        addRecentFile({ name: file.name, kind: "import" }, incoming);
        setStatus("Resolviendo coincidencias de personas...");
    }

    const handleMergeFocusChange = useCallback(
        (focus: MergeFocusPayload | null) => {
            const normalized = normalizeMergeFocus(focus);
            const nextKey = mergeFocusKey(normalized);
            if (!normalized) {
                clearMergeFocusOverlay();
                return;
            }
            if (nextKey && nextKey === mergeFocusKeyRef.current) return;
            mergeFocusKeyRef.current = nextKey;
            setOverlay({
                id: "merge-focus-review",
                type: "merge_focus",
                priority: 95,
                config: {
                    primaryIds: normalized.primaryIds,
                    secondaryIds: normalized.secondaryIds,
                    secondaryLevel1Ids: normalized.secondaryLevel1Ids || normalized.secondaryIds,
                    secondaryLevel2Ids: normalized.secondaryLevel2Ids || []
                }
            });
        },
        [clearMergeFocusOverlay, setOverlay]
    );

    function handleMergeApply(nextDoc: GeneaDocument, stats: { addedPersons: number; updatedPersons: number; addedFamilies: number }) {
        setDocument(nextDoc);
        clearMergeDraft();
        clearMergeFocusOverlay();
        setImportIncomingDoc(null);
        setStatus(`Fusión completada: +${stats.addedPersons} personas, ${stats.updatedPersons} actualizadas y +${stats.addedFamilies} familias.`);
    }

    async function exportGed(version: GedExportVersion = "7.0.3") {
        if (!document) return;
        const result = await FileIOService.exportGed(document, { version });
        const suffix = version === "5.5.1" ? "-5.5.1" : "";
        downloadBlob(result.blob, `geneasketch-export${suffix}.ged`);
        if (result.warnings.length > 0) {
            setExportWarnings(result.warnings.map((warning) => `${warning.code}: ${warning.message}`));
            setStatus(`Exportado GED ${version} con ${result.warnings.length} advertencias.`);
            return;
        }
        setExportWarnings([]);
        setStatus(`Exportado GED ${version}`);
    }

    async function exportBranchGsz(personId: string, direction: ExtractDirection) {
        if (!document) return;
        setStatus("Extrayendo rama...");
        const branch = extractSubTree(document, personId, direction);
        const metadata: GskMetadata = { schemaVersion: 0.1, viewConfig: viewConfig ?? undefined, visualConfig, colorTheme };
        const blob = await FileIOService.exportGsz(branch, "embed", metadata);
        downloadBlob(blob, `Rama_${direction}.gsz`);
        setStatus("Rama extraída y descargada");
    }

    function exportRaster(format: "png" | "jpg") {
        const svg = graphSvgRef.current;
        if (!svg) {
            setStatus("No hay grafo visible para exportar.");
            return;
        }
        exportSvgAsRaster(svg, format, colorTheme.background, 2)
            .then((blob) => {
                downloadBlob(blob, `geneasketch-${format}.${format}`);
                setStatus(`Exportado ${format.toUpperCase()}`);
            })
            .catch(() => setStatus(`No se pudo exportar ${format.toUpperCase()}.`));
    }

    async function exportPdfNow() {
        const svg = graphSvgRef.current;
        if (!svg) {
            setStatus("No hay grafo visible para exportar.");
            return;
        }

        const blob = await exportSvgAsPdf(svg, colorTheme.background, {
            paperSize: pdfOptions.paperSize,
            orientation: pdfOptions.orientation,
            margin: Math.max(0, Math.round(pdfOptions.margin / Math.max(0.25, pdfOptions.scale))),
            scale: pdfOptions.scale,
            customWidth: pdfOptions.customWidth,
            customHeight: pdfOptions.customHeight
        });

        const suffix = pdfOptions.scope === "full" ? "full" : "viewport";
        downloadBlob(blob, `geneasketch-${suffix}.pdf`);
        setShowPdfExport(false);
        setStatus("Exportado PDF");
    }

    function generateScenario(scenario: GeneratorScenario) {
        const generator = new TreeGenerator({ seed: Date.now() });
        const nextDoc =
            scenario === "standard"
                ? generator.generateStandard(5)
                : scenario === "cousin_marriage"
                    ? generator.generateCousinMarriage()
                    : scenario === "pedigree_collapse"
                        ? generator.generatePedigreeCollapse()
                        : generator.generateEndogamy(12, 5);
        setDocument(nextDoc);
        setStatus(`Árbol de prueba generado (${scenario})`);
    }

    function openRecentItem(entryId: string) {
        const opened = openRecentFile(entryId);
        if (!opened) {
            setStatus("No se pudo abrir el elemento reciente.");
            return;
        }

        if (opened.entry.kind === "open") {
            applyLoadedDocument(opened.payload, opened.entry.name, opened.payload.metadata.gedVersion as SourceGedVersion);
            setStatus(`Abierto reciente: ${opened.entry.name}`);
            return;
        }

        if (!document || !hasMeaningfulTree(document)) {
            applyLoadedDocument(opened.payload, opened.entry.name, opened.payload.metadata.gedVersion as SourceGedVersion);
            setStatus(`Abierto reciente para reemplazo: ${opened.entry.name}`);
            return;
        }

        setImportIncomingDoc(opened.payload);
        setStatus(`Importado reciente: ${opened.entry.name}`);
    }

    const recentItems = useMemo(() => {
        if (recentFiles.length === 0) return [{ id: "recent-empty", kind: "label" as const, label: "Sin recientes" }];
        return [
            ...recentFiles.map((entry) => ({
                id: `recent-${entry.id}`,
                label: `${entry.name} (${entry.kind === "open" ? "Abrir" : "Importar"})`,
                onClick: () => openRecentItem(entry.id)
            })),
            { id: "recent-sep", kind: "separator" as const, label: "" },
            { id: "recent-clear", label: "Limpiar recientes", onClick: () => clearRecentFiles() }
        ];
    }, [recentFiles]);

    const nodeMenuState = useMemo(() => {
        if (!nodeMenu || !document) return null;

        if (nodeMenu.nodeKind === "person") {
            const person = document.persons[nodeMenu.nodeId];
            if (!person) return null;

            const items: NodeActionMenuItem[] = [
                { id: "view-details", label: "👁️ Ver ficha detallada", group: "accion", onSelect: () => setDetailPersonId(person.id) },
                { id: "select-person", label: "🔍 Seleccionar persona", group: "accion", onSelect: () => focusPersonInCanvas(person.id) },
                { id: "edit-person", label: "📝 Editar detalles", group: "accion", onSelect: () => openPersonEditor(person.id) },
                { id: "add-relation", label: "➕ Agregar familiar...", group: "accion", onSelect: () => openAddRelationEditor(person.id, "child") }
            ];

            if (viewConfig?.dtree) {
                const lineageOverlay = viewConfig.dtree.overlays.find((overlay) => overlay.type === "lineage" && overlay.config.personId === person.id);
                const hasLineage = Boolean(lineageOverlay);
                const lineageMode = lineageOverlay?.config.mode || "all";
                if (person.sex === "M" || person.sex === "U") {
                    items.push({
                        id: "toggle-lineage-pat",
                        label: hasLineage && lineageMode === "patrilineal" ? "🧬 Quitar ADN-Y" : "🧬 Linaje patrilineal (ADN-Y)",
                        group: "vista",
                        onSelect: () => {
                            if (hasLineage && lineageMode === "patrilineal") {
                                clearOverlayType("lineage");
                                return;
                            }
                            setOverlay({ id: "lineage-hl", type: "lineage", priority: 90, config: { personId: person.id, mode: "patrilineal" } });
                        }
                    });
                }
                if (person.sex === "F" || person.sex === "U") {
                    items.push({
                        id: "toggle-lineage-mat",
                        label: hasLineage && lineageMode === "matrilineal" ? "🧬 Quitar ADN-mt" : "🧬 Linaje matrilineal (ADN-mt)",
                        group: "vista",
                        onSelect: () => {
                            if (hasLineage && lineageMode === "matrilineal") {
                                clearOverlayType("lineage");
                                return;
                            }
                            setOverlay({ id: "lineage-hl", type: "lineage", priority: 90, config: { personId: person.id, mode: "matrilineal" } });
                        }
                    });
                }
                const heatmapOverlay = viewConfig.dtree.overlays.find((overlay) => overlay.type === "heatmap");
                const heatmapActive = heatmapOverlay?.config.personId === person.id;
                items.push({
                    id: "genetic-heatmap",
                    label: heatmapActive ? "🧬 Desactivar análisis" : "🧬 Análisis de parentesco",
                    group: "herramientas",
                    onSelect: () => {
                        if (heatmapActive) {
                            clearOverlayType("heatmap");
                            setStatus("Análisis de parentesco finalizado.");
                            return;
                        }
                        setOverlay({ id: "genetic-heatmap", type: "heatmap", priority: 80, config: { personId: person.id, mode: "vibrant" } });
                        setStatus(`Analizando parentescos desde: ${person.name}`);
                    }
                });
                items.push({
                    id: "toggle-collapse",
                    label: viewConfig.dtree.collapsedNodeIds.includes(person.id) ? "📂 Expandir descendencia" : "📁 Colapsar descendencia",
                    group: "vista",
                    onSelect: () => toggleDTreeNodeCollapse(person.id)
                });
                items.push({ id: "extract-branch", label: "🌳 Extraer rama...", group: "herramientas", onSelect: () => setBranchAnchorId(person.id) });
            }
            items.push({ id: "ai-local", label: "🤖 Asistente IA local...", group: "herramientas", onSelect: () => openLocalAiAssistant(person.id) });
            items.push({
                id: "kinship-click",
                label: "🧬 Calcular parentesco (clic en gráfico)",
                group: "herramientas",
                onSelect: () => setPendingKinshipSourceId(person.id)
            });
            items.push({ id: "kinship-picker", label: "🧬 Calcular parentesco (selector)...", group: "herramientas", onSelect: () => setPicker({ anchorId: person.id, type: "kinship" }) });

            return { x: nodeMenu.clientX, y: nodeMenu.clientY, nodeKind: nodeMenu.nodeKind, title: `Persona: ${person.name}`, items };
        }

        const family = document.families[nodeMenu.nodeId];
        if (!family) return null;
        const items: NodeActionMenuItem[] = [];
        const parentItems: NodeActionMenuItem[] = [];
        if (family.husbandId && document.persons[family.husbandId]) {
            parentItems.push({
                id: `select-father-${family.husbandId}`,
                label: `👨 Padre: ${document.persons[family.husbandId].name}`,
                onSelect: () => selectPersonSoft(family.husbandId!)
            });
        }
        if (family.wifeId && document.persons[family.wifeId]) {
            parentItems.push({
                id: `select-mother-${family.wifeId}`,
                label: `👩 Madre: ${document.persons[family.wifeId].name}`,
                onSelect: () => selectPersonSoft(family.wifeId!)
            });
        }
        if (parentItems.length > 0) {
            items.push({ id: "family-parents-group", label: "👴👵 Seleccionar padres", group: "accion", children: parentItems });
        }
        const childItems = family.childrenIds.reduce<NodeActionMenuItem[]>((acc, childId) => {
            const child = document.persons[childId];
            if (child) acc.push({ id: `select-child-${child.id}`, label: `👶 ${child.name}`, onSelect: () => selectPersonSoft(child.id) });
            return acc;
        }, []);
        if (childItems.length > 0) {
            items.push({ id: "family-children-group", label: `👶 Hijos (${childItems.length})`, group: "accion", children: childItems });
        }
        const target = relationTargetFromFamily(family);
        if (target) {
            items.push({ id: "family-add-child", label: "👶➕ Agregar hijo", group: "accion", onSelect: () => openAddRelationEditor(target.anchorId, target.relationType) });
        }
        const familyFocused = viewConfig?.focusFamilyId === family.id;
        items.push({
            id: "focus-family",
            label: familyFocused ? "🎯 Familia centrada" : "🎯 Enfocar familia (centro)",
            group: "accion",
            disabled: familyFocused,
            onSelect: () => setFocusFamilyId(family.id)
        });
        if (viewConfig?.dtree) {
            items.push({
                id: "toggle-collapse-family",
                label: viewConfig.dtree.collapsedNodeIds.includes(family.id) ? "📂 Expandir descendencia" : "📁 Colapsar descendencia",
                group: "vista",
                onSelect: () => toggleDTreeNodeCollapse(family.id)
            });
            if (family.husbandId && family.wifeId) {
                const hasCoupleLineage = Boolean(
                    viewConfig.dtree.overlays.find((overlay) => overlay.type === "lineage_couple" && overlay.config.familyId === family.id)
                );
                items.push({
                    id: "couple-lineage",
                    label: hasCoupleLineage ? "🧬 Quitar linajes de pareja" : "🧬 Linajes de pareja (Y + mt)",
                    group: "vista",
                    onSelect: () => {
                        if (hasCoupleLineage) {
                            clearOverlayType("lineage_couple");
                            return;
                        }
                        setOverlay({
                            id: "couple-lineage-hl",
                            type: "lineage_couple",
                            priority: 95,
                            config: { familyId: family.id, husbandId: family.husbandId, wifeId: family.wifeId }
                        });
                    }
                });
            }
        }
        return { x: nodeMenu.clientX, y: nodeMenu.clientY, nodeKind: nodeMenu.nodeKind, title: `Familia: ${family.id}`, items };
    }, [nodeMenu, document, viewConfig, clearOverlayType, setOverlay, setStatus, toggleDTreeNodeCollapse, setFocusFamilyId, inspectPerson]);


    const menus: MenuGroup[] = [
        {
            id: "archivo",
            label: "Archivo",
            items: [
                { id: "new", label: "Nuevo", onClick: () => createNewTreeDoc() },
                { id: "open", label: "Abrir", shortcut: "Ctrl+O", onClick: () => openFileInputRef.current?.click() },
                {
                    id: "import-submenu",
                    label: "Importar",
                    children: [
                        { id: "import-merge", label: "Importar y fusionar...", onClick: () => importFileInputRef.current?.click() },
                        { id: "import-replace", label: "Importar y reemplazar...", onClick: () => openFileInputRef.current?.click() }
                    ]
                },
                { id: "recent-submenu", label: "Recientes", children: recentItems },
                { id: "save-gsz", label: "Guardar GSZ", shortcut: "Ctrl+S", disabled: !document, onClick: () => void saveGsz() },
                { id: "exp-ged-703", label: "Exportar GED 7.0.3", disabled: !document, onClick: () => void exportGed("7.0.3") },
                { id: "exp-ged-551", label: "Exportar GED 5.5.1", disabled: !document, onClick: () => void exportGed("5.5.1") },
                { id: "exp-gsz", label: "Exportar GSZ", disabled: !document, onClick: () => void saveGsz() },
                { id: "exp-pdf", label: "Exportar PDF", disabled: !document, onClick: () => setShowPdfExport(true) },
                { id: "exp-png", label: "Exportar PNG", disabled: !document, onClick: () => exportRaster("png") },
                { id: "exp-jpg", label: "Exportar JPG", disabled: !document, onClick: () => exportRaster("jpg") }
            ]
        },
        {
            id: "edit",
            label: "Edit",
            items: [
                { id: "edit-person", label: "Editar persona", disabled: !selectedPersonId, onClick: () => selectedPersonId && openPersonEditor(selectedPersonId) },
                { id: "add-relation", label: "Agregar familiar...", disabled: !selectedPersonId, onClick: () => selectedPersonId && openAddRelationEditor(selectedPersonId, "child") },
                { id: "ai-local", label: "Asistente IA local...", disabled: !selectedPersonId, onClick: () => selectedPersonId && openLocalAiAssistant(selectedPersonId) },
                { id: "ai-global", label: "Asistente IA global...", disabled: !document, onClick: () => openGlobalAiAssistant() },
                { id: "ai-settings", label: "Configuración IA...", onClick: () => setShowAiSettingsModal(true) },
                { id: "ai-undo", label: "Deshacer último lote IA", disabled: !aiUndoSnapshot, onClick: () => undoAiBatch() }
            ]
        },
        {
            id: "vista",
            label: "Vista",
            items: [
                { id: "fit", label: "Ajustar a pantalla", shortcut: "F", onClick: () => fitToScreen() },
                { id: "theme", label: themeMode === "dark" ? "Cambiar a claro" : "Cambiar a oscuro", onClick: () => setThemeMode(themeMode === "dark" ? "light" : "dark") },
                { id: "colors", label: "Colores de nodos", onClick: () => setShowColorThemeMenu(true) },
                { kind: "separator" as const, id: "sep-panels", label: "" },
                { id: "toggle-left", label: leftCollapsed ? "Mostrar panel izquierdo" : "Ocultar panel izquierdo", onClick: () => toggleShellPanel("left") },
                { id: "toggle-right", label: rightCollapsed ? "Mostrar panel derecho" : "Ocultar panel derecho", onClick: () => toggleShellPanel("right") },
                { id: "toggle-timeline", label: timelineOpen ? "Cerrar Timeline" : "Mostrar Timeline", onClick: () => setTimelinePanelOpen(!timelineOpen) },
                {
                    id: "view-advanced",
                    label: "Avanzado",
                    children: [
                        {
                            id: "advanced-timeline-scope",
                            label: "Timeline > Alcance",
                            children: [
                                { id: "scope-visible", label: "Visibles", checked: viewConfig?.timeline.scope === "visible", disabled: !viewConfig, onClick: () => setTimelineScope("visible") },
                                { id: "scope-all", label: "Todo", checked: viewConfig?.timeline.scope === "all", disabled: !viewConfig, onClick: () => setTimelineScope("all") }
                            ]
                        },
                        {
                            id: "advanced-timeline-view",
                            label: "Timeline > Visualización",
                            children: [
                                { id: "timeline-list", label: "Lista", checked: viewConfig?.timeline.view === "list", disabled: !viewConfig, onClick: () => setTimelineView("list") },
                                { id: "timeline-scale", label: "Escala", checked: viewConfig?.timeline.view === "scale", disabled: !viewConfig, onClick: () => setTimelineView("scale") }
                            ]
                        },
                        {
                            id: "advanced-layout",
                            label: "Layout",
                            children: [
                                { id: "layout-vnext", label: "vnext", checked: (viewConfig?.dtree?.layoutEngine ?? "vnext") === "vnext", disabled: !viewConfig, onClick: () => setDTreeLayoutEngine("vnext") },
                                { id: "layout-v2", label: "v2", checked: (viewConfig?.dtree?.layoutEngine ?? "vnext") === "v2", disabled: !viewConfig, onClick: () => setDTreeLayoutEngine("v2") },
                                { id: "layout-legacy", label: "legacy", checked: (viewConfig?.dtree?.layoutEngine ?? "vnext") === "legacy", disabled: !viewConfig, onClick: () => setDTreeLayoutEngine("legacy") }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "tools",
            label: "Herramientas",
            items: [
                { id: "diagnostics", label: "Diagnóstico", onClick: () => setShowDiagnostics(true) },
                { id: "stats-person", label: "Estadísticas persona", disabled: !selectedPersonId, onClick: () => setShowPersonStatsPersonId(selectedPersonId) },
                { id: "stats-global", label: "Estadísticas globales", disabled: !document, onClick: () => setShowGlobalStatsPanel(true) },
                { id: "clear-pos", label: "Limpiar posiciones", onClick: () => clearNodePositions() }
            ]
        },
        {
            id: "advanced",
            label: "Avanzado",
            items: [
                { id: "scn-standard", label: "Generar árbol estándar", onClick: () => generateScenario("standard") },
                { id: "scn-cousin", label: "Generar matrimonio entre primos", onClick: () => generateScenario("cousin_marriage") },
                { id: "scn-collapse", label: "Generar colapso de pedigrí", onClick: () => generateScenario("pedigree_collapse") },
                { id: "scn-endogamy", label: "Generar endogamia", onClick: () => generateScenario("endogamy") },
                { id: "mock-tools", label: "Mock tools (beta)", onClick: () => setShowMockTools((prev) => !prev) }
            ]
        },
        { id: "external", label: "External", items: [{ id: "familysearch", label: "FamilySearch Connect", onClick: () => setShowFamilySearchPanel(true) }] },
        { id: "help", label: "Help", items: [{ id: "about", label: "About GeneaSketch", onClick: () => setShowAboutModal(true) }] }
    ];

    const modeBadge = viewConfig ? "DTree" : null;
    const normalizedDtreeConfig = viewConfig?.dtree
        ? {
            ...viewConfig.dtree,
            layoutEngine: (viewConfig.dtree.layoutEngine === "legacy" ? "legacy" : "vnext") as "legacy" | "vnext"
        }
        : undefined;

    const layoutClassName = buildLayoutClassName(leftCollapsed, rightCollapsed);
    const rightStackClassName = [
        "panel-right-stack",
        !timelineOpen ? "panel-right-stack--timeline-hidden" : "",
        detailsMode === "compact" ? "panel-right-stack--details-compact" : "",
        timelineMode === "compact" ? "panel-right-stack--timeline-compact" : ""
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className="app" style={{ "--canvas-bg-custom": colorTheme.background, "--node-fill-custom": colorTheme.personNode, "--node-text-custom": colorTheme.text, "--edge-color-custom": colorTheme.edges } as React.CSSProperties}>
            <header className="topbar">
                <div className="brand">GeneaSketch</div>
                <TopMenuBar menus={menus} />
                <button className="icon-btn icon-btn--search" onClick={() => setShowSearchPanel(true)} title="Buscar (Ctrl+F)">
                    <span aria-hidden="true">🔎</span>
                    <span>Buscar</span>
                </button>
                <div className="status"><StatusBar message={status} /></div>
                <input ref={openFileInputRef} type="file" accept=".ged,.gdz,.gsz" className="hidden" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void openAndReplace(file); event.currentTarget.value = ""; }} />
                <input ref={importFileInputRef} type="file" accept=".ged,.gdz,.gsz" className="hidden" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void importForMerge(file); event.currentTarget.value = ""; }} />
            </header>

            {restoreAvailable ? (
                <div className="restore-banner">
                    <span>Se encontró sesión previa.</span>
                    <button onClick={() => void restoreSession()}>Continuar sesión</button>
                    <button onClick={() => void clearSession()}>Nueva sesión</button>
                </div>
            ) : null}

            {exportWarnings.length > 0 ? (
                <div className="restore-banner" style={{ marginTop: 6, justifyContent: "space-between" }}>
                    <span>Exportación legacy con advertencias: {exportWarnings.length}</span>
                    <button onClick={() => setExportWarnings([])}>Ocultar</button>
                </div>
            ) : null}

            {aiUndoSnapshot ? (
                <div className="restore-banner" style={{ marginTop: 6, justifyContent: "space-between" }}>
                    <span>Último lote IA disponible para deshacer.</span>
                    <button onClick={undoAiBatch}>Deshacer lote IA</button>
                </div>
            ) : null}

            {pendingKinshipSourceId && document ? (
                <div
                    onClick={() => setPendingKinshipSourceId(null)}
                    style={{
                        position: "absolute",
                        top: 80,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "var(--overlay-panel-bg-soft)",
                        color: "var(--tree-kinship-accent)",
                        border: "1px solid var(--border)",
                        padding: "12px 24px",
                        borderRadius: 8,
                        zIndex: 100,
                        fontWeight: "bold",
                        cursor: "pointer",
                        boxShadow: "var(--overlay-shadow)"
                    }}
                >
                    Selecciona a otra persona en el gráfico para calcular parentesco con {document.persons[pendingKinshipSourceId]?.name} (clic aquí para cancelar)
                </div>
            ) : null}

            <main className={layoutClassName}>
                {!leftCollapsed ? (
                    <LeftPanel
                        document={document}
                        viewConfig={viewConfig}
                        visualConfig={visualConfig}
                        sections={viewConfig?.leftSections}
                        onToggleSection={toggleLeftSection}
                        onSetSections={setLeftSectionState}
                        onDTreeOrientation={setDTreeOrientation}
                        onPreset={setPreset}
                        onDepth={setDepth}
                        onInclude={setInclude}
                        onGridEnabled={setGridEnabled}
                        onClearPositions={clearNodePositions}
                    />
                ) : null}
                <section className="canvas-panel">
                    {viewConfig ? null : <div className="empty-state">Crea un árbol nuevo o abre un archivo GED/GDZ/GSZ.</div>}
                    {modeBadge ? <div className="mode-badge">{modeBadge}</div> : null}
                    {showMockTools ? <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, width: 300 }}><MockToolsPanel /></div> : null}
                    <ShellSideToggle side="left" collapsed={leftCollapsed} onClick={() => toggleShellPanel("left")} />
                    <ShellSideToggle side="right" collapsed={rightCollapsed} onClick={() => toggleShellPanel("right")} />
                    <DTreeView graph={expandedGraph} document={document} fitNonce={fitNonce} onNodeClick={handleNodeClick} onNodeContextMenu={handleNodeContextMenu} focusPersonId={viewConfig?.focusPersonId ?? null} focusFamilyId={viewConfig?.focusFamilyId ?? null} selectedPersonId={selectedPersonId} colorTheme={colorTheme} dtreeConfig={normalizedDtreeConfig} onBgClick={() => setNodeMenu(null)} onBgDoubleClick={() => clearVisualModes()} onSvgReady={(svg) => { graphSvgRef.current = svg; }} />
                </section>
                {!rightCollapsed ? (
                    <section className={rightStackClassName}>
                        <RightPanel
                            document={document}
                            selectedPersonId={detailPersonId || selectedPersonId}
                            detailsMode={detailsMode}
                            onToggleDetailsExpanded={() => toggleRightStackSection("details")}
                            onEditPerson={openPersonEditor}
                            onViewPersonDetail={(personId) => setDetailPersonId(personId)}
                            onAddRelation={openAddRelationEditor}
                            onLinkExistingRelation={(anchorId, type) => setPicker({ anchorId, type })}
                            onUnlinkRelation={(personId, relatedId, type) => {
                                unlinkRelation(personId, relatedId, type);
                                setStatus(`Relación desvinculada: ${type}`);
                            }}
                        />
                        {timelineOpen ? (
                            <TimelineRightPanel
                                document={document}
                                expandedGraph={expandedGraph}
                                viewConfig={viewConfig}
                                onTimelineView={setTimelineView}
                                onTimelineScaleZoom={setTimelineScaleZoom}
                                onTimelineScaleOffset={setTimelineScaleOffset}
                                onTimelineHighlight={handleTimelineHighlight}
                                onTimelineStatus={setTimelineStatus}
                                timelineMode={timelineMode}
                                onToggleTimelineExpanded={() => toggleRightStackSection("timeline")}
                                onClosePanel={() => {
                                    clearOverlayType("timeline");
                                    setTimelinePanelOpen(false);
                                }}
                            />
                        ) : null}
                    </section>
                ) : null}
            </main>

            {/* Advanced search mode: selecting a result opens detailed person panel directly. */}
            <SearchCenterPanel
                open={showSearchPanel}
                document={document}
                onClose={() => setShowSearchPanel(false)}
                onSelectPerson={(personId) => {
                    inspectPerson(personId);
                    setDetailPersonId(personId);
                }}
            />

            {showDiagnostics ? <DiagnosticPanel document={document} parseErrors={parseErrors} parseWarnings={parseWarnings} onApplyDocument={(nextDoc) => { applyDiagnosticDocument(nextDoc); setStatus("Diagnóstico actualizado: correcciones aplicadas"); }} onClose={() => setShowDiagnostics(false)} onSelectPerson={(personId) => { setSelectedPerson(personId); setShowDiagnostics(false); }} onSelectFamily={(familyId) => { const family = document?.families[familyId]; const candidate = family?.husbandId || family?.wifeId || family?.childrenIds[0]; if (candidate) setSelectedPerson(candidate); setShowDiagnostics(false); }} /> : null}
            {showPersonStatsPersonId && document ? <PersonStatsPanel document={document} personId={showPersonStatsPersonId} onClose={() => setShowPersonStatsPersonId(null)} /> : null}
            {showGlobalStatsPanel && document ? <GlobalStatsPanel document={document} visiblePersonIds={visiblePersonIds} onClose={() => setShowGlobalStatsPanel(false)} /> : null}

            {showPdfExport ? (
                <div className="modal-overlay" onClick={() => setShowPdfExport(false)}>
                    <div className="modal-panel" style={{ width: 520 }} onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header"><h3>Exportar PDF</h3><button onClick={() => setShowPdfExport(false)}>Cerrar</button></div>
                        <div className="builder" style={{ marginTop: 8 }}>
                            <label>Alcance<select value={pdfOptions.scope} onChange={(event) => setPdfOptions((prev) => ({ ...prev, scope: event.target.value as "viewport" | "full" }))}><option value="viewport">Viewport actual</option><option value="full">Todo lo visible</option></select></label>
                            <label>Tamaño de papel<select value={pdfOptions.paperSize} onChange={(event) => setPdfOptions((prev) => ({ ...prev, paperSize: event.target.value as PdfExportState["paperSize"] }))}><option value="A4">A4</option><option value="A3">A3</option><option value="A2">A2</option><option value="A1">A1</option><option value="A0">A0</option><option value="LETTER">LETTER</option><option value="LEGAL">LEGAL</option><option value="TABLOID">TABLOID</option><option value="CUSTOM">CUSTOM</option></select></label>
                            <label>Orientación<select value={pdfOptions.orientation} onChange={(event) => setPdfOptions((prev) => ({ ...prev, orientation: event.target.value as PdfExportState["orientation"] }))}><option value="PORTRAIT">Portrait</option><option value="LANDSCAPE">Landscape</option></select></label>
                            <label>Margen (pt)<input type="number" min={0} value={pdfOptions.margin} onChange={(event) => setPdfOptions((prev) => ({ ...prev, margin: Number(event.target.value) || 0 }))} /></label>
                            <label>Escala<input type="number" min={0.25} max={4} step={0.05} value={pdfOptions.scale} onChange={(event) => setPdfOptions((prev) => ({ ...prev, scale: Number(event.target.value) || 1 }))} /></label>
                        </div>
                        <div className="builder-actions" style={{ justifyContent: "flex-end", marginTop: 24 }}><button className="primary" onClick={() => void exportPdfNow()}>Exportar ahora</button></div>
                    </div>
                </div>
            ) : null}

            {importIncomingDoc && document ? (
                <MergeReviewErrorBoundary onClearDraft={clearMergeDraft} onClose={() => { clearMergeFocusOverlay(); setImportIncomingDoc(null); }}>
                    <ImportReviewPanel baseDoc={document} incomingDoc={importIncomingDoc} initialDraft={mergeDraft} onDraftChange={setMergeDraft} onFocusChange={handleMergeFocusChange} onApply={handleMergeApply} onClose={() => { clearMergeFocusOverlay(); setImportIncomingDoc(null); }} />
                </MergeReviewErrorBoundary>
            ) : null}

            {nodeMenuState ? <NodeActionMenu open={Boolean(nodeMenuState)} x={nodeMenuState.x} y={nodeMenuState.y} nodeKind={nodeMenuState.nodeKind} title={nodeMenuState.title} items={nodeMenuState.items} onClose={() => setNodeMenu(null)} /> : null}

            <ColorThemeMenu open={showColorThemeMenu} value={colorTheme} onChange={setColorTheme} onReset={() => setColorTheme(DEFAULT_COLOR_THEME)} onClose={() => setShowColorThemeMenu(false)} />

            <AiSettingsModal
                open={showAiSettingsModal}
                settings={aiSettings}
                onSave={(next) => {
                    setAiSettings(next);
                    setStatus("Ajustes IA guardados.");
                }}
                onClose={() => setShowAiSettingsModal(false)}
                onStatus={setStatus}
            />

            <AiAssistantModal
                open={showAiAssistantModal}
                context={aiContext}
                document={document}
                settings={aiSettings}
                onClose={() => setShowAiAssistantModal(false)}
                onStatus={setStatus}
                onApplyBatch={applyAiBatch}
                onOpenSettings={() => setShowAiSettingsModal(true)}
            />

            <AboutReleaseModal open={showAboutModal} onClose={() => setShowAboutModal(false)} />

            {showFamilySearchPanel ? (
                <FamilySearchPanel
                    onClose={() => setShowFamilySearchPanel(false)}
                    onImport={(payload) => {
                        if (!document) return;
                        console.log("Importing from FamilySearch:", payload);
                        setStatus("Datos recibidos de FamilySearch. Iniciando fusión...");
                        setShowFamilySearchPanel(false);
                    }}
                />
            ) : null}

            <PersonEditorPanel
                editorState={personEditor}
                document={document}
                aiSettings={aiSettings}
                onClose={() => setPersonEditor(null)}
                onSaveEdit={(personId, patch) => {
                    updatePersonById(personId, patch);
                    setStatus("Persona actualizada");
                }}
                onSaveRelation={(anchorId, type, input) => {
                    addRelationFromAnchor(anchorId, type, input);
                    setStatus(`Parentesco creado: ${type}`);
                }}
                onCreateStandalone={(input) => {
                    createStandalonePerson(input);
                    setStatus("Persona creada");
                }}
            />

            {detailPersonId && document ? (
                <PersonDetailPanel
                    document={document}
                    personId={detailPersonId}
                    aiSettings={aiSettings}
                    onClose={() => setDetailPersonId(null)}
                    onSelectPerson={setSelectedPerson}
                    onSetAsFocus={(personId) => focusPersonInCanvas(personId)}
                    onSavePerson={(personId, patch) => {
                        updatePersonById(personId, patch);
                        setStatus("Persona actualizada");
                    }}
                    onSaveFamily={(familyId, patch) => {
                        updateFamilyById(familyId, patch);
                        setStatus("Familia actualizada");
                    }}
                    onCreatePerson={(input) => createPersonRecord(input)}
                    onQuickAddRelation={(anchorId, type) => {
                        setDetailPersonId(null);
                        openAddRelationEditor(anchorId, type);
                    }}
                />
            ) : null}

            {picker && document ? (
                <PersonPickerModal
                    document={document}
                    anchorId={picker.anchorId}
                    relationType={picker.type}
                    onLink={(existingPersonId) => {
                        if (picker.type === "kinship") {
                            setOverlay({ id: "kinship-standard", type: "kinship", priority: 90, config: { person1Id: picker.anchorId, person2Id: existingPersonId } });
                            setStatus("Calculando parentesco...");
                        } else {
                            linkExistingRelation(picker.anchorId, existingPersonId, picker.type);
                            setStatus("Persona vinculada");
                        }
                    }}
                    onClose={() => setPicker(null)}
                />
            ) : null}

            {branchAnchorId && document ? (
                <BranchExtractionModal
                    document={document}
                    personId={branchAnchorId}
                    onClose={() => setBranchAnchorId(null)}
                    onExport={(direction) => {
                        void exportBranchGsz(branchAnchorId, direction);
                        setBranchAnchorId(null);
                    }}
                />
            ) : null}
        </div>
    );
}
