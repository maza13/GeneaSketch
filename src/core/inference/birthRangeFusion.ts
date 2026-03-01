export type YearRange = [number, number];
export type BirthRangeFusionStrategy = "narrow" | "widen";

function normalizeRange(range: YearRange): YearRange {
  return range[0] <= range[1] ? range : [range[1], range[0]];
}

export function fuseBirthRanges(
  localRange: YearRange,
  aiRange: YearRange,
  strategy: BirthRangeFusionStrategy
): YearRange {
  const local = normalizeRange(localRange);
  const ai = normalizeRange(aiRange);

  if (strategy === "widen") {
    return [Math.min(local[0], ai[0]), Math.max(local[1], ai[1])];
  }

  const overlapMin = Math.max(local[0], ai[0]);
  const overlapMax = Math.min(local[1], ai[1]);
  if (overlapMin <= overlapMax) {
    return [overlapMin, overlapMax];
  }

  const pairA: YearRange = [local[1], ai[0]];
  const pairB: YearRange = [ai[1], local[0]];
  const gapA = Math.abs(pairA[1] - pairA[0]);
  const gapB = Math.abs(pairB[1] - pairB[0]);

  const best = gapA <= gapB ? pairA : pairB;
  return normalizeRange(best);
}

export function toGedcomBetween(range: YearRange): string {
  const normalized = normalizeRange(range);
  return `BET ${normalized[0]} AND ${normalized[1]}`;
}

export function describeFusion(
  localRange: YearRange,
  aiRange: YearRange,
  resultRange: YearRange,
  strategy: BirthRangeFusionStrategy
): string {
  const l = normalizeRange(localRange);
  const a = normalizeRange(aiRange);
  const r = normalizeRange(resultRange);
  const strategyLabel = strategy === "narrow" ? "acotar" : "ampliar";
  return `Fusión ${strategyLabel}: local ${l[0]}-${l[1]} + IA ${a[0]}-${a[1]} => ${r[0]}-${r[1]}.`;
}
