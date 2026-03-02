import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { calculateGeneticHeatmap, findKinship, getLineagePath, getLifeOverlapInfo } from "@/core/graph/kinship";
import { consanguinityAlphaFromIntensity, normalizeConsanguinityIntensity } from "@/core/graph/endogamyVisual";
import { analyzeGeneaDocument } from "@/core/diagnostics/analyzer";
import { computeLayout } from "@/core/layout";
import { getPersonMarkerPlace } from "@/core/graph/locationMarkers";
import type { ExpandedGraph, GeneaDocument } from "@/types/domain";
import type { ColorThemeConfig, NodeInteraction } from "@/types/editor";
import { ContextCard } from "@/ui/context/ContextCard";

type Props = {
    graph: ExpandedGraph;
    document: GeneaDocument | null;
    fitNonce: number;
    onBgClick?: () => void;
    onBgDoubleClick?: () => void;
    focusPersonId: string | null;
    focusFamilyId?: string | null;
    selectedPersonId: string | null;
    colorTheme: ColorThemeConfig;
    dtreeConfig?: {
        isVertical: boolean;
        layoutEngine?: "legacy" | "vnext";
        collapsedNodeIds: string[];
        overlays: import("@/types/domain").ActiveOverlay[];
    };
    onNodeClick?: (interaction: NodeInteraction) => void;
    onNodeContextMenu?: (interaction: NodeInteraction) => void;
    onNodeDoubleClick?: (interaction: NodeInteraction) => void;
    onSvgReady?: (svg: SVGSVGElement | null) => void;
};

function interpolateHeatmapColor(val: number, mode: "vibrant" | "monochromatic" = "vibrant"): string {
    const scaledVal = normalizeConsanguinityIntensity(val);

    if (mode === "monochromatic") {
        // Monochromatic/Thematic: uses d3.interpolateBlues
        return d3.interpolateBlues(0.2 + scaledVal * 0.8);
    } else {
        // Vibrant: uses d3.interpolateTurbo
        return d3.interpolateTurbo(scaledVal);
    }
}

function getPercentageLabel(val: number): string {
    if (val >= 1) return "100%";
    const pct = val * 100;
    if (pct < 0.0001) return `< 0.0001%`;
    if (pct < 0.01) return `${pct.toFixed(6)}%`;
    if (pct < 1) return `${pct.toFixed(2)}%`;
    return `${Number(pct.toFixed(1))}%`;
}

function getKinshipDisplayText(kinship: any): string {
    if (!kinship) return "";
    const relationship = kinship.relationship;
    if (relationship?.primary) {
        return relationship.secondary ? `${relationship.primary} (${relationship.secondary})` : relationship.primary;
    }
    return kinship.relationshipText || "";
}

const TREE_PALETTE = {
    endogamyCases: [
        "var(--tree-case-1)",
        "var(--tree-case-2)",
        "var(--tree-case-3)",
        "var(--tree-case-4)",
        "var(--tree-case-5)",
        "var(--tree-case-6)",
        "var(--tree-case-7)",
        "var(--tree-case-8)"
    ],
    highlight: "var(--tree-highlight)",
    danger: "var(--tree-danger)",
    info: "var(--timeline-type-birt)",
    oldestExact: "var(--tree-oldest-exact)",
    oldestEstimated: "var(--tree-oldest-estimated)",
    oldestDeepest: "var(--tree-oldest-deepest)",
    warning: "var(--tree-warning)",
    success: "var(--tree-success)",
    familyOriginSelf: "var(--tree-family-origin-self)",
    familyOriginGroup: "var(--tree-family-origin-group)",
    oldestExactPath: "var(--tree-oldest-exact-path)",
    oldestEstimatedPath: "var(--tree-oldest-estimated-path)",
    oldestDeepestPath: "var(--tree-oldest-deepest-path)",
    livingFill: "var(--tree-living-fill)",
    livingStroke: "var(--tree-living-stroke)",
    focusStroke: "var(--tree-focus-stroke)",
    selectedStroke: "var(--tree-selected-stroke)",
    warningStroke: "var(--tree-warning-stroke)",
    endogamyChildStroke: "var(--tree-endogamy-child)",
    timelinePrimaryStroke: "var(--tree-highlight-strong)",
    patrilineal: "#0ea5e9", // Sky Blue
    matrilineal: "#ec4899", // Hot Pink
    combinedLineage: "#a855f7", // Purple
    overlayBg: "var(--overlay-panel-bg)",
    overlayBgSoft: "var(--overlay-panel-bg-soft)",
    overlayShadow: "var(--overlay-shadow)",
    overlayText: "var(--overlay-text)",
    overlayTextSoft: "var(--overlay-text-soft)",
    overlayTextMuted: "var(--overlay-text-muted)",
    kinshipAccent: "var(--tree-kinship-accent)"
} as const;

export function DTreeView({
    graph,
    document,
    fitNonce,
    onNodeClick,
    onNodeContextMenu,
    focusPersonId,
    focusFamilyId,
    selectedPersonId,
    colorTheme,
    dtreeConfig,
    onBgClick,
    onBgDoubleClick,
    onNodeDoubleClick,
    onSvgReady,
}: Props) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
    const previousPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const [hoveredNode, setHoveredNode] = useState<{ id: string; canonId: string; isPerson: boolean; x: number; y: number } | null>(null);

    const isVert = dtreeConfig?.isVertical ?? true;
    const hasAnyOverlay = !!(dtreeConfig?.overlays && dtreeConfig.overlays.length > 0);

    const personNodeWidth = isVert
        ? Math.max(170, Math.round(colorTheme.nodeWidth * 0.88))
        : Math.max(220, Math.round(colorTheme.nodeWidth * 1.15));
    const personNodeHeightWithPhoto = isVert
        ? Math.max(230, Math.round(personNodeWidth * 1.35))
        : Math.max(160, Math.round(personNodeWidth * 0.7));
    const personNodeHeightNoPhoto = isVert
        ? Math.max(90, Math.round(colorTheme.nodeHeight * 1.15))
        : Math.max(85, Math.round(colorTheme.nodeHeight * 0.9));
    const generationStep = isVert ? personNodeHeightWithPhoto + 40 : personNodeWidth + 60;

    useEffect(() => {
        onSvgReady?.(svgRef.current);
        return () => onSvgReady?.(null);
    }, [onSvgReady]);

    // --- AUXILIARY OVERLAY DATA HOOKS (Pre-resolved) ---

    const diagnosticIssues = useMemo(() => {
        const map = new Map<string, any[]>();
        const overlay = dtreeConfig?.overlays.find(o => o.type === 'layer' && o.config.layerId === 'layer-warnings');
        if (overlay && document) {
            const report = analyzeGeneaDocument(document);
            report.issues.forEach(i => {
                if (i.severity === "error" || i.severity === "warning") {
                    if (!map.has(i.entityId)) map.set(i.entityId, []);
                    map.get(i.entityId)!.push(i);
                    if (i.relatedEntityId) {
                        if (!map.has(i.relatedEntityId)) map.set(i.relatedEntityId, []);
                        map.get(i.relatedEntityId)!.push(i);
                    }
                }
            });
        }
        return map;
    }, [dtreeConfig?.overlays, document]);

    const endogamyData = useMemo(() => {
        type EndogamyRole = {
            role: "ancestor" | "parent" | "child" | "family" | "path";
            kinship?: any;
            color: string;
            contextText?: string;
        };
        const data = {
            edgeColors: new Map<string, string[]>(),
            roles: new Map<string, EndogamyRole[]>()
        };

        const overlay = dtreeConfig?.overlays.find(o => o.type === 'layer' && o.config.layerId === 'layer-endogamy');
        if (overlay && document) {

            const addRole = (nodeId: string, roleData: EndogamyRole) => {
                if (!data.roles.has(nodeId)) data.roles.set(nodeId, []);
                const existing = data.roles.get(nodeId)!;
                if (!existing.some(r =>
                    r.role === roleData.role &&
                    (r.kinship?.relationship?.canonicalKey || r.kinship?.relationshipText) === (roleData.kinship?.relationship?.canonicalKey || roleData.kinship?.relationshipText) &&
                    r.contextText === roleData.contextText
                )) {
                    existing.push(roleData);
                }
            };

            const consanguineousFamilies = Object.values(document.families).filter(fam => {
                if (fam.husbandId && fam.wifeId) {
                    const kinship = findKinship(document, fam.husbandId, fam.wifeId);
                    return kinship && kinship.sharedDnaPercentage > 0;
                }
                return false;
            });

            consanguineousFamilies.forEach(fam => {
                const kinship = findKinship(document, fam.husbandId!, fam.wifeId!);
                if (!kinship) return;

                const dnaFactor = normalizeConsanguinityIntensity(kinship.sharedDnaPercentage);
                const caseScale = d3
                    .scaleLinear<string>()
                    .domain([0, 0.55, 1])
                    .range(["#64748b", "#f59e0b", "#dc2626"])
                    .interpolate(d3.interpolateHcl);
                const baseColor = caseScale(dnaFactor);
                const colorWithAlpha = d3.color(baseColor);
                if (colorWithAlpha) {
                    colorWithAlpha.opacity = consanguinityAlphaFromIntensity(dnaFactor);
                }
                const caseColor = colorWithAlpha ? colorWithAlpha.formatRgb() : baseColor;

                const mrcas = kinship.pathPersonIds.filter(id => {
                    const p = document.persons[id];
                    if (!p) return false;
                    let hasParentInPath = false;
                    if (p.famc) {
                        p.famc.forEach(fId => {
                            const f = document.families[fId];
                            if (f && ((f.husbandId && kinship.pathPersonIds.includes(f.husbandId)) || (f.wifeId && kinship.pathPersonIds.includes(f.wifeId)))) {
                                hasParentInPath = true;
                            }
                        });
                    }
                    return !hasParentInPath;
                });

                const targetPathNodes = new Set<string>();
                const p1Label = `${document.persons[fam.husbandId!]?.name ?? fam.husbandId} ${document.persons[fam.husbandId!]?.surname ?? ""}`.trim();
                const p2Label = `${document.persons[fam.wifeId!]?.name ?? fam.wifeId} ${document.persons[fam.wifeId!]?.surname ?? ""}`.trim();
                const ancestorContext = `Punto de convergencia de una ramificación recurrente entre ${p1Label} y ${p2Label}.`;

                const registerNode = (canonId: string, role: EndogamyRole["role"], contextText?: string) => {
                    const matchingNodes = graph.nodes.filter(n => (n.canonicalId ?? n.id) === canonId);
                    matchingNodes.forEach(mn => {
                        targetPathNodes.add(mn.id);
                        addRole(mn.id, { role, kinship, color: caseColor, contextText });
                    });
                };
                mrcas.forEach((anc) => registerNode(anc, "ancestor", ancestorContext));
                kinship.pathPersonIds.forEach(pathId => {
                    if (!mrcas.includes(pathId) && pathId !== fam.husbandId && pathId !== fam.wifeId) {
                        registerNode(pathId, 'path');
                    }
                });
                Object.values(document.families).forEach(f => {
                    const hasParentInPath = (f.husbandId && kinship.pathPersonIds.includes(f.husbandId)) || (f.wifeId && kinship.pathPersonIds.includes(f.wifeId));
                    const hasChildInPath = f.childrenIds.some(cid => kinship.pathPersonIds.includes(cid));
                    if (hasParentInPath && hasChildInPath && f.id !== fam.id) {
                        registerNode(f.id, 'path');
                    }
                });
                registerNode(fam.husbandId!, 'parent');
                registerNode(fam.wifeId!, 'parent');
                fam.childrenIds.forEach(child => registerNode(child, 'child'));
                registerNode(fam.id, 'family');

                const safeSetEdgeColor = (edgeId: string, color: string) => {
                    if (!data.edgeColors.has(edgeId)) data.edgeColors.set(edgeId, []);
                    if (!data.edgeColors.get(edgeId)!.includes(color)) data.edgeColors.get(edgeId)!.push(color);
                };

                graph.edges.forEach(e => {
                    const fromNode = graph.nodes.find(n => n.id === e.from);
                    const toNode = graph.nodes.find(n => n.id === e.to);
                    if (fromNode && toNode) {
                        if (targetPathNodes.has(fromNode.id) && targetPathNodes.has(toNode.id)) safeSetEdgeColor(e.id, caseColor);
                        else if (fromNode.type === 'junction' && targetPathNodes.has(toNode.id)) {
                            const feedingEdge = graph.edges.find(fe => fe.to === fromNode.id && targetPathNodes.has(fe.from));
                            if (feedingEdge) { safeSetEdgeColor(e.id, caseColor); safeSetEdgeColor(feedingEdge.id, caseColor); targetPathNodes.add(fromNode.id); }
                        }
                        else if (toNode.type === 'junction' && targetPathNodes.has(fromNode.id)) {
                            const outgoingEdge = graph.edges.find(oe => oe.from === toNode.id && targetPathNodes.has(oe.to));
                            if (outgoingEdge) { safeSetEdgeColor(e.id, caseColor); safeSetEdgeColor(outgoingEdge.id, caseColor); targetPathNodes.add(toNode.id); }
                        }
                    }
                });
            });
        }
        return data;
    }, [dtreeConfig?.overlays, graph, document]);

    const familyOriginTargetId = useMemo(() => {
        const overlay = dtreeConfig?.overlays.find(o => o.type === 'origin');
        return overlay?.config.personId ?? null;
    }, [dtreeConfig?.overlays]);

    const familyOriginData = useMemo(() => {
        const empty = { highlightIds: new Set<string>(), summary: null };
        if (!familyOriginTargetId || !document) return empty;
        const person = document.persons[familyOriginTargetId];
        if (!person || person.famc.length === 0) return { highlightIds: new Set<string>([familyOriginTargetId]), summary: null };
        const highlightIds = new Set<string>([familyOriginTargetId]);
        const originFamId = person.famc[0];
        const originFam = document.families[originFamId];
        if (!originFam) return empty;
        if (originFam.husbandId) highlightIds.add(originFam.husbandId);
        if (originFam.wifeId) highlightIds.add(originFam.wifeId);
        for (const sibId of originFam.childrenIds) highlightIds.add(sibId);
        graph.nodes.filter(n => n.id === originFamId || n.canonicalId === originFamId).forEach(n => highlightIds.add(n.id));
        const marriageDate = originFam.events?.find(e => e.type === "MARR")?.date;
        const birthYears: number[] = [];
        for (const cId of originFam.childrenIds) {
            const b = document.persons[cId]?.events.find(e => e.type === "BIRT")?.date;
            if (b) { const y = parseInt(b.replace(/\D/g, "").slice(0, 4), 10); if (!isNaN(y) && y > 0) birthYears.push(y); }
        }
        [originFam.husbandId, originFam.wifeId].forEach(pId => {
            if (!pId) return;
            const b = document.persons[pId]?.events.find(e => e.type === "BIRT")?.date;
            if (b) { const y = parseInt(b.replace(/\D/g, "").slice(0, 4), 10); if (!isNaN(y) && y > 0) birthYears.push(y); }
        });
        const avg = birthYears.length > 0 ? Math.round(birthYears.reduce((a, b) => a + b, 0) / birthYears.length) : 0;
        const romans = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
        const century = avg > 0 ? Math.ceil(avg / 100) : 0;
        const era = avg > 0 ? `S.${romans[century] ?? century} (~${avg})` : undefined;
        const locationCounts = new Map<string, number>();
        for (const cId of originFam.childrenIds) {
            const place = document.persons[cId]?.events.find(e => e.type === "BIRT")?.place?.trim();
            if (place) locationCounts.set(place, (locationCounts.get(place) ?? 0) + 1);
        }
        if (locationCounts.size === 0) {
            for (const pId of [originFam.husbandId, originFam.wifeId]) {
                if (!pId) continue;
                const place = document.persons[pId]?.events.find(e => e.type === "BIRT")?.place?.trim();
                if (place) locationCounts.set(place, (locationCounts.get(place) ?? 0) + 1);
            }
        }
        const location = [...locationCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        return { highlightIds, summary: { famId: originFamId, children: originFam.childrenIds.length, marriageDate, era, location } };
    }, [familyOriginTargetId, document, graph]);

    const deepestAncestorSets = useMemo(() => {
        const overlay = dtreeConfig?.overlays.find(o => o.type === 'deepest');
        if (!overlay) return null;
        const config = overlay.config;
        const mapToNodeIds = (personIds: string[]): Set<string> => {
            const s = new Set<string>();
            for (const pid of personIds) {
                s.add(pid);
                for (const n of graph.nodes) if (n.canonicalId === pid || n.id === pid) s.add(n.id);
            }
            for (const n of graph.nodes) {
                if (n.type === 'family' || n.type === 'familyAlias' || n.type === 'junction') {
                    const neighbors = graph.edges.filter(e => e.from === n.id || e.to === n.id).map(e => e.from === n.id ? e.to : e.from);
                    if (neighbors.filter(nb => s.has(nb)).length >= 2) s.add(n.id);
                }
            }
            return s;
        };
        return {
            exact: mapToNodeIds(config.exactPath || []),
            estimated: mapToNodeIds(config.estimatedPath || []),
            deepest: mapToNodeIds(config.deepestPath || []),
            targetId: config.targetId,
            exactEndId: config.exactId,
            estimatedEndId: config.estimatedId,
            deepestEndId: config.deepestId,
        };
    }, [dtreeConfig?.overlays, graph]);



    const timelineLivingNodeIds = useMemo(() => {
        const overlay = dtreeConfig?.overlays.find(o => o.type === 'timeline');
        const personIds = new Set(overlay?.config.livingIds || []);
        const livingNodeIds = new Set<string>();
        if (personIds.size === 0) return livingNodeIds;
        graph.nodes.forEach((node) => {
            if (node.type !== "person" && node.type !== "personAlias") return;
            const canonicalId = node.canonicalId ?? node.id;
            if (personIds.has(canonicalId)) livingNodeIds.add(node.id);
        });
        return livingNodeIds;
    }, [dtreeConfig?.overlays, graph]);

    const timelineDeceasedNodeIds = useMemo(() => {
        const overlay = dtreeConfig?.overlays.find(o => o.type === 'timeline');
        const personIds = new Set(overlay?.config.deceasedIds || []);
        const deceasedNodeIds = new Set<string>();
        if (personIds.size === 0) return deceasedNodeIds;
        graph.nodes.forEach((node) => {
            if (node.type !== "person" && node.type !== "personAlias") return;
            const canonicalId = node.canonicalId ?? node.id;
            if (personIds.has(canonicalId)) deceasedNodeIds.add(node.id);
        });
        return deceasedNodeIds;
    }, [dtreeConfig?.overlays, graph]);

    const timelineEventNodeIds = useMemo(() => {
        const overlay = dtreeConfig?.overlays.find(o => o.type === 'timeline');
        const personIds = new Set(overlay?.config.eventPersonIds || []);
        const eventNodeIds = new Set<string>();
        if (personIds.size === 0) return eventNodeIds;
        graph.nodes.forEach((node) => {
            if (node.type !== "person" && node.type !== "personAlias") return;
            const canonicalId = node.canonicalId ?? node.id;
            if (personIds.has(canonicalId)) eventNodeIds.add(node.id);
        });
        return eventNodeIds;
    }, [dtreeConfig?.overlays, graph]);

    const hasFamilyOriginHL = familyOriginData.highlightIds.size > 0;

    // --- NEW UNIFIED OVERLAY RESOLVER ---
    const resolvedVisuals = useMemo(() => {
        const nodeStyles = new Map<string, { fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; badge?: string }>();
        const edgeStyles = new Map<string, { color?: string; opacity?: number; thickness?: number }>();
        const activeBadges: any[] = [];

        if (!document || !dtreeConfig?.overlays) return { nodeStyles, edgeStyles, activeBadges };

        // Sort by priority (ascending, so higher priority overwrites)
        const sortedOverlays = [...dtreeConfig.overlays].sort((a, b) => a.priority - b.priority);

        for (const overlay of sortedOverlays) {
            const { type, config } = overlay;

            if (type === 'lineage') {
                const { personId, mode } = config;
                const { personIds, oldestId } = getLineagePath(document, personId, mode);
                const color = mode === 'patrilineal' ? TREE_PALETTE.patrilineal : mode === 'matrilineal' ? TREE_PALETTE.matrilineal : TREE_PALETTE.highlight;

                personIds.forEach(pid => {
                    graph.nodes.filter(n => n.id === pid || n.canonicalId === pid).forEach(n => {
                        nodeStyles.set(n.id, { fill: color, opacity: 1 });
                    });
                });

                // Edges in lineage
                const fullPathIds = new Set(personIds);
                graph.nodes.filter(n => n.type === 'family' || n.type === 'familyAlias' || n.type === 'junction').forEach(fn => {
                    const famId = fn.canonicalId || fn.id.replace('junction:', '');
                    const fam = document.families[famId];
                    if (fam) {
                        const members = [fam.husbandId, fam.wifeId, ...fam.childrenIds].filter(m => m && personIds.has(m));
                        if (members.length >= 2) fullPathIds.add(fn.id);
                    }
                });

                graph.edges.forEach(edge => {
                    const fId = graph.nodes.find(n => n.id === edge.from)?.canonicalId || edge.from;
                    const tId = graph.nodes.find(n => n.id === edge.to)?.canonicalId || edge.to;
                    if (fullPathIds.has(fId) && fullPathIds.has(tId)) {
                        edgeStyles.set(edge.id, { color, opacity: 0.9, thickness: colorTheme.edgeThickness * 1.5 });
                    }
                });

                if (mode !== 'all') {
                    const oldestPerson = document.persons[oldestId];
                    const targetPerson = document.persons[personId];
                    activeBadges.push({
                        type: 'lineage',
                        mode,
                        targetName: targetPerson?.name || personId,
                        oldestName: oldestPerson?.name || oldestId,
                        count: personIds.size
                    });
                }
            }

            if (type === 'lineage_couple') {
                const { husbandId, wifeId } = config;
                const husbandPath = getLineagePath(document, husbandId, 'patrilineal');
                const wifePath = getLineagePath(document, wifeId, 'matrilineal');

                const husbandColor = TREE_PALETTE.patrilineal;
                const wifeColor = TREE_PALETTE.matrilineal;

                const combinedColor = TREE_PALETTE.combinedLineage;

                // 1. Person Nodes
                const allPersons = new Set([...husbandPath.personIds, ...wifePath.personIds]);
                allPersons.forEach(pid => {
                    const isH = husbandPath.personIds.has(pid);
                    const isW = wifePath.personIds.has(pid);
                    const color = (isH && isW) ? combinedColor : isH ? husbandColor : wifeColor;

                    graph.nodes.filter(n => (n.id === pid || n.canonicalId === pid) && (n.type === 'person' || n.type === 'personAlias')).forEach(n => {
                        nodeStyles.set(n.id, { fill: color, opacity: 1 });
                    });
                });

                // 2. Family & Junction Nodes
                graph.nodes.filter(n => n.type === 'family' || n.type === 'familyAlias' || n.type === 'junction').forEach(n => {
                    let famId = n.canonicalId || n.id;
                    if (n.type === 'junction') {
                        famId = n.id.replace('junction:', '');
                    }

                    const fam = document.families[famId];
                    if (fam) {
                        const hId = fam.husbandId;
                        const wId = fam.wifeId;
                        const hInH = !!(hId && husbandPath.personIds.has(hId));
                        const hInW = !!(hId && wifePath.personIds.has(hId));
                        const wInH = !!(wId && husbandPath.personIds.has(wId));
                        const wInW = !!(wId && wifePath.personIds.has(wId));

                        if ((hInH && wInW) || (hInW && wInH) || (hInH && wInH) || (hInW && wInW)) {
                            nodeStyles.set(n.id, { fill: combinedColor, opacity: 1 });
                        } else if (hInH || hInW || fam.childrenIds.some(cid => husbandPath.personIds.has(cid))) {
                            nodeStyles.set(n.id, { fill: husbandColor, opacity: 1 });
                        } else if (wInW || wInH || fam.childrenIds.some(cid => wifePath.personIds.has(cid))) {
                            nodeStyles.set(n.id, { fill: wifeColor, opacity: 1 });
                        }
                    }
                });

                // 3. Edges
                graph.edges.forEach(edge => {
                    const fromNode = graph.nodes.find(n => n.id === edge.from);
                    const toNode = graph.nodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return;

                    const fromStyle = nodeStyles.get(fromNode.id);
                    const toStyle = nodeStyles.get(toNode.id);
                    if (!fromStyle || !toStyle) return;

                    if (fromStyle.fill === combinedColor && toStyle.fill === combinedColor) {
                        edgeStyles.set(edge.id, { color: combinedColor, opacity: 0.95, thickness: colorTheme.edgeThickness * 2 });
                    } else {
                        const isPartHusband = fromStyle.fill === husbandColor || toStyle.fill === husbandColor || fromStyle.fill === combinedColor || toStyle.fill === combinedColor;
                        const isPartWife = fromStyle.fill === wifeColor || toStyle.fill === wifeColor || fromStyle.fill === combinedColor || toStyle.fill === combinedColor;

                        if (isPartHusband && isPartWife) {
                            edgeStyles.set(edge.id, { color: combinedColor, opacity: 0.9, thickness: colorTheme.edgeThickness * 1.5 });
                        } else if (isPartHusband) {
                            edgeStyles.set(edge.id, { color: husbandColor, opacity: 0.9, thickness: colorTheme.edgeThickness * 1.5 });
                        } else if (isPartWife) {
                            edgeStyles.set(edge.id, { color: wifeColor, opacity: 0.9, thickness: colorTheme.edgeThickness * 1.5 });
                        }
                    }
                });

                activeBadges.push({
                    type: 'lineage',
                    mode: 'couple',
                    husbandName: document.persons[husbandId]?.name || husbandId,
                    wifeName: document.persons[wifeId]?.name || wifeId,
                    husbandCount: husbandPath.personIds.size,
                    wifeCount: wifePath.personIds.size
                });
            }

            if (type === 'kinship') {
                const { person1Id, person2Id } = config;
                const kinshipResult = findKinship(document, person1Id, person2Id);
                if (kinshipResult) {
                    const pathIds = new Set(kinshipResult.pathPersonIds);
                    pathIds.forEach(pid => {
                        graph.nodes.filter(n => n.id === pid || n.canonicalId === pid).forEach(n => {
                            nodeStyles.set(n.id, { fill: TREE_PALETTE.highlight, opacity: 1 });
                        });
                    });

                    const fullPathIds = new Set(pathIds);
                    graph.nodes.filter(n => n.type === 'family' || n.type === 'familyAlias' || n.type === 'junction').forEach(fn => {
                        const famId = fn.canonicalId || fn.id.replace('junction:', '');
                        const fam = document.families[famId];
                        if (fam) {
                            const members = [fam.husbandId, fam.wifeId, ...fam.childrenIds].filter(m => m && pathIds.has(m));
                            if (members.length >= 2) fullPathIds.add(fn.id);
                        }
                    });

                    graph.edges.forEach(edge => {
                        const fromNode = graph.nodes.find(n => n.id === edge.from);
                        const toNode = graph.nodes.find(n => n.id === edge.to);
                        if (!fromNode || !toNode) return;

                        const fromId = fromNode.canonicalId || fromNode.id;
                        const toId = toNode.canonicalId || toNode.id;

                        if (fullPathIds.has(fromId) && fullPathIds.has(toId)) {
                            edgeStyles.set(edge.id, { color: TREE_PALETTE.highlight, opacity: 0.9, thickness: colorTheme.edgeThickness * 1.5 });
                        }
                    });

                    activeBadges.push({
                        type: 'kinship',
                        text: kinshipResult.relationship?.primary ?? kinshipResult.relationshipText,
                        textSecondary: kinshipResult.relationship?.secondary,
                        p1: document.persons[person1Id]?.name || person1Id,
                        p2: document.persons[person2Id]?.name || person2Id,
                        sharedDnaPercentage: kinshipResult.sharedDnaPercentage,
                        yDnaShared: kinshipResult.yDnaShared,
                        mtDnaShared: kinshipResult.mtDnaShared
                    });
                }
            }

            if (type === 'heatmap') {
                const { personId, mode, targetId } = config;
                const heatmap = calculateGeneticHeatmap(document, personId);
                const hMode = mode || 'vibrant';

                graph.nodes.forEach(n => {
                    const canonId = n.canonicalId ?? n.id;
                    const dna = heatmap.dnaMap.get(canonId) || 0;
                    if (dna > 0) {
                        const fill = interpolateHeatmapColor(dna, hMode);
                        nodeStyles.set(n.id, { fill, opacity: 1 });
                    } else if (!nodeStyles.has(n.id)) {
                        nodeStyles.set(n.id, { opacity: 0.15 });
                    }
                });

                graph.edges.forEach(edge => {
                    const fromCanon = graph.nodes.find(n => n.id === edge.from)?.canonicalId ?? edge.from;
                    const toCanon = graph.nodes.find(n => n.id === edge.to)?.canonicalId ?? edge.to;
                    const d1 = heatmap.dnaMap.get(fromCanon) || 0;
                    const d2 = heatmap.dnaMap.get(toCanon) || 0;
                    if (d1 > 0 || d2 > 0) {
                        edgeStyles.set(edge.id, {
                            color: interpolateHeatmapColor(Math.max(d1, d2), hMode),
                            opacity: 0.8,
                            thickness: colorTheme.edgeThickness * 1.2
                        });
                    } else if (!edgeStyles.has(edge.id)) {
                        edgeStyles.set(edge.id, { opacity: 0.1 });
                    }
                });

                // If a target is selected in heatmap mode, show path and badge
                if (targetId) {
                    const kinshipResult = findKinship(document, personId, targetId);
                    if (kinshipResult) {
                        const pathIds = new Set(kinshipResult.pathPersonIds);
                        pathIds.forEach(pid => {
                            graph.nodes.filter(n => n.id === pid || n.canonicalId === pid).forEach(n => {
                                const current = nodeStyles.get(n.id) || {};
                                nodeStyles.set(n.id, {
                                    ...current,
                                    stroke: TREE_PALETTE.warning,
                                    strokeWidth: 3.5,
                                    opacity: 1
                                });
                            });
                        });

                        const fullPathIds = new Set(pathIds);
                        graph.nodes.forEach(n => {
                            const canonId = n.canonicalId || n.id;
                            if (n.type === 'family' || n.type === 'familyAlias' || n.type === 'junction') {
                                const famId = n.type === 'junction' ? n.id.replace('junction:', '') : canonId;
                                const fam = document.families[famId];
                                if (fam) {
                                    const members = [fam.husbandId, fam.wifeId, ...fam.childrenIds].filter(m => m && pathIds.has(m));
                                    if (members.length >= 2) {
                                        fullPathIds.add(n.id);
                                        // Also highlight the family node itself
                                        const current = nodeStyles.get(n.id) || {};
                                        nodeStyles.set(n.id, { ...current, stroke: TREE_PALETTE.warning, strokeWidth: 2, opacity: 1 });
                                    }
                                }
                            }
                        });

                        graph.edges.forEach(edge => {
                            const fromNode = graph.nodes.find(n => n.id === edge.from);
                            const toNode = graph.nodes.find(n => n.id === edge.to);
                            if (!fromNode || !toNode) return;

                            const fId = fromNode.canonicalId || fromNode.id;
                            const tId = toNode.canonicalId || toNode.id;

                            if (fullPathIds.has(fId) && fullPathIds.has(tId)) {
                                edgeStyles.set(edge.id, {
                                    color: TREE_PALETTE.warning,
                                    opacity: 1,
                                    thickness: colorTheme.edgeThickness * 2.5
                                });
                            }
                        });

                        activeBadges.push({
                            type: 'kinship',
                            text: kinshipResult.relationship?.primary ?? kinshipResult.relationshipText,
                            textSecondary: kinshipResult.relationship?.secondary,
                            p1: document.persons[personId]?.name || personId,
                            p2: document.persons[targetId]?.name || targetId,
                            sharedDnaPercentage: kinshipResult.sharedDnaPercentage,
                            yDnaShared: kinshipResult.yDnaShared,
                            mtDnaShared: kinshipResult.mtDnaShared
                        });
                    }
                }
            }

            if (type === 'origin') {
                const { personId } = config;
                const targetPerson = document.persons[personId];
                if (targetPerson && targetPerson.famc.length > 0) {
                    const famId = targetPerson.famc[0];
                    const fam = document.families[famId];
                    if (fam) {
                        const hlIds = new Set<string>([famId, fam.husbandId!, fam.wifeId!, ...fam.childrenIds].filter(Boolean));
                        hlIds.forEach(id => {
                            graph.nodes.filter(n => n.id === id || n.canonicalId === id).forEach(n => {
                                nodeStyles.set(n.id, {
                                    fill: (id === personId) ? TREE_PALETTE.familyOriginSelf : TREE_PALETTE.familyOriginGroup,
                                    opacity: 1
                                });
                            });
                        });
                        const fullHlIds = new Set(hlIds);
                        graph.nodes.filter(n => n.type === 'family' || n.type === 'familyAlias' || n.type === 'junction').forEach(fn => {
                            const famId = fn.canonicalId || fn.id.replace('junction:', '');
                            if (hlIds.has(famId)) fullHlIds.add(fn.id);
                        });

                        graph.edges.forEach(edge => {
                            const fId = graph.nodes.find(n => n.id === edge.from)?.canonicalId || edge.from;
                            const tId = graph.nodes.find(n => n.id === edge.to)?.canonicalId || edge.to;
                            if (fullHlIds.has(fId) && fullHlIds.has(tId)) {
                                edgeStyles.set(edge.id, { color: TREE_PALETTE.info, opacity: 0.9, thickness: colorTheme.edgeThickness * 1.8 });
                            }
                        });
                    }
                }
            }

            if (type === 'deepest') {
                if (!deepestAncestorSets) continue;
                const { targetId, exact, estimated, deepest, exactEndId, estimatedEndId, deepestEndId } = deepestAncestorSets;

                const applyPathSet = (s: Set<string>, color: string, pathColor: string, weight: number, op: number, endId?: string) => {
                    s.forEach(nodeId => {
                        const isEnd = nodeId === endId;
                        const isTarget = nodeId === targetId;
                        nodeStyles.set(nodeId, {
                            fill: isTarget ? TREE_PALETTE.warning : isEnd ? color : pathColor,
                            opacity: op
                        });
                    });
                    graph.edges.forEach(edge => {
                        const fNode = graph.nodes.find(n => n.id === edge.from);
                        const tNode = graph.nodes.find(n => n.id === edge.to);
                        if (!fNode || !tNode) return;
                        const fId = fNode.canonicalId || fNode.id;
                        const tId = tNode.canonicalId || tNode.id;

                        if (s.has(fId) && s.has(tId)) {
                            edgeStyles.set(edge.id, { color, opacity: Math.min(1, op + 0.1), thickness: colorTheme.edgeThickness * weight });
                        }
                    });
                };

                applyPathSet(deepest, TREE_PALETTE.oldestDeepest, TREE_PALETTE.oldestDeepestPath, 1.3, 0.45, deepestEndId);
                applyPathSet(estimated, TREE_PALETTE.oldestEstimated, TREE_PALETTE.oldestEstimatedPath, 1.6, 0.7, estimatedEndId);
                applyPathSet(exact, TREE_PALETTE.oldestExact, TREE_PALETTE.oldestExactPath, 2, 0.95, exactEndId);
            }

            if (type === 'timeline') {
                const { livingIds = [], deceasedIds = [], primaryId, secondaryIds = [] } = config;
                const livingSet = new Set(livingIds);
                const deceasedSet = new Set(deceasedIds);
                const secSet = new Set(secondaryIds);

                graph.nodes.forEach(n => {
                    const canonId = n.canonicalId ?? n.id;
                    if (canonId === primaryId || secSet.has(canonId)) {
                        nodeStyles.set(n.id, { fill: TREE_PALETTE.warning, opacity: 1 });
                    } else if (livingSet.has(canonId)) {
                        nodeStyles.set(n.id, { fill: TREE_PALETTE.success, opacity: 1 });
                    } else if (deceasedSet.has(canonId)) {
                        nodeStyles.set(n.id, { fill: TREE_PALETTE.danger, opacity: 1 });
                    }
                });

                graph.edges.forEach(edge => {
                    const fromCanon = graph.nodes.find(n => n.id === edge.from)?.canonicalId ?? edge.from;
                    const toCanon = graph.nodes.find(n => n.id === edge.to)?.canonicalId ?? edge.to;
                    const isPrim = fromCanon === primaryId || toCanon === primaryId;
                    const isSec = secSet.has(fromCanon) || secSet.has(toCanon);
                    if (isPrim || isSec) {
                        edgeStyles.set(edge.id, { color: TREE_PALETTE.warning, opacity: isPrim ? 0.95 : 0.62, thickness: colorTheme.edgeThickness * (isPrim ? 2.1 : 1.6) });
                    }
                });
            }

            if (type === 'merge_focus') {
                const primarySet = new Set<string>((config.primaryIds || []).map((id: string) => String(id)));
                const secondaryLevel1Set = new Set<string>(
                    (config.secondaryLevel1Ids || config.secondaryIds || []).map((id: string) => String(id))
                );
                const secondaryLevel2Set = new Set<string>((config.secondaryLevel2Ids || []).map((id: string) => String(id)));
                if (primarySet.size === 0 && secondaryLevel1Set.size === 0 && secondaryLevel2Set.size === 0) continue;

                graph.nodes.forEach((node) => {
                    const canonId = node.canonicalId ?? node.id;
                    const current = nodeStyles.get(node.id) || {};
                    if (primarySet.has(canonId)) {
                        nodeStyles.set(node.id, {
                            ...current,
                            opacity: 1,
                            stroke: TREE_PALETTE.timelinePrimaryStroke,
                            strokeWidth: 4
                        });
                    } else if (secondaryLevel1Set.has(canonId)) {
                        nodeStyles.set(node.id, {
                            ...current,
                            opacity: 0.82,
                            stroke: TREE_PALETTE.warning,
                            strokeWidth: 2.5
                        });
                    } else if (secondaryLevel2Set.has(canonId)) {
                        nodeStyles.set(node.id, {
                            ...current,
                            opacity: 0.64,
                            stroke: TREE_PALETTE.highlight,
                            strokeWidth: 1.8
                        });
                    } else {
                        nodeStyles.set(node.id, {
                            ...current,
                            opacity: Math.min(current.opacity ?? 1, 0.16)
                        });
                    }
                });

                graph.edges.forEach((edge) => {
                    const fromCanon = graph.nodes.find((n) => n.id === edge.from)?.canonicalId ?? edge.from;
                    const toCanon = graph.nodes.find((n) => n.id === edge.to)?.canonicalId ?? edge.to;
                    const current = edgeStyles.get(edge.id) || {};
                    const touchesPrimary = primarySet.has(fromCanon) || primarySet.has(toCanon);
                    const touchesSecondaryLevel1 = secondaryLevel1Set.has(fromCanon) || secondaryLevel1Set.has(toCanon);
                    const touchesSecondaryLevel2 = secondaryLevel2Set.has(fromCanon) || secondaryLevel2Set.has(toCanon);
                    if (touchesPrimary || touchesSecondaryLevel1 || touchesSecondaryLevel2) {
                        edgeStyles.set(edge.id, {
                            ...current,
                            color: touchesPrimary
                                ? TREE_PALETTE.timelinePrimaryStroke
                                : touchesSecondaryLevel1
                                    ? TREE_PALETTE.warning
                                    : TREE_PALETTE.highlight,
                            opacity: touchesPrimary ? 0.96 : touchesSecondaryLevel1 ? 0.66 : 0.48,
                            thickness: colorTheme.edgeThickness * (touchesPrimary ? 2.2 : touchesSecondaryLevel1 ? 1.6 : 1.2)
                        });
                    } else {
                        edgeStyles.set(edge.id, {
                            ...current,
                            opacity: Math.min(current.opacity ?? 1, 0.08)
                        });
                    }
                });
            }

            if (type === 'layer') {
                const layerId = config.layerId;
                if (layerId === 'layer-warnings' && document) {
                    const report = analyzeGeneaDocument(document);
                    const issueTargetIds = new Set(report.issues.map(i => i.entityId));
                    graph.nodes.forEach(n => {
                        const canonId = n.canonicalId ?? n.id;
                        if (issueTargetIds.has(canonId)) {
                            nodeStyles.set(n.id, { fill: TREE_PALETTE.danger, opacity: 1 });
                        } else if (!nodeStyles.has(n.id)) {
                            nodeStyles.set(n.id, { opacity: 0.15 });
                        }
                    });
                    graph.edges.forEach(edge => {
                        const fromCanon = graph.nodes.find(n => n.id === edge.from)?.canonicalId ?? edge.from;
                        const toCanon = graph.nodes.find(n => n.id === edge.to)?.canonicalId ?? edge.to;
                        if (issueTargetIds.has(fromCanon) && issueTargetIds.has(toCanon)) {
                            edgeStyles.set(edge.id, { color: TREE_PALETTE.danger, opacity: 0.8, thickness: colorTheme.edgeThickness * 1.5 });
                        } else if (!edgeStyles.has(edge.id)) {
                            edgeStyles.set(edge.id, { opacity: 0.1 });
                        }
                    });
                } else if (layerId === 'layer-symmetry' && document) {
                    graph.nodes.forEach(n => {
                        if (n.type === 'person' || n.type === 'personAlias') {
                            const p = document.persons[n.canonicalId ?? n.id];
                            let known = 0;
                            if (p?.famc.length > 0) {
                                const f = document.families[p.famc[0]];
                                if (f?.husbandId) known++;
                                if (f?.wifeId) known++;
                            }
                            const fill = known === 2 ? TREE_PALETTE.success : known === 1 ? TREE_PALETTE.warning : TREE_PALETTE.danger;
                            nodeStyles.set(n.id, { fill, opacity: 1 });
                        } else {
                            nodeStyles.set(n.id, { opacity: 0.15 });
                        }
                    });
                    graph.edges.forEach(edge => edgeStyles.set(edge.id, { opacity: 0.25 }));
                } else if (layerId === 'layer-places' && document) {
                    const mode = config.mode || 'intelligent';
                    graph.nodes.forEach(n => {
                        if (n.type === 'person' || n.type === 'personAlias') {
                            const p = document.persons[n.canonicalId ?? n.id];
                            if (!p) return;

                            const placeStr = getPersonMarkerPlace(p, mode);
                            if (placeStr?.trim()) {
                                const place = placeStr.trim().toUpperCase();
                                let hash = 0;
                                for (let i = 0; i < place.length; i++) hash = place.charCodeAt(i) + ((hash << 5) - hash);
                                nodeStyles.set(n.id, { fill: `hsl(${Math.abs(hash) % 360}, 75%, 28%)`, opacity: 1 });
                            } else {
                                nodeStyles.set(n.id, { opacity: 0.25 });
                            }
                        } else {
                            nodeStyles.set(n.id, { opacity: 0.15 });
                        }
                    });
                    graph.edges.forEach(edge => edgeStyles.set(edge.id, { opacity: 0.25 }));
                } else if (layerId === 'layer-endogamy' && document) {
                    const roles = endogamyData.roles;
                    graph.nodes.forEach(n => {
                        const r = roles.get(n.id) || [];
                        const uniqueColors = Array.from(new Set(r.map(role => role.color)));
                        const isChild = r.some(role => role.role === 'child');
                        if (uniqueColors.length > 0) {
                            nodeStyles.set(n.id, {
                                fill: uniqueColors.length === 1 ? uniqueColors[0] : `url(#grad-endo-${n.id})`,
                                opacity: 1,
                                stroke: isChild ? TREE_PALETTE.endogamyChildStroke : (uniqueColors.length === 1 ? uniqueColors[0] : undefined),
                                strokeWidth: isChild ? 6 : 3.5
                            });
                        } else {
                            nodeStyles.set(n.id, { opacity: 0.15 });
                        }
                    });
                    graph.edges.forEach(edge => {
                        const colors = endogamyData.edgeColors.get(edge.id);
                        if (colors && colors.length > 0) {
                            edgeStyles.set(edge.id, { color: colors[0], opacity: 0.8, thickness: colorTheme.edgeThickness * 1.5 });
                        } else {
                            edgeStyles.set(edge.id, { opacity: 0.1 });
                        }
                    });
                }
            }
        }

        // Apply selection/focus styles last to ensure they override overlays
        graph.nodes.forEach(n => {
            const isSelected = selectedPersonId === n.id || selectedPersonId === n.canonicalId;
            const isFocus = focusPersonId === n.id || focusPersonId === n.canonicalId;
            const currentStyle = nodeStyles.get(n.id) || {};

            if (isFocus) {
                nodeStyles.set(n.id, { ...currentStyle, stroke: TREE_PALETTE.focusStroke, strokeWidth: 2.4, opacity: 1 });
            } else if (isSelected) {
                nodeStyles.set(n.id, { ...currentStyle, stroke: TREE_PALETTE.selectedStroke, strokeWidth: 3, opacity: 1 });
            } else if (!currentStyle.stroke) { // Default stroke if not set by overlay or selection
                nodeStyles.set(n.id, { ...currentStyle, stroke: colorTheme.edges, strokeWidth: 1.2 });
            }
        });


        return { nodeStyles, edgeStyles, activeBadges };
    }, [dtreeConfig?.overlays, document, graph, colorTheme, endogamyData, selectedPersonId, focusPersonId]);

    // Layout effect
    useEffect(() => {
        const result = computeLayout({
            graph,
            document,
            focusPersonId,
            focusFamilyId,
            collapsedNodeIds: dtreeConfig?.collapsedNodeIds ?? [],
            isVertical: dtreeConfig?.isVertical ?? true,
            generationStep,
            personNodeWidth,
            personNodeHeightWithPhoto,
            personNodeHeightNoPhoto,
            layoutEngine: dtreeConfig?.layoutEngine ?? "vnext",
            previousPositions: previousPositionsRef.current
        });

        if (result.diagnostics.warnings.length > 0) {
            const warningText = result.diagnostics.warnings.join(" | ");
            console.warn(`[layout:${result.diagnostics.engine}] ${warningText}`);
        }

        const nextPositions = new Map(result.positions);
        previousPositionsRef.current = new Map(nextPositions);
        setPositions(nextPositions);
    }, [
        graph,
        document,
        focusPersonId,
        focusFamilyId,
        dtreeConfig?.isVertical,
        dtreeConfig?.layoutEngine,
        dtreeConfig?.collapsedNodeIds,
        generationStep,
        personNodeWidth,
        personNodeHeightNoPhoto,
        personNodeHeightWithPhoto
    ]);

    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const initialFitDone = useRef(false);
    const lastDocRef = useRef<GeneaDocument | null>(null);

    // 1. Initialize Zoom behavior once
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const g = svg.select("g.zoom-layer");

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.05, 5])
            .wheelDelta((event) => {
                // Smoothing for laptop touchpads
                return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode === 2 ? 1 : 0.002) * (event.ctrlKey ? 10 : 1);
            })
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        //Laptop Touchpad smoothing hint: use smooth wheel
        // (This is a standard way to make d3-zoom feel better on laptops)

        svg.call(zoom).on("dblclick.zoom", null);
        zoomRef.current = zoom;
    }, []);

    // 2. Perform Fit to Screen on fitNonce change OR first document load
    useEffect(() => {
        if (!svgRef.current || positions.size === 0 || !zoomRef.current) return;
        const svg = d3.select(svgRef.current);
        const zoom = zoomRef.current;

        const xs = Array.from(positions.values()).map(p => p.x);
        const ys = Array.from(positions.values()).map(p => p.y);

        if (xs.length > 0 && ys.length > 0) {
            const minX = Math.min(...xs) - personNodeWidth;
            const maxX = Math.max(...xs) + personNodeWidth;
            const minY = Math.min(...ys) - personNodeHeightWithPhoto;
            const maxY = Math.max(...ys) + personNodeHeightWithPhoto;

            const width = containerRef.current?.clientWidth || 800;
            const height = containerRef.current?.clientHeight || 600;

            const scale = Math.min(
                0.9,
                width / (maxX - minX),
                height / (maxY - minY)
            );

            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;

            const t = d3.zoomIdentity.translate(width / 2 - cx * scale, height / 2 - cy * scale).scale(scale);

            if (!initialFitDone.current || fitNonce > 0 || (lastDocRef.current !== document && document)) {
                svg.transition().duration(800).call(zoom.transform, t);
                initialFitDone.current = true;
                lastDocRef.current = document;
            }
        }
    }, [positions.size > 0, fitNonce, document]); // fitNonce or file change triggers fit


    const kinshipBadge = resolvedVisuals.activeBadges.find(b => b.type === 'kinship' || b.type === 'lineage');

    return (
        <div
            ref={containerRef}
            style={{ width: "100%", height: "100%", backgroundColor: colorTheme.background, overflow: "hidden" }}
            onClick={() => onBgClick?.()}
            onDoubleClick={() => onBgDoubleClick?.()}
        >
            <svg ref={svgRef} width="100%" height="100%">
                <g className="zoom-layer">
                    <g className="edges">
                        {graph.edges.map((edge) => {
                            const source = positions.get(edge.from);
                            const target = positions.get(edge.to);
                            if (!source || !target) return null;

                            const isChild = edge.type === "child" || edge.type === "junction-link";
                            let pathD = "";

                            if (isVert) {
                                if (isChild) {
                                    const midY = (source.y + target.y) / 2;
                                    pathD = `M ${source.x} ${source.y} L ${source.x} ${midY} L ${target.x} ${midY} L ${target.x} ${target.y}`;
                                } else {
                                    pathD = `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
                                }
                            } else {
                                if (isChild) {
                                    const midX = (source.x + target.x) / 2;
                                    pathD = `M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`;
                                } else {
                                    pathD = `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
                                }
                            }

                            const style = resolvedVisuals.edgeStyles.get(edge.id);
                            const edgeOpacity = style?.opacity ?? (edge.type === "identity" ? 0.3 : 0.7);
                            const edgeThickness = style?.thickness ?? colorTheme.edgeThickness;
                            const edgeColor = style?.color ?? colorTheme.edges;

                            return (
                                <path
                                    key={edge.id}
                                    d={pathD}
                                    fill="none"
                                    stroke={edgeColor}
                                    strokeWidth={edgeThickness}
                                    strokeDasharray={edge.type === "identity" ? "5,5" : "none"}
                                    opacity={edgeOpacity}
                                    style={{ transition: "opacity 0.3s, stroke 0.3s, stroke-width 0.3s" }}
                                />
                            );
                        })}
                    </g>
                    <g className="nodes">
                        {graph.nodes.map((node) => {
                            const pos = positions.get(node.id);
                            if (!pos) return null;

                            const isPerson = node.type === "person" || node.type === "personAlias";
                            const isCollapsed = dtreeConfig?.collapsedNodeIds.includes(node.id);

                            const style = resolvedVisuals.nodeStyles.get(node.id);
                            const nodeFill = style?.fill ?? colorTheme.personNode;
                            const nodeOpacity = style?.opacity ?? (node.isAlias ? 0.6 : 1);
                            const strokeColor = style?.stroke ?? colorTheme.edges;
                            const strokeWidth = style?.strokeWidth ?? 1.2;

                            const personData = document && isPerson
                                ? document.persons[node.canonicalId ?? node.id]
                                : null;

                            const name = personData ? personData.name : node.label;
                            const surname = personData?.surname || "";

                            // Obtener fechas
                            const birthEvent = personData?.events.find((e) => e.type === "BIRT");
                            const deathEvent = personData?.events.find((e) => e.type === "DEAT");
                            const birthText = birthEvent?.date || "?";

                            const isDeceased = personData?.lifeStatus === "deceased";
                            const deathText = isDeceased ? (deathEvent?.date || "?") : "vivo";

                            const mediaRef = personData?.mediaRefs?.[0];
                            const photoUrl = mediaRef ? (document?.media?.[mediaRef]?.fileName || mediaRef) : null;

                            const handleClick = (e: React.MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const kind = node.type.startsWith("family") ? "family" : "person";
                                onNodeClick?.({
                                    nodeId: node.canonicalId ?? node.id,
                                    nodeKind: kind,
                                    view: "tree",
                                    clientX: e.clientX,
                                    clientY: e.clientY
                                });
                            };

                            const handleContextMenu = (e: React.MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const kind = node.type.startsWith("family") ? "family" : "person";
                                onNodeContextMenu?.({
                                    nodeId: node.canonicalId ?? node.id,
                                    nodeKind: kind,
                                    view: "tree",
                                    clientX: e.clientX,
                                    clientY: e.clientY
                                });
                            };

                            return (
                                <g
                                    key={node.id}
                                    transform={`translate(${pos.x}, ${pos.y})`}
                                    onClick={handleClick}
                                    onContextMenu={handleContextMenu}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        onNodeDoubleClick?.({
                                            nodeId: node.canonicalId ?? node.id,
                                            nodeKind: node.type.startsWith("family") ? "family" : "person",
                                            view: "tree",
                                            clientX: e.clientX,
                                            clientY: e.clientY
                                        });
                                    }}
                                    onMouseEnter={(e) => {
                                        if (hasAnyOverlay) {
                                            setHoveredNode({ id: node.id, canonId: node.canonicalId ?? node.id, isPerson, x: e.clientX, y: e.clientY });
                                        }
                                    }}
                                    onMouseLeave={() => setHoveredNode(null)}
                                    className={timelineEventNodeIds.has(node.id) ? "node-event-pulse" : ""}
                                    style={{
                                        cursor: "pointer",
                                        opacity: nodeOpacity,
                                        transition: "opacity 0.3s, transform 0.5s",
                                        //@ts-ignore
                                        "--original-stroke-width": strokeWidth
                                    } as React.CSSProperties}
                                >
                                    {dtreeConfig?.overlays.some(o => o.type === 'layer' && o.config.layerId === 'layer-endogamy') && (
                                        (() => {
                                            const nodeRoles = endogamyData.roles.get(node.id) || [];
                                            const uniqueColors = Array.from(new Set(nodeRoles.map(r => r.color)));
                                            if (uniqueColors.length > 1) {
                                                return (
                                                    <defs>
                                                        <linearGradient id={`grad-endo-${node.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                            {uniqueColors.flatMap((c, i) => [
                                                                <stop key={`${i}-a`} offset={`${(i / uniqueColors.length) * 100}%`} stopColor={c} />,
                                                                <stop key={`${i}-b`} offset={`${((i + 1) / uniqueColors.length) * 100}%`} stopColor={c} />
                                                            ])}
                                                        </linearGradient>
                                                    </defs>
                                                );
                                            }
                                            return null;
                                        })()
                                    )}
                                    {isPerson ? (
                                        <>
                                            {(() => {
                                                const cardW = personNodeWidth;
                                                const cardH = photoUrl ? personNodeHeightWithPhoto : personNodeHeightNoPhoto;
                                                const cardTop = -cardH / 2;

                                                const photoW = cardW - 24;
                                                const photoH = photoUrl ? Math.round(cardH * (isVert ? 0.6 : 0.5)) : 0;
                                                const photoX = -photoW / 2;
                                                const photoY = cardTop + 10;

                                                const nameY = photoUrl ? (photoY + photoH + (isVert ? 22 : 18)) : (cardTop + (isVert ? 24 : 20));
                                                const surnameY = nameY + (isVert ? 16 : 14);
                                                const metaY = surnameY + (isVert ? 16 : 14);

                                                return (
                                                    <>
                                                        <rect
                                                            x={-cardW / 2}
                                                            y={cardTop}
                                                            width={cardW}
                                                            height={cardH}
                                                            rx={10}
                                                            fill={nodeFill}
                                                            stroke={strokeColor}
                                                            strokeWidth={strokeWidth}
                                                            strokeDasharray={node.isAlias ? "5,5" : "none"}
                                                        />
                                                        {photoUrl && (
                                                            <image
                                                                x={photoX}
                                                                y={photoY}
                                                                width={photoW}
                                                                height={photoH}
                                                                href={photoUrl}
                                                                clipPath="inset(0% round 10px)"
                                                                preserveAspectRatio="xMidYMid slice"
                                                                pointerEvents="none"
                                                            />
                                                        )}
                                                        <text
                                                            textAnchor="middle"
                                                            x={0}
                                                            y={nameY}
                                                            fill={colorTheme.text}
                                                            fontSize={Math.max(12, colorTheme.nodeFontSize * 0.92)}
                                                            fontFamily="Helvetica"
                                                            fontWeight="bold"
                                                            pointerEvents="none"
                                                        >
                                                            {name}
                                                        </text>
                                                        <text
                                                            textAnchor="middle"
                                                            x={0}
                                                            y={surnameY}
                                                            fill={colorTheme.text}
                                                            fontSize={Math.max(11, colorTheme.nodeFontSize * 0.76)}
                                                            fontFamily="Helvetica"
                                                            opacity={0.9}
                                                            pointerEvents="none"
                                                        >
                                                            {surname}
                                                        </text>
                                                        <text
                                                            textAnchor="middle"
                                                            x={0}
                                                            y={metaY}
                                                            fill={colorTheme.text}
                                                            fontSize={10}
                                                            fontFamily="Helvetica"
                                                            opacity={0.85}
                                                            pointerEvents="none"
                                                        >
                                                            {`* ${birthText}   ${isDeceased ? "†" : "•"} ${deathText}`}
                                                        </text>
                                                    </>
                                                );
                                            })()}
                                            {node.isAlias && (
                                                <g transform={`translate(${personNodeWidth / 2 - 20}, ${-(photoUrl ? personNodeHeightWithPhoto : personNodeHeightNoPhoto) / 2 + 15})`}>
                                                    <circle r={10} fill={colorTheme.edges} opacity={0.1} />
                                                    <text textAnchor="middle" y={4} fill={colorTheme.text} fontSize={14}>{">>"}</text>
                                                </g>
                                            )}
                                            {isCollapsed && (
                                                <g transform={`translate(${isVert ? 0 : personNodeWidth / 2 + 12}, ${isVert ? (photoUrl ? personNodeHeightWithPhoto : personNodeHeightNoPhoto) / 2 + 12 : 0})`}>
                                                    <circle r={10} fill={colorTheme.edges} />
                                                    <text fill={colorTheme.background} textAnchor="middle" y={4} fontSize={14} fontWeight="bold">+</text>
                                                </g>
                                            )}
                                        </>
                                    ) : node.type === "junction" ? (
                                        <circle r={5} fill={strokeColor} opacity={0.6} pointerEvents="none" />
                                    ) : (
                                        <g>
                                            <circle r={14} fill="transparent" pointerEvents="all" />
                                            <circle r={6} fill={strokeColor} opacity={0.88} pointerEvents="none" />
                                            {dtreeConfig?.overlays.some(o => o.type === 'layer' && o.config.layerId === 'layer-endogamy') && endogamyData.roles.get(node.id)?.some(r => r.role === 'family') && (
                                                <g transform={`translate(${isVert ? 0 : 35}, ${isVert ? 20 : 0})`}>
                                                    <rect x={-40} y={-9} width={80} height={18} rx={9} fill={strokeColor} opacity={0.9} pointerEvents="none" />
                                                    <text textAnchor="middle" y={3} fill={TREE_PALETTE.overlayText} fontSize={10} fontWeight="bold" pointerEvents="none">Consanguíneos</text>
                                                </g>
                                            )}
                                            {isCollapsed && (
                                                <g transform={`translate(${isVert ? 14 : 14}, ${isVert ? 0 : 14})`} pointerEvents="none">
                                                    <circle r={8} fill={colorTheme.edges} />
                                                    <text fill={colorTheme.background} textAnchor="middle" y={3} fontSize={12} fontWeight="bold">+</text>
                                                </g>
                                            )}
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </g>
            </svg>
            {kinshipBadge && (
                <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", background: TREE_PALETTE.overlayBgSoft, color: TREE_PALETTE.overlayText, border: "1px solid var(--border)", padding: "12px 24px", borderRadius: 12, fontSize: 18, zIndex: 10, boxShadow: TREE_PALETTE.overlayShadow, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", backdropFilter: "blur(12px)" }}>
                    {kinshipBadge.type === 'kinship' ? (
                        <>
                            <div style={{ fontSize: 16, opacity: 0.9, marginBottom: 4 }}>
                                Parentesco de <strong>{kinshipBadge.p1}</strong> con <strong>{kinshipBadge.p2}</strong>
                            </div>
                            <div style={{ fontSize: 20, margin: "4px 0" }}>
                                <strong>Relacion: </strong>
                                <span style={{ color: "var(--tree-warning)", fontWeight: "bold" }}>{kinshipBadge.text}</span>
                                {kinshipBadge.textSecondary ? <span style={{ color: TREE_PALETTE.overlayTextSoft, fontSize: 14 }}> ({kinshipBadge.textSecondary})</span> : null}
                            </div>
                            {kinshipBadge.sharedDnaPercentage > 0 && (
                                <div style={{ fontSize: 16, opacity: 0.9 }}>
                                    <strong>ADN compartido:</strong> {getPercentageLabel(kinshipBadge.sharedDnaPercentage)}
                                </div>
                            )}
                            {(kinshipBadge.yDnaShared || kinshipBadge.mtDnaShared) && (
                                <div style={{ fontSize: 14, display: "flex", gap: "12px", opacity: 0.9 }}>
                                    {kinshipBadge.yDnaShared && <span> Linea paterna pura (ADN-Y)</span>}
                                    {kinshipBadge.mtDnaShared && <span> Linea materna pura (ADN-mt)</span>}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: 16, opacity: 0.9, marginBottom: 4 }}>
                                {kinshipBadge.mode === 'patrilineal' ? '🛡️ Linaje Patrilineal (ADN-Y)' : '🌸 Linaje Matrilineal (ADN-mt)'}
                            </div>
                            {kinshipBadge.mode === 'couple' ? (
                                <>
                                    <div style={{ fontSize: 15 }}>
                                        Linajes combinados: <strong style={{ color: TREE_PALETTE.patrilineal }}>Y-DNA</strong> y <strong style={{ color: TREE_PALETTE.matrilineal }}>mt-DNA</strong>
                                    </div>
                                    <div style={{ fontSize: 14, opacity: 0.9 }}>
                                        {kinshipBadge.husbandName} (Y: {kinshipBadge.husbandCount}) + {kinshipBadge.wifeName} (mt: {kinshipBadge.wifeCount})
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: 15 }}>
                                        Desde: <strong style={{ color: kinshipBadge.mode === 'patrilineal' ? TREE_PALETTE.patrilineal : TREE_PALETTE.matrilineal }}>{kinshipBadge.oldestName}</strong> hasta <strong>{kinshipBadge.targetName}</strong>
                                    </div>
                                    <div style={{ fontSize: 14, opacity: 0.8 }}>
                                        Total de personas en linaje: <strong>{kinshipBadge.count}</strong>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Tooltip Hover Insights (Only when Layer Active) */}
            {hoveredNode && dtreeConfig?.overlays && dtreeConfig.overlays.length > 0 && (
                <div style={{
                    position: "fixed",
                    top: hoveredNode.y + 15,
                    left: hoveredNode.x + 15,
                    background: TREE_PALETTE.overlayBg,
                    border: "1px solid var(--line)",
                    padding: "10px 14px",
                    borderRadius: 6,
                    color: TREE_PALETTE.overlayText,
                    fontSize: 13,
                    zIndex: 100,
                    pointerEvents: "none",
                    boxShadow: TREE_PALETTE.overlayShadow,
                    maxWidth: 320
                }}>
                    {(() => {
                        const activeLayerOverlay = dtreeConfig?.overlays.find(o => o.type === 'layer');
                        const activeLayer = activeLayerOverlay?.config.layerId;
                        const personData = hoveredNode.isPerson ? document?.persons[hoveredNode.canonId] : null;

                        if (activeLayer === "layer-symmetry" && document && hoveredNode.isPerson) {
                            let knownParents = 0;
                            let hName = "Desconocido";
                            let wName = "Desconocida";
                            const p = document.persons[hoveredNode.canonId];
                            if (p?.famc.length > 0) {
                                const primaryFam = document.families[p.famc[0]];
                                if (primaryFam?.husbandId) { knownParents++; hName = document?.persons[primaryFam.husbandId]?.name || "Padre"; }
                                if (primaryFam?.wifeId) { knownParents++; wName = document?.persons[primaryFam.wifeId]?.name || "Madre"; }
                            }
                            return (
                                <>
                                    <div style={{ fontWeight: "bold", marginBottom: 4, color: "var(--success-text)" }}>Completitud de rama</div>
                                    <div style={{ marginBottom: 4 }}>Padres conocidos: <strong>{knownParents}/2</strong></div>
                                    <div style={{ color: TREE_PALETTE.overlayTextSoft, fontSize: 12 }}>• P: {hName}</div>
                                    <div style={{ color: TREE_PALETTE.overlayTextSoft, fontSize: 12 }}>• M: {wName}</div>
                                </>
                            );
                        } else if (activeLayer === "layer-places" && personData) {
                            const resi = personData.residence?.trim();
                            const birt = personData.events.find(e => e.type === "BIRT")?.place?.trim();
                            const deat = personData.events.find(e => e.type === "DEAT")?.place?.trim();

                            const place = resi || birt || deat;
                            const sourceLabel = resi ? "Residencia" : birt ? "Nacimiento" : deat ? "Defunción" : "No registrado";

                            return (
                                <>
                                    <div style={{ fontWeight: "bold", marginBottom: 4, color: TREE_PALETTE.info }}>Geografía ({sourceLabel})</div>
                                    <div>Lugar: <strong>{place || "No registrado"}</strong></div>
                                </>
                            );
                        } else if (activeLayer === "layer-warnings") {
                            const probs = diagnosticIssues.get(hoveredNode.canonId);
                            if (probs && probs.length > 0) {
                                return (
                                    <>
                                        <div style={{ fontWeight: "bold", marginBottom: 4, color: TREE_PALETTE.danger }}>Advertencias Críticas ({probs.length})</div>
                                        <ul style={{ margin: 0, paddingLeft: 16, color: "var(--danger-text)", fontSize: 12 }}>
                                            {probs.map((p, i) => <li key={i} style={{ marginBottom: 4 }}>{p.message}</li>)}
                                        </ul>
                                    </>
                                );
                            } else {
                                return <div style={{ color: "var(--success-text)" }}>No se encontraron anomalías en esta persona.</div>;
                            }
                        } else if (activeLayer === "layer-endogamy") {
                            const roles = endogamyData.roles.get(hoveredNode.id);
                            if (roles && roles.length > 0) {
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {roles.map((r, i) => {
                                            if (r.role === 'ancestor') {
                                                return (
                                                    <ContextCard
                                                        key={i}
                                                        compact
                                                        title="Ancestro en Colapso de Pedigri"
                                                        rows={[
                                                            {
                                                                label: 'Contexto',
                                                                value: r.contextText || 'Punto de convergencia de una ramificacion recurrente.',
                                                                tone: 'muted'
                                                            }
                                                        ]}
                                                    />
                                                );
                                            }
                                            if (r.role === 'parent') {
                                                return (
                                                    <ContextCard
                                                        key={i}
                                                        compact
                                                        title="Progenitor Consanguineo"
                                                        rows={[
                                                            {
                                                                label: 'Parentesco con coprogenitor',
                                                                value: getKinshipDisplayText(r.kinship),
                                                                tone: 'accent'
                                                            }
                                                        ]}
                                                    />
                                                );
                                            }
                                            if (r.role === 'child') {
                                                const inbreeding = (r.kinship?.sharedDnaPercentage || 0) / 2;
                                                return (
                                                    <ContextCard
                                                        key={i}
                                                        compact
                                                        title="Descendiente Consanguineo"
                                                        rows={[
                                                            {
                                                                label: 'Relacion previa progenitores',
                                                                value: getKinshipDisplayText(r.kinship),
                                                                tone: 'muted'
                                                            },
                                                            {
                                                                label: 'Coincidencia hereditaria',
                                                                value: getPercentageLabel(inbreeding),
                                                                tone: inbreeding < 0.001 ? 'muted' : 'warn'
                                                            }
                                                        ]}
                                                    />
                                                );
                                            }
                                            if (r.role === 'family') {
                                                return (
                                                    <ContextCard
                                                        key={i}
                                                        compact
                                                        title="Union Consanguinea Restringida"
                                                        rows={[
                                                            {
                                                                label: 'Parentesco',
                                                                value: getKinshipDisplayText(r.kinship),
                                                                tone: 'accent'
                                                            },
                                                            {
                                                                label: 'ADN teorico compartido',
                                                                value: getPercentageLabel(r.kinship?.sharedDnaPercentage || 0),
                                                                tone: 'normal'
                                                            }
                                                        ]}
                                                    />
                                                );
                                            }
                                            if (r.role === 'path') {
                                                return (
                                                    <ContextCard
                                                        key={i}
                                                        compact
                                                        title="Ruta Estructural Activa"
                                                        rows={[
                                                            {
                                                                label: 'Transmisor',
                                                                value: `Grado de consanguinidad (${getKinshipDisplayText(r.kinship)})`,
                                                                tone: 'muted'
                                                            }
                                                        ]}
                                                    />
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                );
                            } else {
                                if (hoveredNode.isPerson) {
                                    return <div style={{ color: TREE_PALETTE.overlayTextMuted }}>Este individuo no forma parte de ninguna ruta de consanguinidad de las familias que componen el documento.</div>;
                                } else {
                                    return null;
                                }
                            }
                        } else if (hasFamilyOriginHL) {
                            const { summary } = familyOriginData;
                            const isSelf = hoveredNode.canonId === familyOriginTargetId || hoveredNode.id === familyOriginTargetId;
                            const persData = document && hoveredNode.isPerson ? document.persons[hoveredNode.canonId] : null;
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {persData && (
                                        <div style={{ fontWeight: 'bold', color: isSelf ? TREE_PALETTE.familyOriginSelf : TREE_PALETTE.info, fontSize: 14, marginBottom: 2 }}>
                                            {isSelf ? "Persona consultada" : persData.name + (persData.surname ? ` ${persData.surname}` : "")}
                                        </div>
                                    )}
                                    {summary && (
                                        <div style={{ background: 'var(--info-bg)', borderRadius: 6, padding: '8px 10px', borderLeft: `3px solid ${TREE_PALETTE.info}` }}>
                                            <div style={{ fontWeight: 'bold', color: TREE_PALETTE.info, marginBottom: 4, fontSize: 12 }}>Familia de origen</div>
                                            <div style={{ fontSize: 12, color: TREE_PALETTE.overlayTextSoft, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                <span>{summary.children} {summary.children === 1 ? 'hijo/a' : 'hijos/as'}</span>
                                                {summary.marriageDate && <span>Matrimonio: {summary.marriageDate}</span>}
                                                {summary.era && <span>📅 Época: {summary.era}</span>}
                                                {summary.location && <span>Lugar: {summary.location}</span>}
                                            </div>
                                        </div>
                                    )}
                                    {!summary && <div style={{ color: TREE_PALETTE.overlayTextMuted, fontSize: 12 }}>Sin familia de origen documentada.</div>}
                                </div>
                            );
                        } else if (dtreeConfig?.overlays.some(o => o.type === 'heatmap')) {
                            const heatmapOverlay = dtreeConfig.overlays.find(o => o.type === 'heatmap')!;
                            const baseId = heatmapOverlay.config.personId;
                            const targetId = hoveredNode.canonId;

                            if (document && document.persons[baseId] && document.persons[targetId]) {
                                const baseP = document.persons[baseId];
                                const targetP = document.persons[targetId];
                                const kinship = findKinship(document, baseId, targetId);
                                const contemporaneity = getLifeOverlapInfo(baseP, targetP);
                                const isSelf = baseId === targetId;

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontWeight: "bold", fontSize: 14, color: TREE_PALETTE.kinshipAccent }}>
                                            {isSelf ? "Analizando tu propia ficha" : `Relación con ${baseP.name}`}
                                        </div>
                                        {kinship && (
                                            <ContextCard
                                                compact
                                                title="Análisis Biológico"
                                                rows={[
                                                    { label: 'Parentesco', value: kinship.relationshipText, tone: 'accent' },
                                                    { label: 'ADN Compartido', value: getPercentageLabel(kinship.sharedDnaPercentage), tone: 'normal' }
                                                ]}
                                            />
                                        )}
                                        {contemporaneity && (
                                            <div style={{ fontSize: 12, background: 'rgba(0,0,0,0.1)', padding: '6px 8px', borderRadius: 4, borderLeft: `2px solid ${TREE_PALETTE.info}` }}>
                                                🕒 {contemporaneity}
                                            </div>
                                        )}
                                        {baseP.famc.length > 0 && targetP.famc.length > 0 && baseP.famc[0] === targetP.famc[0] && !isSelf && (
                                            <div style={{ fontSize: 11, color: "var(--success-text)", fontWeight: 600 }}>
                                                ✓ Pertenecen a la misma familia nuclear.
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                        }
                        return null;
                    })()}
                </div>
            )}

            {/* Timeline Simulation Badge */}
            {(() => {
                const timelineOverlay = dtreeConfig?.overlays.find(o => o.type === 'timeline');
                if (!timelineOverlay) return null;
                const displayYear = timelineOverlay.config.year ?? timelineOverlay.config.currentYear ?? "—";

                return (
                    <div style={{
                        position: "absolute",
                        bottom: 24,
                        right: 24,
                        background: "rgba(15, 23, 42, 0.8)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "16px",
                        padding: "16px 20px",
                        color: "#fff",
                        zIndex: 20,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        minWidth: 200
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-muted)", letterSpacing: "0.05em" }}>Simulación</span>
                            <span style={{ fontSize: 24, fontWeight: "bold", color: "var(--accent)" }}>{displayYear}</span>
                        </div>
                        <div style={{ height: 1, background: "rgba(255,255,255,0.1)" }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: TREE_PALETTE.success }} />
                                    <span style={{ fontSize: 13 }}>Personas vivas</span>
                                </div>
                                <span style={{ fontWeight: "bold", color: TREE_PALETTE.success }}>{timelineLivingNodeIds.size}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: TREE_PALETTE.danger }} />
                                    <span style={{ fontSize: 13 }}>Difuntos</span>
                                </div>
                                <span style={{ fontWeight: "bold", color: TREE_PALETTE.danger }}>{timelineDeceasedNodeIds.size}</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Legend Box */}
            {(() => {
                const layerOverlay = dtreeConfig?.overlays.find(o => o.type === 'layer');
                const originOverlay = dtreeConfig?.overlays.find(o => o.type === 'origin');
                const deepestOverlay = dtreeConfig?.overlays.find(o => o.type === 'deepest');
                const hasAny = layerOverlay || originOverlay || deepestOverlay;

                if (!hasAny) return null;

                const activeLayer = layerOverlay?.config.layerId;
                const hasFamilyOriginHL = !!originOverlay;
                const hasDeepestHL = !!deepestOverlay;

                return (
                    <div style={{ position: "absolute", bottom: 24, left: 24, background: TREE_PALETTE.overlayBg, border: "1px solid var(--line)", padding: "14px 18px", borderRadius: 8, color: "var(--text)", fontSize: 13, zIndex: 10, maxWidth: 350, boxShadow: TREE_PALETTE.overlayShadow }}>
                        <div style={{ fontWeight: "bold", marginBottom: 8, fontSize: 14 }}>Leyenda de Capa</div>
                        {activeLayer === "layer-symmetry" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: TREE_PALETTE.success }} /> 2 padres identificados</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: TREE_PALETTE.warning }} /> 1 padre identificado</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: TREE_PALETTE.danger }} /> Callejón sin salida (0 padres)</div>
                            </div>
                        )}
                        {activeLayer === "layer-places" && (
                            <div style={{ color: "var(--ink-muted)", lineHeight: 1.4 }}>
                                Cada color único representa un lugar de nacimiento distinto. Las personas sin lugar documentado se atenúan en gris.<br /><br /><strong style={{ color: TREE_PALETTE.overlayText }}>Pasa el cursor</strong> sobre los nodos para ver el nombre exacto del lugar.
                            </div>
                        )}
                        {activeLayer === "layer-warnings" && (
                            <div style={{ color: "var(--ink-muted)", lineHeight: 1.4 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text)", marginBottom: 6 }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: TREE_PALETTE.danger }} /> Problema temporal/lógico</div>
                                Nodos y aristas resaltadas en rojo contienen errores que requieren intervención manual. <strong style={{ color: TREE_PALETTE.overlayText }}>Pasa el cursor</strong> sobre ellos para leer la advertencia descriptiva de los eventos.
                            </div>
                        )}
                        {activeLayer === "layer-endogamy" && (
                            <div style={{ color: "var(--ink-muted)", lineHeight: 1.4 }}>
                                Las líneas de color trazan las rutas genéticas desde un <strong style={{ color: TREE_PALETTE.overlayText }}>Ancestro en Colapso de Pedigrí</strong> hasta un <strong style={{ color: TREE_PALETTE.overlayText }}>Descendiente Consanguíneo</strong>.<br /><br />
                                <strong style={{ color: TREE_PALETTE.overlayText }}>Pasa el cursor</strong> por los nodos o uniones iluminadas para evaluar las relaciones y la coincidencia hereditaria.
                            </div>
                        )}
                        {hasFamilyOriginHL && (
                            <div style={{ color: "var(--ink-muted)", lineHeight: 1.4 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, color: TREE_PALETTE.familyOriginSelf, marginBottom: 6, fontWeight: 600 }}>🏠 Familia de Origen</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: TREE_PALETTE.familyOriginGroup }} /> Padres y hermanos de origen</div>
                                Resalta la familia de origen de la persona consultada. <strong style={{ color: TREE_PALETTE.overlayText }}>Pasa el cursor</strong> sobre cualquier nodo iluminado para ver el resumen de la familia.
                            </div>
                        )}

                        {hasDeepestHL && (
                            <div style={{ color: "var(--ink-muted)", lineHeight: 1.4, marginTop: hasFamilyOriginHL ? 10 : 0 }}>
                                <div style={{ fontWeight: 600, color: TREE_PALETTE.warning, marginBottom: 6 }}>🧓 Antepasados Más Remotos</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: TREE_PALETTE.oldestExact }} /> Fecha exacta más antigua</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: TREE_PALETTE.oldestEstimated }} /> Fecha estimada más antigua</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: TREE_PALETTE.oldestDeepest }} /> Generación más profunda (sin fecha)</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: TREE_PALETTE.warning }} /> Persona consultada</div>
                                </div>
                                Resalta 3 rutas de distinta certeza hacia los antepasados más remotos.
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}


