import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expandGraph } from "@/core/graph/expand";
import {
  createLayoutFixtureDoc,
  createLayoutFixtureViewConfig
} from "@/tests/layout/fixture";
import { KindraViewV31 } from "@/views/KindraViewV31";
import type { ColorThemeConfig } from "@/types/editor";

const COLOR_THEME: ColorThemeConfig = {
  background: "#0f172a",
  personNode: "#1e293b",
  text: "#e2e8f0",
  edges: "#64748b",
  nodeFontSize: 14,
  edgeThickness: 1.5,
  nodeWidth: 210,
  nodeHeight: 100
};

describe("render core v3 smoke", () => {
  it("renders V3 tree shell and overlay panels without DTreeView bridge", () => {
    const document = createLayoutFixtureDoc();
    const viewConfig = createLayoutFixtureViewConfig();
    const graph = expandGraph(document, viewConfig);

    const html = renderToStaticMarkup(
      <KindraViewV31
        graph={graph}
        document={document}
        fitNonce={0}
        focusPersonId={"P1"}
        focusFamilyId={null}
        selectedPersonId={"P1"}
        colorTheme={COLOR_THEME}
        kindraConfig={{
          isVertical: true,
          layoutEngine: "vnext",
          collapsedNodeIds: [],
          overlays: [
            {
              id: "ov-lineage",
              type: "lineage",
              priority: 5,
              config: { personId: "P1", mode: "patrilineal" }
            },
            {
              id: "ov-timeline",
              type: "timeline",
              priority: 35,
              config: { year: 2000, livingIds: ["P1"], deceasedIds: ["PFM"], eventPersonIds: ["P1"] }
            }
          ]
        }}
      />
    );

    expect(html).toContain("zoom-layer");
    expect(html).toContain("Simulacion");
    expect(html).toContain("Linaje Patrilineal");
  });
});
