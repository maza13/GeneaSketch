import type { GraphDocument, Person } from "@/types/domain";
import {
  normalizeSearchText,
  parseSemanticQuery,
  type SearchFilters,
  type SearchLifeStatusFilter,
  type SearchSexFilter,
  type SearchSurnameFilter
} from "./searchQueryParser";
import { buildSearchIndex } from "./searchIndex";

export type SearchSortField = "id" | "name" | "surname";
export type SearchSortDirection = "asc" | "desc";

export type SearchResult = {
  personId: string;
  title: string;
  subtitle: string;
  rank: number;
  sort: {
    id: string;
    name: string;
    surname: string;
  };
};

export type SearchFilterState = {
  sex: SearchSexFilter;
  lifeStatus: SearchLifeStatusFilter;
  surname: SearchSurnameFilter;
};

const DEFAULT_FILTERS: SearchFilterState = {
  sex: "any",
  lifeStatus: "any",
  surname: "any"
};

function personLabel(person: Person): string {
  return `${person.name}${person.surname ? ` ${person.surname}` : ""}`.trim();
}

function searchByName(document: GraphDocument, target: string): Person[] {
  if (!target) return [];
  return buildSearchIndex(document).rows
    .filter((row) => {
      return (
        row.fullNorm.includes(target) ||
        row.idNorm.includes(target) ||
        row.birthPlaceNorm.includes(target) ||
        row.deathPlaceNorm.includes(target) ||
        row.birthDateNorm.includes(target) ||
        row.deathDateNorm.includes(target)
      );
    })
    .map((row) => row.person);
}

function mapPersonToResult(person: Person, subtitle?: string, rank = 0): SearchResult {
  return {
    personId: person.id,
    title: personLabel(person),
    subtitle: subtitle ?? person.id,
    rank,
    sort: {
      id: normalizeSearchText(person.id),
      name: normalizeSearchText(person.name),
      surname: normalizeSearchText(person.surname ?? "")
    }
  };
}

function sortResults(
  rows: SearchResult[],
  sortField: SearchSortField,
  sortDirection: SearchSortDirection
): SearchResult[] {
  const next = [...rows].sort((a, b) => {
    const rankDelta = b.rank - a.rank;
    if (rankDelta !== 0) return rankDelta;
    const primary = a.sort[sortField].localeCompare(b.sort[sortField]);
    if (primary !== 0) return primary;
    return a.sort.id.localeCompare(b.sort.id);
  });
  return sortDirection === "desc" ? next.reverse() : next;
}

function mergeFilters(uiFilters: SearchFilterState | undefined, parsed: Partial<SearchFilters>): SearchFilterState {
  return {
    sex: parsed.sex ?? uiFilters?.sex ?? DEFAULT_FILTERS.sex,
    lifeStatus: parsed.lifeStatus ?? uiFilters?.lifeStatus ?? DEFAULT_FILTERS.lifeStatus,
    surname: parsed.surname ?? uiFilters?.surname ?? DEFAULT_FILTERS.surname
  };
}

function applyFilters(rows: SearchResult[], document: GraphDocument, filters: SearchFilterState): SearchResult[] {
  return rows.filter((row) => {
    const person = document.persons[row.personId];
    if (!person) return false;
    if (filters.sex !== "any" && person.sex !== filters.sex) return false;
    if (filters.lifeStatus !== "any" && person.lifeStatus !== filters.lifeStatus) return false;
    if (filters.surname === "with" && !(person.surname && person.surname.trim().length > 0)) return false;
    if (filters.surname === "without" && Boolean(person.surname && person.surname.trim().length > 0)) return false;
    return true;
  });
}

export function buildSearchResults(
  document: GraphDocument,
  query: string,
  sortField: SearchSortField,
  sortDirection: SearchSortDirection,
  uiFilters?: SearchFilterState
): SearchResult[] {
  const parsed = parseSemanticQuery(query);
  const activeFilters = mergeFilters(uiFilters, parsed.filters);
  let rows: SearchResult[] = [];

  if (!parsed.target) {
    rows = Object.values(document.persons).map((person) => mapPersonToResult(person, undefined, 0));
    return sortResults(applyFilters(rows, document, activeFilters), sortField, sortDirection);
  }

  const matched = searchByName(document, parsed.target);
  const index = buildSearchIndex(document);
  if (parsed.mode === "free") {
    rows = matched
      .map((person) => {
        const row = index.rowByPersonId.get(person.id);
        if (!row) return mapPersonToResult(person, undefined, 0);

        const id = row.idNorm;
        const name = row.nameNorm;
        const surname = row.surnameNorm;
        const full = row.fullNorm;
        const birthPlace = row.birthPlaceNorm;
        const deathPlace = row.deathPlaceNorm;

        let rank = 0;
        if (id === parsed.target || full === parsed.target) rank = 100;
        else if (name === parsed.target || surname === parsed.target) rank = 95;
        else if (birthPlace === parsed.target || deathPlace === parsed.target) rank = 90;
        else if (full.startsWith(parsed.target)) rank = 85;
        else if (name.startsWith(parsed.target) || surname.startsWith(parsed.target)) rank = 80;
        else if (birthPlace.startsWith(parsed.target) || deathPlace.startsWith(parsed.target)) rank = 75;
        else if (full.includes(parsed.target)) rank = 70;
        else if (id.includes(parsed.target)) rank = 60;
        else if (birthPlace.includes(parsed.target) || deathPlace.includes(parsed.target)) rank = 50;

        return mapPersonToResult(person, undefined, rank);
      })
      .filter((row) => row.rank > 0);
    return sortResults(applyFilters(rows, document, activeFilters), sortField, sortDirection);
  }

  const relationalRows: SearchResult[] = [];
  for (const anchor of matched) {
    const anchorLabel = personLabel(anchor);
    if (parsed.mode === "children_of") {
      for (const familyId of anchor.fams) {
        const family = document.families[familyId];
        if (!family) continue;
        for (const childId of family.childrenIds) {
          const child = document.persons[childId];
          if (!child) continue;
          relationalRows.push(mapPersonToResult(child, `Hijo/a de ${anchorLabel}`, 100));
        }
      }
    }
    if (parsed.mode === "parents_of") {
      for (const familyId of anchor.famc) {
        const family = document.families[familyId];
        if (!family) continue;
        if (family.husbandId && document.persons[family.husbandId]) {
          const father = document.persons[family.husbandId];
          relationalRows.push(mapPersonToResult(father, `Padre de ${anchorLabel}`, 100));
        }
        if (family.wifeId && document.persons[family.wifeId]) {
          const mother = document.persons[family.wifeId];
          relationalRows.push(mapPersonToResult(mother, `Madre de ${anchorLabel}`, 100));
        }
      }
    }
    if (parsed.mode === "spouse_of") {
      for (const familyId of anchor.fams) {
        const family = document.families[familyId];
        if (!family) continue;
        const spouseId = family.husbandId === anchor.id ? family.wifeId : family.husbandId;
        if (!spouseId || !document.persons[spouseId]) continue;
        const spouse = document.persons[spouseId];
        relationalRows.push(mapPersonToResult(spouse, `Pareja de ${anchorLabel}`, 100));
      }
    }
  }

  const dedup = new Map<string, SearchResult>();
  for (const row of relationalRows) dedup.set(row.personId, row);
  rows = Array.from(dedup.values());
  return sortResults(applyFilters(rows, document, activeFilters), sortField, sortDirection);
}

