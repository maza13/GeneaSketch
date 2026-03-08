import {
  calculateGeneticHeatmap,
  findKinship,
  type KinshipResult
} from "@/core/graph/kinship";
import type { GraphDocument } from "@/types/domain";

type HeatmapResult = ReturnType<typeof calculateGeneticHeatmap>;

export type KinshipHeatmapRuntime = {
  document: GraphDocument;
  getHeatmap: (basePersonId: string) => HeatmapResult;
  getKinship: (leftPersonId: string, rightPersonId: string) => KinshipResult | null;
  getHeatmapKinship: (basePersonId: string, targetPersonId: string) => KinshipResult | null;
};

const runtimeByDocument = new WeakMap<GraphDocument, KinshipHeatmapRuntime>();

function hasPerson(document: GraphDocument, personId: string): boolean {
  return Boolean(personId) && Boolean(document.persons[personId]);
}

function pairKey(leftPersonId: string, rightPersonId: string): string {
  return leftPersonId < rightPersonId
    ? `${leftPersonId}|${rightPersonId}`
    : `${rightPersonId}|${leftPersonId}`;
}

function directionalPairKey(basePersonId: string, targetPersonId: string): string {
  return `${basePersonId}|${targetPersonId}`;
}

function createEmptyHeatmapResult(): HeatmapResult {
  return {
    dnaMap: new Map<string, number>(),
    inbreedingMap: new Map<string, number>()
  };
}

export function createKinshipHeatmapRuntime(document: GraphDocument): KinshipHeatmapRuntime {
  const cachedRuntime = runtimeByDocument.get(document);
  if (cachedRuntime) {
    return cachedRuntime;
  }

  const heatmapByBase = new Map<string, HeatmapResult>();
  const kinshipByPair = new Map<string, KinshipResult | null>();
  const heatmapKinshipByPair = new Map<string, KinshipResult | null>();

  const runtime: KinshipHeatmapRuntime = {
    document,
    getHeatmap(basePersonId) {
      if (!hasPerson(document, basePersonId)) {
        return createEmptyHeatmapResult();
      }
      const cached = heatmapByBase.get(basePersonId);
      if (cached) {
        return cached;
      }
      const next = calculateGeneticHeatmap(document, basePersonId);
      heatmapByBase.set(basePersonId, next);
      return next;
    },
    getKinship(leftPersonId, rightPersonId) {
      if (!hasPerson(document, leftPersonId) || !hasPerson(document, rightPersonId)) {
        return null;
      }

      const key = pairKey(leftPersonId, rightPersonId);
      if (kinshipByPair.has(key)) {
        return kinshipByPair.get(key) ?? null;
      }

      const resolved = findKinship(document, leftPersonId, rightPersonId);
      kinshipByPair.set(key, resolved);
      return resolved;
    },
    getHeatmapKinship(basePersonId, targetPersonId) {
      if (!hasPerson(document, basePersonId) || !hasPerson(document, targetPersonId)) {
        return null;
      }

      const key = directionalPairKey(basePersonId, targetPersonId);
      if (heatmapKinshipByPair.has(key)) {
        return heatmapKinshipByPair.get(key) ?? null;
      }

      const resolved = runtime.getKinship(basePersonId, targetPersonId);
      heatmapKinshipByPair.set(key, resolved);
      return resolved;
    }
  };

  runtimeByDocument.set(document, runtime);
  return runtime;
}
