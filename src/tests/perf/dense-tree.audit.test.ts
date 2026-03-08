import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { expandGraph } from "@/core/graph/expand";
import { documentToGenraph } from "@/core/genraph/GedcomBridge";
import { computeLayout } from "@/core/layout";
import {
  clearGraphProjectionCache,
  projectGraphDocument,
} from "@/core/read-model";
import { MockTreeGenerator, type GeneratorConfig } from "@/core/testing/mockGenerator";
import { measureColdWarmRuns, type PerfStats } from "@/tests/perf/common/perfStats";
import { writeJsonReport, writeMarkdownReport } from "@/tests/perf/common/reportWriter";
import { buildSearchResults } from "@/ui/search/searchEngine";
import type { GeneaDocument, ViewConfig } from "@/types/domain";

type DensePerfReport = {
  generatedAt: string;
  scenario: {
    seed: string | number;
    depth: number;
    avgChildren: number;
    endogamyFactor: number;
    persons: number;
    families: number;
    visibleNodes: number;
    visibleEdges: number;
  };
  thresholds: {
    projectionP95Ms: number;
    layoutP95Ms: number;
    searchQueryP95Ms: number;
  };
  results: {
    projection: PerfStats;
    ttvProxy: PerfStats;
    layout: PerfStats;
    search: PerfStats;
  };
  classification: "pass" | "needs-followup";
  rationale: string[];
};

const DENSE_CONFIG: GeneratorConfig = {
  seed: "super-analysis-050-dense-tree",
  depth: 10,
  avgChildren: 2,
  endogamyFactor: 0.15,
};

const THRESHOLDS = {
  projectionP95Ms: 250,
  layoutP95Ms: 450,
  searchQueryP95Ms: 80,
};

function buildDenseDocument(config: GeneratorConfig): GeneaDocument {
  const generator = new MockTreeGenerator();
  return generator.generate(config);
}

function buildDenseViewConfig(document: GeneaDocument): ViewConfig {
  const focusPersonId = Object.keys(document.persons)[0];
  if (!focusPersonId) throw new Error("Dense scenario did not generate persons.");
  return {
    mode: "tree",
    preset: "extended_family",
    focusPersonId,
    focusFamilyId: null,
    homePersonId: focusPersonId,
    rightPanelView: "details",
    timeline: {
      scope: "visible",
      view: "list",
      scaleZoom: 1,
      scaleOffset: 0,
    },
    depth: {
      ancestors: 10,
      descendants: 3,
      unclesGreatUncles: 2,
      siblingsNephews: 2,
      unclesCousins: 2,
    },
    showSpouses: true,
    kindra: {
      isVertical: true,
      layoutEngine: "vnext",
      collapsedNodeIds: [],
      overlays: [],
    },
  };
}

function firstPersonLabel(document: GeneaDocument): string {
  const first = Object.values(document.persons)[0];
  if (!first) return "";
  return first.surname || first.name || first.id;
}

function classify(report: Omit<DensePerfReport, "classification" | "rationale">): {
  classification: DensePerfReport["classification"];
  rationale: string[];
} {
  const rationale: string[] = [];
  let classification: DensePerfReport["classification"] = "pass";

  if (report.results.projection.p95Ms > report.thresholds.projectionP95Ms) {
    classification = "needs-followup";
    rationale.push(
      `projection p95 ${report.results.projection.p95Ms}ms exceeds threshold ${report.thresholds.projectionP95Ms}ms`
    );
  }
  if (report.results.layout.p95Ms > report.thresholds.layoutP95Ms) {
    classification = "needs-followup";
    rationale.push(
      `layout p95 ${report.results.layout.p95Ms}ms exceeds threshold ${report.thresholds.layoutP95Ms}ms`
    );
  }
  if (report.results.search.p95Ms > report.thresholds.searchQueryP95Ms) {
    classification = "needs-followup";
    rationale.push(
      `search p95 ${report.results.search.p95Ms}ms exceeds threshold ${report.thresholds.searchQueryP95Ms}ms`
    );
  }
  if (report.scenario.persons < 1800) {
    classification = "needs-followup";
    rationale.push(
      `dense scenario generated only ${report.scenario.persons} persons; target was approximately 2000`
    );
  }
  if (rationale.length === 0) {
    rationale.push("All measured p95 values are within first-pass thresholds for the generated dense scenario.");
  }

  return { classification, rationale };
}

describe("perf/dense-tree audit", () => {
  it("captures projection, layout, and search metrics for a dense reproducible scenario", async () => {
    const document = buildDenseDocument(DENSE_CONFIG);
    const viewConfig = buildDenseViewConfig(document);
    const expanded = expandGraph(document, viewConfig);
    const focusQuery = firstPersonLabel(document);
    const { graph } = documentToGenraph(document, "7.0.x");

    // Pure read-model projection from an already-built graph.
    const graphProjection = await measureColdWarmRuns(() => {
      clearGraphProjectionCache();
      projectGraphDocument(graph);
    });

    // Proxy for "time to visible" from document-derived graph load path.
    const ttvProxy = await measureColdWarmRuns(() => {
      const rebuilt = documentToGenraph(document, "7.0.x").graph;
      clearGraphProjectionCache();
      const projected = projectGraphDocument(rebuilt);
      computeLayout({
        graph: expanded,
        document: projected ?? document,
        focusPersonId: viewConfig.focusPersonId,
        focusFamilyId: null,
        collapsedNodeIds: [],
        isVertical: true,
        generationStep: 300,
        personNodeWidth: 190,
        personNodeHeightWithPhoto: 230,
        personNodeHeightNoPhoto: 100,
        layoutEngine: "vnext",
      });
    });

    const layout = await measureColdWarmRuns(() => {
      computeLayout({
        graph: expanded,
        document,
        focusPersonId: viewConfig.focusPersonId,
        focusFamilyId: null,
        collapsedNodeIds: [],
        isVertical: true,
        generationStep: 300,
        personNodeWidth: 190,
        personNodeHeightWithPhoto: 230,
        personNodeHeightNoPhoto: 100,
        layoutEngine: "vnext",
      });
    });

    const search = await measureColdWarmRuns(() => {
      buildSearchResults(document as any, focusQuery, "name", "asc");
      buildSearchResults(document as any, "seed", "name", "asc");
      buildSearchResults(document as any, Object.keys(document.persons)[0] ?? "", "id", "asc");
    });

    const baseReport = {
      generatedAt: new Date().toISOString(),
      scenario: {
        seed: DENSE_CONFIG.seed,
        depth: DENSE_CONFIG.depth,
        avgChildren: DENSE_CONFIG.avgChildren,
        endogamyFactor: DENSE_CONFIG.endogamyFactor,
        persons: Object.keys(document.persons).length,
        families: Object.keys(document.families).length,
        visibleNodes: expanded.nodes.length,
        visibleEdges: expanded.edges.length,
      },
      thresholds: THRESHOLDS,
      results: {
        projection: graphProjection,
        ttvProxy,
        layout,
        search,
      },
    };

    const finalClassification = classify(baseReport);
    const report: DensePerfReport = {
      ...baseReport,
      classification: finalClassification.classification,
      rationale: finalClassification.rationale,
    };

    const reportDir = path.resolve(process.cwd(), "reports/super-analysis-0.5.0");
    writeJsonReport(path.join(reportDir, "dimension-3-performance.json"), report);
    writeMarkdownReport(
      path.join(reportDir, "dimension-3-performance.md"),
      [
        "# Super Analysis 0.5.0 - Dimension 3 Performance and scale",
        "",
        `- generatedAt: ${report.generatedAt}`,
        `- classification: ${report.classification}`,
        `- persons: ${report.scenario.persons}`,
        `- families: ${report.scenario.families}`,
        `- visibleNodes: ${report.scenario.visibleNodes}`,
        `- visibleEdges: ${report.scenario.visibleEdges}`,
        "",
        "| Metric | p50 (ms) | p95 (ms) | max (ms) | threshold p95 |",
        "| :--- | ---: | ---: | ---: | ---: |",
        `| projection | ${report.results.projection.p50Ms} | ${report.results.projection.p95Ms} | ${report.results.projection.maxMs} | ${report.thresholds.projectionP95Ms} |`,
        `| ttvProxy | ${report.results.ttvProxy.p50Ms} | ${report.results.ttvProxy.p95Ms} | ${report.results.ttvProxy.maxMs} | n/a |`,
        `| layout | ${report.results.layout.p50Ms} | ${report.results.layout.p95Ms} | ${report.results.layout.maxMs} | ${report.thresholds.layoutP95Ms} |`,
        `| search | ${report.results.search.p50Ms} | ${report.results.search.p95Ms} | ${report.results.search.maxMs} | ${report.thresholds.searchQueryP95Ms} |`,
        "",
        "## Rationale",
        "",
        ...report.rationale.map((line) => `- ${line}`),
      ].join("\n")
    );

    // Keep the audit test stable: it should guarantee the report exists and the scenario is materially dense.
    expect(fs.existsSync(path.join(reportDir, "dimension-3-performance.json"))).toBe(true);
    expect(fs.existsSync(path.join(reportDir, "dimension-3-performance.md"))).toBe(true);
    expect(report.scenario.persons).toBeGreaterThan(1000);
  });
});
