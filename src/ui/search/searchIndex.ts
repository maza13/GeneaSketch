import type { GraphDocument, Person } from "@/types/domain";
import { normalizeSearchText } from "./searchQueryParser";

export type SearchIndexRow = {
  person: Person;
  personId: string;
  idNorm: string;
  nameNorm: string;
  surnameNorm: string;
  fullNorm: string;
  birthPlaceNorm: string;
  deathPlaceNorm: string;
  birthDateNorm: string;
  deathDateNorm: string;
};

export type SearchIndex = {
  rows: SearchIndexRow[];
  rowByPersonId: Map<string, SearchIndexRow>;
};

const cache = new WeakMap<GraphDocument, SearchIndex>();

function personLabel(person: Person): string {
  return `${person.name}${person.surname ? ` ${person.surname}` : ""}`.trim();
}

export function buildSearchIndex(document: GraphDocument): SearchIndex {
  const cached = cache.get(document);
  if (cached) return cached;

  const rows = Object.values(document.persons).map((person) => ({
    person,
    personId: person.id,
    idNorm: normalizeSearchText(person.id),
    nameNorm: normalizeSearchText(person.name),
    surnameNorm: normalizeSearchText(person.surname ?? ""),
    fullNorm: normalizeSearchText(personLabel(person)),
    birthPlaceNorm: normalizeSearchText(person.birthPlace ?? ""),
    deathPlaceNorm: normalizeSearchText(person.deathPlace ?? ""),
    birthDateNorm: normalizeSearchText(person.birthDate ?? ""),
    deathDateNorm: normalizeSearchText(person.deathDate ?? ""),
  }));

  const next = {
    rows,
    rowByPersonId: new Map(rows.map((row) => [row.personId, row])),
  };
  cache.set(document, next);
  return next;
}
