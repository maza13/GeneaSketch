import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { parseGedcomAnyVersion } from "@/core/gedcom/parser";
import { documentToGenraph } from "@/core/genraph/GedcomBridge";
import { GenraphGraph } from "@/core/genraph/GenraphGraph";
import { exportGskPackage, importGskPackage } from "@/core/genraph/GskPackage";
import { parseJournalFromJsonl } from "@/core/genraph/Journal";
import {
  clearGraphProjectionCache,
  projectGraphDocument,
  selectFamilies,
  selectGraphStats,
  selectPersons,
  selectSearchEntries,
  selectTimelineInput,
  setReadModelMode,
} from "@/core/read-model";
import type { GraphFamily, GraphPerson, GraphSearchEntry, GraphStatsSummary, GraphTimelineInput } from "@/core/read-model/types";
import type { Event, GeneaDocument, GraphDocument, Person } from "@/types/domain";

type ParityFixture = {
  id: string;
  category: "canonical" | "synthetic" | "compat" | "real";
  graphFactory: () => Promise<GenraphGraph> | GenraphGraph;
};

type FixtureSummary = {
  id: string;
  category: string;
  persons: number;
  families: number;
  mismatches: Array<{
    area: string;
    path: string;
    classification: "semantic" | "ordering";
    legacyValue: unknown;
    directValue: unknown;
  }>;
};

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "@I1@",
    name: "Base Person",
    surname: "Base",
    sex: "U",
    lifeStatus: "alive",
    events: [],
    famc: [],
    fams: [],
    mediaRefs: [],
    sourceRefs: [],
    ...overrides,
  };
}

function makeMultiUnionDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": makePerson({ id: "@I1@", name: "Padre Base", surname: "Base", sex: "M", fams: ["@F1@", "@F2@"] }),
      "@I2@": makePerson({ id: "@I2@", name: "Madre Uno", surname: "Uno", sex: "F", fams: ["@F1@"] }),
      "@I3@": makePerson({ id: "@I3@", name: "Madre Dos", surname: "Dos", sex: "F", fams: ["@F2@"] }),
      "@I4@": makePerson({ id: "@I4@", name: "Hijo Uno", surname: "Base Uno", sex: "M", famc: ["@F1@"] }),
      "@I5@": makePerson({ id: "@I5@", name: "Hija Dos", surname: "Base Dos", sex: "F", famc: ["@F2@"] }),
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: "@I2@", childrenIds: ["@I4@"], events: [] },
      "@F2@": { id: "@F2@", husbandId: "@I1@", wifeId: "@I3@", childrenIds: ["@I5@"], events: [] },
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" },
  };
}

function normalizeEvents(events: Event[]): Array<Record<string, unknown>> {
  return [...events]
    .map((event) => ({
      id: event.id ?? `${event.type}:${event.date ?? ""}:${event.place ?? ""}`,
      type: event.type,
      date: event.date ?? null,
      place: event.place ?? null,
      sourceRefs: [...(event.sourceRefs ?? [])]
        .map((ref) => `${ref.id}|${ref.page ?? ""}|${ref.text ?? ""}|${ref.quality ?? ""}`)
        .sort(),
      noteRefs: [...(event.noteRefs ?? [])].sort(),
      notesInline: [...(event.notesInline ?? [])].sort(),
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function normalizePersons(persons: GraphPerson[]): Array<Record<string, unknown>> {
  return [...persons]
    .map((person) => ({
      id: person.id,
      name: person.name,
      surname: person.surname ?? null,
      lifeStatus: person.lifeStatus,
      birthDate: person.birthDate ?? null,
      deathDate: person.deathDate ?? null,
      famc: [...(person.famc ?? [])].sort(),
      fams: [...(person.fams ?? [])].sort(),
      events: normalizeEvents(person.events ?? []),
      sourceRefs: [...(person.sourceRefs ?? [])]
        .map((ref) => `${ref.id}|${ref.page ?? ""}|${ref.text ?? ""}|${ref.quality ?? ""}`)
        .sort(),
      noteRefs: [...(person.noteRefs ?? [])].sort(),
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function normalizeFamilies(families: GraphFamily[]): Array<Record<string, unknown>> {
  return [...families]
    .map((family) => ({
      id: family.id,
      husbandId: family.husbandId ?? null,
      wifeId: family.wifeId ?? null,
      childrenIds: [...family.childrenIds].sort(),
      events: normalizeEvents(family.events ?? []),
      noteRefs: [...(family.noteRefs ?? [])].sort(),
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function normalizeStats(stats: GraphStatsSummary): Record<string, unknown> {
  return {
    persons: stats.persons,
    families: stats.families,
    living: stats.living,
    deceased: stats.deceased,
  };
}

function normalizeSearch(search: GraphSearchEntry[]): Array<Record<string, unknown>> {
  return [...search]
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      surname: entry.surname ?? null,
      lifeStatus: entry.lifeStatus,
      birthDate: entry.birthDate ?? null,
      deathDate: entry.deathDate ?? null,
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function normalizeTimeline(timeline: GraphTimelineInput): Record<string, unknown> {
  return {
    persons: normalizePersons(timeline.persons as GraphPerson[]),
    families: normalizeFamilies(timeline.families as GraphFamily[]),
  };
}

function summarizeProjection(graph: GenraphGraph): {
  document: GraphDocument | null;
  persons: Array<Record<string, unknown>>;
  families: Array<Record<string, unknown>>;
  stats: Record<string, unknown>;
  search: Array<Record<string, unknown>>;
  timeline: Record<string, unknown>;
} {
  return {
    document: projectGraphDocument(graph),
    persons: normalizePersons(selectPersons(graph)),
    families: normalizeFamilies(selectFamilies(graph)),
    stats: normalizeStats(selectGraphStats(graph)),
    search: normalizeSearch(selectSearchEntries(graph)),
    timeline: normalizeTimeline(selectTimelineInput(graph)),
  };
}

function arraysEqual(a: unknown[], b: unknown[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function deepDiff(
  legacyValue: unknown,
  directValue: unknown,
  area: string,
  currentPath = ""
): FixtureSummary["mismatches"] {
  if (JSON.stringify(legacyValue) === JSON.stringify(directValue)) return [];

  if (Array.isArray(legacyValue) && Array.isArray(directValue)) {
    const maybeOrdering = [...legacyValue].map((x) => JSON.stringify(x)).sort();
    const maybeOrderingOther = [...directValue].map((x) => JSON.stringify(x)).sort();
    if (arraysEqual(maybeOrdering, maybeOrderingOther)) {
      return [{
        area,
        path: currentPath || "$",
        classification: "ordering",
        legacyValue,
        directValue,
      }];
    }
    const len = Math.max(legacyValue.length, directValue.length);
    const mismatches: FixtureSummary["mismatches"] = [];
    for (let i = 0; i < len; i += 1) {
      mismatches.push(...deepDiff(legacyValue[i], directValue[i], area, `${currentPath}[${i}]`));
    }
    return mismatches;
  }

  if (
    legacyValue &&
    directValue &&
    typeof legacyValue === "object" &&
    typeof directValue === "object" &&
    !Array.isArray(legacyValue) &&
    !Array.isArray(directValue)
  ) {
    const keys = new Set([
      ...Object.keys(legacyValue as Record<string, unknown>),
      ...Object.keys(directValue as Record<string, unknown>),
    ]);
    const mismatches: FixtureSummary["mismatches"] = [];
    for (const key of [...keys].sort()) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      mismatches.push(
        ...deepDiff(
          (legacyValue as Record<string, unknown>)[key],
          (directValue as Record<string, unknown>)[key],
          area,
          nextPath
        )
      );
    }
    return mismatches;
  }

  return [{
    area,
    path: currentPath || "$",
    classification: "semantic",
    legacyValue,
    directValue,
  }];
}

function withMode<T>(mode: "direct" | "legacy", fn: () => T): T {
  setReadModelMode(mode);
  clearGraphProjectionCache();
  return fn();
}

function loadCanonicalGraph(baseName: "basico" | "tipico" | "edgecases"): GenraphGraph {
  const root = path.resolve(process.cwd(), "docs/wiki-gsk/ejemplos/canon");
  const data = JSON.parse(fs.readFileSync(path.join(root, `${baseName}.graph.json`), "utf8"));
  const journalRaw = fs.readFileSync(path.join(root, `${baseName}.journal.jsonl`), "utf8");
  const journal = parseJournalFromJsonl(journalRaw);
  return GenraphGraph.fromData(data, journal);
}

async function buildCompatRepairGraph(): Promise<GenraphGraph> {
  const graph = GenraphGraph.create();
  graph.addPersonNode({ uid: "p-father", type: "Person", sex: "M", isLiving: false });
  graph.addPersonNode({ uid: "p-child", type: "Person", sex: "F", isLiving: true });

  const blob = await exportGskPackage(graph);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
  const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as {
    edges: Record<string, Record<string, unknown>>;
  };

  graphJson.edges["pc-legacy"] = {
    uid: "pc-legacy",
    type: "ParentChild",
    fromUid: "p-father",
    toUid: "p-child",
    parentRole: "father",
    nature: "BIO",
    certainty: "high",
    createdAt: "2026-03-03T00:00:00.000Z",
  };

  delete manifest.graphHash;
  delete (manifest as Record<string, unknown>).integrity;
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("graph.json", JSON.stringify(graphJson, null, 2));
  const payload = await zip.generateAsync({ type: "uint8array" });
  const result = await importGskPackage(payload, { strict: false });
  return result.graph;
}

function buildAdoptionGraph(): GenraphGraph {
  const rawGedcom = [
    "0 HEAD",
    "1 GEDC",
    "2 VERS 5.5.1",
    "0 @I1@ INDI",
    "1 NAME Adopted /Child/",
    "1 SEX F",
    "1 FAMC @F1@",
    "2 PEDI ADOPTED",
    "2 QUAY 1",
    "0 @I2@ INDI",
    "1 NAME Parent /One/",
    "1 SEX M",
    "1 FAMS @F1@",
    "0 @I3@ INDI",
    "1 NAME Parent /Two/",
    "1 SEX F",
    "1 FAMS @F1@",
    "0 @F1@ FAM",
    "1 HUSB @I2@",
    "1 WIFE @I3@",
    "1 CHIL @I1@",
    "0 TRLR",
  ].join("\n");

  const parsed = parseGedcomAnyVersion(rawGedcom);
  if (!parsed.document) throw new Error("Expected adoption GED fixture to parse.");
  return documentToGenraph(parsed.document, "5.5.1").graph;
}

function buildRealSampleGraph(): GenraphGraph {
  const raw = fs.readFileSync(path.resolve(process.cwd(), "samples/NuñezyMendoza.ged"), "utf8");
  const parsed = parseGedcomAnyVersion(raw);
  if (!parsed.document) throw new Error("Expected real GED sample to parse.");
  const version = parsed.sourceVersion?.startsWith("7") ? "7.0.x" : "5.5.1";
  return documentToGenraph(parsed.document, version).graph;
}

const fixtures: ParityFixture[] = [
  { id: "canonical_basico", category: "canonical", graphFactory: () => loadCanonicalGraph("basico") },
  { id: "canonical_tipico", category: "canonical", graphFactory: () => loadCanonicalGraph("tipico") },
  { id: "canonical_edgecases", category: "canonical", graphFactory: () => loadCanonicalGraph("edgecases") },
  { id: "synthetic_multi_union", category: "synthetic", graphFactory: () => documentToGenraph(makeMultiUnionDoc(), "7.0.x").graph },
  { id: "synthetic_adoption", category: "synthetic", graphFactory: buildAdoptionGraph },
  { id: "compat_missing_union_repair", category: "compat", graphFactory: buildCompatRepairGraph },
  { id: "real_sample_nunez_mendoza", category: "real", graphFactory: buildRealSampleGraph },
];

describe("read-model parity audit", () => {
  it("produces a repeatable direct-vs-legacy parity report for complex fixtures", async () => {
    const fixtureSummaries: FixtureSummary[] = [];

    for (const fixture of fixtures) {
      const graph = await fixture.graphFactory();
      const direct = withMode("direct", () => summarizeProjection(graph));
      const legacy = withMode("legacy", () => summarizeProjection(graph));

      const mismatches = [
        ...deepDiff(legacy.persons, direct.persons, "persons"),
        ...deepDiff(legacy.families, direct.families, "families"),
        ...deepDiff(legacy.stats, direct.stats, "stats"),
        ...deepDiff(legacy.search, direct.search, "search"),
        ...deepDiff(legacy.timeline, direct.timeline, "timeline"),
      ];

      fixtureSummaries.push({
        id: fixture.id,
        category: fixture.category,
        persons: legacy.document ? Object.keys(legacy.document.persons).length : 0,
        families: legacy.document ? Object.keys(legacy.document.families).length : 0,
        mismatches,
      });
    }

    const semanticMismatches = fixtureSummaries.flatMap((fixture) =>
      fixture.mismatches
        .filter((mismatch) => mismatch.classification === "semantic")
        .map((mismatch) => ({ fixtureId: fixture.id, ...mismatch }))
    );

    const reportRoot = path.resolve(process.cwd(), "reports/super-analysis-0.5.0");
    fs.mkdirSync(reportRoot, { recursive: true });

    const reportJson = {
      generatedAt: new Date().toISOString(),
      fixtureCount: fixtureSummaries.length,
      semanticMismatchCount: semanticMismatches.length,
      fixtures: fixtureSummaries,
    };

    fs.writeFileSync(
      path.join(reportRoot, "dimension-2-read-model-parity.json"),
      JSON.stringify(reportJson, null, 2),
      "utf8"
    );

    const lines = [
      "# Super Analysis 0.5.0 - Dimension 2 Read-model parity",
      "",
      `- generatedAt: ${reportJson.generatedAt}`,
      `- fixtureCount: ${reportJson.fixtureCount}`,
      `- semanticMismatchCount: ${reportJson.semanticMismatchCount}`,
      "",
      "| Fixture | Category | Persons | Families | Total mismatches | Semantic mismatches |",
      "| :--- | :--- | ---: | ---: | ---: | ---: |",
      ...fixtureSummaries.map((fixture) => {
        const semanticCount = fixture.mismatches.filter((m) => m.classification === "semantic").length;
        return `| ${fixture.id} | ${fixture.category} | ${fixture.persons} | ${fixture.families} | ${fixture.mismatches.length} | ${semanticCount} |`;
      }),
      "",
    ];

    if (semanticMismatches.length === 0) {
      lines.push("No semantic mismatches were detected across the audit corpus.");
    } else {
      lines.push("## Semantic mismatches");
      lines.push("");
      for (const mismatch of semanticMismatches) {
        lines.push(`- ${mismatch.fixtureId} :: ${mismatch.area} :: ${mismatch.path}`);
      }
    }

    fs.writeFileSync(path.join(reportRoot, "dimension-2-read-model-parity.md"), `${lines.join("\n")}\n`, "utf8");

    expect(fixtures.map((fixture) => fixture.id)).toEqual([
      "canonical_basico",
      "canonical_tipico",
      "canonical_edgecases",
      "synthetic_multi_union",
      "synthetic_adoption",
      "compat_missing_union_repair",
      "real_sample_nunez_mendoza",
    ]);
  });
});
