import { useMemo } from "react";
import type {
    Family,
    PendingRelationType,
    ViewConfig,
    ActiveOverlay,
    OverlayType
} from "@/types/domain";
import type { GraphDocument } from "@/core/read-model/types";
import type { NodeInteraction, GraphNodeKind } from "@/types/editor";
import type { NodeActionMenuItem } from "@/ui/NodeActionMenu";

export type NodeMenuState = {
    x: number;
    y: number;
    nodeKind: GraphNodeKind;
    title: string;
    items: NodeActionMenuItem[];
} | null;

export type NodeActionsParams = {
    nodeMenu: NodeInteraction | null;
    document: GraphDocument | null;
    viewConfig: ViewConfig | null;
    // Callbacks
    setWorkspacePersonId: (id: string | null) => void;
    focusPersonInCanvas: (id: string) => void;
    openPersonEditor: (id: string) => void;
    openAddRelationEditor: (id: string, type: PendingRelationType) => void;
    clearOverlayType: (type: OverlayType) => void;
    setOverlay: (overlay: ActiveOverlay) => void;
    setStatus: (msg: string) => void;
    toggleDTreeNodeCollapse: (id: string) => void;
    setBranchAnchorId: (id: string | null) => void;
    openLocalAiAssistant: (id: string) => void;
    setPendingKinshipSourceId: (id: string | null) => void;
    setPicker: (picker: { anchorId: string, type: PendingRelationType | "kinship" } | null) => void;
    selectPersonSoft: (id: string) => void;
    setFocusFamilyId: (id: string | null) => void;
    inspectPerson: (id: string) => void;
};

export function useNodeActions(p: NodeActionsParams): NodeMenuState {

    function relationTargetFromFamily(family: Family): { anchorId: string; relationType: PendingRelationType } | null {
        if (family.husbandId) return { anchorId: family.husbandId, relationType: "child" };
        if (family.wifeId) return { anchorId: family.wifeId, relationType: "child" };
        if (family.childrenIds[0]) return { anchorId: family.childrenIds[0], relationType: "sibling" };
        return null;
    }

    const nodeMenuState = useMemo((): NodeMenuState => {
        if (!p.nodeMenu || !p.document) return null;
        const document = p.document;

        if (p.nodeMenu.nodeKind === "person") {
            const person = document.persons[p.nodeMenu.nodeId];
            if (!person) return null;

            const items: NodeActionMenuItem[] = [
                { id: "view-details", label: "👁️ Ver ficha detallada", group: "accion", onSelect: () => p.setWorkspacePersonId(person.id) },
                { id: "select-person", label: "🔍 Seleccionar persona", group: "accion", onSelect: () => p.focusPersonInCanvas(person.id) },
                { id: "edit-person", label: "📝 Editar detalles", group: "accion", onSelect: () => p.openPersonEditor(person.id) },
                { id: "add-relation", label: "➕ Agregar familiar...", group: "accion", onSelect: () => p.openAddRelationEditor(person.id, "child") }
            ];

            if (p.viewConfig?.dtree) {
                const lineageOverlay = p.viewConfig.dtree.overlays.find((overlay) => overlay.type === "lineage" && overlay.config.personId === person.id);
                const hasLineage = Boolean(lineageOverlay);
                const lineageMode = lineageOverlay?.config.mode || "all";
                if (person.sex === "M" || person.sex === "U") {
                    items.push({
                        id: "toggle-lineage-pat",
                        label: hasLineage && lineageMode === "patrilineal" ? "🧬 Quitar ADN-Y" : "🧬 Linaje patrilineal (ADN-Y)",
                        group: "vista",
                        onSelect: () => {
                            if (hasLineage && lineageMode === "patrilineal") {
                                p.clearOverlayType("lineage");
                                return;
                            }
                            p.setOverlay({ id: "lineage-hl", type: "lineage", priority: 90, config: { personId: person.id, mode: "patrilineal" } });
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
                                p.clearOverlayType("lineage");
                                return;
                            }
                            p.setOverlay({ id: "lineage-hl", type: "lineage", priority: 90, config: { personId: person.id, mode: "matrilineal" } });
                        }
                    });
                }
                const heatmapOverlay = p.viewConfig.dtree.overlays.find((overlay) => overlay.type === "heatmap");
                const heatmapActive = heatmapOverlay?.config.personId === person.id;
                items.push({
                    id: "genetic-heatmap",
                    label: heatmapActive ? "🧬 Desactivar análisis" : "🧬 Análisis de parentesco",
                    group: "herramientas",
                    onSelect: () => {
                        if (heatmapActive) {
                            p.clearOverlayType("heatmap");
                            p.setStatus("Análisis de parentesco finalizado.");
                            return;
                        }
                        p.setOverlay({ id: "genetic-heatmap", type: "heatmap", priority: 80, config: { personId: person.id, mode: "vibrant" } });
                        p.setStatus(`Analizando parentescos desde: ${person.name}`);
                    }
                });
                items.push({
                    id: "toggle-collapse",
                    label: p.viewConfig.dtree.collapsedNodeIds.includes(person.id) ? "📂 Expandir descendencia" : "📁 Colapsar descendencia",
                    group: "vista",
                    onSelect: () => p.toggleDTreeNodeCollapse(person.id)
                });
                items.push({ id: "extract-branch", label: "🌳 Extraer rama...", group: "herramientas", onSelect: () => p.setBranchAnchorId(person.id) });
            }
            items.push({ id: "ai-local", label: "🤖 Asistente IA local...", group: "herramientas", onSelect: () => p.openLocalAiAssistant(person.id) });
            items.push({
                id: "kinship-click",
                label: "🧬 Calcular parentesco (clic en gráfico)",
                group: "herramientas",
                onSelect: () => p.setPendingKinshipSourceId(person.id)
            });
            items.push({ id: "kinship-picker", label: "🧬 Calcular parentesco (selector)...", group: "herramientas", onSelect: () => p.setPicker({ anchorId: person.id, type: "kinship" }) });

            return { x: p.nodeMenu.clientX, y: p.nodeMenu.clientY, nodeKind: p.nodeMenu.nodeKind, title: `Persona: ${person.name}`, items };
        }

        const family = document.families[p.nodeMenu.nodeId];
        if (!family) return null;
        const items: NodeActionMenuItem[] = [];
        const parentItems: NodeActionMenuItem[] = [];
        if (family.husbandId && document.persons[family.husbandId]) {
            parentItems.push({
                id: `select-father-${family.husbandId}`,
                label: `👨 Padre: ${document.persons[family.husbandId].name}`,
                onSelect: () => p.selectPersonSoft(family.husbandId!)
            });
        }
        if (family.wifeId && document.persons[family.wifeId]) {
            parentItems.push({
                id: `select-mother-${family.wifeId}`,
                label: `👩 Madre: ${document.persons[family.wifeId].name}`,
                onSelect: () => p.selectPersonSoft(family.wifeId!)
            });
        }
        if (parentItems.length > 0) {
            items.push({ id: "family-parents-group", label: "👴👵 Seleccionar padres", group: "accion", children: parentItems });
        }
        const childItems = family.childrenIds.reduce<NodeActionMenuItem[]>((acc, childId) => {
            const child = document.persons[childId];
            if (child) acc.push({ id: `select-child-${child.id}`, label: `👶 ${child.name}`, onSelect: () => p.selectPersonSoft(child.id) });
            return acc;
        }, []);
        if (childItems.length > 0) {
            items.push({ id: "family-children-group", label: `👶 Hijos (${childItems.length})`, group: "accion", children: childItems });
        }
        const target = relationTargetFromFamily(family);
        if (target) {
            items.push({ id: "family-add-child", label: "👶➕ Agregar hijo", group: "accion", onSelect: () => p.openAddRelationEditor(target.anchorId, target.relationType) });
        }
        const familyFocused = p.viewConfig?.focusFamilyId === family.id;
        items.push({
            id: "focus-family",
            label: familyFocused ? "🎯 Familia centrada" : "🎯 Enfocar familia (centro)",
            group: "accion",
            disabled: familyFocused,
            onSelect: () => p.setFocusFamilyId(family.id)
        });
        if (p.viewConfig?.dtree) {
            items.push({
                id: "toggle-collapse-family",
                label: p.viewConfig.dtree.collapsedNodeIds.includes(family.id) ? "📂 Expandir descendencia" : "📁 Colapsar descendencia",
                group: "vista",
                onSelect: () => p.toggleDTreeNodeCollapse(family.id)
            });
            if (family.husbandId && family.wifeId) {
                const hasCoupleLineage = Boolean(
                    p.viewConfig.dtree.overlays.find((overlay) => overlay.type === "lineage_couple" && overlay.config.familyId === family.id)
                );
                items.push({
                    id: "couple-lineage",
                    label: hasCoupleLineage ? "🧬 Quitar linajes de pareja" : "🧬 Linajes de pareja (Y + mt)",
                    group: "vista",
                    onSelect: () => {
                        if (hasCoupleLineage) {
                            p.clearOverlayType("lineage_couple");
                            return;
                        }
                        p.setOverlay({
                            id: "couple-lineage-hl",
                            type: "lineage_couple",
                            priority: 95,
                            config: { familyId: family.id, husbandId: family.husbandId, wifeId: family.wifeId }
                        });
                    }
                });
            }
        }
        return { x: p.nodeMenu.clientX, y: p.nodeMenu.clientY, nodeKind: p.nodeMenu.nodeKind, title: `Familia: ${family.id}`, items };
    }, [p]);

    return nodeMenuState;
}

