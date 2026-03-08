import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeGeneaDocument } from "@/core/diagnostics/analyzer";
import {
  calculateGeneticHeatmap,
  findKinship,
  getLineagePath
} from "@/core/graph/kinship";
import {
  inferTimelineEvents,
  inferTimelineStatus
} from "@/core/timeline/livingPresence";
import {
  createPerfScenarios,
  selectOverlayPerfTargets
} from "@/tests/perf/common/perfScenarios";
import { measureColdWarmRuns, type PerfStats } from "@/tests/perf/common/perfStats";
import { writeJsonReport, writeMarkdownReport } from "@/tests/perf/common/reportWriter";
import type { GraphDocument } from "@/types/domain";

const SHOULD_RUN_PERF =
  process.env.PERF_WRITE_REPORTS === "1"
  || ["test:perf:overlays", "test:perf:all"].includes(process.env.npm_lifecycle_event ?? "");
const perfIt = SHOULD_RUN_PERF ? it : it.skip;

type OverlayFamilyKey =
  | "kinship"
  | "heatmap_first_run"
  | "heatmap_target_switch"
  | "lineage"
  | "layer_diagnostics"
  | "timeline_inference";

type OverlayBaseline = {
  commit: string;
  generatedAt: string;
  slo: {
    overlayNoHeatmapP95Ms: number;
    heatmapFirstRunP95Ms: number;
    heatmapTargetSwitchP95Ms: number;
  };
  families: Record<OverlayFamilyKey, { p50Ms: number; p95Ms: number; maxMs: number }>;
};

function loadOverlayBaseline(): OverlayBaseline {
  const baselinePath = path.resolve(
    process.cwd(),
    "reports/perf/kindra-v31-phase0/baseline-overlays.json"
  );
  const raw = readFileSync(baselinePath, "utf8");
  return JSON.parse(raw) as OverlayBaseline;
}

function getAbsoluteSloLimit(baseline: OverlayBaseline, family: OverlayFamilyKey): number {
  if (family === "heatmap_first_run") return baseline.slo.heatmapFirstRunP95Ms;
  if (family === "heatmap_target_switch") return baseline.slo.heatmapTargetSwitchP95Ms;
  return baseline.slo.overlayNoHeatmapP95Ms;
}

function buildSummaryMarkdown(
  measuredAt: string,
  baselineCommit: string,
  aggregateResults: Record<OverlayFamilyKey, { aggregateP95Ms: number; scenarioP95Ms: Record<string, number> }>
): string {
  const lines = [
    "# Kindra v3.1 Phase0 Overlay Perf",
    "",
    `- measuredAt: ${measuredAt}`,
    `- baselineCommit: ${baselineCommit}`,
    "",
    "| Family | aggregate p95 (ms) | scenario p95 values |",
    "| :--- | ---: | :--- |"
  ];

  for (const [family, result] of Object.entries(aggregateResults)) {
    const scenarioPart = Object.entries(result.scenarioP95Ms)
      .map(([scenarioId, value]) => `${scenarioId}: ${value}`)
      .join(", ");
    lines.push(`| ${family} | ${result.aggregateP95Ms} | ${scenarioPart} |`);
  }

  return lines.join("\n");
}

async function measureOverlayFamiliesForScenario(
  document: GraphDocument,
  timelineYear: number
): Promise<Record<OverlayFamilyKey, PerfStats>> {
  const targets = selectOverlayPerfTargets(document);
  const [kinshipLeft, kinshipRight] = targets.kinshipPair;

  const kinshipStats = await measureColdWarmRuns(() => {
    findKinship(document, kinshipLeft, kinshipRight);
  });

  const heatmapFirstRunStats = await measureColdWarmRuns(() => {
    calculateGeneticHeatmap(document, targets.heatmapBaseId);
  });

  calculateGeneticHeatmap(document, targets.heatmapBaseId);
  const heatmapTargetSwitchStats = await measureColdWarmRuns(() => {
    for (const targetId of targets.heatmapTargets) {
      findKinship(document, targets.heatmapBaseId, targetId);
    }
  });

  const lineageStats = await measureColdWarmRuns(() => {
    getLineagePath(document, targets.lineagePersonId, "patrilineal");
    getLineagePath(document, targets.lineagePersonId, "matrilineal");
  });

  const diagnosticsStats = await measureColdWarmRuns(() => {
    analyzeGeneaDocument(document);
  });

  const timelineStats = await measureColdWarmRuns(() => {
    inferTimelineStatus(document, timelineYear);
    inferTimelineEvents(document, timelineYear);
  });

  return {
    kinship: kinshipStats,
    heatmap_first_run: heatmapFirstRunStats,
    heatmap_target_switch: heatmapTargetSwitchStats,
    lineage: lineageStats,
    layer_diagnostics: diagnosticsStats,
    timeline_inference: timelineStats
  };
}

describe("perf/overlays phase0", () => {
  perfIt("meets SLO and regression gates", async () => {
    const baseline = loadOverlayBaseline();
    const scenarios = createPerfScenarios();
    const scenarioResults: Record<string, Record<OverlayFamilyKey, PerfStats>> = {};
    const families: OverlayFamilyKey[] = [
      "kinship",
      "heatmap_first_run",
      "heatmap_target_switch",
      "lineage",
      "layer_diagnostics",
      "timeline_inference"
    ];
    const failures: string[] = [];

    for (const scenario of scenarios) {
      const clonedDoc = structuredClone(scenario.document) as GraphDocument;
      scenarioResults[scenario.id] = await measureOverlayFamiliesForScenario(
        clonedDoc,
        scenario.timelineYear
      );
    }

    const aggregateResults: Record<OverlayFamilyKey, { aggregateP95Ms: number; scenarioP95Ms: Record<string, number> }> = {
      kinship: { aggregateP95Ms: 0, scenarioP95Ms: {} },
      heatmap_first_run: { aggregateP95Ms: 0, scenarioP95Ms: {} },
      heatmap_target_switch: { aggregateP95Ms: 0, scenarioP95Ms: {} },
      lineage: { aggregateP95Ms: 0, scenarioP95Ms: {} },
      layer_diagnostics: { aggregateP95Ms: 0, scenarioP95Ms: {} },
      timeline_inference: { aggregateP95Ms: 0, scenarioP95Ms: {} }
    };

    for (const family of families) {
      const scenarioP95: Record<string, number> = {};
      const p95Values: number[] = [];

      for (const scenario of scenarios) {
        const stats = scenarioResults[scenario.id]?.[family];
        if (!stats) {
          failures.push(`Missing measured stats for ${family} in ${scenario.id}.`);
          continue;
        }
        scenarioP95[scenario.id] = stats.p95Ms;
        p95Values.push(stats.p95Ms);
      }

      if (p95Values.length === 0) {
        failures.push(`No p95 values measured for family ${family}.`);
        continue;
      }

      const aggregateP95 = Number(Math.max(...p95Values).toFixed(3));
      aggregateResults[family] = {
        aggregateP95Ms: aggregateP95,
        scenarioP95Ms: scenarioP95
      };

      const absoluteSloLimit = getAbsoluteSloLimit(baseline, family);
      if (aggregateP95 > absoluteSloLimit) {
        failures.push(
          `Absolute SLO failed for ${family}: aggregate p95 ${aggregateP95}ms > ${absoluteSloLimit}ms.`
        );
      }

      const baselineFamily = baseline.families[family];
      if (!baselineFamily) {
        failures.push(`Missing baseline family entry for ${family}.`);
        continue;
      }

      const regressionLimit = Number((baselineFamily.p95Ms * 1.1).toFixed(3));
      if (aggregateP95 > regressionLimit) {
        failures.push(
          `Regression gate failed for ${family}: aggregate p95 ${aggregateP95}ms > ${regressionLimit}ms (baseline p95 ${baselineFamily.p95Ms}ms).`
        );
      }
    }

    if (process.env.PERF_WRITE_REPORTS === "1") {
      const measuredAt = new Date().toISOString();
      const outputDir = path.resolve(process.cwd(), "reports/perf/kindra-v31-phase0");
      writeJsonReport(path.join(outputDir, "latest-overlays.json"), {
        measuredAt,
        baselineCommit: baseline.commit,
        aggregateResults,
        scenarioResults
      });
      writeMarkdownReport(
        path.join(outputDir, "latest-overlays-summary.md"),
        buildSummaryMarkdown(measuredAt, baseline.commit, aggregateResults)
      );
    }

    expect(failures).toEqual([]);
  }, 120000);
});
