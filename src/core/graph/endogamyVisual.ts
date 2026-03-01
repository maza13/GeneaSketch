function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function remapSegment(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number
): number {
  if (value <= inputMin) return outputMin;
  if (value >= inputMax) return outputMax;
  const t = (value - inputMin) / (inputMax - inputMin);
  return outputMin + (outputMax - outputMin) * easeInOutCubic(t);
}

// Strict realistic visual profile for consanguinity intensity.
// Input is shared DNA in ratio form [0..1].
export function normalizeConsanguinityIntensity(sharedDna: number): number {
  const v = clamp01(sharedDna);

  if (v <= 0.001) return remapSegment(v, 0, 0.001, 0, 0.06); // 0% - 0.1%
  if (v <= 0.005) return remapSegment(v, 0.001, 0.005, 0.06, 0.14); // 0.1% - 0.5%
  if (v <= 0.02) return remapSegment(v, 0.005, 0.02, 0.14, 0.3); // 0.5% - 2%
  if (v <= 0.0625) return remapSegment(v, 0.02, 0.0625, 0.3, 0.56); // 2% - 6.25%
  if (v <= 0.125) return remapSegment(v, 0.0625, 0.125, 0.56, 0.78); // 6.25% - 12.5%
  if (v <= 0.25) return remapSegment(v, 0.125, 0.25, 0.78, 1); // 12.5% - 25%

  return 1;
}

export function consanguinityAlphaFromIntensity(intensity: number): number {
  // Keep very-low percentages almost imperceptible.
  return 0.12 + clamp01(intensity) * 0.86;
}

