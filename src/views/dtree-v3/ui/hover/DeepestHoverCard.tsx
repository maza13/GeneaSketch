import type { DeepestAncestorSets, TreePalette } from "@/views/dtree-v3/overlays/types";
import type { HoveredNode } from "@/views/dtree-v3/ui/overlayUiModel";

type Props = {
  hoveredNode: HoveredNode;
  sets: DeepestAncestorSets | null;
  palette: TreePalette;
};

export function DeepestHoverCard({ hoveredNode, sets, palette }: Props) {
  if (!sets) return null;
  const isExact = sets.exact.has(hoveredNode.id) || sets.exact.has(hoveredNode.canonId);
  const isEstimated = sets.estimated.has(hoveredNode.id) || sets.estimated.has(hoveredNode.canonId);
  const isDeepest = sets.deepest.has(hoveredNode.id) || sets.deepest.has(hoveredNode.canonId);
  if (!isExact && !isEstimated && !isDeepest) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontWeight: "bold", color: palette.warning }}>Ruta ancestral remota</div>
      {isExact ? <div>Incluye trazo de fecha exacta mas antigua.</div> : null}
      {isEstimated ? <div>Incluye trazo estimado de antiguedad.</div> : null}
      {isDeepest ? <div>Incluye trazo de mayor profundidad generacional.</div> : null}
    </div>
  );
}
