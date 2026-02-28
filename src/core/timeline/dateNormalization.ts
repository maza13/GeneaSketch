import type { TimelineDateCertainty } from "@/types/editor";

export type NormalizedTimelineDate = {
  sortDate: Date | null;
  sortTimestamp: number | null;
  displayDate: string;
  certainty: TimelineDateCertainty;
  undated: boolean;
};

const MONTH_TO_INDEX: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11
};

function parseYear(token: string): number | null {
  if (!/^\d{4}$/.test(token)) return null;
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

function toUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function parseCoreDate(raw: string): Date | null {
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (!normalized) return null;

  const directYear = parseYear(normalized);
  if (directYear !== null) {
    return toUtcDate(directYear, 0, 1);
  }

  const parts = normalized.split(" ");
  if (parts.length >= 3) {
    const maybeDay = Number(parts[0]);
    const maybeMonth = MONTH_TO_INDEX[parts[1]];
    const maybeYear = parseYear(parts[2]);
    if (
      Number.isFinite(maybeDay) &&
      maybeDay >= 1 &&
      maybeDay <= 31 &&
      maybeMonth !== undefined &&
      maybeYear !== null
    ) {
      return toUtcDate(maybeYear, maybeMonth, maybeDay);
    }
  }

  if (parts.length >= 2) {
    const maybeMonth = MONTH_TO_INDEX[parts[0]];
    const maybeYear = parseYear(parts[1]);
    if (maybeMonth !== undefined && maybeYear !== null) {
      return toUtcDate(maybeYear, maybeMonth, 1);
    }
  }

  const yearMatch = normalized.match(/\b(\d{4})\b/);
  if (yearMatch) {
    return toUtcDate(Number(yearMatch[1]), 0, 1);
  }

  return null;
}

export function certaintyRank(value: TimelineDateCertainty): number {
  if (value === "exact") return 4;
  if (value === "estimated_manual") return 3;
  if (value === "inferred_auto") return 2;
  return 1;
}

export function normalizeGedcomTimelineDate(rawDate?: string): NormalizedTimelineDate {
  const source = (rawDate ?? "").trim();
  if (!source) {
    return {
      sortDate: null,
      sortTimestamp: null,
      displayDate: "Sin fecha",
      certainty: "undated",
      undated: true
    };
  }

  const upper = source.toUpperCase();
  const between = upper.match(/\bBET\s+(.+?)\s+AND\s+(.+)$/);
  if (between) {
    const left = parseCoreDate(between[1]);
    const right = parseCoreDate(between[2]);
    if (left && right) {
      const midpoint = Math.round((left.getTime() + right.getTime()) / 2);
      const sortDate = new Date(midpoint);
      return {
        sortDate,
        sortTimestamp: sortDate.getTime(),
        displayDate: source,
        certainty: "estimated_manual",
        undated: false
      };
    }
  }

  const hasManualQualifier = /^(ABT|EST|CAL|AFT|BEF|FROM|TO)\b/.test(upper);
  const stripped = upper.replace(/^(ABT|EST|CAL|AFT|BEF|FROM|TO)\s+/, "");
  const parsed = parseCoreDate(stripped);
  if (parsed) {
    return {
      sortDate: parsed,
      sortTimestamp: parsed.getTime(),
      displayDate: source,
      certainty: hasManualQualifier ? "estimated_manual" : "exact",
      undated: false
    };
  }

  return {
    sortDate: null,
    sortTimestamp: null,
    displayDate: source,
    certainty: "undated",
    undated: true
  };
}
