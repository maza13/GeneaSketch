// React JSX transformer (needed for inline JSX in .tsx useMemo)
import { useMemo } from "react";
import type {
    RecentFileEntry,
    ViewConfig,
    GedExportVersion,
    TimelineScope,
    TimelineViewMode,
    PendingRelationType
} from "@/types/domain";
import type { GraphDocument } from "@/core/read-model/types";
import type { ColorThemeConfig } from "@/types/editor";
import type { MenuGroup, MenuItem } from "@/ui/TopMenuBar";
import type { GeneratorScenario } from "@/core/testing/generator";

export type ThemeMode = "dark" | "light";

export type MenuLayout = "frequency" | "role" | "hybrid";

export type MenuConfigParams = {
    document: GraphDocument | null;
    viewConfig: ViewConfig | null;
    recentFiles: RecentFileEntry[];
    selectedPersonId: string | null;
    colorTheme: ColorThemeConfig;
    themeMode: ThemeMode;
    aiUndoSnapshot: GraphDocument | null;
    leftCollapsed: boolean;
    rightCollapsed: boolean;
    timelineOpen: boolean;
    menuLayout: MenuLayout;
    // Callbacks
    createNewTreeDoc: () => void;
    openFileInput: () => void;
    importFileInput: () => void;
    openAndReplace: (file: File) => void;
    openRecentItem: (id: string, onColorThemeLoad?: (theme: ColorThemeConfig) => void) => void;
    saveGsk: (theme: ColorThemeConfig) => Promise<void>;
    exportGed: (version: GedExportVersion) => Promise<void>;
    setShowPdfExport: (show: boolean) => void;
    exportRaster: (format: "png" | "jpg", bg: string) => void;
    openPersonEditor: (id: string) => void;
    openAddRelationEditor: (id: string, type: PendingRelationType) => void;
    openLocalAiAssistant: (id: string) => void;
    openGlobalAiAssistant: () => void;
    setShowAiSettingsModal: (show: boolean) => void;
    undoAiBatch: () => void;
    fitToScreen: () => void;
    setThemeMode: (mode: ThemeMode) => void;
    setShowColorThemeMenu: (show: boolean) => void;
    toggleShellPanel: (side: "left" | "right") => void;
    setTimelinePanelOpen: (show: boolean) => void;
    setTimelineScope: (scope: TimelineScope) => void;
    setTimelineView: (view: TimelineViewMode) => void;
    setDTreeLayoutEngine: (engine: "vnext" | "v2") => void;
    setShowDiagnostics: (show: boolean) => void;
    setShowPersonStatsPersonId: (id: string | null) => void;
    setShowGlobalStatsPanel: (show: boolean) => void;
    clearNodePositions: () => void;
    generateScenario: (scenario: GeneratorScenario) => void;
    setShowMockTools: (update: (prev: boolean) => boolean) => void;
    setShowFamilySearchPanel: (show: boolean) => void;
    setShowWikiPanel: (show: boolean) => void;
    setShowAboutModal: (show: boolean) => void;
    setShowAboutModalV2: (show: boolean) => void;
    setShowAboutModalV3: (show: boolean) => void;
    openPersonWorkspaceV3: (id: string) => void;
    setColorTheme: (theme: ColorThemeConfig) => void;
    clearRecentFiles: () => void;
    setMenuLayout: (layout: MenuLayout) => void;
};

/** Helper: renders a Material Symbols icon span */
const ic = (name: string): React.ReactNode => (
    <span className="material-symbols-outlined">{name}</span>
);

/** Menu separator shorthand */
const sep = (id: string): MenuItem => ({ kind: "separator" as const, id, label: "" });

export function useMenuConfig(p: MenuConfigParams) {
    const recentItems = useMemo((): MenuItem[] => {
        if (p.recentFiles.length === 0) return [{ id: "recent-empty", kind: "label" as const, label: "Sin recientes" }];
        return [
            ...p.recentFiles.map((entry) => ({
                id: `recent-${entry.id}`,
                label: `${entry.name} (${entry.kind === "open" ? "Abrir" : "Importar"})`,
                onClick: () => p.openRecentItem(entry.id, p.setColorTheme)
            })),
            sep("recent-sep"),
            { id: "recent-clear", label: "Limpiar recientes", icon: ic("delete_sweep"), onClick: () => p.clearRecentFiles() }
        ];
    }, [p.recentFiles, p.openRecentItem, p.setColorTheme, p.clearRecentFiles]);

    const menus = useMemo((): MenuGroup[] => {

        // ── Archivo / Proyecto shared items ──────────────────────────────────
        const itemNew: MenuItem = { id: "new", label: "Nuevo", icon: ic("add"), onClick: () => p.createNewTreeDoc() };
        const itemOpen: MenuItem = { id: "open", label: "Abrir...", icon: ic("folder_open"), shortcut: "Ctrl+O", onClick: () => p.openFileInput() };
        const itemSave: MenuItem = { id: "save-gsk", label: "Guardar (.gsk)", icon: ic("save"), shortcut: "Ctrl+S", disabled: !p.document, onClick: () => void p.saveGsk(p.colorTheme) };
        const itemImport: MenuItem = {
            id: "import-submenu", label: "Importar GEDCOM", icon: ic("upload_file"),
            children: [
                { id: "import-merge", label: "Fusionar con actual...", onClick: () => p.importFileInput() },
                { id: "import-replace", label: "Reemplazar documento...", onClick: () => p.importFileInput() }
            ]
        };
        const itemRecent: MenuItem = { id: "recent-submenu", label: "Recientes", icon: ic("history"), children: recentItems };
        const itemExpGed7: MenuItem = { id: "exp-ged-703", label: "Exportar GED 7.0.3", icon: ic("export_notes"), disabled: !p.document, onClick: () => void p.exportGed("7.0.3") };
        const itemExpGed5: MenuItem = { id: "exp-ged-551", label: "Exportar GED 5.5.1", icon: ic("description"), disabled: !p.document, onClick: () => void p.exportGed("5.5.1") };
        const itemExpPdf: MenuItem = { id: "exp-pdf", label: "Exportar PDF", icon: ic("picture_as_pdf"), disabled: !p.document, onClick: () => p.setShowPdfExport(true) };
        const itemExpPng: MenuItem = { id: "exp-png", label: "Exportar PNG", icon: ic("image"), disabled: !p.document, onClick: () => p.exportRaster("png", p.colorTheme.background) };
        const itemExpJpg: MenuItem = { id: "exp-jpg", label: "Exportar JPG", icon: ic("photo"), disabled: !p.document, onClick: () => p.exportRaster("jpg", p.colorTheme.background) };

        // ── Persona ─────────────────────────────────────────────────────────
        const itemEditPerson: MenuItem = { id: "edit-person", label: "Editar persona...", icon: ic("edit"), disabled: !p.selectedPersonId, onClick: () => p.selectedPersonId && p.openPersonEditor(p.selectedPersonId) };
        const itemAddRelation: MenuItem = { id: "add-relation", label: "Agregar familiar...", icon: ic("person_add"), disabled: !p.selectedPersonId, onClick: () => p.selectedPersonId && p.openAddRelationEditor(p.selectedPersonId, "child") };
        const itemPersonV3: MenuItem = { id: "person-v3", label: "Expediente Persona V3", icon: ic("badge"), disabled: !p.selectedPersonId, onClick: () => p.selectedPersonId && p.openPersonWorkspaceV3(p.selectedPersonId) };
        const itemFamilySearch: MenuItem = { id: "familysearch", label: "FamilySearch Connect", icon: ic("travel_explore"), onClick: () => p.setShowFamilySearchPanel(true) };

        // ── IA & Análisis ────────────────────────────────────────────────────
        const itemAiLocal: MenuItem = { id: "ai-local", label: "Asistente IA (persona)", icon: ic("auto_awesome"), disabled: !p.selectedPersonId, onClick: () => p.selectedPersonId && p.openLocalAiAssistant(p.selectedPersonId) };
        const itemAiGlobal: MenuItem = { id: "ai-global", label: "Asistente IA (árbol)", icon: ic("psychology"), disabled: !p.document, onClick: () => p.openGlobalAiAssistant() };
        const itemAiSettings: MenuItem = { id: "ai-settings", label: "Configuración IA...", icon: ic("tune"), shortcut: "Ctrl+Mayús+I", onClick: () => p.setShowAiSettingsModal(true) };
        const itemAiUndo: MenuItem = { id: "ai-undo", label: "Deshacer lote IA", icon: ic("undo"), disabled: !p.aiUndoSnapshot, onClick: () => p.undoAiBatch() };
        const itemDiagnostics: MenuItem = { id: "diagnostics", label: "Diagnóstico", icon: ic("health_and_safety"), onClick: () => p.setShowDiagnostics(true) };
        const itemStatsPerson: MenuItem = { id: "stats-person", label: "Estadísticas persona", icon: ic("person_search"), disabled: !p.selectedPersonId, onClick: () => p.selectedPersonId && p.setShowPersonStatsPersonId(p.selectedPersonId) };
        const itemStatsGlobal: MenuItem = { id: "stats-global", label: "Estadísticas árbol", icon: ic("bar_chart"), disabled: !p.document, onClick: () => p.setShowGlobalStatsPanel(true) };

        // ── Vista ────────────────────────────────────────────────────────────
        const itemFit: MenuItem = { id: "fit", label: "Ajustar a pantalla", icon: ic("fit_screen"), shortcut: "F", onClick: () => p.fitToScreen() };
        const itemTheme: MenuItem = { id: "theme", label: p.themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro", icon: ic(p.themeMode === "dark" ? "light_mode" : "dark_mode"), onClick: () => p.setThemeMode(p.themeMode === "dark" ? "light" : "dark") };
        const itemColors: MenuItem = { id: "colors", label: "Colores de nodos...", icon: ic("palette"), onClick: () => p.setShowColorThemeMenu(true) };
        const itemToggleLeft: MenuItem = { id: "toggle-left", label: p.leftCollapsed ? "Mostrar panel izquierdo" : "Ocultar panel izquierdo", icon: ic(p.leftCollapsed ? "left_panel_open" : "left_panel_close"), shortcut: "[", onClick: () => p.toggleShellPanel("left") };
        const itemToggleRight: MenuItem = { id: "toggle-right", label: p.rightCollapsed ? "Mostrar panel derecho" : "Ocultar panel derecho", icon: ic(p.rightCollapsed ? "right_panel_open" : "right_panel_close"), shortcut: "]", onClick: () => p.toggleShellPanel("right") };
        const itemToggleTimeline: MenuItem = { id: "toggle-timeline", label: p.timelineOpen ? "Cerrar Timeline" : "Mostrar Timeline", icon: ic("timeline"), shortcut: "Mayús+T", onClick: () => p.setTimelinePanelOpen(!p.timelineOpen) };
        const itemClearPos: MenuItem = { id: "clear-pos", label: "Restaurar posiciones", icon: ic("reset_wrench"), onClick: () => p.clearNodePositions() };

        const itemAdvancedView: MenuItem = {
            id: "view-advanced", label: "Avanzado", icon: ic("settings"),
            children: [
                {
                    id: "advanced-timeline-scope", label: "Alcance Timeline", children: [
                        { id: "scope-visible", label: "Visibles", checked: p.viewConfig?.timeline.scope === "visible", disabled: !p.viewConfig, onClick: () => p.setTimelineScope("visible") },
                        { id: "scope-all", label: "Todo", checked: p.viewConfig?.timeline.scope === "all", disabled: !p.viewConfig, onClick: () => p.setTimelineScope("all") }
                    ]
                },
                {
                    id: "advanced-timeline-view", label: "Visión Timeline", children: [
                        { id: "timeline-list", label: "Lista", checked: p.viewConfig?.timeline.view === "list", disabled: !p.viewConfig, onClick: () => p.setTimelineView("list") },
                        { id: "timeline-scale", label: "Escala", checked: p.viewConfig?.timeline.view === "scale", disabled: !p.viewConfig, onClick: () => p.setTimelineView("scale") }
                    ]
                },
                {
                    id: "advanced-layout", label: "Motor DTree", children: [
                        { id: "layout-vnext", label: "vnext", checked: (p.viewConfig?.dtree?.layoutEngine ?? "vnext") === "vnext", disabled: !p.viewConfig, onClick: () => p.setDTreeLayoutEngine("vnext") },
                        { id: "layout-v2", label: "v2", checked: (p.viewConfig?.dtree?.layoutEngine ?? "vnext") === "v2", disabled: !p.viewConfig, onClick: () => p.setDTreeLayoutEngine("v2") }
                    ]
                }
            ]
        };

        // ── Dev & test ────────────────────────────────────────────────────────
        const itemScenarios: MenuItem = {
            id: "test-gen", label: "Generadores de prueba", icon: ic("science"),
            children: [
                { id: "scn-standard", label: "Árbol estándar", onClick: () => p.generateScenario("standard") },
                { id: "scn-cousin", label: "Matrimonio entre primos", onClick: () => p.generateScenario("cousin_marriage") },
                { id: "scn-collapse", label: "Colapso de pedigrí", onClick: () => p.generateScenario("pedigree_collapse") },
                { id: "scn-endogamy", label: "Endogamia múltiple", onClick: () => p.generateScenario("endogamy") },
                { id: "mock-tools", label: "Mock Tools (Dev)", onClick: () => p.setShowMockTools((prev) => !prev) }
            ]
        };

        // ── Ayuda ─────────────────────────────────────────────────────────────
        const itemWiki: MenuItem = { id: "wiki", label: "Wiki GeneaSketch", icon: ic("menu_book"), onClick: () => p.setShowWikiPanel(true) };
        const itemAboutV2: MenuItem = { id: "about-v2", label: "Acerca de (V2)", icon: ic("info"), onClick: () => p.setShowAboutModalV2(true) };
        const itemAboutV3: MenuItem = { id: "about-v3", label: "Acerca de (V3)", icon: ic("info_i"), onClick: () => p.setShowAboutModalV3(true) };

        // ── Layout switcher ───────────────────────────────────────────────────
        const itemLayoutSwitcher: MenuItem = {
            id: "switch-layout", label: "Disposición de menú", icon: ic("space_dashboard"),
            children: [
                { id: "layout-frequency", label: "A — Por Frecuencia", checked: p.menuLayout === "frequency", onClick: () => p.setMenuLayout("frequency") },
                { id: "layout-role", label: "B — Por Rol", checked: p.menuLayout === "role", onClick: () => p.setMenuLayout("role") },
                { id: "layout-hybrid", label: "C — Híbrido Moderno", checked: p.menuLayout === "hybrid", onClick: () => p.setMenuLayout("hybrid") },
            ]
        };

        // ════════════════════════════════════════════════════════════════════
        // LAYOUT A — Por Frecuencia de uso
        // Archivo · Árbol · Análisis · Vista · Herramientas · Ayuda
        // ════════════════════════════════════════════════════════════════════
        if (p.menuLayout === "frequency") {
            return [
                {
                    id: "archivo", label: "Archivo", items: [
                        itemNew, itemOpen, itemRecent, sep("s1"),
                        itemSave, sep("s2"),
                        itemImport, sep("s3"),
                        itemExpPdf, itemExpPng, itemExpJpg, sep("s4"),
                        itemExpGed7, itemExpGed5
                    ]
                },
                {
                    id: "arbol", label: "Árbol", items: [
                        itemEditPerson, itemPersonV3, itemAddRelation, sep("s5"),
                        itemFamilySearch
                    ]
                },
                {
                    id: "analisis", label: "Análisis", items: [
                        itemAiGlobal, itemAiLocal, sep("s6"),
                        itemAiSettings, itemAiUndo, sep("s7"),
                        itemDiagnostics, itemStatsGlobal, itemStatsPerson
                    ]
                },
                {
                    id: "vista", label: "Vista", items: [
                        itemFit, sep("s8"),
                        itemToggleLeft, itemToggleRight, itemToggleTimeline, sep("s9"),
                        itemTheme, itemColors, sep("s10"),
                        itemAdvancedView, itemClearPos, sep("s11"),
                        itemLayoutSwitcher
                    ]
                },
                {
                    id: "ayuda", label: "Ayuda", items: [
                        itemWiki, sep("s12"),
                        itemAboutV2, itemAboutV3, sep("s13"),
                        itemScenarios
                    ]
                }
            ];
        }

        // ════════════════════════════════════════════════════════════════════
        // LAYOUT B — Por Rol del usuario
        // Proyecto · Personas · Investigar · Presentar · Ayuda
        // ════════════════════════════════════════════════════════════════════
        if (p.menuLayout === "role") {
            return [
                {
                    id: "proyecto", label: "Proyecto", items: [
                        itemNew, itemOpen, itemRecent, sep("s1"),
                        itemSave, sep("s2"),
                        itemImport, sep("s3"),
                        itemExpGed7, itemExpGed5
                    ]
                },
                {
                    id: "personas", label: "Personas", items: [
                        itemEditPerson, itemPersonV3, itemAddRelation, sep("s4"),
                        itemFamilySearch
                    ]
                },
                {
                    id: "investigar", label: "Investigar", items: [
                        itemAiGlobal, itemAiLocal, sep("s5"),
                        itemAiSettings, itemAiUndo, sep("s6"),
                        itemDiagnostics, itemStatsGlobal, itemStatsPerson
                    ]
                },
                {
                    id: "presentar", label: "Presentar", items: [
                        itemExpPdf, itemExpPng, itemExpJpg, sep("s7"),
                        itemFit, itemToggleLeft, itemToggleRight, itemToggleTimeline, sep("s8"),
                        itemTheme, itemColors, itemAdvancedView, itemClearPos, sep("s9"),
                        itemLayoutSwitcher
                    ]
                },
                {
                    id: "ayuda", label: "Ayuda", items: [
                        itemWiki, sep("s10"),
                        itemAboutV2, itemAboutV3, sep("s11"),
                        itemScenarios
                    ]
                }
            ];
        }

        // ════════════════════════════════════════════════════════════════════
        // LAYOUT C — Híbrido Moderno (macOS style)
        // GeneaSketch · Editar · Vista
        // + Quick actions in toolbar (acciones rápidas a la derecha)
        // ════════════════════════════════════════════════════════════════════
        // (hybrid = p.menuLayout === "hybrid" → default fallback)
        return [
            {
                id: "geneasketch", label: "GeneaSketch", items: [
                    itemNew, itemOpen, itemRecent, sep("s1"),
                    itemSave, sep("s2"),
                    itemImport, sep("s3"),
                    itemExpGed7, itemExpGed5, sep("s4"),
                    itemWiki, itemAboutV2, itemAboutV3, sep("s5"),
                    itemScenarios
                ]
            },
            {
                id: "editar", label: "Editar", items: [
                    itemEditPerson, itemPersonV3, itemAddRelation, sep("s6"),
                    itemFamilySearch, sep("s7"),
                    itemAiLocal, itemAiGlobal, itemAiSettings, itemAiUndo
                ]
            },
            {
                id: "vista", label: "Vista", items: [
                    itemFit, sep("s8"),
                    itemToggleLeft, itemToggleRight, itemToggleTimeline, sep("s9"),
                    itemTheme, itemColors, sep("s10"),
                    itemAdvancedView, itemClearPos, sep("s11"),
                    itemExpPdf, itemExpPng, itemExpJpg, sep("s12"),
                    itemDiagnostics, itemStatsGlobal, itemStatsPerson, sep("s13"),
                    itemLayoutSwitcher
                ]
            }
        ];

    }, [p, recentItems]);

    // Quick-action icons shown on the right side of the toolbar
    const actions = useMemo((): MenuItem[] => {
        if (p.menuLayout === "frequency") {
            // Layout A: no extra quick actions (menu is comprehensive)
            return [];
        }

        if (p.menuLayout === "role") {
            // Layout B: search + IA as quick access
            return [
                { id: "qa-diagnostics", label: "Diagnóstico rápido", icon: ic("search"), onClick: () => p.setShowDiagnostics(true) },
                { id: "qa-ai", label: "Asistente IA (árbol)", icon: ic("auto_awesome"), onClick: () => p.openGlobalAiAssistant() },
            ];
        }

        // Layout C (hybrid): 4 quick actions — IA, Export, View Toggle, Settings
        return [
            { id: "qa-ai", label: "Asistente IA (árbol)", icon: ic("auto_awesome"), onClick: () => p.openGlobalAiAssistant() },
            { id: "qa-search", label: "Diagnóstico", icon: ic("search"), onClick: () => p.setShowDiagnostics(true) },
            { id: "qa-export", label: "Exportar PDF", icon: ic("picture_as_pdf"), disabled: !p.document, onClick: () => p.setShowPdfExport(true) },
            { id: "qa-settings", label: "Configuración IA", icon: ic("tune"), onClick: () => p.setShowAiSettingsModal(true) },
        ];
    }, [p.menuLayout, p.document, p.setShowDiagnostics, p.openGlobalAiAssistant, p.setShowPdfExport, p.setShowAiSettingsModal]);

    return { menus, actions };
}

