import type { GeneaDocument } from "@/types/domain";

export type RelationIndexes = {
  parentsByPerson: Record<string, string[]>;
  childrenByPerson: Record<string, string[]>;
  spousesByPerson: Record<string, string[]>;
  siblingsByPerson: Record<string, string[]>;
};

const indexCache = new WeakMap<GeneaDocument, RelationIndexes>();

/**
 * Builds or retrieves a cached index of all primary relationships in the document.
 * Returns records instead of Maps for better compatibility with legacy logic and serialization.
 */
export function getRelationIndexes(doc: GeneaDocument): RelationIndexes {
  let cached = indexCache.get(doc);
  if (cached) return cached;

  const parentsMap = new Map<string, Set<string>>();
  const childrenMap = new Map<string, Set<string>>();
  const spousesMap = new Map<string, Set<string>>();
  const siblingsMap = new Map<string, Set<string>>();

  // Pre-initialize
  for (const personId of Object.keys(doc.persons)) {
    parentsMap.set(personId, new Set());
    childrenMap.set(personId, new Set());
    spousesMap.set(personId, new Set());
    siblingsMap.set(personId, new Set());
  }

  for (const family of Object.values(doc.families)) {
    const parents = [family.husbandId, family.wifeId].filter((id): id is string => Boolean(id));

    // Children and Parents
    for (const childId of family.childrenIds) {
      const childParents = parentsMap.get(childId);
      if (childParents) {
        for (const parentId of parents) {
          childParents.add(parentId);
          childrenMap.get(parentId)?.add(childId);
        }
      }

      // Siblings
      for (const siblingId of family.childrenIds) {
        if (childId !== siblingId) {
          siblingsMap.get(childId)?.add(siblingId);
        }
      }
    }

    // Spouses
    if (family.husbandId && family.wifeId) {
      spousesMap.get(family.husbandId)?.add(family.wifeId);
      spousesMap.get(family.wifeId)?.add(family.husbandId);
    }
  }

  const result: RelationIndexes = {
    parentsByPerson: Object.fromEntries([...parentsMap.entries()].map(([id, set]) => [id, [...set]])),
    childrenByPerson: Object.fromEntries([...childrenMap.entries()].map(([id, set]) => [id, [...set]])),
    spousesByPerson: Object.fromEntries([...spousesMap.entries()].map(([id, set]) => [id, [...set]])),
    siblingsByPerson: Object.fromEntries([...siblingsMap.entries()].map(([id, set]) => [id, [...set]]))
  };

  indexCache.set(doc, result);
  return result;
}

/**
 * Alias for getRelationIndexes to satisfy legacy imports (e.g. in personMatcher.ts)
 */
export function buildRelationshipIndexes(doc: GeneaDocument): RelationIndexes {
  return getRelationIndexes(doc);
}
