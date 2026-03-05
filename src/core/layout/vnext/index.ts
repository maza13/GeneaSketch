import type { LayoutInput, LayoutOutput } from "@/core/layout/types";
import { createLayoutModel } from "@/core/layout/vnext/model";
import { solveVirtualLayout } from "@/core/layout/vnext/solver";
import { buildVirtualTrees } from "@/core/layout/vnext/virtualTree";

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function roundMs(value: number): number {
  return Number(value.toFixed(3));
}

export function computeLayoutVNext(input: LayoutInput): LayoutOutput {
  const t0 = nowMs();
  const model = createLayoutModel(input.graph, input.document);
  const tBuildStart = nowMs();
  const virtualTrees = buildVirtualTrees(model, input);
  const tSolveStart = nowMs();
  const { positions, diagnostics } = solveVirtualLayout(input, model, virtualTrees);
  const tEnd = nowMs();

  return {
    positions,
    diagnostics: {
      engine: "vnext",
      effectiveEngine: "vnext",
      warnings: [...diagnostics, ...virtualTrees.diagnostics],
      timingsMs: {
        total: roundMs(tEnd - t0),
        buildVirtualTree: roundMs(tSolveStart - tBuildStart),
        solve: roundMs(tEnd - tSolveStart)
      }
    }
  };
}
