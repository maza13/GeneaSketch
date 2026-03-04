import type {
  ExpandedEdge,
  ExpandedGraph,
  ExpandedNode,
  GeneaDocument,
  SidePreference,
  ViewConfig
} from "@/types/domain";
import { getRelationIndexes, type RelationIndexes } from "./indexes";

type FamilyVisibleModel = {
  id: string;
  husbandId: string | null;
  wifeId: string | null;
  childrenIds: string[];
  generation: number;
  sidePreference: SidePreference;
};

type AliasContextRole = "spouse" | "child";

type PersonAliasPlan = {
  aliasByContextKey: Map<string, string>;
  aliasToCanonical: Map<string, string>;
};

type FamilyAliasPlan = {
  aliasByFamilyAndSide: Map<string, string>;
  aliasToCanonical: Map<string, string>;
};

export function expandGraph(document: GeneaDocument, config: ViewConfig): ExpandedGraph {
  const focusPersonId = config.focusPersonId;
  const focusFamilyId = config.focusFamilyId;
  const focusFamily = focusFamilyId ? document.families[focusFamilyId] : null;

  // Si no hay familia objetivo válida, y tampoco hay persona válida, abortamos.
  if (!focusFamily && (!focusPersonId || !document.persons[focusPersonId])) {
    return { nodes: [], edges: [] };
  }

  // Use Global Indexing (Cached)
  const indexes = getRelationIndexes(document);

  // Determine starting nodes for expansion
  const focusRoots = focusFamily
    ? [focusFamily.husbandId, focusFamily.wifeId].filter(Boolean) as string[]
    : [focusPersonId!];

  let finalVisiblePersons = new Set<string>();

  if (config.preset === "family_origin") {
    // Parents + Full Siblings of focus. No grandparents.
    const parents = new Set<string>();
    const fullSiblings = new Set<string>();
    for (const rootId of focusRoots) {
      const p = indexes.parentsByPerson[rootId] ?? [];
      for (const id of p) parents.add(id);

      const s = collectFullSiblings(indexes, rootId);
      for (const id of s) fullSiblings.add(id);
    }
    finalVisiblePersons = new Set([...focusRoots, ...parents, ...fullSiblings]);
  } else if (config.preset === "nuclear_family") {
    // Focus + Parents + Spouses + Children (1 gen up, 1 gen down)
    const parents = new Set<string>();
    for (const rootId of focusRoots) {
      const p = indexes.parentsByPerson[rootId] ?? [];
      for (const id of p) parents.add(id);
    }
    const spouses = new Set<string>();
    const children = new Set<string>();
    for (const rootId of focusRoots) {
      (indexes.spousesByPerson[rootId] ?? []).forEach(s => spouses.add(s));
      (indexes.childrenByPerson[rootId] ?? []).forEach(c => children.add(c));
    }
    finalVisiblePersons = new Set([...focusRoots, ...parents, ...spouses, ...children]);
  } else if (config.preset === "extended_family") {
    // 2 generations up + 2 generations down + Spouses of those in direct line
    const explicitZeroCollapse =
      config.showSpouses === false &&
      config.depth.ancestors === 0 &&
      config.depth.descendants === 0;
    const upDepth = explicitZeroCollapse ? 0 : 2;
    const downDepth = explicitZeroCollapse ? 0 : 2;
    const ancestors2 = collectAncestorsForMultiple(indexes, focusRoots, upDepth);
    const descendants2 = collectDescendantsForMultiple(indexes, focusRoots, downDepth);
    const directLine = new Set(focusRoots);
    ancestors2.forEach(ids => ids.forEach(id => directLine.add(id)));
    descendants2.forEach(ids => ids.forEach(id => directLine.add(id)));
    finalVisiblePersons = new Set(directLine);
    for (const pId of directLine) {
      (indexes.spousesByPerson[pId] ?? []).forEach(s => finalVisiblePersons.add(s));
    }

    // Extended preset also honors collateral depth sliders when provided.
    const collateralAncestorDepth = Math.max(config.depth.unclesGreatUncles, config.depth.unclesCousins > 0 ? 1 : 0);
    const collateralAncestorsByDepth = collectAncestorsForMultiple(indexes, focusRoots, collateralAncestorDepth);
    const unclesGreatUncles = collectUnclesGreatUncles(indexes, collateralAncestorsByDepth, config.depth.unclesGreatUncles);
    const siblingsNephews = collectSiblingsNephewsForMultiple(indexes, focusRoots, config.depth.siblingsNephews);
    const unclesCousins = collectUnclesCousins(indexes, focusRoots, config.depth.unclesCousins);
    for (const personId of [...unclesGreatUncles, ...siblingsNephews, ...unclesCousins]) {
      finalVisiblePersons.add(personId);
    }
  } else if (config.preset === "direct_ancestors") {
    // All direct ancestors. No collaterals or descendants.
    const allAncestors = collectAncestorsForMultiple(indexes, focusRoots, 25);
    finalVisiblePersons = new Set(focusRoots);
    allAncestors.forEach(ids => ids.forEach(id => finalVisiblePersons.add(id)));
  } else if (config.preset === "direct_descendants") {
    // All direct descendants. No collaterals or ancestors.
    const allDescendants = collectDescendantsForMultiple(indexes, focusRoots, 25);
    finalVisiblePersons = new Set(focusRoots);
    allDescendants.forEach(ids => ids.forEach(id => finalVisiblePersons.add(id)));
  } else {
    // Custom logic (the old ways)
    const collateralAncestorDepth = Math.max(config.depth.unclesGreatUncles, config.depth.unclesCousins > 0 ? 1 : 0);
    const collateralAncestorsByDepth = collectAncestorsForMultiple(indexes, focusRoots, collateralAncestorDepth);

    const ancestorsByDepth = collectAncestorsForMultiple(indexes, focusRoots, config.depth.ancestors);
    const descendantsByDepth = collectDescendantsForMultiple(indexes, focusRoots, config.depth.descendants);

    const directLine = new Set<string>(focusRoots);
    for (const ids of ancestorsByDepth.values()) {
      for (const id of ids) directLine.add(id);
    }
    for (const ids of descendantsByDepth.values()) {
      for (const id of ids) directLine.add(id);
    }

    const unclesGreatUncles = collectUnclesGreatUncles(indexes, collateralAncestorsByDepth, config.depth.unclesGreatUncles);
    const siblingsNephews = collectSiblingsNephewsForMultiple(indexes, focusRoots, config.depth.siblingsNephews);
    const unclesCousins = collectUnclesCousins(indexes, focusRoots, config.depth.unclesCousins);

    const baseVisiblePersons = new Set<string>([
      ...directLine,
      ...unclesGreatUncles,
      ...siblingsNephews,
      ...unclesCousins
    ]);

    finalVisiblePersons = new Set<string>(baseVisiblePersons);
    if (config.showSpouses) {
      for (const personId of baseVisiblePersons) {
        const spouses = indexes.spousesByPerson[personId] ?? [];
        for (const spouseId of spouses) finalVisiblePersons.add(spouseId);
      }
    }
  }

  // Si hay focusFamily, ambos son "generacion 0". De lo crontrario es el focusPerson.
  const mainFocus = focusRoots[0]!;
  const generationByPerson = buildGenerationMap(indexes, focusRoots, finalVisiblePersons);
  compactGenerations(generationByPerson);
  const ancestorPathByPerson = buildAncestorPathMap(document, mainFocus, finalVisiblePersons, focusRoots);
  const personSideById = new Map<string, SidePreference>();
  for (const personId of finalVisiblePersons) {
    personSideById.set(personId, resolveSidePreference(ancestorPathByPerson.get(personId)));
  }

  const visibleFamilies = collectVisibleFamilies(document, finalVisiblePersons, generationByPerson, personSideById);
  const familyById = new Map(visibleFamilies.map((family) => [family.id, family]));
  const personDistance = buildPersonDistance(indexes, focusRoots);
  const repeatedPersons = buildRepeatedPersonSet(indexes, focusRoots, finalVisiblePersons);

  const personAliasPlan = buildPersonAliasPlan(visibleFamilies, finalVisiblePersons, personDistance, personSideById, repeatedPersons);
  const familyAliasPlan = buildFamilyAliasPlan(visibleFamilies, personSideById);

  const nodes = new Map<string, ExpandedNode>();
  const edges = new Map<string, ExpandedEdge>();

  const addNode = (node: ExpandedNode) => {
    if (!nodes.has(node.id)) nodes.set(node.id, node);
  };

  const addEdge = (edge: ExpandedEdge) => {
    if (!edges.has(edge.id)) edges.set(edge.id, edge);
  };

  for (const personId of finalVisiblePersons) {
    const person = document.persons[personId];
    if (!person) continue;
    const generation = generationByPerson.get(personId) ?? 0;
    addNode({
      id: personId,
      label: person.name,
      isAlias: false,
      generation,
      generationDepth: Math.abs(generation),
      sidePreference: personSideById.get(personId) ?? "neutral",
      type: "person"
    });
  }

  for (const family of visibleFamilies) {
    addNode({
      id: family.id,
      label: "",
      isAlias: false,
      generation: family.generation,
      generationDepth: Math.abs(family.generation),
      sidePreference: family.sidePreference,
      type: "family"
    });
  }

  for (const [aliasId, canonicalId] of personAliasPlan.aliasToCanonical.entries()) {
    const person = document.persons[canonicalId];
    if (!person) continue;
    const generation = generationByPerson.get(canonicalId) ?? 0;
    addNode({
      id: aliasId,
      canonicalId,
      label: person.name,
      isAlias: true,
      generation,
      generationDepth: Math.abs(generation),
      sidePreference: personSideById.get(canonicalId) ?? "neutral",
      type: "personAlias"
    });
    addEdge({
      id: `identity:${aliasId}->${canonicalId}`,
      from: aliasId,
      to: canonicalId,
      type: "identity",
      layoutAffects: false
    });
  }

  for (const [aliasId, canonicalId] of familyAliasPlan.aliasToCanonical.entries()) {
    const family = familyById.get(canonicalId);
    if (!family) continue;
    addNode({
      id: aliasId,
      canonicalId,
      label: "",
      isAlias: true,
      generation: family.generation,
      generationDepth: Math.abs(family.generation),
      sidePreference: family.sidePreference,
      type: "familyAlias"
    });
    addEdge({
      id: `identity:${aliasId}->${canonicalId}`,
      from: aliasId,
      to: canonicalId,
      type: "identity",
      layoutAffects: false
    });
  }

  for (const family of visibleFamilies) {
    const orderedChildren = [...family.childrenIds].sort((leftId, rightId) => compareChildren(document, leftId, rightId));

    const spouseIds = [family.husbandId, family.wifeId].filter((id): id is string => Boolean(id));
    for (const spouseId of spouseIds) {
      if (!finalVisiblePersons.has(spouseId)) continue;
      const personVisual = resolvePersonVisualId(personAliasPlan, spouseId, family.id, "spouse");
      const side = personSideById.get(spouseId) ?? "neutral";
      const familyVisual = resolveFamilyVisualId(familyAliasPlan, family.id, side);
      const spouseRole = spouseId === family.husbandId ? "husband" as const : "wife" as const;
      addEdge({
        id: `spouse:${personVisual}->${familyVisual}`,
        from: personVisual,
        to: familyVisual,
        type: "spouse",
        familyId: family.id,
        spouseRole,
        layoutAffects: true
      });
    }

    const childrenByFamilyVisual = new Map<string, string[]>();
    for (const childId of orderedChildren) {
      const side = personSideById.get(childId) ?? "neutral";
      const familyVisual = resolveFamilyVisualId(familyAliasPlan, family.id, side);
      const bucket = childrenByFamilyVisual.get(familyVisual) ?? [];
      bucket.push(childId);
      childrenByFamilyVisual.set(familyVisual, bucket);
    }

    for (const [familyVisual, childIds] of childrenByFamilyVisual.entries()) {
      if (childIds.length === 0) continue;

      const junctionId = `junction:${familyVisual}`;
      const familyGen = family.generation;

      addNode({
        id: junctionId,
        label: "",
        isAlias: false,
        generation: familyGen,
        generationDepth: 0,
        sidePreference: "neutral",
        type: "junction"
      });

      addEdge({
        id: `junction-link:${familyVisual}->${junctionId}`,
        from: familyVisual,
        to: junctionId,
        type: "junction-link",
        familyId: family.id,
        layoutAffects: true
      });

      for (const childId of childIds) {
        const childVisual = resolvePersonVisualId(personAliasPlan, childId, family.id, "child");
        addEdge({
          id: `child:${junctionId}->${childVisual}`,
          from: junctionId,
          to: childVisual,
          type: "child",
          familyId: family.id,
          layoutAffects: true
        });
      }
    }
  }

  return {
    nodes: [...nodes.values()],
    edges: [...edges.values()]
  };
}


function collectAncestorsForMultiple(indexes: RelationIndexes, roots: string[], maxDepth: number): Map<number, Set<string>> {
  const byDepth = new Map<number, Set<string>>();
  if (maxDepth <= 0) return byDepth;

  const visited = new Set<string>(roots);
  const queue: Array<{ id: string; depth: number }> = roots.map(id => ({ id, depth: 0 }));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const parents = indexes.parentsByPerson[current.id] ?? [];
    for (const parentId of parents) {
      const depth = current.depth + 1;
      const bucket = byDepth.get(depth) ?? new Set<string>();
      bucket.add(parentId);
      byDepth.set(depth, bucket);

      if (visited.has(parentId)) continue;
      visited.add(parentId);
      queue.push({ id: parentId, depth });
    }
  }

  return byDepth;
}

function collectDescendantsForMultiple(indexes: RelationIndexes, roots: string[], maxDepth: number): Map<number, Set<string>> {
  const byDepth = new Map<number, Set<string>>();
  if (maxDepth <= 0) return byDepth;

  const visited = new Set<string>(roots);
  const queue: Array<{ id: string; depth: number }> = roots.map(id => ({ id, depth: 0 }));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const children = indexes.childrenByPerson[current.id] ?? [];
    for (const childId of children) {
      const depth = current.depth + 1;
      const bucket = byDepth.get(depth) ?? new Set<string>();
      bucket.add(childId);
      byDepth.set(depth, bucket);

      if (visited.has(childId)) continue;
      visited.add(childId);
      queue.push({ id: childId, depth });
    }
  }

  return byDepth;
}

function collectUnclesGreatUncles(indexes: RelationIndexes, ancestorsByDepth: Map<number, Set<string>>, maxDepth: number): Set<string> {
  const out = new Set<string>();
  if (maxDepth <= 0) return out;

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const ancestors = ancestorsByDepth.get(depth) ?? new Set<string>();
    for (const ancestorId of ancestors) {
      const siblings = collectSiblings(indexes, ancestorId);
      for (const siblingId of siblings) out.add(siblingId);
    }
  }

  return out;
}

function collectSiblingsNephewsForMultiple(indexes: RelationIndexes, roots: string[], depth: number): Set<string> {
  const out = new Set<string>();
  if (depth <= 0) return out;

  const queue: Array<{ id: string; depth: number }> = [];
  for (const rootId of roots) {
    const siblings = collectSiblings(indexes, rootId);
    for (const siblingId of siblings) {
      if (!out.has(siblingId)) {
        out.add(siblingId);
        queue.push({ id: siblingId, depth: 1 });
      }
    }
  }

  // Descendants of siblings (Slider B)
  // depth N means we show N-1 generations of descendants
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= depth) continue;
    const children = indexes.childrenByPerson[current.id] ?? [];
    for (const childId of children) {
      if (!out.has(childId)) {
        out.add(childId);
        queue.push({ id: childId, depth: current.depth + 1 });
      }
    }
  }

  return out;
}

function collectUnclesCousins(indexes: RelationIndexes, roots: string[], depth: number): Set<string> {
  const out = new Set<string>();
  if (depth <= 0) return out;

  // Parents of focus roots
  const parents = new Set<string>();
  for (const rootId of roots) {
    const p = indexes.parentsByPerson[rootId] ?? [];
    for (const id of p) parents.add(id);
  }

  const queue: Array<{ id: string; depth: number }> = [];

  for (const parentId of parents) {
    const uncles = collectSiblings(indexes, parentId);
    for (const uncleId of uncles) {
      if (!out.has(uncleId)) {
        out.add(uncleId);
        queue.push({ id: uncleId, depth: 1 });
      }
    }
  }

  // Descendants of direct uncles (Slider C)
  // depth N means we show N-1 generations of descendants
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= depth) continue;
    const children = indexes.childrenByPerson[current.id] ?? [];
    for (const childId of children) {
      if (!out.has(childId)) {
        out.add(childId);
        queue.push({ id: childId, depth: current.depth + 1 });
      }
    }
  }

  return out;
}

function collectFullSiblings(indexes: RelationIndexes, personId: string): string[] {
  const out = new Set<string>();
  const parents = indexes.parentsByPerson[personId] ?? [];
  if (parents.length === 0) return [];

  // Get children of ALL parents
  const childrenPerParent = parents.map(pId => new Set(indexes.childrenByPerson[pId] ?? []));

  // Intersection: only children that are in ALL parent sets
  const firstSet = childrenPerParent[0];
  for (const siblingId of firstSet) {
    if (siblingId === personId) continue;
    if (childrenPerParent.every(set => set.has(siblingId))) {
      out.add(siblingId);
    }
  }

  return [...out];
}

function collectSiblings(indexes: RelationIndexes, personId: string): string[] {
  const out = new Set<string>();
  const parents = indexes.parentsByPerson[personId] ?? [];
  for (const parentId of parents) {
    const siblings = indexes.childrenByPerson[parentId] ?? [];
    for (const siblingId of siblings) {
      if (siblingId !== personId) out.add(siblingId);
    }
  }
  return [...out];
}

function buildGenerationMap(indexes: RelationIndexes, roots: string[], visiblePersons: Set<string>): Map<string, number> {
  const out = new Map<string, number>();
  const processed = new Set<string>();
  const queue: string[] = [];

  for (const root of roots) {
    out.set(root, 0);
    queue.push(root);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (processed.has(current)) continue;
    processed.add(current);
    const currentGen = out.get(current) ?? 0;

    const parents = indexes.parentsByPerson[current] ?? [];
    for (const parentId of parents) {
      if (!visiblePersons.has(parentId)) continue;
      const nextGen = currentGen - 1;
      const prev = out.get(parentId);
      if (prev === undefined || Math.abs(nextGen) < Math.abs(prev) || (Math.abs(nextGen) === Math.abs(prev) && nextGen < prev)) {
        out.set(parentId, nextGen);
        if (!processed.has(parentId)) queue.push(parentId);
      }
    }

    const children = indexes.childrenByPerson[current] ?? [];
    for (const childId of children) {
      if (!visiblePersons.has(childId)) continue;
      const nextGen = currentGen + 1;
      const prev = out.get(childId);
      if (prev === undefined || Math.abs(nextGen) < Math.abs(prev) || (Math.abs(nextGen) === Math.abs(prev) && nextGen < prev)) {
        out.set(childId, nextGen);
        if (!processed.has(childId)) queue.push(childId);
      }
    }

    const spouses = indexes.spousesByPerson[current] ?? [];
    for (const spouseId of spouses) {
      if (!visiblePersons.has(spouseId)) continue;
      const nextGen = currentGen;
      const prev = out.get(spouseId);
      if (prev === undefined || Math.abs(nextGen) < Math.abs(prev)) {
        out.set(spouseId, nextGen);
        if (!processed.has(spouseId)) queue.push(spouseId);
      }
    }
  }

  for (const personId of visiblePersons) {
    if (!out.has(personId)) out.set(personId, 0);
  }

  return out;
}

function compactGenerations(genMap: Map<string, number>): void {
  const usedGens = new Set(genMap.values());
  if (usedGens.size <= 1) return;
  const sorted = [...usedGens].sort((a, b) => a - b);
  const zeroIdx = sorted.indexOf(0);
  if (zeroIdx === -1) return;
  const mapping = new Map<number, number>();
  for (let i = 0; i < sorted.length; i++) {
    mapping.set(sorted[i], i - zeroIdx);
  }
  for (const [id, gen] of genMap) {
    genMap.set(id, mapping.get(gen) ?? gen);
  }
}

function buildAncestorPathMap(document: GeneaDocument, mainFocus: string, visiblePersons: Set<string>, roots: string[]): Map<string, string> {
  const out = new Map<string, string>();
  const queue: Array<{ personId: string; path: string }> = [];

  if (roots.length === 2) {
    // Es una familia: Asignar Husband a paternal y Wife a maternal de raíz para separarlos
    out.set(roots[0]!, "0"); // Hus
    out.set(roots[1]!, "1"); // Wife
    queue.push({ personId: roots[0]!, path: "0" });
    queue.push({ personId: roots[1]!, path: "1" });
  } else {
    out.set(mainFocus, "");
    queue.push({ personId: mainFocus, path: "" });
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const person = document.persons[current.personId];
    if (!person) continue;

    for (const familyId of person.famc) {
      const family = document.families[familyId];
      if (!family) continue;

      const parentEntries: Array<{ id: string; step: string }> = [];
      if (family.husbandId && visiblePersons.has(family.husbandId)) parentEntries.push({ id: family.husbandId, step: "0" });
      if (family.wifeId && visiblePersons.has(family.wifeId)) parentEntries.push({ id: family.wifeId, step: "1" });

      for (const entry of parentEntries) {
        const nextPath = `${current.path}${entry.step}`;
        const prevPath = out.get(entry.id);
        if (prevPath === undefined || comparePath(nextPath, prevPath) < 0) {
          out.set(entry.id, nextPath);
          queue.push({ personId: entry.id, path: nextPath });
        }
      }
    }
  }

  return out;
}

function resolveSidePreference(path: string | undefined): SidePreference {
  if (!path || path.length === 0) return "neutral";
  if (path.startsWith("0")) return "paternal";
  if (path.startsWith("1")) return "maternal";
  return "neutral";
}

function collectVisibleFamilies(
  document: GeneaDocument,
  visiblePersons: Set<string>,
  generationByPerson: Map<string, number>,
  sideByPerson: Map<string, SidePreference>
): FamilyVisibleModel[] {
  const out: FamilyVisibleModel[] = [];

  for (const family of Object.values(document.families)) {
    const parents = [family.husbandId, family.wifeId].filter((id): id is string => Boolean(id));
    const visibleParents = parents.filter((id) => visiblePersons.has(id));
    const visibleChildren = family.childrenIds.filter((id) => visiblePersons.has(id));

    const shouldShow =
      (visibleParents.length >= 1 && visibleChildren.length >= 1) ||
      visibleParents.length >= 2;

    if (!shouldShow) continue;

    const generation =
      visibleParents.length > 0
        ? Math.min(...visibleParents.map((id) => generationByPerson.get(id) ?? 0))
        : (generationByPerson.get(visibleChildren[0]) ?? 0) - 1;

    const sideVotes = new Map<SidePreference, number>([
      ["paternal", 0],
      ["maternal", 0],
      ["neutral", 0]
    ]);

    for (const personId of [...visibleParents, ...visibleChildren]) {
      const side = sideByPerson.get(personId) ?? "neutral";
      sideVotes.set(side, (sideVotes.get(side) ?? 0) + 1);
    }

    const sidePreference = resolveDominantSide(sideVotes);

    out.push({
      id: family.id,
      husbandId: family.husbandId && visiblePersons.has(family.husbandId) ? family.husbandId : null,
      wifeId: family.wifeId && visiblePersons.has(family.wifeId) ? family.wifeId : null,
      childrenIds: visibleChildren,
      generation,
      sidePreference
    });
  }

  return out;
}

function resolveDominantSide(sideVotes: Map<SidePreference, number>): SidePreference {
  const paternal = sideVotes.get("paternal") ?? 0;
  const maternal = sideVotes.get("maternal") ?? 0;
  const neutral = sideVotes.get("neutral") ?? 0;

  if (paternal > maternal && paternal >= neutral) return "paternal";
  if (maternal > paternal && maternal >= neutral) return "maternal";
  if (paternal > 0) return "paternal";
  if (maternal > 0) return "maternal";
  return "neutral";
}

function buildPersonDistance(indexes: RelationIndexes, roots: string[]): Map<string, number> {
  const out = new Map<string, number>();
  const queue: string[] = [];

  for (const root of roots) {
    out.set(root, 0);
    queue.push(root);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dist = out.get(current) ?? 0;

    const neighbors = new Set<string>([
      ...(indexes.parentsByPerson[current] ?? []),
      ...(indexes.childrenByPerson[current] ?? []),
      ...(indexes.spousesByPerson[current] ?? [])
    ]);

    for (const next of neighbors) {
      if (out.has(next)) continue;
      out.set(next, dist + 1);
      queue.push(next);
    }
  }

  return out;
}

function buildRepeatedPersonSet(indexes: RelationIndexes, roots: string[], visiblePersons: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const root of roots) {
    const repeatedAncestors = countMultiPathNodes(root, indexes.parentsByPerson);
    const repeatedDescendants = countMultiPathNodes(root, indexes.childrenByPerson);
    for (const item of [...repeatedAncestors, ...repeatedDescendants]) {
      out.add(item);
    }
  }
  return new Set([...out].filter((personId) => visiblePersons.has(personId)));
}

function countMultiPathNodes(startId: string, adjacency: Record<string, string[]>): Set<string> {
  const pathCounts = new Map<string, number>([[startId, 1]]);
  const queue = [startId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentPaths = pathCounts.get(currentId) ?? 0;
    if (currentPaths <= 0) continue;

    const neighbors = adjacency[currentId] ?? [];
    for (const nextId of neighbors) {
      if (nextId === startId) continue;
      const previous = pathCounts.get(nextId) ?? 0;
      const next = Math.min(2, previous + currentPaths);
      if (next === previous) continue;
      pathCounts.set(nextId, next);
      queue.push(nextId);
    }
  }

  return new Set([...pathCounts.entries()].filter(([nodeId, count]) => nodeId !== startId && count >= 2).map(([nodeId]) => nodeId));
}

function computeFamilyScore(
  family: FamilyVisibleModel,
  excludePersonId: string,
  personDistance: Map<string, number>
): number {
  const otherMembers: string[] = [];
  if (family.husbandId && family.husbandId !== excludePersonId) otherMembers.push(family.husbandId);
  if (family.wifeId && family.wifeId !== excludePersonId) otherMembers.push(family.wifeId);
  for (const childId of family.childrenIds) {
    if (childId !== excludePersonId) otherMembers.push(childId);
  }
  if (otherMembers.length === 0) return Number.MAX_SAFE_INTEGER;
  return Math.min(...otherMembers.map((id) => personDistance.get(id) ?? Number.MAX_SAFE_INTEGER));
}

function buildPersonAliasPlan(
  visibleFamilies: FamilyVisibleModel[],
  visiblePersons: Set<string>,
  personDistance: Map<string, number>,
  sideByPerson: Map<string, SidePreference>,
  repeatedPersons: Set<string>
): PersonAliasPlan {
  const contextsByPerson = new Map<string, Array<{ familyId: string; role: AliasContextRole; familyScore: number; side: SidePreference }>>();

  for (const family of visibleFamilies) {
    const spouseIds = [family.husbandId, family.wifeId].filter((id): id is string => Boolean(id));
    for (const spouseId of spouseIds) {
      if (!visiblePersons.has(spouseId)) continue;
      const list = contextsByPerson.get(spouseId) ?? [];
      list.push({
        familyId: family.id,
        role: "spouse",
        familyScore: computeFamilyScore(family, spouseId, personDistance),
        side: sideByPerson.get(spouseId) ?? "neutral"
      });
      contextsByPerson.set(spouseId, list);
    }

    for (const childId of family.childrenIds) {
      if (!visiblePersons.has(childId)) continue;
      const list = contextsByPerson.get(childId) ?? [];
      list.push({
        familyId: family.id,
        role: "child",
        familyScore: computeFamilyScore(family, childId, personDistance),
        side: sideByPerson.get(childId) ?? "neutral"
      });
      contextsByPerson.set(childId, list);
    }
  }

  const aliasByContextKey = new Map<string, string>();
  const aliasToCanonical = new Map<string, string>();

  for (const [personId, contexts] of contextsByPerson.entries()) {
    if (!repeatedPersons.has(personId)) continue;
    if (contexts.length <= 1) continue;

    const childContexts = contexts.filter(c => c.role === "child");
    const spouseContexts = contexts.filter(c => c.role === "spouse");

    const sortContexts = (ctxList: typeof contexts) => {
      return [...ctxList].sort((left, right) => {
        if (left.familyScore !== right.familyScore) return left.familyScore - right.familyScore;
        if (left.side !== right.side) return sideRank(left.side) - sideRank(right.side);
        return left.familyId.localeCompare(right.familyId);
      });
    };

    const orderedChild = sortContexts(childContexts);
    const orderedSpouse = sortContexts(spouseContexts);

    // Canonical ID is used for the absolute best child context and absolute best spouse context
    // Any other contexts get an Alias!
    const assignAlias = (orderedList: typeof contexts) => {
      for (let index = 1; index < orderedList.length; index += 1) {
        const context = orderedList[index];
        const contextKey = buildPersonContextKey(personId, context.familyId, context.role);
        const aliasId = `__personAlias_${sanitizeId(personId)}_${sanitizeId(context.familyId)}_${context.role}_${index}`;
        aliasByContextKey.set(contextKey, aliasId);
        aliasToCanonical.set(aliasId, personId);
      }
    };

    assignAlias(orderedChild);
    assignAlias(orderedSpouse);
  }

  return { aliasByContextKey, aliasToCanonical };
}

function buildFamilyAliasPlan(visibleFamilies: FamilyVisibleModel[], sideByPerson: Map<string, SidePreference>): FamilyAliasPlan {
  const aliasByFamilyAndSide = new Map<string, string>();
  const aliasToCanonical = new Map<string, string>();

  for (const family of visibleFamilies) {
    const sideContexts = new Set<SidePreference>();

    if (family.husbandId) sideContexts.add(sideByPerson.get(family.husbandId) ?? "neutral");
    if (family.wifeId) sideContexts.add(sideByPerson.get(family.wifeId) ?? "neutral");
    for (const childId of family.childrenIds) {
      sideContexts.add(sideByPerson.get(childId) ?? "neutral");
    }

    if (!sideContexts.has("paternal") || !sideContexts.has("maternal")) continue;
    if (sideContexts.has("neutral")) continue;

    const aliasId = `__familyAlias_${sanitizeId(family.id)}_maternal`;
    aliasByFamilyAndSide.set(buildFamilySideKey(family.id, "maternal"), aliasId);
    aliasToCanonical.set(aliasId, family.id);
  }

  return { aliasByFamilyAndSide, aliasToCanonical };
}

function resolvePersonVisualId(plan: PersonAliasPlan, personId: string, familyId: string, role: AliasContextRole): string {
  const contextKey = buildPersonContextKey(personId, familyId, role);
  return plan.aliasByContextKey.get(contextKey) ?? personId;
}

function resolveFamilyVisualId(plan: FamilyAliasPlan, familyId: string, side: SidePreference): string {
  const key = buildFamilySideKey(familyId, side);
  return plan.aliasByFamilyAndSide.get(key) ?? familyId;
}

function buildPersonContextKey(personId: string, familyId: string, role: AliasContextRole): string {
  return `${personId}|${familyId}|${role}`;
}

function buildFamilySideKey(familyId: string, side: SidePreference): string {
  return `${familyId}|${side}`;
}

function comparePath(left: string, right: string): number {
  if (left.length !== right.length) return left.length - right.length;
  return left.localeCompare(right);
}

export function sideRank(side: SidePreference): number {
  if (side === "paternal") return 0;
  if (side === "maternal") return 1;
  return 2;
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

function compareChildren(document: GeneaDocument, leftId: string, rightId: string): number {
  const leftDate = birthOrderNumber(document.persons[leftId]?.events.find((event) => event.type === "BIRT")?.date);
  const rightDate = birthOrderNumber(document.persons[rightId]?.events.find((event) => event.type === "BIRT")?.date);

  if (leftDate !== rightDate) return leftDate - rightDate;
  return leftId.localeCompare(rightId);
}

function birthOrderNumber(value: string | undefined): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const normalized = value.trim().toUpperCase();
  const monthMap = new Map<string, number>([
    ["JAN", 1],
    ["FEB", 2],
    ["MAR", 3],
    ["APR", 4],
    ["MAY", 5],
    ["JUN", 6],
    ["JUL", 7],
    ["AUG", 8],
    ["SEP", 9],
    ["OCT", 10],
    ["NOV", 11],
    ["DEC", 12]
  ]);

  const parts = normalized.split(/\s+/);
  let year = Number.MAX_SAFE_INTEGER;
  let month = 1;
  let day = 1;

  if (parts.length === 3) {
    day = Number(parts[0]);
    month = monthMap.get(parts[1]) ?? 1;
    year = Number(parts[2]);
  } else if (parts.length === 2) {
    if (monthMap.has(parts[0])) {
      month = monthMap.get(parts[0]) ?? 1;
      year = Number(parts[1]);
    } else {
      day = Number(parts[0]);
      year = Number(parts[1]);
    }
  } else if (parts.length === 1) {
    year = Number(parts[0]);
  }

  if (!Number.isFinite(year)) return Number.MAX_SAFE_INTEGER;
  if (!Number.isFinite(month) || month < 1 || month > 12) month = 1;
  if (!Number.isFinite(day) || day < 1 || day > 31) day = 1;

  return year * 10000 + month * 100 + day;
}
