import type { Family, GeneaDocument, ParentChildLink, Person, SiblingLink, UnionV2 } from "@/types/domain";

type GraphV2Shape = {
  unions: Record<string, UnionV2>;
  parentChildLinks: Record<string, ParentChildLink>;
  siblingLinks: Record<string, SiblingLink>;
};

function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function inferUnionType(family: Family): UnionV2["unionType"] {
  if (family.events.some((event) => event.type === "DIV")) return "divorced";
  if (family.events.some((event) => event.type === "MARR")) return "married";
  if (family.husbandId || family.wifeId) return "partner";
  return "unknown";
}

function buildUnionFromFamily(family: Family): UnionV2 {
  const marriage = family.events.find((event) => event.type === "MARR");
  const divorce = family.events.find((event) => event.type === "DIV");
  const partnerIds = dedupe([family.husbandId, family.wifeId].filter(Boolean) as string[]);

  return {
    id: `U:${family.id}`,
    legacyFamilyId: family.id,
    partnerIds,
    unionType: inferUnionType(family),
    dateRange:
      marriage?.date || divorce?.date
        ? {
          from: marriage?.date,
          to: divorce?.date
        }
        : undefined,
    place: marriage?.place
  };
}

export function legacyToGraphV2(doc: GeneaDocument): GraphV2Shape {
  const unions: Record<string, UnionV2> = {};
  const parentChildLinks: Record<string, ParentChildLink> = {};
  const siblingLinks: Record<string, SiblingLink> = {};

  const families = Object.values(doc.families).sort((a, b) => a.id.localeCompare(b.id));
  for (const family of families) {
    const union = buildUnionFromFamily(family);
    unions[union.id] = union;

    for (const childId of dedupe(family.childrenIds)) {
      if (family.husbandId) {
        const id = `PCL:${family.id}:father:${childId}`;
        parentChildLinks[id] = {
          id,
          parentId: family.husbandId,
          childId,
          role: "father",
          certainty: "high"
        };
      }
      if (family.wifeId) {
        const id = `PCL:${family.id}:mother:${childId}`;
        parentChildLinks[id] = {
          id,
          parentId: family.wifeId,
          childId,
          role: "mother",
          certainty: "high"
        };
      }
    }

    const siblings = dedupe(family.childrenIds).sort((a, b) => a.localeCompare(b));
    for (let i = 0; i < siblings.length; i += 1) {
      for (let j = i + 1; j < siblings.length; j += 1) {
        const left = siblings[i];
        const right = siblings[j];
        const id = `SBL:${family.id}:${left}:${right}`;
        siblingLinks[id] = {
          id,
          personAId: left,
          personBId: right,
          certainty: "high"
        };
      }
    }
  }

  return { unions, parentChildLinks, siblingLinks };
}

function projectFamilyIdFromUnion(union: UnionV2, index: number): string {
  if (union.legacyFamilyId) return union.legacyFamilyId;
  return `@F_V2_${index + 1}@`;
}

function resolveSpouseRoles(partnerIds: string[], persons: Record<string, Person>): { husbandId?: string; wifeId?: string } {
  const validPartners = partnerIds.filter((id) => Boolean(persons[id]));
  if (validPartners.length === 0) return {};
  if (validPartners.length === 1) {
    const single = validPartners[0];
    const sex = persons[single].sex;
    if (sex === "F") return { wifeId: single };
    return { husbandId: single };
  }

  const male = validPartners.find((id) => persons[id].sex === "M");
  const female = validPartners.find((id) => persons[id].sex === "F" && id !== male);
  const first = validPartners[0];
  const second = validPartners.find((id) => id !== first);

  return {
    husbandId: male ?? (persons[first].sex !== "F" ? first : second),
    wifeId: female ?? (persons[first].sex === "F" ? first : second)
  };
}

function groupLinksByChild(links: ParentChildLink[]): Map<string, ParentChildLink[]> {
  const byChild = new Map<string, ParentChildLink[]>();
  for (const link of links) {
    if (!byChild.has(link.childId)) byChild.set(link.childId, []);
    byChild.get(link.childId)!.push(link);
  }
  return byChild;
}

export function graphV2ToLegacyProjection(doc: GeneaDocument): { families: Record<string, Family>; persons: Record<string, Person> } {
  if (!doc.unions || !doc.parentChildLinks) {
    // Keep deterministic dedupe on legacy projection even when V2 graph is absent.
    const families = structuredClone(doc.families);
    const persons: Record<string, Person> = {};
    for (const person of Object.values(doc.persons)) {
      persons[person.id] = {
        ...person,
        famc: [],
        fams: []
      };
    }
    for (const family of Object.values(families)) {
      family.childrenIds = dedupe(family.childrenIds);
      if (family.husbandId && persons[family.husbandId]) persons[family.husbandId].fams.push(family.id);
      if (family.wifeId && persons[family.wifeId]) persons[family.wifeId].fams.push(family.id);
      for (const childId of family.childrenIds) {
        if (persons[childId]) persons[childId].famc.push(family.id);
      }
    }
    for (const person of Object.values(persons)) {
      person.famc = dedupe(person.famc);
      person.fams = dedupe(person.fams);
    }
    return { families, persons };
  }

  const unions = Object.values(doc.unions).sort((a, b) => a.id.localeCompare(b.id));
  const links = Object.values(doc.parentChildLinks).sort((a, b) => a.id.localeCompare(b.id));
  const byChild = groupLinksByChild(links);

  const families: Record<string, Family> = {};
  const unionIdByFamilyId = new Map<string, string>();
  const unionIdsByParent = new Map<string, string[]>();

  unions.forEach((union, index) => {
    const familyId = projectFamilyIdFromUnion(union, index);
    const roles = resolveSpouseRoles(union.partnerIds, doc.persons);
    families[familyId] = {
      id: familyId,
      husbandId: roles.husbandId,
      wifeId: roles.wifeId,
      childrenIds: [],
      events: [
        ...(union.dateRange?.from ? [{ type: "MARR" as const, date: union.dateRange.from, place: union.place }] : []),
        ...(union.unionType === "divorced" && union.dateRange?.to ? [{ type: "DIV" as const, date: union.dateRange.to }] : [])
      ]
    };
    unionIdByFamilyId.set(familyId, union.id);
    for (const partnerId of union.partnerIds) {
      if (!unionIdsByParent.has(partnerId)) unionIdsByParent.set(partnerId, []);
      unionIdsByParent.get(partnerId)!.push(union.id);
    }
  });

  const familyIdByUnionId = new Map<string, string>();
  for (const [familyId, unionId] of unionIdByFamilyId.entries()) {
    familyIdByUnionId.set(unionId, familyId);
  }

  for (const [childId, childLinks] of byChild.entries()) {
    const parentIds = dedupe(childLinks.map((link) => link.parentId));
    const unionSets = parentIds.map((parentId) => new Set(unionIdsByParent.get(parentId) ?? []));

    let targetUnionId: string | undefined;
    if (unionSets.length > 1) {
      const intersection = Array.from(unionSets[0]).filter((candidate) =>
        unionSets.slice(1).every((set) => set.has(candidate))
      );
      if (intersection.length > 0) targetUnionId = intersection.sort()[0];
    }
    if (!targetUnionId) {
      const firstParent = parentIds.slice().sort()[0];
      targetUnionId = (unionIdsByParent.get(firstParent) ?? []).slice().sort()[0];
    }
    if (!targetUnionId) continue;

    const familyId = familyIdByUnionId.get(targetUnionId);
    if (!familyId || !families[familyId]) continue;
    families[familyId].childrenIds.push(childId);
  }

  const persons: Record<string, Person> = {};
  for (const person of Object.values(doc.persons)) {
    persons[person.id] = {
      ...person,
      famc: [],
      fams: []
    };
  }

  for (const family of Object.values(families)) {
    family.childrenIds = dedupe(family.childrenIds).sort((a, b) => a.localeCompare(b));
    if (family.husbandId && persons[family.husbandId]) persons[family.husbandId].fams.push(family.id);
    if (family.wifeId && persons[family.wifeId]) persons[family.wifeId].fams.push(family.id);
    for (const childId of family.childrenIds) {
      if (persons[childId]) persons[childId].famc.push(family.id);
    }
  }

  for (const person of Object.values(persons)) {
    person.famc = dedupe(person.famc).sort((a, b) => a.localeCompare(b));
    person.fams = dedupe(person.fams).sort((a, b) => a.localeCompare(b));
  }

  return { families, persons };
}

export function syncGraphV2FromLegacy(doc: GeneaDocument): GeneaDocument {
  const graph = legacyToGraphV2(doc);
  return {
    ...doc,
    unions: graph.unions,
    parentChildLinks: graph.parentChildLinks,
    siblingLinks: graph.siblingLinks
  };
}

export function syncLegacyProjectionFromGraphV2(doc: GeneaDocument): GeneaDocument {
  const projection = graphV2ToLegacyProjection(doc);
  return {
    ...doc,
    families: projection.families,
    persons: projection.persons
  };
}

