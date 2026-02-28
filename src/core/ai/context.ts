import type { AiInputContext } from "@/types/ai";
import type { GeneaDocument, Person } from "@/types/domain";

export function personLabel(person: Person): string {
  const fullName = `${person.name}${person.surname ? ` ${person.surname}` : ""}`.trim();
  const birth = person.events.find((event) => event.type === "BIRT")?.date;
  const death = person.events.find((event) => event.type === "DEAT")?.date;
  const birthYear = birth?.match(/(\d{4})/)?.[1];
  const generation =
    birthYear && Number.isFinite(Number(birthYear))
      ? `gen=${Math.floor((Number(birthYear) - 1900) / 25)}`
      : "gen=?";
  return `${fullName} [${person.id}] sexo=${person.sex} estado=${person.lifeStatus} nac=${birth || "?"} def=${death || "?"} famc=${person.famc.length} fams=${person.fams.length} ${generation}`;
}

function summarizePersonNetwork(doc: GeneaDocument, anchorPersonId: string, includeSecondHop: boolean): string[] {
  const anchor = doc.persons[anchorPersonId];
  if (!anchor) return [];
  const ids = new Set<string>([anchor.id]);

  for (const familyId of [...anchor.fams, ...anchor.famc]) {
    const family = doc.families[familyId];
    if (!family) continue;
    if (family.husbandId) ids.add(family.husbandId);
    if (family.wifeId) ids.add(family.wifeId);
    for (const childId of family.childrenIds) ids.add(childId);
  }

  if (includeSecondHop) {
    for (const id of Array.from(ids)) {
      const person = doc.persons[id];
      if (!person) continue;
      for (const familyId of [...person.fams, ...person.famc]) {
        const family = doc.families[familyId];
        if (!family) continue;
        if (family.husbandId) ids.add(family.husbandId);
        if (family.wifeId) ids.add(family.wifeId);
        for (const childId of family.childrenIds) ids.add(childId);
      }
    }
  }

  return Array.from(ids)
    .map((id) => doc.persons[id])
    .filter((value): value is Person => Boolean(value))
    .map(personLabel);
}

function summarizeGlobalIndex(doc: GeneaDocument, expanded: boolean): string[] {
  const persons = Object.values(doc.persons)
    .slice(0, expanded ? 200 : 80)
    .map(personLabel);

  const families = Object.values(doc.families)
    .slice(0, expanded ? 120 : 50)
    .map((family) => {
      const husband = family.husbandId ? doc.persons[family.husbandId] : null;
      const wife = family.wifeId ? doc.persons[family.wifeId] : null;
      const husbandName = husband ? `${husband.name}${husband.surname ? ` ${husband.surname}` : ""}` : "?";
      const wifeName = wife ? `${wife.name}${wife.surname ? ` ${wife.surname}` : ""}` : "?";
      const children = family.childrenIds
        .slice(0, 5)
        .map((id) => doc.persons[id]?.name || id)
        .join(", ");
      const marriage = family.events.find((event) => event.type === "MARR")?.date;
      const divorce = family.events.find((event) => event.type === "DIV")?.date;
      return `FAM ${family.id}: ${husbandName} <-> ${wifeName}, hijos=${family.childrenIds.length}${children ? ` [${children}]` : ""} marr=${marriage || "?"} div=${divorce || "?"}`;
    });

  return [...persons, ...families];
}

export function buildAiContextSnapshot(doc: GeneaDocument, context: AiInputContext, expanded: boolean): string {
  const header = [
    `persons=${Object.keys(doc.persons).length}`,
    `families=${Object.keys(doc.families).length}`,
    `format=${doc.metadata.sourceFormat}`,
    `version=${doc.metadata.gedVersion}`
  ].join(" | ");

  const lines =
    context.kind === "local"
      ? summarizePersonNetwork(doc, context.anchorPersonId, expanded)
      : summarizeGlobalIndex(doc, expanded);

  return [header, ...lines].join("\n");
}
