import type { InferenceEvidence } from "@/core/inference/types";

type PresenterOptions = {
  finalRange?: [number, number];
};

function keyForEvidence(item: InferenceEvidence): string {
  const rule = item.ruleId || item.type;
  return `${rule}|${item.relationClass || "other"}`;
}

function rankEvidence(item: InferenceEvidence): number {
  const impactScore = item.impact === "high" ? 100 : item.impact === "medium" ? 60 : 30;
  const layerScore = item.layer ? (4 - item.layer) * 10 : 20;
  const typeScore = item.type === "strict_limit" ? 20 : item.type === "contextual" ? 10 : 0;
  return impactScore + layerScore + typeScore;
}

function parseYears(items: InferenceEvidence[]): number[] {
  const years: number[] = [];
  for (const item of items) {
    const matches = item.message.match(/\b(\d{4})\b/g);
    if (!matches) continue;
    for (const m of matches) {
      const y = Number(m);
      if (Number.isFinite(y)) years.push(y);
    }
  }
  return years.sort((a, b) => a - b);
}

function ruleSummary(ruleId: string | undefined, items: InferenceEvidence[], count: number): string {
  const years = parseYears(items);
  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  if (ruleId === "child_birth") {
    if (Number.isFinite(firstYear) && Number.isFinite(lastYear) && firstYear !== lastYear) {
      return `El primer hijo registrado (${firstYear}) y el ultimo (${lastYear}) acotan la edad parental del foco.`;
    }
    if (Number.isFinite(firstYear)) {
      return `Nacimiento de descendencia en ${firstYear} acota la edad parental del foco.`;
    }
    return "Nacimiento de descendencia acota la edad parental del foco.";
  }

  if (ruleId === "parent_death") {
    if (years.length >= 2) {
      return `Defunciones parentales (${years[0]} y ${years[years.length - 1]}) fijan un limite superior para el nacimiento del foco.`;
    }
    if (years.length === 1) {
      return `Defuncion parental en ${years[0]} fija un limite superior para el nacimiento del foco.`;
    }
    return "Defuncion parental fija un limite superior para el nacimiento del foco.";
  }

  if (ruleId === "parent_birth") {
    if (years.length >= 2) {
      return `Nacimientos parentales (${years[0]} y ${years[years.length - 1]}) acotan la ventana biologica del foco.`;
    }
    if (years.length === 1) {
      return `Nacimiento parental en ${years[0]} acota la ventana biologica del foco.`;
    }
    return "Nacimientos parentales acotan la ventana biologica del foco.";
  }

  if (ruleId === "child_birth_soft") {
    return "Patron demografico de primer hijo refuerza el rango como apoyo contextual.";
  }

  const base = items[0]?.message || "Evidencia contextual";
  if (count <= 1) return base;
  return `${base} (${count} evidencias similares)`;
}

function isBindingConstraint(item: InferenceEvidence, finalRange?: [number, number]): boolean {
  if (!finalRange) return true;
  if (item.type !== "strict_limit") return true;
  const [finalMin, finalMax] = finalRange;
  const lower = item.minLimit;
  const upper = item.maxLimit;
  if (lower === undefined && upper === undefined) return false;
  const bindsLower = lower !== undefined && lower >= finalMin - 1;
  const bindsUpper = upper !== undefined && upper <= finalMax + 1;
  return bindsLower || bindsUpper;
}

export function presentInferenceEvidence(
  evidences: InferenceEvidence[],
  options: PresenterOptions = {}
): {
  summary: InferenceEvidence[];
  grouped: Array<{ key: string; label: string; items: InferenceEvidence[] }>;
  deduped: InferenceEvidence[];
} {
  const groupedMap = new Map<string, InferenceEvidence[]>();
  for (const item of evidences) {
    if (item.ruleId === "ignored" || item.ruleId === "unknown_date") continue;
    const key = keyForEvidence(item);
    const bucket = groupedMap.get(key) || [];
    bucket.push(item);
    groupedMap.set(key, bucket);
  }

  const deduped: InferenceEvidence[] = [];
  const grouped: Array<{ key: string; label: string; items: InferenceEvidence[] }> = [];
  for (const [key, items] of groupedMap.entries()) {
    const representative = [...items].sort((a, b) => rankEvidence(b) - rankEvidence(a))[0];
    const mergedLayer = Math.min(...items.map((i) => i.layer || 1)) as 1 | 2 | 3;
    const message = ruleSummary(representative.ruleId, items, items.length);
    const candidate: InferenceEvidence = {
      ...representative,
      layer: mergedLayer,
      message,
      count: items.length
    };
    if (!isBindingConstraint(candidate, options.finalRange)) continue;
    deduped.push(candidate);
    grouped.push({
      key,
      label: `Capa ${mergedLayer} · ${representative.relationClass || representative.type}`,
      items
    });
  }

  const sorted = [...deduped].sort((a, b) => rankEvidence(b) - rankEvidence(a));
  return {
    summary: sorted.slice(0, 5),
    grouped: grouped.sort((a, b) => a.key.localeCompare(b.key)),
    deduped: sorted
  };
}
