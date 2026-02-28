import { estimatePersonBirthYear } from "@/core/inference/dateInference";
import { normalizeGedcomTimelineDate, certaintyRank } from "@/core/timeline/dateNormalization";
import type { Event, GeneaDocument } from "@/types/domain";

type YearBound = {
  year: number;
  inferred: boolean;
};

type LifeWindow = {
  minYear: YearBound | null;
  maxYear: YearBound | null;
};

function pickBestYear(events: Event[], type: "BIRT" | "DEAT"): YearBound | null {
  const rows = events.filter((event) => event.type === type);
  if (rows.length === 0) return null;

  const candidates = rows
    .map((row) => {
      const parsed = normalizeGedcomTimelineDate(row.date);
      if (!parsed.sortDate) return null;
      return {
        year: parsed.sortDate.getUTCFullYear(),
        inferred: parsed.certainty !== "exact",
        rank: certaintyRank(parsed.certainty)
      };
    })
    .filter((value): value is { year: number; inferred: boolean; rank: number } => Boolean(value))
    .sort((left, right) => {
      if (left.rank !== right.rank) return right.rank - left.rank;
      return left.year - right.year;
    });

  if (candidates.length === 0) return null;
  const best = candidates[0]!;
  return { year: best.year, inferred: best.inferred };
}

function buildLifeWindow(document: GeneaDocument, personId: string): LifeWindow {
  const person = document.persons[personId];
  if (!person) return { minYear: null, maxYear: null };

  let minYear = pickBestYear(person.events, "BIRT");
  let maxYear = pickBestYear(person.events, "DEAT");

  if (!minYear) {
    const inferred = estimatePersonBirthYear(personId, document);
    if (typeof inferred?.suggestedYear === "number") {
      minYear = { year: inferred.suggestedYear, inferred: true };
    }
  }

  if (!maxYear && minYear) {
    maxYear = { year: minYear.year + 110, inferred: true };
  }

  if (!minYear && maxYear) {
    minYear = { year: maxYear.year - 110, inferred: true };
  }

  return { minYear, maxYear };
}

function overlaps(
  minYear: number,
  maxYear: number,
  rangeStart: number,
  rangeEnd: number
): boolean {
  return minYear <= rangeEnd && maxYear >= rangeStart;
}

export function inferLivingPersonIdsByYear(document: GeneaDocument, year: number): string[] {
  if (!Number.isFinite(year)) return [];
  const targetYear = Math.floor(year);
  const result: string[] = [];

  for (const personId of Object.keys(document.persons)) {
    const { minYear, maxYear } = buildLifeWindow(document, personId);
    if (!minYear || !maxYear) continue;
    if (targetYear >= minYear.year && targetYear <= maxYear.year) {
      result.push(personId);
    }
  }
  return result;
}

export function inferLivingPersonIdsByDecade(document: GeneaDocument, decadeStart: number): string[] {
  if (!Number.isFinite(decadeStart)) return [];
  const start = Math.floor(decadeStart / 10) * 10;
  const end = start + 9;
  const result: string[] = [];

  for (const personId of Object.keys(document.persons)) {
    const { minYear, maxYear } = buildLifeWindow(document, personId);
    if (!minYear || !maxYear) continue;
    if (overlaps(minYear.year, maxYear.year, start, end)) {
      result.push(personId);
    }
  }
  return result;
}
export function inferTimelineStatus(document: GeneaDocument, year: number): { living: Set<string>, deceased: Set<string> } {
  const living = new Set<string>();
  const deceased = new Set<string>();
  if (!Number.isFinite(year)) return { living, deceased };

  const targetYear = Math.floor(year);

  for (const personId of Object.keys(document.persons)) {
    const { minYear, maxYear } = buildLifeWindow(document, personId);
    if (!minYear || !maxYear) continue;

    if (targetYear >= minYear.year) {
      if (targetYear <= maxYear.year) {
        living.add(personId);
      } else {
        deceased.add(personId);
      }
    }
  }
  return { living, deceased };
}

export function inferTimelineEvents(document: GeneaDocument, year: number): Set<string> {
  const eventPersonIds = new Set<string>();
  if (!Number.isFinite(year)) return eventPersonIds;

  const targetYear = Math.floor(year);

  // Check person-level events (Birth, Death)
  for (const [personId, person] of Object.entries(document.persons)) {
    for (const event of person.events) {
      if (event.type === "BIRT" || event.type === "DEAT") {
        const parsed = normalizeGedcomTimelineDate(event.date);
        if (parsed.sortDate && parsed.sortDate.getUTCFullYear() === targetYear) {
          eventPersonIds.add(personId);
        }
      }
    }
  }

  // Check family-level events (Marriage, Divorce, Birth of children)
  for (const family of Object.values(document.families)) {
    // Marriage / Divorce
    for (const event of family.events || []) {
      if (event.type === "MARR" || event.type === "DIV") {
        const parsed = normalizeGedcomTimelineDate(event.date);
        if (parsed.sortDate && parsed.sortDate.getUTCFullYear() === targetYear) {
          if (family.husbandId) eventPersonIds.add(family.husbandId);
          if (family.wifeId) eventPersonIds.add(family.wifeId);
        }
      }
    }

    // Children births (important event for parents)
    for (const childId of family.childrenIds) {
      const child = document.persons[childId];
      if (!child) continue;
      const birth = child.events.find(e => e.type === "BIRT");
      if (birth) {
        const parsed = normalizeGedcomTimelineDate(birth.date);
        if (parsed.sortDate && parsed.sortDate.getUTCFullYear() === targetYear) {
          if (family.husbandId) eventPersonIds.add(family.husbandId);
          if (family.wifeId) eventPersonIds.add(family.wifeId);
        }
      }
    }
  }

  return eventPersonIds;
}
