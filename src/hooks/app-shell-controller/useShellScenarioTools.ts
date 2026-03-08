import { useCallback } from "react";
import { TreeGenerator, type GeneratorScenario } from "@/core/testing/generator";
import type { AppShellControllerParams } from "./types";

export function useShellScenarioTools(params: AppShellControllerParams) {
  const generateScenario = useCallback(
    (scenario: GeneratorScenario) => {
      const generator = new TreeGenerator({ seed: Date.now() });
      const nextDoc =
        scenario === "standard"
          ? generator.generateStandard(5)
          : scenario === "cousin_marriage"
            ? generator.generateCousinMarriage()
            : scenario === "pedigree_collapse"
              ? generator.generatePedigreeCollapse()
              : generator.generateEndogamy(12, 5);
      params.applyProjectedDocument(nextDoc, "mock");
      params.setStatus(`Árbol de prueba generado (${scenario})`);
    },
    [params],
  );

  return { generateScenario };
}
