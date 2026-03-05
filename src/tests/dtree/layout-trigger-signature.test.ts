import { describe, expect, it } from "vitest";
import { buildLayoutTriggerSignature } from "@/views/dtree-v3/layout/layoutTriggerSignature";

describe("layout trigger signature", () => {
  it("is stable for collapsed ids regardless of order", () => {
    const first = buildLayoutTriggerSignature({
      graphNodeCount: 10,
      graphEdgeCount: 9,
      personCount: 7,
      familyCount: 3,
      focusPersonId: "P1",
      focusFamilyId: null,
      isVertical: true,
      layoutEngine: "vnext",
      collapsedNodeIds: ["B", "A", "A"],
      generationStep: 250,
      personNodeWidth: 200,
      personNodeHeightWithPhoto: 230,
      personNodeHeightNoPhoto: 90
    });
    const second = buildLayoutTriggerSignature({
      graphNodeCount: 10,
      graphEdgeCount: 9,
      personCount: 7,
      familyCount: 3,
      focusPersonId: "P1",
      focusFamilyId: null,
      isVertical: true,
      layoutEngine: "vnext",
      collapsedNodeIds: ["A", "B"],
      generationStep: 250,
      personNodeWidth: 200,
      personNodeHeightWithPhoto: 230,
      personNodeHeightNoPhoto: 90
    });
    expect(first).toBe(second);
  });

  it("changes only with layout-impacting inputs", () => {
    const base = buildLayoutTriggerSignature({
      graphNodeCount: 10,
      graphEdgeCount: 9,
      personCount: 7,
      familyCount: 3,
      focusPersonId: "P1",
      focusFamilyId: null,
      isVertical: true,
      layoutEngine: "vnext",
      collapsedNodeIds: [],
      generationStep: 250,
      personNodeWidth: 200,
      personNodeHeightWithPhoto: 230,
      personNodeHeightNoPhoto: 90
    });
    const changedFocus = buildLayoutTriggerSignature({
      graphNodeCount: 10,
      graphEdgeCount: 9,
      personCount: 7,
      familyCount: 3,
      focusPersonId: "P2",
      focusFamilyId: null,
      isVertical: true,
      layoutEngine: "vnext",
      collapsedNodeIds: [],
      generationStep: 250,
      personNodeWidth: 200,
      personNodeHeightWithPhoto: 230,
      personNodeHeightNoPhoto: 90
    });
    expect(changedFocus).not.toBe(base);
  });
});
