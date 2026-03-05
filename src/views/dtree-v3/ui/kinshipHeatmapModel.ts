import type { KinshipResult } from "@/core/graph/kinship";

export type HeatmapHoverModel = {
  title: string;
  kinshipLabel: string | null;
  sharedDnaLabel: string | null;
  contemporaneity: string | null;
  isSameNuclearFamily: boolean;
};

export function formatPercentageLabel(value: number): string {
  if (value >= 1) return "100%";
  const percentage = value * 100;
  if (percentage < 0.0001) return "< 0.0001%";
  if (percentage < 0.01) return `${percentage.toFixed(6)}%`;
  if (percentage < 1) return `${percentage.toFixed(2)}%`;
  return `${Number(percentage.toFixed(1))}%`;
}

export function formatKinshipDisplayText(kinship: KinshipResult | null | undefined): string {
  if (!kinship) return "";
  const relationship = kinship.relationship;
  if (relationship?.primary) {
    return relationship.secondary
      ? `${relationship.primary} (${relationship.secondary})`
      : relationship.primary;
  }
  return kinship.relationshipText || "";
}

export function buildHeatmapHoverModel(params: {
  baseName: string;
  isSelf: boolean;
  kinship: KinshipResult | null;
  contemporaneity: string | null;
  isSameNuclearFamily: boolean;
}): HeatmapHoverModel {
  return {
    title: params.isSelf
      ? "Analizando tu propia ficha"
      : `Relacion con ${params.baseName}`,
    kinshipLabel: params.kinship?.relationshipText ?? null,
    sharedDnaLabel: params.kinship
      ? formatPercentageLabel(params.kinship.sharedDnaPercentage)
      : null,
    contemporaneity: params.contemporaneity,
    isSameNuclearFamily: params.isSameNuclearFamily
  };
}
