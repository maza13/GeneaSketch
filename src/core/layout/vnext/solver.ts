import { flextree } from "d3-flextree";
import type { LayoutInput, LayoutPoint, VirtualLayoutNode } from "@/core/layout/types";
import type { LayoutModel } from "@/core/layout/vnext/model";
import { chooseOriginFamilyForPerson, orderFamiliesForPerson, sortSpousesForFamily } from "@/core/layout/vnext/orderRules";
import type { VirtualTreeBuildResult } from "@/core/layout/vnext/virtualTree";

type SolvedLayout = {
  positions: Map<string, LayoutPoint>;
  diagnostics: string[];
};

type FlexHierarchyNode = ReturnType<ReturnType<typeof flextree<VirtualLayoutNode>>["hierarchy"]>;

function resolveCanonicalPersonId(model: LayoutModel, nodeId: string): string {
  return model.nodeById.get(nodeId)?.canonicalId ?? nodeId;
}

function personHasPhoto(input: LayoutInput, model: LayoutModel, personNodeId: string): boolean {
  const canonicalId = resolveCanonicalPersonId(model, personNodeId);
  const person = input.document?.persons[canonicalId] ?? input.document?.persons[personNodeId];
  return Boolean(person?.mediaRefs?.[0]);
}

function nodeWidth(input: LayoutInput, nodeType: VirtualLayoutNode["nodeType"]): number {
  if (nodeType === "family" || nodeType === "familyAlias") return 40;
  if (nodeType === "junction") return 20;
  if (nodeType === "fake") return 0;
  return input.personNodeWidth;
}

function nodeHeight(
  input: LayoutInput,
  model: LayoutModel,
  nodeType: VirtualLayoutNode["nodeType"],
  entityId?: string
): number {
  if (nodeType === "family" || nodeType === "familyAlias" || nodeType === "junction") {
    return input.personNodeHeightNoPhoto;
  }
  if (nodeType === "fake") return 0;
  if (!entityId) return input.personNodeHeightNoPhoto;

  return personHasPhoto(input, model, entityId)
    ? input.personNodeHeightWithPhoto
    : input.personNodeHeightNoPhoto;
}

function relationGap(left: VirtualLayoutNode, right: VirtualLayoutNode): number {
  const hints = [left.relationHint, right.relationHint];
  if (hints.includes("union-chain")) return 24;
  if (hints.includes("siblings")) return 18;
  if (hints.includes("parents")) return 26;
  if (hints.includes("collateral-exterior")) return 46;
  return 34;
}

function localSubtreeFactor(node: any): number {
  const count = typeof node?.descendants === "function" ? node.descendants().length : 1;
  return Math.min(30, Math.max(0, count * 1.2));
}

function createLayoutSolver(input: LayoutInput, model: LayoutModel) {
  return flextree<VirtualLayoutNode>({
    nodeSize: (node) => {
      const data = node.data;
      const width = nodeWidth(input, data.nodeType);
      const height = nodeHeight(input, model, data.nodeType, data.entityId);

      if (data.kind === "row" && data.nodeType === "fake" && !data.isPlaceholder) {
        return [0, 0];
      }

      return input.isVertical ? [width, height] : [height, width];
    },
    spacing: (nodeA, nodeB) => {
      const base = relationGap(nodeA.data, nodeB.data);
      if (nodeA.parent === nodeB.parent) {
        return base + Math.min(localSubtreeFactor(nodeA), localSubtreeFactor(nodeB)) * 0.25;
      }
      return base + Math.min(localSubtreeFactor(nodeA), localSubtreeFactor(nodeB)) * 0.4;
    }
  });
}

function findRootX(hierarchy: FlexHierarchyNode, rootId: string): number {
  let rootX = 0;
  hierarchy.each((node: any) => {
    if (node.data.entityId === rootId || node.data.id === rootId) {
      rootX = node.x;
    }
  });
  return rootX;
}

function getGeneration(model: LayoutModel, entityId: string): number {
  return model.nodeById.get(entityId)?.generation ?? 0;
}

function setPosition(
  positions: Map<string, LayoutPoint>,
  id: string,
  x: number,
  y: number,
  isVertical: boolean
): void {
  if (isVertical) {
    positions.set(id, { x, y });
    return;
  }
  positions.set(id, { x: y, y: x });
}

function appendHierarchyPositions(
  positions: Map<string, LayoutPoint>,
  hierarchy: FlexHierarchyNode,
  model: LayoutModel,
  input: LayoutInput,
  shiftX: number
): void {
  hierarchy.each((rawNode: any) => {
    const node = rawNode.data as VirtualLayoutNode;
    if (node.kind !== "entity") return;
    if (!node.entityId) return;

    const generation = getGeneration(model, node.entityId);
    const logicalX = rawNode.x + shiftX;
    // For horizontal mode, we flip the generation axis so ancestors (negative) expand to the right (+X)
    const logicalY = (input.isVertical ? generation : -generation) * input.generationStep;
    setPosition(positions, node.entityId, logicalX, logicalY, input.isVertical);
  });
}

function compactByGeneration(_positions: Map<string, LayoutPoint>): void {
  // Intentionally disabled for now: this pass was moving nodes independently
  // and could break nucleus-family-spouse alignment on complex branches.
}

function axisValue(point: LayoutPoint, isVertical: boolean): number {
  return isVertical ? point.x : point.y;
}

function withAxis(point: LayoutPoint, isVertical: boolean, axis: number): LayoutPoint {
  return isVertical ? { ...point, x: axis } : { ...point, y: axis };
}

function familyHalfSize(): number {
  return 20;
}

function relationGapUnion(): number {
  return 24;
}

function personFamilyCenterDistance(input: LayoutInput): number {
  return input.personNodeWidth / 2 + familyHalfSize() + relationGapUnion();
}

function resolveRootAnchorPerson(model: LayoutModel, virtualTrees: VirtualTreeBuildResult): string | undefined {
  if (virtualTrees.rootType === "person" || virtualTrees.rootType === "personAlias") {
    return virtualTrees.rootId;
  }
  if (virtualTrees.rootType === "family" || virtualTrees.rootType === "familyAlias") {
    const spouses = model.spousesByFamily.get(virtualTrees.rootId) ?? [];
    const husband = spouses.find(
      (personId) => model.spouseRoleByFamilyPerson.get(`${virtualTrees.rootId}|${personId}`) === "husband"
    );
    return husband ?? spouses[0];
  }
  return undefined;
}

function enforceRootUnionSpacing(
  positions: Map<string, LayoutPoint>,
  model: LayoutModel,
  input: LayoutInput,
  virtualTrees: VirtualTreeBuildResult
): void {
  const anchorPersonId = resolveRootAnchorPerson(model, virtualTrees);
  if (!anchorPersonId) return;

  const anchorPoint = positions.get(anchorPersonId);
  if (!anchorPoint) return;

  const orderedFamilies = orderFamiliesForPerson(model, anchorPersonId, input.focusFamilyId);
  if (orderedFamilies.length === 0) return;

  const minCenterDistance = personFamilyCenterDistance(input);
  let anchorAxis = axisValue(anchorPoint, input.isVertical);
  let direction = 1;

  const firstFamilyPoint = positions.get(orderedFamilies[0]);
  if (firstFamilyPoint) {
    direction = axisValue(firstFamilyPoint, input.isVertical) >= anchorAxis ? 1 : -1;
  }

  let chainAxis = anchorAxis;

  for (let index = 0; index < orderedFamilies.length; index += 1) {
    const familyId = orderedFamilies[index];
    const familyPoint = positions.get(familyId);
    if (!familyPoint) continue;

    const currentFamilyAxis = axisValue(familyPoint, input.isVertical);
    const targetFamilyDistance =
      index === 0
        ? Math.max(minCenterDistance, Math.abs(currentFamilyAxis - anchorAxis))
        : minCenterDistance;
    const familyTargetAxis = chainAxis + direction * targetFamilyDistance;
    positions.set(familyId, withAxis(familyPoint, input.isVertical, familyTargetAxis));

    const spouses = sortSpousesForFamily(model, familyId, anchorPersonId);
    if (spouses.length === 0) {
      chainAxis = familyTargetAxis;
      continue;
    }

    let prevAxis = familyTargetAxis;
    for (let spouseIndex = 0; spouseIndex < spouses.length; spouseIndex += 1) {
      const spouseId = spouses[spouseIndex];
      const spousePoint = positions.get(spouseId);
      if (!spousePoint) continue;

      const spouseDistance =
        index === 0 && spouseIndex === 0
          ? Math.max(minCenterDistance, Math.abs(familyTargetAxis - anchorAxis))
          : minCenterDistance;
      const spouseTargetAxis = prevAxis + direction * spouseDistance;
      positions.set(spouseId, withAxis(spousePoint, input.isVertical, spouseTargetAxis));
      prevAxis = spouseTargetAxis;
    }

    chainAxis = prevAxis;
  }
}

function enforceAncestorSiblingPriority(
  positions: Map<string, LayoutPoint>,
  model: LayoutModel,
  input: LayoutInput,
  virtualTrees: VirtualTreeBuildResult
): void {
  const rootGeneration = model.nodeById.get(virtualTrees.rootId)?.generation ?? 0;
  const siblingCenterDistance = input.personNodeWidth + 18;

  for (const node of model.nodeById.values()) {
    if (node.type !== "person" && node.type !== "personAlias") continue;
    if (node.sidePreference !== "maternal" && node.sidePreference !== "paternal") continue;
    if (node.generation >= rootGeneration) continue;

    const personPoint = positions.get(node.id);
    if (!personPoint) continue;

    const originFamilyId = chooseOriginFamilyForPerson(model, node.id);
    if (!originFamilyId) continue;

    const siblings = (model.childrenByFamily.get(originFamilyId) ?? []).filter(
      (personId) => personId !== node.id && positions.has(personId)
    );
    if (siblings.length === 0) continue;

    const siblingAxes = siblings
      .map((personId) => positions.get(personId))
      .filter((point): point is LayoutPoint => Boolean(point))
      .map((point) => axisValue(point, input.isVertical));
    if (siblingAxes.length === 0) continue;

    const targetAxis =
      node.sidePreference === "maternal"
        ? Math.min(...siblingAxes) - siblingCenterDistance
        : Math.max(...siblingAxes) + siblingCenterDistance;

    positions.set(node.id, withAxis(personPoint, input.isVertical, targetAxis));
  }
}

function anchorToPreviousRoot(
  positions: Map<string, LayoutPoint>,
  rootId: string,
  previous: Map<string, LayoutPoint> | undefined
): void {
  if (!previous) return;
  const previousRoot = previous.get(rootId);
  const currentRoot = positions.get(rootId);
  if (!previousRoot || !currentRoot) return;

  const dx = previousRoot.x - currentRoot.x;
  const dy = previousRoot.y - currentRoot.y;

  for (const [id, point] of positions.entries()) {
    positions.set(id, { x: point.x + dx, y: point.y + dy });
  }
}

export function solveVirtualLayout(
  input: LayoutInput,
  model: LayoutModel,
  virtualTrees: VirtualTreeBuildResult
): SolvedLayout {
  const diagnostics: string[] = [...virtualTrees.diagnostics];
  const positions = new Map<string, LayoutPoint>();

  if (!virtualTrees.rootId) {
    return { positions, diagnostics: [...diagnostics, "Missing root ID."] };
  }

  const solver = createLayoutSolver(input, model);

  const upHierarchy = solver.hierarchy(virtualTrees.ancestorRoot, (node) => node.children);
  solver(upHierarchy);
  const upRootX = findRootX(upHierarchy, virtualTrees.rootId);
  appendHierarchyPositions(positions, upHierarchy, model, input, -upRootX);

  const downHierarchy = solver.hierarchy(virtualTrees.descendantRoot, (node) => node.children);
  solver(downHierarchy);
  const downRootX = findRootX(downHierarchy, virtualTrees.rootId);
  appendHierarchyPositions(positions, downHierarchy, model, input, -downRootX);

  compactByGeneration(positions);
  enforceRootUnionSpacing(positions, model, input, virtualTrees);
  enforceAncestorSiblingPriority(positions, model, input, virtualTrees);
  anchorToPreviousRoot(positions, virtualTrees.rootId, input.previousPositions);

  return { positions, diagnostics };
}
