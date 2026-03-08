import type { TimelineNodeSets, TreePalette } from "@/views/kindra-v31/overlays/types";
import type { HoveredNode } from "@/views/kindra-v31/ui/overlayUiModel";

type Props = {
  hoveredNode: HoveredNode;
  timelineNodeSets: TimelineNodeSets;
  palette: TreePalette;
};

export function TimelineHoverCard({ hoveredNode, timelineNodeSets, palette }: Props) {
  const isLiving =
    timelineNodeSets.livingNodeIds.has(hoveredNode.id)
    || timelineNodeSets.livingNodeIds.has(hoveredNode.canonId);
  const isDeceased =
    timelineNodeSets.deceasedNodeIds.has(hoveredNode.id)
    || timelineNodeSets.deceasedNodeIds.has(hoveredNode.canonId);
  const hasEvent =
    timelineNodeSets.eventNodeIds.has(hoveredNode.id)
    || timelineNodeSets.eventNodeIds.has(hoveredNode.canonId);

  if (!isLiving && !isDeceased && !hasEvent) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontWeight: "bold", color: palette.warning }}>Contexto de timeline</div>
      {isLiving ? <div style={{ color: palette.success }}>Persona viva en el periodo.</div> : null}
      {isDeceased ? <div style={{ color: palette.danger }}>Persona fallecida en el periodo.</div> : null}
      {hasEvent ? <div>Evento relevante activo en la simulacion.</div> : null}
    </div>
  );
}
