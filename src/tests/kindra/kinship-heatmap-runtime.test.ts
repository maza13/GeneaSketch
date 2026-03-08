import { describe, expect, it } from "vitest";
import { createLayoutFixtureDoc } from "@/tests/layout/fixture";
import { createKinshipHeatmapRuntime } from "@/views/kindra-v31/overlays/kinshipHeatmapRuntime";

describe("kinship heatmap runtime", () => {
  it("reuses runtime instance per document identity", () => {
    const document = createLayoutFixtureDoc();
    const first = createKinshipHeatmapRuntime(document);
    const second = createKinshipHeatmapRuntime(document);
    expect(first).toBe(second);
  });

  it("memoizes heatmap by base person and invalidates with document identity", () => {
    const document = createLayoutFixtureDoc();
    const runtime = createKinshipHeatmapRuntime(document);
    const first = runtime.getHeatmap("P1");
    const second = runtime.getHeatmap("P1");
    expect(first).toBe(second);

    const nextDocument = structuredClone(document);
    const nextRuntime = createKinshipHeatmapRuntime(nextDocument);
    const nextHeatmap = nextRuntime.getHeatmap("P1");
    expect(nextHeatmap).not.toBe(first);
  });

  it("keeps target-switch cheap via directional kinship memo", () => {
    const document = createLayoutFixtureDoc();
    const runtime = createKinshipHeatmapRuntime(document);
    const firstTarget = runtime.getHeatmapKinship("P1", "PM");
    const secondTarget = runtime.getHeatmapKinship("P1", "PF");
    const firstTargetRepeat = runtime.getHeatmapKinship("P1", "PM");

    expect(firstTarget).not.toBeNull();
    expect(secondTarget).not.toBeNull();
    expect(firstTargetRepeat).toBe(firstTarget);
  });

  it("returns safe no-op values for invalid ids", () => {
    const document = createLayoutFixtureDoc();
    const runtime = createKinshipHeatmapRuntime(document);
    const heatmap = runtime.getHeatmap("UNKNOWN");
    const kinship = runtime.getKinship("P1", "UNKNOWN");
    const heatmapKinship = runtime.getHeatmapKinship("UNKNOWN", "P1");

    expect(heatmap.dnaMap.size).toBe(0);
    expect(heatmap.inbreedingMap.size).toBe(0);
    expect(kinship).toBeNull();
    expect(heatmapKinship).toBeNull();
  });
});
