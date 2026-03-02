import { getRelationIndexes } from "@/core/graph/indexes";
import type { GeneaDocument } from "@/types/domain";

export type KinshipNode = {
  personId: string;
  layer: 1 | 2 | 3;
  distance: number;
  generationDelta: number;
  relationHint: "parent" | "child" | "spouse" | "sibling" | "other";
  relationPath: string[];
};

type Edge = {
  to: string;
  relation: "parent" | "child" | "spouse" | "sibling";
  generationShift: number;
};

function buildAdjacency(document: GeneaDocument): Record<string, Edge[]> {
  const idx = getRelationIndexes(document);
  const adjacency: Record<string, Edge[]> = {};
  for (const personId of Object.keys(document.persons)) adjacency[personId] = [];

  for (const [personId, parentIds] of Object.entries(idx.parentsByPerson)) {
    for (const parentId of parentIds) adjacency[personId].push({ to: parentId, relation: "parent", generationShift: 1 });
  }
  for (const [personId, childIds] of Object.entries(idx.childrenByPerson)) {
    for (const childId of childIds) adjacency[personId].push({ to: childId, relation: "child", generationShift: -1 });
  }
  for (const [personId, spouseIds] of Object.entries(idx.spousesByPerson)) {
    for (const spouseId of spouseIds) adjacency[personId].push({ to: spouseId, relation: "spouse", generationShift: 0 });
  }
  for (const [personId, siblingIds] of Object.entries(idx.siblingsByPerson)) {
    for (const siblingId of siblingIds) adjacency[personId].push({ to: siblingId, relation: "sibling", generationShift: 0 });
  }
  return adjacency;
}

export function collectKinshipNodes(document: GeneaDocument, focusPersonId: string, maxDepth = 3): KinshipNode[] {
  if (!document.persons[focusPersonId]) return [];
  const adjacency = buildAdjacency(document);

  const queue: Array<{
    personId: string;
    depth: number;
    generationDelta: number;
    firstRelation: "parent" | "child" | "spouse" | "sibling" | "other";
    path: string[];
  }> = [{
    personId: focusPersonId,
    depth: 0,
    generationDelta: 0,
    firstRelation: "other",
    path: []
  }];

  const visited = new Set<string>([focusPersonId]);
  const out: KinshipNode[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    for (const edge of adjacency[current.personId] || []) {
      if (visited.has(edge.to)) continue;
      const depth = current.depth + 1;
      visited.add(edge.to);
      const firstRelation = current.depth === 0 ? edge.relation : current.firstRelation;
      const nextPath = [...current.path, edge.relation];
      const generationDelta = current.generationDelta + edge.generationShift;
      if (depth >= 1 && depth <= 3) {
        out.push({
          personId: edge.to,
          layer: depth as 1 | 2 | 3,
          distance: depth,
          generationDelta,
          relationHint: firstRelation,
          relationPath: nextPath
        });
      }
      queue.push({
        personId: edge.to,
        depth,
        generationDelta,
        firstRelation,
        path: nextPath
      });
    }
  }

  return out;
}
