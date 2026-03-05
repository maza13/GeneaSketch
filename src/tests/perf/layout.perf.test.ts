import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeLayout } from "@/core/layout";
import { buildLayoutInputForScenario, createPerfScenarios } from "@/tests/perf/common/perfScenarios";
import { measureColdWarmRuns, type PerfStats } from "@/tests/perf/common/perfStats";
import { writeJsonReport, writeMarkdownReport } from "@/tests/perf/common/reportWriter";

type LayoutBaseline = {
  commit: string;
  generatedAt: string;
  slo: {
    layoutP95Ms: number;
  };
  scenarios: Record<string, { p50Ms: number; p95Ms: number; maxMs: number }>;
};

function loadLayoutBaseline(): LayoutBaseline {
  const baselinePath = path.resolve(
    process.cwd(),
    "reports/perf/dtree-v3-phase0/baseline-layout.json"
  );
  const raw = readFileSync(baselinePath, "utf8");
  return JSON.parse(raw) as LayoutBaseline;
}

function buildSummaryMarkdown(
  measuredAt: string,
  baselineCommit: string,
  results: Record<string, PerfStats>
): string {
  const lines = [
    "# DTree V3 Phase0 Layout Perf",
    "",
    `- measuredAt: ${measuredAt}`,
    `- baselineCommit: ${baselineCommit}`,
    "",
    "| Scenario | p50 (ms) | p95 (ms) | max (ms) | samples |",
    "| :--- | ---: | ---: | ---: | :--- |"
  ];

  for (const [scenarioId, stats] of Object.entries(results)) {
    lines.push(
      `| ${scenarioId} | ${stats.p50Ms} | ${stats.p95Ms} | ${stats.maxMs} | ${stats.samplesMs.join(", ")} |`
    );
  }

  return lines.join("\n");
}

describe("perf/layout phase0", () => {
  it("meets SLO and regression gates", async () => {
    const baseline = loadLayoutBaseline();
    const scenarios = createPerfScenarios();
    const results: Record<string, PerfStats> = {};
    const failures: string[] = [];

    for (const scenario of scenarios) {
      const input = buildLayoutInputForScenario(scenario);
      const stats = await measureColdWarmRuns(() => {
        computeLayout(input);
      });
      results[scenario.id] = stats;
    }

    for (const [scenarioId, stats] of Object.entries(results)) {
      const baselineScenario = baseline.scenarios[scenarioId];
      if (!baselineScenario) {
        failures.push(`Missing baseline scenario entry for ${scenarioId}.`);
        continue;
      }

      if (stats.p95Ms > baseline.slo.layoutP95Ms) {
        failures.push(
          `Absolute SLO failed for ${scenarioId}: p95=${stats.p95Ms}ms > ${baseline.slo.layoutP95Ms}ms.`
        );
      }

      const regressionLimit = Number((baselineScenario.p95Ms * 1.1).toFixed(3));
      if (stats.p95Ms > regressionLimit) {
        failures.push(
          `Regression gate failed for ${scenarioId}: p95=${stats.p95Ms}ms > ${regressionLimit}ms (baseline p95 ${baselineScenario.p95Ms}ms).`
        );
      }
    }

    if (process.env.PERF_WRITE_REPORTS === "1") {
      const measuredAt = new Date().toISOString();
      const outputDir = path.resolve(process.cwd(), "reports/perf/dtree-v3-phase0");
      writeJsonReport(path.join(outputDir, "latest-layout.json"), {
        measuredAt,
        baselineCommit: baseline.commit,
        results
      });
      writeMarkdownReport(
        path.join(outputDir, "latest-layout-summary.md"),
        buildSummaryMarkdown(measuredAt, baseline.commit, results)
      );
    }

    expect(failures).toEqual([]);
  }, 120000);
});
