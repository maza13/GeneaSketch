import type { GSchemaGraph } from "@/core/gschema/GSchemaGraph";
import { clearReadModelCache, getCached, setCached } from "./cache";
import { buildDirectDocument } from "./directProjection";
import type {
  GraphFamily,
  GraphPerson,
  GraphProjectionDocument,
  ReadModelMode,
  GraphSearchEntry,
  GraphStatsSummary,
  GraphTimelineInput,
} from "./types";

let lastKey = "";
let lastDoc: GraphProjectionDocument | null = null;

export function setReadModelMode(mode: ReadModelMode): void {
  if (mode !== "direct") {
    console.warn(`[read-model] Legacy mode request ignored; runtime mainline is direct-only (requested: ${mode}).`);
  }
  clearGraphProjectionCache();
}

export function getReadModelMode(): ReadModelMode {
  return "direct";
}

function keyFor(graph: GSchemaGraph | null): string {
  if (!graph) return "";
  return `${graph.graphId}:${graph.journalLength}:direct`;
}

function keyedSelector(graph: GSchemaGraph | null, selector: string): string {
  const key = keyFor(graph);
  return key ? `${key}:${selector}` : "";
}

export function projectGraphDocument(graph: GSchemaGraph | null): GraphProjectionDocument | null {
  if (!graph) {
    lastKey = "";
    lastDoc = null;
    return null;
  }
  const key = keyFor(graph);
  if (lastDoc && key === lastKey) return lastDoc;
  lastDoc = buildDirectDocument(graph);
  lastKey = key;
  return lastDoc;
}

export function selectPersons(graph: GSchemaGraph | null): GraphPerson[] {
  const cacheKey = keyedSelector(graph, "persons");
  if (!cacheKey) return [];
  const cached = getCached<GraphPerson[]>(cacheKey);
  if (cached) return cached;
  const doc = projectGraphDocument(graph);
  return setCached(cacheKey, Object.values(doc?.persons || {}));
}

export function selectFamilies(graph: GSchemaGraph | null): GraphFamily[] {
  const cacheKey = keyedSelector(graph, "families");
  if (!cacheKey) return [];
  const cached = getCached<GraphFamily[]>(cacheKey);
  if (cached) return cached;
  const doc = projectGraphDocument(graph);
  return setCached(cacheKey, Object.values(doc?.families || {}));
}

export function selectGraphStats(graph: GSchemaGraph | null): GraphStatsSummary {
  const cacheKey = keyedSelector(graph, "stats");
  if (!cacheKey) return { persons: 0, families: 0, living: 0, deceased: 0 };
  const cached = getCached<GraphStatsSummary>(cacheKey);
  if (cached) return cached;
  const persons = selectPersons(graph);
  const families = selectFamilies(graph);
  const living = persons.filter((person) => person.lifeStatus === "alive").length;
  const deceased = persons.length - living;
  return setCached(cacheKey, {
    persons: persons.length,
    families: families.length,
    living,
    deceased,
  });
}

export function selectTimelineInput(graph: GSchemaGraph | null): GraphTimelineInput {
  const cacheKey = keyedSelector(graph, "timeline");
  if (!cacheKey) return { persons: [], families: [] };
  const cached = getCached<GraphTimelineInput>(cacheKey);
  if (cached) return cached;
  return setCached(cacheKey, {
    persons: selectPersons(graph),
    families: selectFamilies(graph),
  });
}

export function selectSearchEntries(graph: GSchemaGraph | null): GraphSearchEntry[] {
  const cacheKey = keyedSelector(graph, "search");
  if (!cacheKey) return [];
  const cached = getCached<GraphSearchEntry[]>(cacheKey);
  if (cached) return cached;
  const rows = selectPersons(graph).map((person) => ({
    id: person.id,
    name: person.name,
    surname: person.surname,
    lifeStatus: person.lifeStatus,
    birthDate: person.birthDate,
    deathDate: person.deathDate,
  }));
  return setCached(cacheKey, rows);
}

export function clearGraphProjectionCache(): void {
  lastKey = "";
  lastDoc = null;
  clearReadModelCache();
}
