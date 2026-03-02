import type { BirthEstimatorConfig } from "@/core/inference/birthEstimatorConfig";
import type { ConstraintSolveResult, EvidenceInterval } from "@/core/inference/types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function intersectSpans(spans: Array<[number, number]>): [number, number] | null {
  if (spans.length === 0) return null;
  let min = -Infinity;
  let max = Infinity;
  for (const span of spans) {
    min = Math.max(min, span[0]);
    max = Math.min(max, span[1]);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return null;
  return [Math.round(min), Math.round(max)];
}

function reliability(ev: EvidenceInterval): number {
  return ev.weight * ev.qualityFactor;
}

function scoreYearAgainstSoft(year: number, span: [number, number]): number {
  if (year >= span[0] && year <= span[1]) return 1;
  const distance = year < span[0] ? span[0] - year : year - span[1];
  const decay = Math.max(0, 1 - distance / 12);
  return decay;
}

function pickCredibleInterval(
  years: number[],
  probs: number[],
  massTarget: number,
  feasible: [number, number],
  minWidth: number
): [number, number] {
  if (years.length === 0) return feasible;
  const maxIdx = probs.reduce((best, p, idx) => (p > probs[best] ? idx : best), 0);

  let left = maxIdx;
  let right = maxIdx;
  let mass = probs[maxIdx];

  while (mass < massTarget && (left > 0 || right < years.length - 1)) {
    const leftCandidate = left > 0 ? probs[left - 1] : -1;
    const rightCandidate = right < years.length - 1 ? probs[right + 1] : -1;
    if (leftCandidate >= rightCandidate && left > 0) {
      left -= 1;
      mass += probs[left];
    } else if (right < years.length - 1) {
      right += 1;
      mass += probs[right];
    } else if (left > 0) {
      left -= 1;
      mass += probs[left];
    } else {
      break;
    }
  }

  let minYear = years[left];
  let maxYear = years[right];
  if (maxYear - minYear < minWidth) {
    const targetHalf = Math.ceil(minWidth / 2);
    const center = Math.round((minYear + maxYear) / 2);
    minYear = clamp(center - targetHalf, feasible[0], feasible[1]);
    maxYear = clamp(center + targetHalf, feasible[0], feasible[1]);
    if (maxYear - minYear < minWidth) {
      minYear = feasible[0];
      maxYear = feasible[1];
    }
  }

  return [minYear, maxYear];
}

export function solveBirthRange(
  evidence: EvidenceInterval[],
  config: BirthEstimatorConfig
): ConstraintSolveResult {
  const diagnostics: string[] = [];
  const hardAll = evidence.filter((ev) => ev.kind === "hard" && ev.hardSpan);
  const soft = evidence.filter((ev) => ev.kind === "soft" && ev.bestSpan);
  const info = evidence.filter((ev) => ev.kind === "info");

  let activeHard = [...hardAll];
  const dropped: EvidenceInterval[] = [];

  let feasible = intersectSpans(activeHard.map((ev) => ev.hardSpan!));
  while (!feasible && activeHard.length > 0) {
    const sorted = [...activeHard].sort((a, b) => {
      const rel = reliability(a) - reliability(b);
      if (rel !== 0) return rel;
      return a.id.localeCompare(b.id);
    });
    const weakest = sorted[0];
    activeHard = activeHard.filter((ev) => ev.id !== weakest.id);
    dropped.push(weakest);
    diagnostics.push(`Conflicto: se descartó hard débil ${weakest.reference}.`);
    feasible = intersectSpans(activeHard.map((ev) => ev.hardSpan!));
  }

  if (!feasible) {
    diagnostics.push("Sin rango factible por hard constraints; se usa fallback de dominio.");
    feasible = [config.domainMinYear, config.domainMaxYear];
  }

  const years: number[] = [];
  const rawScores: number[] = [];
  for (let year = feasible[0]; year <= feasible[1]; year += 1) {
    years.push(year);
    let score = 1;
    for (const ev of soft) {
      const s = scoreYearAgainstSoft(year, ev.bestSpan!);
      score += s * reliability(ev);
    }
    rawScores.push(Math.max(0.0001, score));
  }

  const total = rawScores.reduce((acc, value) => acc + value, 0);
  const probs = total > 0 ? rawScores.map((value) => value / total) : rawScores.map(() => 1 / rawScores.length);

  const finalRange = pickCredibleInterval(years, probs, config.credibleMass, feasible, config.minRangeWidthYears);

  const usedWeight = activeHard.reduce((acc, ev) => acc + reliability(ev), 0) + soft.reduce((acc, ev) => acc + reliability(ev), 0);
  const droppedWeight = dropped.reduce((acc, ev) => acc + reliability(ev), 0);
  const width = Math.max(1, finalRange[1] - finalRange[0] + 1);
  const widthPenalty = Math.min(0.45, Math.log10(width) / 4);
  const conflictPenalty = Math.min(0.35, droppedWeight / Math.max(1, usedWeight + droppedWeight));
  const confidence = clamp(0.95 - widthPenalty - conflictPenalty, 0.05, 0.95);

  diagnostics.push(`Factible final: ${feasible[0]}-${feasible[1]}.`);
  diagnostics.push(`Rango creíble (${Math.round(config.credibleMass * 100)}% masa): ${finalRange[0]}-${finalRange[1]}.`);
  if (dropped.length > 0) diagnostics.push(`Descartadas ${dropped.length} hard constraints por conflicto.`);
  if (info.length > 0) diagnostics.push(`Se registraron ${info.length} evidencias informativas no limitantes.`);

  return {
    feasibleSpan: feasible,
    finalRange,
    confidence,
    usedEvidence: [...activeHard, ...soft, ...info],
    droppedEvidence: dropped,
    diagnostics
  };
}
