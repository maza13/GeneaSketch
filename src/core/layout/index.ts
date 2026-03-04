import type { LayoutInput, LayoutOutput } from "@/core/layout/types";
import { computeLayoutVNext } from "@/core/layout/vnext";

export function computeLayout(input: LayoutInput): LayoutOutput {
  return computeLayoutVNext({ ...input, layoutEngine: "vnext" });
}

export type { LayoutInput, LayoutOutput, LayoutEngine } from "@/core/layout/types";
