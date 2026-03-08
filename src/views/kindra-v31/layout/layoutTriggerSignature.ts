export type LayoutTriggerSignatureInput = {
  graphNodeCount: number;
  graphEdgeCount: number;
  personCount: number;
  familyCount: number;
  focusPersonId: string | null;
  focusFamilyId: string | null;
  isVertical: boolean;
  layoutEngine: "vnext";
  collapsedNodeIds: string[];
  generationStep: number;
  personNodeWidth: number;
  personNodeHeightWithPhoto: number;
  personNodeHeightNoPhoto: number;
};

function serializeCollapsedNodeIds(collapsedNodeIds: string[]): string {
  return Array.from(new Set(collapsedNodeIds)).sort((left, right) => left.localeCompare(right)).join(",");
}

export function buildLayoutTriggerSignature(input: LayoutTriggerSignatureInput): string {
  return [
    `nodes:${input.graphNodeCount}`,
    `edges:${input.graphEdgeCount}`,
    `persons:${input.personCount}`,
    `families:${input.familyCount}`,
    `focusPerson:${input.focusPersonId ?? ""}`,
    `focusFamily:${input.focusFamilyId ?? ""}`,
    `vertical:${input.isVertical ? "1" : "0"}`,
    `engine:${input.layoutEngine}`,
    `collapsed:${serializeCollapsedNodeIds(input.collapsedNodeIds)}`,
    `step:${input.generationStep}`,
    `nodeW:${input.personNodeWidth}`,
    `nodeHPhoto:${input.personNodeHeightWithPhoto}`,
    `nodeHNoPhoto:${input.personNodeHeightNoPhoto}`
  ].join("|");
}
