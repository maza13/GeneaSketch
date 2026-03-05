import { performance } from "node:perf_hooks";

export type PerfRunLabel = "cold" | "warm-1" | "warm-2";

export type PerfRunSample = {
  label: PerfRunLabel;
  durationMs: number;
};

export type PerfStats = {
  samplesMs: number[];
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  minMs: number;
  meanMs: number;
  runs: PerfRunSample[];
};

function round(value: number): number {
  return Number(value.toFixed(3));
}

function percentile(samples: number[], percentileRank: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((left, right) => left - right);
  const rank = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1)
  );
  return sorted[rank] ?? sorted[sorted.length - 1]!;
}

export function computePerfStats(samplesMs: number[]): Omit<PerfStats, "runs"> {
  if (samplesMs.length === 0) {
    return {
      samplesMs: [],
      p50Ms: 0,
      p95Ms: 0,
      maxMs: 0,
      minMs: 0,
      meanMs: 0
    };
  }

  const maxMs = Math.max(...samplesMs);
  const minMs = Math.min(...samplesMs);
  const meanMs = samplesMs.reduce((acc, value) => acc + value, 0) / samplesMs.length;

  return {
    samplesMs: samplesMs.map(round),
    p50Ms: round(percentile(samplesMs, 50)),
    p95Ms: round(percentile(samplesMs, 95)),
    maxMs: round(maxMs),
    minMs: round(minMs),
    meanMs: round(meanMs)
  };
}

export async function measureColdWarmRuns(task: () => void | Promise<void>): Promise<PerfStats> {
  const labels: PerfRunLabel[] = ["cold", "warm-1", "warm-2"];
  const runs: PerfRunSample[] = [];

  for (const label of labels) {
    const startedAt = performance.now();
    await task();
    const endedAt = performance.now();
    runs.push({
      label,
      durationMs: round(endedAt - startedAt)
    });
  }

  const samples = runs.map((run) => run.durationMs);
  const stats = computePerfStats(samples);
  return {
    ...stats,
    runs
  };
}
