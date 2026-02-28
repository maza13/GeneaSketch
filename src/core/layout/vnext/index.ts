import type { LayoutInput, LayoutOutput } from "@/core/layout/types";
import { createLayoutModel } from "@/core/layout/vnext/model";
import { solveVirtualLayout } from "@/core/layout/vnext/solver";
import { buildVirtualTrees } from "@/core/layout/vnext/virtualTree";

export function computeLayoutVNext(input: LayoutInput): LayoutOutput {
  const model = createLayoutModel(input.graph, input.document);
  const virtualTrees = buildVirtualTrees(model, input);
  const { positions, diagnostics } = solveVirtualLayout(input, model, virtualTrees);

  return {
    positions,
    diagnostics: {
      engine: "vnext",
      warnings: [...diagnostics, ...virtualTrees.diagnostics]
    }
  };
}
