import type { YearSpan } from "@/core/inference/types";

function extractYear(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/\b(\d{4})\b/);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseDateToYearSpan(dateRaw?: string): YearSpan {
  const warnings: string[] = [];
  if (!dateRaw || dateRaw.trim().length === 0) {
    return { precision: "unknown", warnings: ["Fecha ausente."] };
  }

  const raw = dateRaw.trim();
  const upper = raw.toUpperCase();

  const directYear = /^\d{4}$/.test(upper) ? Number(upper) : undefined;
  if (directYear !== undefined) {
    return { minYear: directYear, maxYear: directYear, precision: "exact", warnings };
  }

  const between = upper.match(/\bBET\s+(.+?)\s+AND\s+(.+)$/);
  if (between) {
    const left = extractYear(between[1]);
    const right = extractYear(between[2]);
    if (left !== undefined && right !== undefined) {
      return {
        minYear: Math.min(left, right),
        maxYear: Math.max(left, right),
        precision: "range",
        warnings
      };
    }
    warnings.push("BET/AND sin años parseables.");
    return { precision: "unknown", warnings };
  }

  const before = upper.match(/^BEF\s+(.+)$/);
  if (before) {
    const year = extractYear(before[1]);
    if (year !== undefined) {
      warnings.push("Fecha abierta inferior (BEF).");
      return { maxYear: year, precision: "open_before", warnings };
    }
    warnings.push("BEF sin año parseable.");
    return { precision: "unknown", warnings };
  }

  const after = upper.match(/^AFT\s+(.+)$/);
  if (after) {
    const year = extractYear(after[1]);
    if (year !== undefined) {
      warnings.push("Fecha abierta superior (AFT).");
      return { minYear: year, precision: "open_after", warnings };
    }
    warnings.push("AFT sin año parseable.");
    return { precision: "unknown", warnings };
  }

  const about = upper.match(/^(ABT|EST|CAL)\s+(.+)$/);
  if (about) {
    const year = extractYear(about[2]);
    if (year !== undefined) {
      warnings.push(`Fecha aproximada ${about[1]}.`);
      return { minYear: year - 4, maxYear: year + 4, precision: "year", warnings };
    }
    warnings.push(`${about[1]} sin año parseable.`);
    return { precision: "unknown", warnings };
  }

  const anyYear = extractYear(upper);
  if (anyYear !== undefined) {
    warnings.push("Fecha parcialmente parseada por año embebido.");
    return { minYear: anyYear, maxYear: anyYear, precision: "year", warnings };
  }

  warnings.push("DATE_PHRASE o fecha no parseable.");
  return { precision: "unknown", warnings };
}
