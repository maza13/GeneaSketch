import type { LayoutInput, LayoutOutput } from "@/core/layout/types";
import { createLayoutModel } from "@/core/layout/legacy/model";
import { solveVirtualLayout } from "@/core/layout/legacy/solver";
import { buildVirtualTrees } from "@/core/layout/legacy/virtualTree";

export function computeLayoutLegacy(input: LayoutInput): LayoutOutput {
  const model = createLayoutModel(input.graph, input.document);
  const virtualTrees = buildVirtualTrees(model, input);
  const { positions, diagnostics } = solveVirtualLayout(input, model, virtualTrees);

  return {
    positions,
    diagnostics: {
      engine: "legacy",
      warnings: [...diagnostics, ...virtualTrees.diagnostics]
    }
  };
}
