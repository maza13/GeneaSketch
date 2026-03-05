import type { ActiveOverlay, OverlayType } from "@/types/domain";
import type { NodeInteraction } from "@/types/editor";

type NodeClickRoutingInput = {
  interaction: NodeInteraction;
  pendingKinshipSourceId: string | null;
  heatmapOverlay: ActiveOverlay | null;
};

type NodeClickRoutingDecision = {
  nextOverlay: ActiveOverlay | null;
  inspectPersonId: string | null;
  clearPendingKinship: boolean;
  consume: boolean;
  statusMessage: string | null;
};

function createKinshipOverlay(person1Id: string, person2Id: string): ActiveOverlay {
  return {
    id: "kinship-standard",
    type: "kinship",
    priority: 90,
    config: { person1Id, person2Id }
  };
}

function updateHeatmapTarget(
  overlay: ActiveOverlay,
  targetId: string
): ActiveOverlay {
  return {
    ...overlay,
    type: "heatmap",
    config: {
      ...overlay.config,
      targetId
    }
  };
}

export function resolveNodeClickRouting(input: NodeClickRoutingInput): NodeClickRoutingDecision {
  const { interaction, pendingKinshipSourceId, heatmapOverlay } = input;

  if (pendingKinshipSourceId) {
    if (interaction.nodeKind === "person") {
      return {
        nextOverlay: createKinshipOverlay(pendingKinshipSourceId, interaction.nodeId),
        inspectPersonId: null,
        clearPendingKinship: true,
        consume: true,
        statusMessage: "Calculando parentesco..."
      };
    }
    return {
      nextOverlay: null,
      inspectPersonId: null,
      clearPendingKinship: true,
      consume: true,
      statusMessage: null
    };
  }

  if (heatmapOverlay?.type === "heatmap" && interaction.nodeKind === "person") {
    return {
      nextOverlay: updateHeatmapTarget(heatmapOverlay, interaction.nodeId),
      inspectPersonId: interaction.nodeId,
      clearPendingKinship: false,
      consume: true,
      statusMessage: null
    };
  }

  if (interaction.nodeKind === "person") {
    return {
      nextOverlay: null,
      inspectPersonId: interaction.nodeId,
      clearPendingKinship: false,
      consume: false,
      statusMessage: null
    };
  }

  return {
    nextOverlay: null,
    inspectPersonId: null,
    clearPendingKinship: false,
    consume: false,
    statusMessage: null
  };
}

export type { NodeClickRoutingDecision, NodeClickRoutingInput, OverlayType };
