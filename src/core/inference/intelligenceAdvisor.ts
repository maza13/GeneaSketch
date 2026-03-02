import type { AiBirthRefinementLevel } from "@/types/ai";
import type { InferenceResult } from "@/core/inference/types";

export type BirthIntelligenceRecommendation = {
  recommendedLevel: AiBirthRefinementLevel;
  confidence: number;
  reasonText: string;
};

export function recommendBirthRefinementLevel(local: InferenceResult | null): BirthIntelligenceRecommendation {
  if (!local) {
    return {
      recommendedLevel: "complex",
      confidence: 0.9,
      reasonText: "No hay base local confiable; se recomienda razonamiento IA mas profundo."
    };
  }

  const range = local.suggestedRange || (typeof local.suggestedYear === "number" ? [local.suggestedYear, local.suggestedYear] as [number, number] : null);
  const width = range ? Math.abs(range[1] - range[0]) : 999;
  const hardCount = (local.evidences || []).filter((item) => item.type === "strict_limit").length;
  const highCount = (local.evidences || []).filter((item) => item.impact === "high").length;

  if (hardCount >= 3 && width <= 25) {
    return {
      recommendedLevel: "simple",
      confidence: 0.8,
      reasonText: "Hay evidencia fuerte suficiente y rango relativamente acotado."
    };
  }

  if (width > 80 || highCount === 0) {
    return {
      recommendedLevel: "complex",
      confidence: 0.86,
      reasonText: "El caso tiene alta incertidumbre o poca evidencia de alto impacto."
    };
  }

  return {
    recommendedLevel: "balanced",
    confidence: 0.75,
    reasonText: "El caso tiene evidencia parcial; conviene un equilibrio entre costo y profundidad."
  };
}
