import type { ExpandedEdge, ExpandedGraph, ExpandedNode, GeneaDocument } from "@/types/domain";

export type LayoutModel = {
  graph: ExpandedGraph;
  document: GeneaDocument | null;
  nodeById: Map<string, ExpandedNode>;
  spousesByFamily: Map<string, string[]>;
  familiesByPerson: Map<string, string[]>;
  spouseRoleByFamilyPerson: Map<string, ExpandedEdge["spouseRole"]>;
  junctionsByFamily: Map<string, string[]>;
  familyByJunction: Map<string, string>;
  childrenByJunction: Map<string, string[]>;
  childrenByFamily: Map<string, string[]>;
  parentFamiliesByPerson: Map<string, string[]>;
};

function pushUnique(map: Map<string, string[]>, key: string, value: string): void {
  const bucket = map.get(key) ?? [];
  if (!bucket.includes(value)) bucket.push(value);
  map.set(key, bucket);
}

export function createLayoutModel(graph: ExpandedGraph, document: GeneaDocument | null): LayoutModel {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  const spousesByFamily = new Map<string, string[]>();
  const familiesByPerson = new Map<string, string[]>();
  const spouseRoleByFamilyPerson = new Map<string, ExpandedEdge["spouseRole"]>();
  const junctionsByFamily = new Map<string, string[]>();
  const familyByJunction = new Map<string, string>();
  const childrenByJunction = new Map<string, string[]>();
  const childrenByFamily = new Map<string, string[]>();
  const parentFamiliesByPerson = new Map<string, string[]>();

  for (const edge of graph.edges) {
    if (!edge.layoutAffects) continue;

    if (edge.type === "spouse") {
      pushUnique(spousesByFamily, edge.to, edge.from);
      pushUnique(familiesByPerson, edge.from, edge.to);
      spouseRoleByFamilyPerson.set(`${edge.to}|${edge.from}`, edge.spouseRole);
      continue;
    }

    if (edge.type === "junction-link") {
      pushUnique(junctionsByFamily, edge.from, edge.to);
      familyByJunction.set(edge.to, edge.from);
      continue;
    }

    if (edge.type === "child") {
      pushUnique(childrenByJunction, edge.from, edge.to);
      const familyId = familyByJunction.get(edge.from);
      if (familyId) {
        pushUnique(childrenByFamily, familyId, edge.to);
        pushUnique(parentFamiliesByPerson, edge.to, familyId);
      }
    }
  }

  // If child edges arrived before junction-link indexing, backfill unresolved families.
  for (const [junctionId, children] of childrenByJunction.entries()) {
    const familyId = familyByJunction.get(junctionId);
    if (!familyId) continue;
    for (const childId of children) {
      pushUnique(childrenByFamily, familyId, childId);
      pushUnique(parentFamiliesByPerson, childId, familyId);
    }
  }

  return {
    graph,
    document,
    nodeById,
    spousesByFamily,
    familiesByPerson,
    spouseRoleByFamilyPerson,
    junctionsByFamily,
    familyByJunction,
    childrenByJunction,
    childrenByFamily,
    parentFamiliesByPerson
  };
}
