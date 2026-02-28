import type { GeneaDocument } from "@/types/domain";
import { analyzeGeneaDocument } from "@/core/diagnostics/analyzer";
import type { DiagnosticCategory } from "@/core/diagnostics/types";

export type GlobalStatistics = {
  totals: { persons: number; families: number; media: number };
  demographics: { sex: Record<"M" | "F" | "U", number>; lifeStatus: Record<"alive" | "deceased", number> };
  coverage: { withName: number; withBirth: number; withDeathAmongDeceased: number; placeholders: number };
  structure: {
    orphanPersons: number;
    orphanFamilies: number;
    emptyFamilies: number;
    singleParentFamilies: number;
    avgChildrenPerFamily: number;
    connectedComponents: number;
  };
  chronology: { earliestBirth?: number; latestBirth?: number; earliestDeath?: number; latestDeath?: number };
  surnamesTop: Array<{ surname: string; count: number }>;
  diagnostics: { error: number; warning: number; info: number; byCategory: Record<DiagnosticCategory, number> };
};

function parseYear(date?: string): number | undefined {
  if (!date) return undefined;
  const match = date.match(/\b(\d{4})\b/);
  if (!match) return undefined;
  return Number.parseInt(match[1], 10);
}

function getFamilyIdsInScope(doc: GeneaDocument, personIds: Set<string>): Set<string> {
  const familyIds = new Set<string>();
  for (const [familyId, family] of Object.entries(doc.families)) {
    if (
      (family.husbandId && personIds.has(family.husbandId)) ||
      (family.wifeId && personIds.has(family.wifeId)) ||
      family.childrenIds.some((childId) => personIds.has(childId))
    ) {
      familyIds.add(familyId);
    }
  }
  return familyIds;
}

function countConnectedComponents(doc: GeneaDocument, personIds: Set<string>, familyIds: Set<string>): number {
  const adjacency = new Map<string, Set<string>>();
  for (const personId of personIds) adjacency.set(personId, new Set<string>());

  for (const familyId of familyIds) {
    const family = doc.families[familyId];
    if (!family) continue;
    const members = [family.husbandId, family.wifeId, ...family.childrenIds].filter(
      (id): id is string => Boolean(id && personIds.has(id))
    );

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        adjacency.get(members[i])?.add(members[j]);
        adjacency.get(members[j])?.add(members[i]);
      }
    }
  }

  const visited = new Set<string>();
  let components = 0;

  for (const personId of personIds) {
    if (visited.has(personId)) continue;
    components += 1;
    const queue = [personId];
    visited.add(personId);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const next of adjacency.get(current) || []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return components;
}

export function calculateGlobalStatistics(
  doc: GeneaDocument,
  scope: "all" | "visible" = "all",
  visiblePersonIds?: string[]
): GlobalStatistics {
  const personIds =
    scope === "visible"
      ? new Set((visiblePersonIds || []).filter((id) => Boolean(doc.persons[id])))
      : new Set(Object.keys(doc.persons));

  const familyIds = getFamilyIdsInScope(doc, personIds);

  const sex: Record<"M" | "F" | "U", number> = { M: 0, F: 0, U: 0 };
  const lifeStatus: Record<"alive" | "deceased", number> = { alive: 0, deceased: 0 };

  let withName = 0;
  let withBirth = 0;
  let withDeathAmongDeceased = 0;
  let placeholders = 0;

  let earliestBirth: number | undefined;
  let latestBirth: number | undefined;
  let earliestDeath: number | undefined;
  let latestDeath: number | undefined;

  const surnameMap = new Map<string, number>();
  const mediaSet = new Set<string>();

  for (const personId of personIds) {
    const person = doc.persons[personId];
    if (!person) continue;

    sex[person.sex] += 1;
    lifeStatus[person.lifeStatus] += 1;

    if (person.name.trim() && person.name !== "(Sin nombre)") withName += 1;
    if (person.isPlaceholder) placeholders += 1;

    if (person.events.some((event) => event.type === "BIRT")) withBirth += 1;
    if (person.lifeStatus === "deceased" && person.events.some((event) => event.type === "DEAT")) withDeathAmongDeceased += 1;

    const birth = parseYear(person.events.find((event) => event.type === "BIRT")?.date);
    const death = parseYear(person.events.find((event) => event.type === "DEAT")?.date);

    if (birth !== undefined) {
      earliestBirth = earliestBirth === undefined ? birth : Math.min(earliestBirth, birth);
      latestBirth = latestBirth === undefined ? birth : Math.max(latestBirth, birth);
    }
    if (death !== undefined) {
      earliestDeath = earliestDeath === undefined ? death : Math.min(earliestDeath, death);
      latestDeath = latestDeath === undefined ? death : Math.max(latestDeath, death);
    }

    if (person.surname && person.surname.trim()) {
      const surname = person.surname.trim().toUpperCase();
      surnameMap.set(surname, (surnameMap.get(surname) || 0) + 1);
    }

    for (const mediaRef of person.mediaRefs) {
      if (doc.media[mediaRef]) mediaSet.add(mediaRef);
    }
  }

  let orphanPersons = 0;
  for (const personId of personIds) {
    const person = doc.persons[personId];
    if (!person) continue;
    const hasFamc = person.famc.some((familyId) => familyIds.has(familyId));
    const hasFams = person.fams.some((familyId) => familyIds.has(familyId));
    if (!hasFamc && !hasFams) orphanPersons += 1;
  }

  let orphanFamilies = 0;
  let emptyFamilies = 0;
  let singleParentFamilies = 0;
  let totalChildren = 0;

  for (const familyId of familyIds) {
    const family = doc.families[familyId];
    if (!family) continue;

    const hasHusband = Boolean(family.husbandId && personIds.has(family.husbandId));
    const hasWife = Boolean(family.wifeId && personIds.has(family.wifeId));
    const childCount = family.childrenIds.filter((childId) => personIds.has(childId)).length;

    totalChildren += childCount;
    if (!hasHusband && !hasWife && childCount === 0) emptyFamilies += 1;
    if ((hasHusband || hasWife) && childCount === 0) orphanFamilies += 1;
    if ((hasHusband ? 1 : 0) + (hasWife ? 1 : 0) === 1) singleParentFamilies += 1;
  }

  const avgChildrenPerFamily = familyIds.size > 0 ? Math.round((totalChildren / familyIds.size) * 10) / 10 : 0;
  const connectedComponents = personIds.size > 0 ? countConnectedComponents(doc, personIds, familyIds) : 0;

  const baseReport = analyzeGeneaDocument(doc);
  const filteredIssues = baseReport.issues.filter((issue) => {
    if (issue.entityId.startsWith("@I")) return personIds.has(issue.entityId);
    if (issue.entityId.startsWith("@F")) return familyIds.has(issue.entityId);
    return scope === "all";
  });

  const byCategory: Record<DiagnosticCategory, number> = {
    structural: 0,
    chronological: 0,
    data_quality: 0,
    relationships: 0
  };

  let error = 0;
  let warning = 0;
  let info = 0;
  for (const issue of filteredIssues) {
    byCategory[issue.category] += 1;
    if (issue.severity === "error") error += 1;
    else if (issue.severity === "warning") warning += 1;
    else info += 1;
  }

  const surnamesTop = Array.from(surnameMap.entries())
    .map(([surname, count]) => ({ surname, count }))
    .sort((a, b) => b.count - a.count || a.surname.localeCompare(b.surname))
    .slice(0, 10);

  return {
    totals: {
      persons: personIds.size,
      families: familyIds.size,
      media: mediaSet.size
    },
    demographics: { sex, lifeStatus },
    coverage: { withName, withBirth, withDeathAmongDeceased, placeholders },
    structure: {
      orphanPersons,
      orphanFamilies,
      emptyFamilies,
      singleParentFamilies,
      avgChildrenPerFamily,
      connectedComponents
    },
    chronology: { earliestBirth, latestBirth, earliestDeath, latestDeath },
    surnamesTop,
    diagnostics: {
      error,
      warning,
      info,
      byCategory
    }
  };
}
