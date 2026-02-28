import type { LayoutInput, LayoutOutput } from "@/core/layout/types";
import { computeLayoutLegacy } from "@/core/layout/legacy";
import { computeLayoutVNext } from "@/core/layout/vnext";

export function computeLayout(input: LayoutInput): LayoutOutput {
  const requestedEngine = input.layoutEngine ?? "vnext";

  if (requestedEngine === "legacy") {
    return computeLayoutLegacy({ ...input, layoutEngine: "legacy" });
  }

  try {
    return computeLayoutVNext({ ...input, layoutEngine: "vnext" });
  } catch (error) {
    throw error;
  }
}

export type { LayoutInput, LayoutOutput, LayoutEngine } from "@/core/layout/types";
