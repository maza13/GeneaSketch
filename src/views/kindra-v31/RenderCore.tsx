import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { computeLayout } from "@/core/layout";
import type { ExpandedGraph, GraphDocument } from "@/types/domain";
import type { ColorThemeConfig, NodeInteraction } from "@/types/editor";
import { buildLayoutTriggerSignature } from "@/views/kindra-v31/layout/layoutTriggerSignature";
import { buildOverlayPrecomputedData } from "@/views/kindra-v31/overlays/contextBuilders";
import { TREE_PALETTE } from "@/views/kindra-v31/overlays/palette";
import { resolveOverlayPipeline } from "@/views/kindra-v31/overlays/pipeline";
import { KinshipBadgePanel } from "@/views/kindra-v31/ui/KinshipBadgePanel";
import { HeatmapHoverCard } from "@/views/kindra-v31/ui/HeatmapHoverCard";
import { LayerLegendPanel } from "@/views/kindra-v31/ui/LayerLegendPanel";
import { TimelineSimulationBadge } from "@/views/kindra-v31/ui/TimelineSimulationBadge";
import { LayerHoverCards } from "@/views/kindra-v31/ui/hover/LayerHoverCards";
import { OriginHoverCard } from "@/views/kindra-v31/ui/hover/OriginHoverCard";
import { DeepestHoverCard } from "@/views/kindra-v31/ui/hover/DeepestHoverCard";
import { TimelineHoverCard } from "@/views/kindra-v31/ui/hover/TimelineHoverCard";
import type { HoveredNode } from "@/views/kindra-v31/ui/overlayUiModel";
import { resolveOverlayUiDescriptor } from "@/views/kindra-v31/ui/overlayUiResolver";

export type RenderCoreProps = {
    graph: ExpandedGraph;
    document: GraphDocument | null;
    fitNonce: number;
    onBgClick?: () => void;
    onBgDoubleClick?: () => void;
    focusPersonId: string | null;
    focusFamilyId?: string | null;
    selectedPersonId: string | null;
    colorTheme: ColorThemeConfig;
    kindraConfig?: {
        isVertical: boolean;
        layoutEngine?: "vnext";
        collapsedNodeIds: string[];
        overlays: import("@/types/domain").ActiveOverlay[];
    };
    onNodeClick?: (interaction: NodeInteraction) => void;
    onNodeContextMenu?: (interaction: NodeInteraction) => void;
    onNodeDoubleClick?: (interaction: NodeInteraction) => void;
    onSvgReady?: (svg: SVGSVGElement | null) => void;
};

export function RenderCore({
    graph,
    document,
    fitNonce,
    onNodeClick,
    onNodeContextMenu,
    focusPersonId,
    focusFamilyId,
    selectedPersonId,
    colorTheme,
    kindraConfig,
    onBgClick,
    onBgDoubleClick,
    onNodeDoubleClick,
    onSvgReady
}: RenderCoreProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
    const previousPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const [hoveredNode, setHoveredNode] = useState<HoveredNode | null>(null);

    const isVert = kindraConfig?.isVertical ?? true;
    const hasAnyOverlay = !!(kindraConfig?.overlays && kindraConfig.overlays.length > 0);

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
    const overlayPrecomputed = useMemo(
        () =>
            buildOverlayPrecomputedData({
                overlays: kindraConfig?.overlays,
                document,
                graph
            }),
        [kindraConfig?.overlays, document, graph]
    );

    const diagnosticIssues = overlayPrecomputed.diagnosticIssues;
    const endogamyData = overlayPrecomputed.endogamyData;
    const familyOriginTargetId = overlayPrecomputed.familyOriginTargetId;
    const familyOriginData = overlayPrecomputed.familyOriginData;
    const timelineLivingNodeIds = overlayPrecomputed.timelineNodeSets.livingNodeIds;
    const timelineDeceasedNodeIds = overlayPrecomputed.timelineNodeSets.deceasedNodeIds;
    const timelineEventNodeIds = overlayPrecomputed.timelineNodeSets.eventNodeIds;

    const resolvedVisuals = useMemo(
        () =>
            resolveOverlayPipeline({
                overlays: kindraConfig?.overlays,
                document,
                graph,
                colorTheme,
                selectedPersonId,
                focusPersonId,
                palette: TREE_PALETTE,
                precomputed: overlayPrecomputed
            }),
        [
            kindraConfig?.overlays,
            document,
            graph,
            colorTheme,
            selectedPersonId,
            focusPersonId,
            overlayPrecomputed
        ]
    );
    const layoutInput = useMemo(
        () => ({
            graph,
            document,
            focusPersonId,
            focusFamilyId,
            collapsedNodeIds: kindraConfig?.collapsedNodeIds ?? [],
            isVertical: kindraConfig?.isVertical ?? true,
            generationStep,
            personNodeWidth,
            personNodeHeightWithPhoto,
            personNodeHeightNoPhoto,
            layoutEngine: kindraConfig?.layoutEngine ?? "vnext"
        }),
        [
            graph,
            document,
            focusPersonId,
            focusFamilyId,
            kindraConfig?.collapsedNodeIds,
            kindraConfig?.isVertical,
            kindraConfig?.layoutEngine,
            generationStep,
            personNodeWidth,
            personNodeHeightWithPhoto,
            personNodeHeightNoPhoto
        ]
    );

    const layoutTriggerSignature = useMemo(
        () =>
            buildLayoutTriggerSignature({
                graphNodeCount: layoutInput.graph.nodes.length,
                graphEdgeCount: layoutInput.graph.edges.length,
                personCount: Object.keys(layoutInput.document?.persons ?? {}).length,
                familyCount: Object.keys(layoutInput.document?.families ?? {}).length,
                focusPersonId: layoutInput.focusPersonId,
                focusFamilyId: layoutInput.focusFamilyId ?? null,
                isVertical: layoutInput.isVertical,
                layoutEngine: layoutInput.layoutEngine,
                collapsedNodeIds: layoutInput.collapsedNodeIds,
                generationStep: layoutInput.generationStep,
                personNodeWidth: layoutInput.personNodeWidth,
                personNodeHeightWithPhoto: layoutInput.personNodeHeightWithPhoto,
                personNodeHeightNoPhoto: layoutInput.personNodeHeightNoPhoto
            }),
        [layoutInput]
    );

    // Layout effect
    useEffect(() => {
        const result = computeLayout({
            ...layoutInput,
            previousPositions: previousPositionsRef.current
        });

        if (result.diagnostics.warnings.length > 0) {
            const warningText = result.diagnostics.warnings.join(" | ");
            console.warn(`[layout:${result.diagnostics.effectiveEngine}] ${warningText}`);
        }

        const nextPositions = new Map(result.positions);
        previousPositionsRef.current = new Map(nextPositions);
        setPositions(nextPositions);
    }, [layoutInput, layoutTriggerSignature]);

    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const initialFitDone = useRef(false);
    const lastDocRef = useRef<GraphDocument | null>(null);

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

    const activeOverlays = kindraConfig?.overlays ?? [];
    const overlayUiDescriptor = useMemo(
        () =>
            resolveOverlayUiDescriptor({
                document,
                graph,
                overlays: activeOverlays,
                hoveredNode,
                resolvedVisuals,
                precomputed: overlayPrecomputed,
                palette: TREE_PALETTE
            }),
        [
            document,
            graph,
            activeOverlays,
            hoveredNode,
            resolvedVisuals,
            overlayPrecomputed
        ]
    );
    const activeLayerId = overlayUiDescriptor.activeLayerOverlay?.config?.layerId ?? null;

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
                            const isCollapsed = kindraConfig?.collapsedNodeIds.includes(node.id);

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
                                    {kindraConfig?.overlays.some(o => o.type === 'layer' && o.config.layerId === 'layer-endogamy') && (
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
                                            {kindraConfig?.overlays.some(o => o.type === 'layer' && o.config.layerId === 'layer-endogamy') && endogamyData.roles.get(node.id)?.some(r => r.role === 'family') && (
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
            {overlayUiDescriptor.kinshipBadge ? (
                <KinshipBadgePanel kinshipBadge={overlayUiDescriptor.kinshipBadge} palette={TREE_PALETTE} />
            ) : null}

                        {hoveredNode && overlayUiDescriptor.hoverMode !== "none" ? (
                <div
                    style={{
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
                    }}
                >
                    {overlayUiDescriptor.hoverMode === "layer" ? (
                        <LayerHoverCards
                            hoveredNode={hoveredNode}
                            document={document}
                            activeLayerId={activeLayerId}
                            diagnosticIssues={diagnosticIssues}
                            endogamyData={endogamyData}
                            palette={TREE_PALETTE}
                        />
                    ) : null}
                    {overlayUiDescriptor.hoverMode === "origin" ? (
                        <OriginHoverCard
                            hoveredNode={hoveredNode}
                            document={document}
                            familyOriginTargetId={familyOriginTargetId}
                            familyOriginData={familyOriginData}
                            palette={TREE_PALETTE}
                        />
                    ) : null}
                    {overlayUiDescriptor.hoverMode === "heatmap" && overlayUiDescriptor.heatmapOverlay ? (
                        <HeatmapHoverCard
                            hoveredNode={hoveredNode}
                            heatmapOverlay={overlayUiDescriptor.heatmapOverlay}
                            document={document}
                            palette={TREE_PALETTE}
                            runtime={overlayPrecomputed.kinshipHeatmapRuntime}
                        />
                    ) : null}
                    {(overlayUiDescriptor.hoverMode === "origin" || overlayUiDescriptor.hoverMode === "deepest") ? (
                        <DeepestHoverCard
                            hoveredNode={hoveredNode}
                            sets={overlayPrecomputed.deepestAncestorSets}
                            palette={TREE_PALETTE}
                        />
                    ) : null}
                    {(overlayUiDescriptor.hoverMode === "timeline" || overlayUiDescriptor.timelineOverlay) &&
                    overlayUiDescriptor.hoverMode !== "layer" ? (
                        <TimelineHoverCard
                            hoveredNode={hoveredNode}
                            timelineNodeSets={overlayPrecomputed.timelineNodeSets}
                            palette={TREE_PALETTE}
                        />
                    ) : null}
                </div>
            ) : null}

            <TimelineSimulationBadge
                timelineOverlay={overlayUiDescriptor.timelineOverlay}
                livingCount={timelineLivingNodeIds.size}
                deceasedCount={timelineDeceasedNodeIds.size}
                palette={TREE_PALETTE}
            />

            <LayerLegendPanel
                activeLayerId={activeLayerId}
                hasFamilyOriginHighlight={overlayUiDescriptor.hasFamilyOriginHighlight}
                hasDeepestHighlight={overlayUiDescriptor.hasDeepestHighlight}
                palette={TREE_PALETTE}
            />
        </div>
    );
}





