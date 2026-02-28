import type { ExpandedNode } from "@/types/domain";
import type { LayoutInput, VirtualLayoutNode } from "@/core/layout/types";
import type { LayoutModel } from "@/core/layout/vnext/model";
import {
  chooseOriginFamilyForPerson,
  orderFamiliesForPerson,
  resolvePrimaryFamilyForPerson,
  sortChildrenForFamily,
  sortChildrenForJunction,
  sortSpousesForFamily
} from "@/core/layout/vnext/orderRules";

export type VirtualTreeBuildResult = {
  rootId: string;
  rootType: ExpandedNode["type"];
  ancestorRoot: VirtualLayoutNode;
  descendantRoot: VirtualLayoutNode;
  diagnostics: string[];
};

type BuildContext = {
  model: LayoutModel;
  input: LayoutInput;
  rootId: string;
  collapsedSet: Set<string>;
  rowCounters: Map<string, number>;
  ancestorVisit: Set<string>;
  descendantVisit: Set<string>;
  diagnostics: string[];
  primaryByPerson: Map<string, string | undefined>;
};

function resolveRootId(input: LayoutInput): string | null {
  if (!input.graph.nodes.length) return null;
  if (input.focusFamilyId && input.graph.nodes.some((node) => node.id === input.focusFamilyId)) {
    return input.focusFamilyId;
  }
  if (input.focusPersonId && input.graph.nodes.some((node) => node.id === input.focusPersonId)) {
    return input.focusPersonId;
  }
  return input.graph.nodes[0]?.id ?? null;
}

function createBuildContext(model: LayoutModel, input: LayoutInput, rootId: string): BuildContext {
  return {
    model,
    input,
    rootId,
    collapsedSet: new Set(input.collapsedNodeIds ?? []),
    rowCounters: new Map<string, number>(),
    ancestorVisit: new Set<string>(),
    descendantVisit: new Set<string>(),
    diagnostics: [],
    primaryByPerson: new Map<string, string | undefined>()
  };
}

function nextVirtualId(ctx: BuildContext, prefix: string, key: string): string {
  const counterKey = `${prefix}|${key}`;
  const next = (ctx.rowCounters.get(counterKey) ?? 0) + 1;
  ctx.rowCounters.set(counterKey, next);
  return `v2:${prefix}:${key}:${next}`;
}

function makeRowNode(
  ctx: BuildContext,
  prefix: string,
  key: string,
  relationHint: VirtualLayoutNode["relationHint"] = "generic"
): VirtualLayoutNode {
  return {
    id: nextVirtualId(ctx, prefix, key),
    kind: "row",
    nodeType: "fake",
    children: [],
    relationHint
  };
}

function makePlaceholder(
  ctx: BuildContext,
  prefix: string,
  key: string,
  nodeType: "person" | "family",
  relationHint: VirtualLayoutNode["relationHint"]
): VirtualLayoutNode {
  return {
    id: nextVirtualId(ctx, `${prefix}-placeholder`, key),
    kind: "row",
    nodeType,
    children: [],
    relationHint,
    isPlaceholder: true
  };
}

function makeEntityNode(
  ctx: BuildContext,
  entityId: string,
  relationHint: VirtualLayoutNode["relationHint"] = "generic"
): VirtualLayoutNode {
  const nodeType = ctx.model.nodeById.get(entityId)?.type;
  if (!nodeType) {
    ctx.diagnostics.push(`Missing visual node for ${entityId}.`);
    return {
      id: nextVirtualId(ctx, "missing", entityId),
      kind: "row",
      nodeType: "fake",
      children: [],
      relationHint
    };
  }

  return {
    id: entityId,
    kind: "entity",
    entityId,
    nodeType,
    children: [],
    relationHint
  };
}

function getPrimaryFamily(ctx: BuildContext, personId: string): string | undefined {
  if (ctx.primaryByPerson.has(personId)) {
    return ctx.primaryByPerson.get(personId);
  }
  const primary = resolvePrimaryFamilyForPerson(ctx.model, personId, ctx.input.focusFamilyId);
  ctx.primaryByPerson.set(personId, primary);
  return primary;
}

function pickJunctionForFamily(ctx: BuildContext, familyId: string, childId?: string): string | undefined {
  const junctions = [...(ctx.model.junctionsByFamily.get(familyId) ?? [])].sort((left, right) =>
    left.localeCompare(right)
  );
  if (junctions.length === 0) return undefined;
  if (!childId) return junctions[0];

  for (const junctionId of junctions) {
    const children = ctx.model.childrenByJunction.get(junctionId) ?? [];
    if (children.includes(childId)) return junctionId;
  }
  return junctions[0];
}

function getFamilySpouseByRole(
  ctx: BuildContext,
  familyId: string,
  role: "husband" | "wife"
): string | undefined {
  const spouses = ctx.model.spousesByFamily.get(familyId) ?? [];
  return spouses.find((spouseId) => ctx.model.spouseRoleByFamilyPerson.get(`${familyId}|${spouseId}`) === role);
}

function buildRootCompanionPlaceholders(
  ctx: BuildContext,
  personId: string,
  coreNode: VirtualLayoutNode
): VirtualLayoutNode {
  const row = makeRowNode(ctx, "up-root", personId, "union-chain");
  row.children.push(coreNode);

  const primary = getPrimaryFamily(ctx, personId);
  const orderedFamilies = orderFamiliesForPerson(
    ctx.model,
    personId,
    ctx.input.focusFamilyId,
    primary
  );

  for (const familyId of orderedFamilies) {
    row.children.push(makePlaceholder(ctx, "up-root-family", `${personId}|${familyId}`, "family", "union-chain"));
    const spouses = sortSpousesForFamily(ctx.model, familyId, personId);
    for (const spouseId of spouses) {
      row.children.push(
        makePlaceholder(ctx, "up-root-spouse", `${familyId}|${spouseId}`, "person", "union-chain")
      );
    }
  }

  if (row.children.length <= 1) return coreNode;
  return row;
}

function buildFamilyDescendantBranches(
  ctx: BuildContext,
  familyNode: VirtualLayoutNode,
  familyId: string,
  depth: number,
  relationHint: VirtualLayoutNode["relationHint"] = "generic"
): void {
  const junctions = [...(ctx.model.junctionsByFamily.get(familyId) ?? [])].sort((left, right) =>
    left.localeCompare(right)
  );

  for (const junctionId of junctions) {
    const junctionNode = makeEntityNode(ctx, junctionId, relationHint);
    familyNode.children.push(junctionNode);

    const children = sortChildrenForJunction(ctx.model, junctionId);
    for (const childId of children) {
      if (depth > 32) continue;
      if (ctx.descendantVisit.has(`${familyId}|${childId}`)) continue;
      ctx.descendantVisit.add(`${familyId}|${childId}`);
      const childRow = buildDescendantRow(ctx, childId, false, depth + 1, relationHint);
      junctionNode.children.push(childRow);
    }
  }
}

function buildDescendantRow(
  ctx: BuildContext,
  personId: string,
  ignorePrimaryFamily = false,
  depth = 0,
  relationHint: VirtualLayoutNode["relationHint"] = "union-chain"
): VirtualLayoutNode {
  const row = makeRowNode(ctx, "down-row", personId, relationHint);
  const personNode = makeEntityNode(ctx, personId, relationHint);
  row.children.push(personNode);

  if (ctx.collapsedSet.has(personId)) {
    return row;
  }

  const primary = getPrimaryFamily(ctx, personId);
  let families = orderFamiliesForPerson(ctx.model, personId, ctx.input.focusFamilyId, primary);

  // In horizontal mode, we restrict to the primary lineage path or direct descendants.
  // We avoid showing secondary spouses (without children of interest) to keep the view clean.
  if (!ctx.input.isVertical && primary) {
    families = families.filter(fId => fId === primary || (ctx.model.childrenByFamily.get(fId)?.length ?? 0) > 0);
  }

  if (ignorePrimaryFamily && primary) {
    families = families.filter((familyId) => familyId !== primary);
  }

  for (const familyId of families) {
    const visitKey = `${personId}|${familyId}`;
    if (ctx.descendantVisit.has(visitKey)) continue;
    ctx.descendantVisit.add(visitKey);

    const familyNode = makeEntityNode(ctx, familyId, relationHint);
    row.children.push(familyNode);

    const spouses = sortSpousesForFamily(ctx.model, familyId, personId);
    for (const spouseId of spouses) {
      row.children.push(makeEntityNode(ctx, spouseId, relationHint));
    }

    buildFamilyDescendantBranches(ctx, familyNode, familyId, depth, relationHint);
  }

  return row;
}

function buildSecondaryFamilyBlock(
  ctx: BuildContext,
  ownerPersonId: string,
  familyId: string,
  sideContext: "paternal-exterior" | "maternal-exterior",
  depth: number
): VirtualLayoutNode {
  const block = makeRowNode(ctx, "secondary-block", `${ownerPersonId}|${familyId}`, "collateral-exterior");
  block.sidePreferenceContext = sideContext;

  const familyNode = makeEntityNode(ctx, familyId, "collateral-exterior");
  familyNode.sidePreferenceContext = sideContext;
  block.children.push(familyNode);

  const spouses = sortSpousesForFamily(ctx.model, familyId, ownerPersonId);
  for (const spouseId of spouses) {
    const spouseNode = makeEntityNode(ctx, spouseId, "collateral-exterior");
    spouseNode.sidePreferenceContext = sideContext;
    block.children.push(spouseNode);
  }

  const hasChildren = (ctx.model.childrenByFamily.get(familyId)?.length ?? 0) > 0;
  if (!hasChildren) {
    return block;
  }

  // Keep real family->junction->child topology for collateral branches.
  buildFamilyDescendantBranches(ctx, familyNode, familyId, depth + 1, "collateral-exterior");

  return block;
}

function sortParentsBand(children: VirtualLayoutNode[]): VirtualLayoutNode[] {
  const score = (context: VirtualLayoutNode["sidePreferenceContext"]): number => {
    if (context === "paternal-exterior") return -2;
    if (context === "paternal") return -1;
    if (context === "maternal") return 1;
    if (context === "maternal-exterior") return 2;
    return 0;
  };

  return [...children].sort((left, right) => {
    const leftScore = score(left.sidePreferenceContext);
    const rightScore = score(right.sidePreferenceContext);
    if (leftScore !== rightScore) return leftScore - rightScore;
    return left.id.localeCompare(right.id);
  });
}

function buildAncestorTree(
  ctx: BuildContext,
  personId: string,
  lineSide: "paternal" | "maternal" | "neutral" = "neutral",
  depth = 0
): VirtualLayoutNode {
  const visitKey = `${personId}|${lineSide}`;
  if (ctx.ancestorVisit.has(visitKey)) {
    return makeEntityNode(ctx, personId, "parents");
  }
  ctx.ancestorVisit.add(visitKey);

  const personNode = makeEntityNode(ctx, personId, "parents");

  if (ctx.collapsedSet.has(personId)) {
    return personId === ctx.rootId ? buildRootCompanionPlaceholders(ctx, personId, personNode) : personNode;
  }

  const originFamilyId = chooseOriginFamilyForPerson(ctx.model, personId);
  const junctionId = originFamilyId ? pickJunctionForFamily(ctx, originFamilyId, personId) : undefined;

  if (!originFamilyId || !junctionId || depth > 32) {
    return personId === ctx.rootId ? buildRootCompanionPlaceholders(ctx, personId, personNode) : personNode;
  }

  const junctionNode = makeEntityNode(ctx, junctionId, "parents");
  personNode.children.push(junctionNode);

  const familyNode = makeEntityNode(ctx, originFamilyId, "parents");
  familyNode.sidePreferenceContext = "centerFam";
  junctionNode.children.push(familyNode);

  const siblings = sortChildrenForFamily(ctx.model, originFamilyId).filter((childId) => childId !== personId);

  const makeSiblingBus = (ids: string[]) => {
    if (ids.length === 0) return null;
    const bus = makeRowNode(ctx, "sibling-bus", originFamilyId, "siblings");
    bus.children = ids.map(id => {
      return buildDescendantRow(ctx, id, false, 0, "siblings");
    });
    return bus;
  };

  const parentsBand = makeRowNode(ctx, "parents-band", originFamilyId, "parents");
  familyNode.children.push(parentsBand);

  const fatherId = getFamilySpouseByRole(ctx, originFamilyId, "husband");
  const motherId = getFamilySpouseByRole(ctx, originFamilyId, "wife");

  if (fatherId) {
    const fatherNode = buildAncestorTree(ctx, fatherId, "paternal", depth + 1);
    fatherNode.sidePreferenceContext = "paternal";
    parentsBand.children.push(fatherNode);

    if (ctx.input.isVertical) {
      const fatherFamilies = orderFamiliesForPerson(ctx.model, fatherId, ctx.input.focusFamilyId, originFamilyId).filter(
        (familyId) => familyId !== originFamilyId
      );
      for (const familyId of fatherFamilies) {
        const block = buildSecondaryFamilyBlock(ctx, fatherId, familyId, "paternal-exterior", depth + 1);
        parentsBand.children.push(block);
      }
    }
  }

  if (motherId) {
    const motherNode = buildAncestorTree(ctx, motherId, "maternal", depth + 1);
    motherNode.sidePreferenceContext = "maternal";
    parentsBand.children.push(motherNode);

    if (ctx.input.isVertical) {
      const motherFamilies = orderFamiliesForPerson(ctx.model, motherId, ctx.input.focusFamilyId, originFamilyId).filter(
        (familyId) => familyId !== originFamilyId
      );
      for (const familyId of motherFamilies) {
        const block = buildSecondaryFamilyBlock(ctx, motherId, familyId, "maternal-exterior", depth + 1);
        parentsBand.children.push(block);
      }
    }
  }

  parentsBand.children = sortParentsBand(parentsBand.children);

  if (lineSide === "paternal") {
    const bus = ctx.input.isVertical ? makeSiblingBus(siblings) : null;
    junctionNode.children = bus ? [bus, familyNode] : [familyNode];
  } else if (lineSide === "maternal") {
    const bus = ctx.input.isVertical ? makeSiblingBus(siblings) : null;
    junctionNode.children = bus ? [familyNode, bus] : [familyNode];
  } else {
    const split = Math.floor(siblings.length / 2);
    const leftBus = ctx.input.isVertical ? makeSiblingBus(siblings.slice(0, split)) : null;
    const rightBus = ctx.input.isVertical ? makeSiblingBus(siblings.slice(split)) : null;
    junctionNode.children = [
      ...(leftBus ? [leftBus] : []),
      familyNode,
      ...(rightBus ? [rightBus] : [])
    ];
  }

  return personId === ctx.rootId ? buildRootCompanionPlaceholders(ctx, personId, personNode) : personNode;
}

function buildFamilyAsRootAncestors(ctx: BuildContext, familyId: string): VirtualLayoutNode {
  const familyNode = makeEntityNode(ctx, familyId, "parents");
  const parentsBand = makeRowNode(ctx, "family-root-parents", familyId, "parents");
  familyNode.children.push(parentsBand);

  const fatherId = getFamilySpouseByRole(ctx, familyId, "husband");
  const motherId = getFamilySpouseByRole(ctx, familyId, "wife");

  if (fatherId) {
    const fatherNode = buildAncestorTree(ctx, fatherId, "paternal", 1);
    fatherNode.sidePreferenceContext = "paternal";
    parentsBand.children.push(fatherNode);

    const fatherFamilies = orderFamiliesForPerson(ctx.model, fatherId, ctx.input.focusFamilyId, familyId).filter(
      (candidateId) => candidateId !== familyId
    );
    for (const candidateId of fatherFamilies) {
      const block = buildSecondaryFamilyBlock(ctx, fatherId, candidateId, "paternal-exterior", 1);
      parentsBand.children.push(block);
    }
  }

  if (motherId) {
    const motherNode = buildAncestorTree(ctx, motherId, "maternal", 1);
    motherNode.sidePreferenceContext = "maternal";
    parentsBand.children.push(motherNode);

    const motherFamilies = orderFamiliesForPerson(ctx.model, motherId, ctx.input.focusFamilyId, familyId).filter(
      (candidateId) => candidateId !== familyId
    );
    for (const candidateId of motherFamilies) {
      const block = buildSecondaryFamilyBlock(ctx, motherId, candidateId, "maternal-exterior", 1);
      parentsBand.children.push(block);
    }
  }

  parentsBand.children = sortParentsBand(parentsBand.children);
  return familyNode;
}

function buildFamilyAsRootDescendants(ctx: BuildContext, familyId: string): VirtualLayoutNode {
  const fatherId = getFamilySpouseByRole(ctx, familyId, "husband");
  const motherId = getFamilySpouseByRole(ctx, familyId, "wife");

  if (fatherId || motherId) {
    const anchorParent = fatherId ?? motherId;
    if (anchorParent) {
      return buildDescendantRow(ctx, anchorParent);
    }
  }

  const rootRow = makeRowNode(ctx, "down-root-family", familyId, "union-chain");
  const familyNode = makeEntityNode(ctx, familyId, "union-chain");
  rootRow.children.push(familyNode);
  buildFamilyDescendantBranches(ctx, familyNode, familyId, 0);
  return rootRow;
}

export function buildVirtualTrees(model: LayoutModel, input: LayoutInput): VirtualTreeBuildResult {
  const rootId = resolveRootId(input);
  if (!rootId) {
    return {
      rootId: "",
      rootType: "person",
      ancestorRoot: {
        id: "empty-up",
        kind: "row",
        nodeType: "fake",
        children: []
      },
      descendantRoot: {
        id: "empty-down",
        kind: "row",
        nodeType: "fake",
        children: []
      },
      diagnostics: ["No root for layout."]
    };
  }

  const rootNode = model.nodeById.get(rootId);
  if (!rootNode) {
    return {
      rootId,
      rootType: "person",
      ancestorRoot: {
        id: "missing-up",
        kind: "row",
        nodeType: "fake",
        children: []
      },
      descendantRoot: {
        id: "missing-down",
        kind: "row",
        nodeType: "fake",
        children: []
      },
      diagnostics: [`Root ${rootId} not found in visible graph.`]
    };
  }

  const ctx = createBuildContext(model, input, rootId);

  let ancestorRoot: VirtualLayoutNode;
  let descendantRoot: VirtualLayoutNode;

  if (rootNode.type === "family" || rootNode.type === "familyAlias") {
    ancestorRoot = buildFamilyAsRootAncestors(ctx, rootId);
    descendantRoot = buildFamilyAsRootDescendants(ctx, rootId);
  } else {
    ancestorRoot = buildAncestorTree(ctx, rootId);
    descendantRoot = buildDescendantRow(ctx, rootId);
  }

  return {
    rootId,
    rootType: rootNode.type,
    ancestorRoot,
    descendantRoot,
    diagnostics: ctx.diagnostics
  };
}
