/**
 * GSchema Golden Tests
 *
 * These are the canonical correctness tests for the GSchema 0.1.x engine.
 * They verify:
 * 1. Core graph CRUD (add nodes, edges, claims)
 * 2. Graph integrity validation
 * 3. GedcomBridge round-trip (GeneaDocument ↔ GSchemaGraph)
 * 4. Serialization/deserialization (toData / fromData)
 * 5. Journal replay (replayJournal produces identical graph)
 *
 * These should ALWAYS pass before any merge into main.
 */

import { describe, it, expect, beforeEach } from "vitest";
import JSZip from "jszip";
import { GSchemaGraph } from "../core/gschema/GSchemaGraph";
import { validateGSchemaGraph } from "../core/gschema/validation";
import { PersonPredicates, UnionPredicates } from "../core/gschema/predicates";
import { documentToGSchema, gschemaToDocument, roundTripDocument } from "../core/gschema/GedcomBridge";
import { serializeJournalToJsonl, parseJournalFromJsonl, replayJournal, applyJournalOps } from "../core/gschema/Journal";
import { exportGskPackage, importGskPackage } from "../core/gschema/GskPackage";
import { mergeJournalsThreeWay } from "../core/gschema/JournalMerge";
import { parseGedcomAnyVersion } from "../core/gedcom/parser";
import { serializeGedcom } from "../core/gedcom/serializer";
import type { GeneaDocument, Person } from "../types/domain";

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

const uid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "@I1@",
    name: "Juan /García/",
    surname: "García",
    sex: "M",
    lifeStatus: "deceased",
    birthDate: "1 JAN 1950",
    birthPlace: "Madrid, España",
    deathDate: "15 MAR 2010",
    deathPlace: "Barcelona, España",
    events: [
      {
        id: uid(),
        type: "BIRT",
        date: "1 JAN 1950",
        place: "Madrid, España",
        sourceRefs: [],
        mediaRefs: [],
        notesInline: [],
        noteRefs: [],
      },
      {
        id: uid(),
        type: "DEAT",
        date: "15 MAR 2010",
        place: "Barcelona, España",
        sourceRefs: [],
        mediaRefs: [],
        notesInline: [],
        noteRefs: [],
      },
    ],
    famc: [],
    fams: ["@F1@"],
    names: [{ value: "Juan /García/" }],
    mediaRefs: [],
    sourceRefs: [],
    ...overrides,
  };
}

function makeMinimalDoc(): GeneaDocument {
  const p1: Person = makePerson({ id: "@I1@", fams: ["@F1@"] });
  const p2: Person = makePerson({
    id: "@I2@",
    name: "María /López/",
    surname: "López",
    sex: "F",
    famc: [],
    fams: ["@F1@"],
    birthDate: "10 JUN 1955",
    birthPlace: "Valencia, España",
    deathDate: undefined,
    deathPlace: undefined,
    events: [
      {
        id: uid(), type: "BIRT", date: "10 JUN 1955", place: "Valencia, España",
        sourceRefs: [], mediaRefs: [], notesInline: [], noteRefs: []
      }
    ]
  });
  const p3: Person = makePerson({
    id: "@I3@",
    name: "Ana /García López/",
    surname: "García López",
    sex: "F",
    lifeStatus: "alive",
    birthDate: "5 SEP 1975",
    birthPlace: "Madrid, España",
    deathDate: undefined,
    deathPlace: undefined,
    events: [
      {
        id: uid(), type: "BIRT", date: "5 SEP 1975", place: "Madrid, España",
        sourceRefs: [], mediaRefs: [], notesInline: [], noteRefs: []
      }
    ],
    famc: ["@F1@"],
    fams: [],
  });

  return {
    persons: { "@I1@": p1, "@I2@": p2, "@I3@": p3 },
    families: {
      "@F1@": {
        id: "@F1@",
        husbandId: "@I1@",
        wifeId: "@I2@",
        childrenIds: ["@I3@"],
        events: [
          {
            id: uid(), type: "MARR", date: "20 JUN 1974", place: "Madrid, España",
            sourceRefs: [], mediaRefs: [], notesInline: [], noteRefs: []
          }
        ]
      }
    },
    media: {},
    metadata: { sourceFormat: "GED" as const, gedVersion: "5.5.1" },
  };
}

function makeMultiUnionDoc(): GeneaDocument {
  const father = makePerson({ id: "@I1@", name: "Padre /Base/", sex: "M", fams: ["@F1@", "@F2@"], famc: [] });
  const mother1 = makePerson({ id: "@I2@", name: "Madre /Uno/", sex: "F", fams: ["@F1@"], famc: [] });
  const mother2 = makePerson({ id: "@I3@", name: "Madre /Dos/", sex: "F", fams: ["@F2@"], famc: [] });
  const child1 = makePerson({ id: "@I4@", name: "Hijo /Uno/", sex: "M", famc: ["@F1@"], fams: [] });
  const child2 = makePerson({ id: "@I5@", name: "Hijo /Dos/", sex: "F", famc: ["@F2@"], fams: [] });

  return {
    persons: {
      "@I1@": father,
      "@I2@": mother1,
      "@I3@": mother2,
      "@I4@": child1,
      "@I5@": child2,
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: "@I2@", childrenIds: ["@I4@"], events: [] },
      "@F2@": { id: "@F2@", husbandId: "@I1@", wifeId: "@I3@", childrenIds: ["@I5@"], events: [] },
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" },
  };
}

// ─────────────────────────────────────────────
// 1. GSchemaGraph Core Engine
// ─────────────────────────────────────────────

describe("GSchemaGraph — core CRUD", () => {
  let graph: GSchemaGraph;

  beforeEach(() => {
    graph = GSchemaGraph.create();
  });

  it("should create an empty graph", () => {
    expect(graph.nodeCount).toBe(0);
    expect(graph.edgeCount).toBe(0);
    expect(graph.journalLength).toBe(0);
  });

  it("should add a PersonNode and retrieve it", () => {
    const nodeInput = { uid: uid(), type: "Person" as const, sex: "M" as const, isLiving: false };
    graph.addPersonNode(nodeInput);
    const node = graph.node(nodeInput.uid);
    expect(node).toBeTruthy();
    expect(node?.type).toBe("Person");
    expect(graph.journalLength).toBe(1);
  });

  it("should add a Claim and retrieve it as preferred", () => {
    const personUid = uid();
    graph.addPersonNode({ uid: personUid, type: "Person", sex: "F", isLiving: true });
    graph.addClaim({
      uid: uid(),
      nodeUid: personUid,
      predicate: PersonPredicates.NAME_FULL,
      value: "María /García/",
      provenance: { actorId: "test", timestamp: Date.now() / 1000, method: "test" },
      quality: "reviewed", lifecycle: "active", isPreferred: true,
      createdAt: new Date().toISOString(),
    });

    const preferred = graph.getPreferred(personUid, PersonPredicates.NAME_FULL);
    expect(preferred?.value).toBe("María /García/");
  });

  it("should enforce single preferred claim per predicate", () => {
    const personUid = uid();
    graph.addPersonNode({ uid: personUid, type: "Person", sex: "M", isLiving: false });

    const c1Id = uid();
    const c2Id = uid();

    graph.addClaim({
      uid: c1Id, nodeUid: personUid, predicate: PersonPredicates.NAME_FULL,
      value: "Juan", provenance: { actorId: "a", timestamp: 0, method: "test" },
      quality: "raw", lifecycle: "active", isPreferred: true, createdAt: ""
    });
    graph.addClaim({
      uid: c2Id, nodeUid: personUid, predicate: PersonPredicates.NAME_FULL,
      value: "José", provenance: { actorId: "a", timestamp: 0, method: "test" },
      quality: "raw", lifecycle: "active", isPreferred: true, createdAt: ""
    });

    const claims = graph.getClaims(personUid, PersonPredicates.NAME_FULL);
    const preferredClaims = claims.filter(c => c.isPreferred);
    expect(preferredClaims).toHaveLength(1);
    expect(preferredClaims[0].uid).toBe(c2Id);
  });

  it("should soft-delete a node (not actually remove)", () => {
    const personUid = uid();
    graph.addPersonNode({ uid: personUid, type: "Person", sex: "M", isLiving: false });
    graph.softDeleteNode(personUid, "test deletion");

    expect(graph.node(personUid)).toBeUndefined();
    expect(graph.nodeCount).toBe(0);
    expect(graph.journalLength).toBe(2);
  });

  it("should retract a claim without removing it", () => {
    const personUid = uid();
    graph.addPersonNode({ uid: personUid, type: "Person", sex: "M", isLiving: false });
    const claimId = uid();
    graph.addClaim({
      uid: claimId, nodeUid: personUid, predicate: PersonPredicates.NAME_FULL,
      value: "Juan", provenance: { actorId: "a", timestamp: 0, method: "test" },
      quality: "raw", lifecycle: "active", isPreferred: true, createdAt: ""
    });
    graph.retractClaim(claimId, "incorrect name");

    const preferred = graph.getPreferred(personUid, PersonPredicates.NAME_FULL);
    expect(preferred).toBeNull();
  });

  it("should correctly return edges from/to nodes", () => {
    const p1 = uid(); const p2 = uid(); const u1 = uid();
    graph.addPersonNode({ uid: p1, type: "Person", sex: "M", isLiving: false });
    graph.addPersonNode({ uid: p2, type: "Person", sex: "F", isLiving: false });
    graph.addUnionNode({ uid: u1, type: "Union", unionType: "MARR" });

    graph.addMemberEdge({ uid: uid(), type: "Member", fromUid: p1, toUid: u1, role: "HUSB" });
    graph.addMemberEdge({ uid: uid(), type: "Member", fromUid: p2, toUid: u1, role: "WIFE" });

    expect(graph.edgesFrom(p1)).toHaveLength(1);
    expect(graph.edgesFrom(p2)).toHaveLength(1);
    expect(graph.edgesTo(u1)).toHaveLength(2);
    expect(graph.getMembers(u1)).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────
// 2. Graph Validation
// ─────────────────────────────────────────────

describe("validateGSchemaGraph", () => {
  it("should pass validation for an empty graph", () => {
    const graph = GSchemaGraph.create();
    const result = validateGSchemaGraph(graph.toData());
    expect(result.isValid).toBe(true);
    expect(result.issues.filter(i => i.severity === "error")).toHaveLength(0);
  });

  it("should detect orphaned edge (toUid not in nodes)", () => {
    const graph = GSchemaGraph.create();
    const p1 = uid();
    graph.addPersonNode({ uid: p1, type: "Person", sex: "M", isLiving: false });
    graph.addMemberEdge({
      uid: uid(), type: "Member", fromUid: p1, toUid: "non-existent-uid", role: "HUSB"
    });
    const result = validateGSchemaGraph(graph.toData());
    const errors = result.issues.filter(i => i.code === "EDGE_ORPHAN_TO");
    expect(errors.length).toBeGreaterThan(0);
    expect(result.isValid).toBe(false);
  });

  it("should warn when multiple preferred claims conflict", () => {
    const graph = GSchemaGraph.create();
    const nodeUid = uid();
    graph.addPersonNode({ uid: nodeUid, type: "Person", sex: "M", isLiving: false });

    const data = graph.toData();
    data.claims[nodeUid] = {
      [PersonPredicates.NAME_FULL]: [
        {
          uid: uid(), nodeUid, predicate: PersonPredicates.NAME_FULL,
          value: "A", provenance: { actorId: "", timestamp: 0, method: "" },
          quality: "raw", lifecycle: "active", isPreferred: true, createdAt: ""
        },
        {
          uid: uid(), nodeUid, predicate: PersonPredicates.NAME_FULL,
          value: "B", provenance: { actorId: "", timestamp: 0, method: "" },
          quality: "raw", lifecycle: "active", isPreferred: true, createdAt: ""
        }
      ]
    };

    const result = validateGSchemaGraph(data);
    const conflict = result.issues.find(i => i.code === "MULTIPLE_PREFERRED_CLAIMS");
    expect(conflict).toBeTruthy();
    expect(result.isValid).toBe(false);
  });
});

// ─────────────────────────────────────────────
// 3. GedcomBridge Round-Trip
// ─────────────────────────────────────────────

describe("GedcomBridge — round trip", () => {
  it("should convert GeneaDocument to GSchemaGraph without data loss", () => {
    const doc = makeMinimalDoc();
    const { graph, xrefMap, quarantineCount } = documentToGSchema(doc, "5.5.1");

    expect(quarantineCount).toBe(0);
    expect(Object.keys(xrefMap)).toHaveLength(4);

    expect(graph.allNodes().filter(n => n.type === "Person")).toHaveLength(3);
    expect(graph.allNodes().filter(n => n.type === "Union")).toHaveLength(1);
    const unions = graph.allNodes().filter(n => n.type === "Union");
    expect(graph.getMembers(unions[0].uid)).toHaveLength(2);
    const fathers = graph.allNodes().filter(n => n.type === "Person" && graph.getChildren(n.uid).length > 0);
    expect(fathers.length).toBeGreaterThan(0);
  });

  it("should preserve birth date through GedcomBridge", () => {
    const doc = makeMinimalDoc();
    const { graph, xrefMap } = documentToGSchema(doc, "5.5.1");

    const p1Uid = xrefMap["@I1@"];
    const birthDate = graph.getValue<{ raw: string }>(p1Uid, PersonPredicates.EVENT_BIRTH_DATE);
    expect(birthDate?.raw).toBe("1 JAN 1950");
  });

  it("should preserve birth place as GeoRef", () => {
    const doc = makeMinimalDoc();
    const { graph, xrefMap } = documentToGSchema(doc, "5.5.1");

    const p1Uid = xrefMap["@I1@"];
    const birthPlace = graph.getValue<{ placeRaw: string }>(p1Uid, PersonPredicates.EVENT_BIRTH_PLACE);
    expect(birthPlace?.placeRaw).toBe("Madrid, España");
  });

  it("should preserve marriage date in union node", () => {
    const doc = makeMinimalDoc();
    const { graph, xrefMap } = documentToGSchema(doc, "5.5.1");

    const unionUid = xrefMap["@F1@"];
    const marrDate = graph.getValue<{ raw: string }>(unionUid, UnionPredicates.EVENT_MARRIAGE_DATE);
    expect(marrDate?.raw).toBe("20 JUN 1974");
  });

  it("should project GSchemaGraph back to GeneaDocument with same persons", () => {
    const doc = makeMinimalDoc();
    const { graph } = documentToGSchema(doc, "5.5.1");
    const projected = gschemaToDocument(graph);

    expect(Object.keys(projected.persons)).toHaveLength(3);
    expect(Object.keys(projected.families)).toHaveLength(1);
  });

  it("roundTripDocument should preserve person count and families", () => {
    const doc = makeMinimalDoc();
    const result = roundTripDocument(doc);

    expect(Object.keys(result.persons)).toHaveLength(Object.keys(doc.persons).length);
    expect(Object.keys(result.families)).toHaveLength(Object.keys(doc.families).length);
  });

  it("should preserve children per union in multi-union round trip", () => {
    const doc = makeMultiUnionDoc();
    const projected = roundTripDocument(doc);

    expect(projected.families["@F1@"]?.childrenIds).toEqual(["@I4@"]);
    expect(projected.families["@F2@"]?.childrenIds).toEqual(["@I5@"]);
    expect(projected.persons["@I4@"]?.famc).toContain("@F1@");
    expect(projected.persons["@I5@"]?.famc).toContain("@F2@");
  });

  it("should write unionUid in ParentChild edges during document->gschema projection", () => {
    const doc = makeMultiUnionDoc();
    const { graph, xrefMap } = documentToGSchema(doc, "7.0.x");
    const f1Uid = xrefMap["@F1@"];
    const f2Uid = xrefMap["@F2@"];

    const parentChildEdges = graph.allEdges().filter((edge) => edge.type === "ParentChild");
    const f1Edges = parentChildEdges.filter((edge) => edge.unionUid === f1Uid);
    const f2Edges = parentChildEdges.filter((edge) => edge.unionUid === f2Uid);

    expect(f1Edges.length).toBeGreaterThan(0);
    expect(f2Edges.length).toBeGreaterThan(0);
    expect(f1Edges.every((edge) => edge.unionUid === f1Uid)).toBe(true);
    expect(f2Edges.every((edge) => edge.unionUid === f2Uid)).toBe(true);
  });

  it("should synthesize name from given/surname when NAME_FULL is missing", () => {
    const graph = GSchemaGraph.create();
    const pUid = uid();
    graph.addPersonNode({ uid: pUid, type: "Person", sex: "F", isLiving: true, xref: "@I100@" });
    graph.addClaim({
      uid: uid(),
      nodeUid: pUid,
      predicate: PersonPredicates.NAME_GIVEN,
      value: "Ana",
      provenance: { actorId: "test", timestamp: 0, method: "test" },
      quality: "raw", lifecycle: "active", isPreferred: true,
      createdAt: new Date().toISOString()
    });
    graph.addClaim({
      uid: uid(),
      nodeUid: pUid,
      predicate: PersonPredicates.NAME_SURNAME,
      value: "Lopez",
      provenance: { actorId: "test", timestamp: 0, method: "test" },
      quality: "raw", lifecycle: "active", isPreferred: true,
      createdAt: new Date().toISOString()
    });

    const projected = gschemaToDocument(graph);
    expect(projected.persons["@I100@"].name).toBe("Ana");
    expect(projected.persons["@I100@"].names?.[0]?.value).toBe("Ana Lopez");
  });

  it("should infer GIVN and SURN claims from bare NAME string with slashes", () => {
    // This test simulates a GEDCOM import with a bare 1 NAME line (no 2 GIVN/2 SURN tags)
    const rawGedcom = `0 @I1@ INDI\n1 NAME Juan Jesús /Nuñez Mendoza/\n1 SEX M\n0 TRLR`;
    const { document } = parseGedcomAnyVersion(rawGedcom);
    const { graph } = documentToGSchema(document!);

    const nodeUid = graph.allNodes().find(n => n.type === "Person")?.uid;
    if (!nodeUid) throw new Error("Person node not found");

    const givenClaims = graph.getClaims(nodeUid, PersonPredicates.NAME_GIVEN);
    const surnameClaims = graph.getClaims(nodeUid, PersonPredicates.NAME_SURNAME);

    expect(givenClaims.length).toBe(1);
    expect(givenClaims[0].value).toBe("Juan Jesús");
    expect(surnameClaims.length).toBe(1);
    expect(surnameClaims[0].value).toBe("Nuñez Mendoza");

    // Also verify the projection back to document (what the UI sees)
    const projected = gschemaToDocument(graph);
    expect(projected.persons["@I1@"].name).toBe("Juan Jesús");
    expect(projected.persons["@I1@"].surname).toBe("Nuñez Mendoza");
  });

  it("should extract name metadata (prefix, suffix, title) from GEDCOM tags", () => {
    const rawGedcom = `0 @I2@ INDI
1 NAME Juan /Perez/
2 NPFX Dr.
2 NSFX Jr.
1 TITL Conde de Barcelona
0 TRLR`;
    const { document } = parseGedcomAnyVersion(rawGedcom);
    const { graph } = documentToGSchema(document!);
    const nodeUid = graph.allNodes().find(n => n.type === "Person")?.uid!;

    expect(graph.getClaims(nodeUid, PersonPredicates.NAME_PREFIX)[0].value).toBe("Dr.");
    expect(graph.getClaims(nodeUid, PersonPredicates.NAME_SUFFIX)[0].value).toBe("Jr.");
    expect(graph.getClaims(nodeUid, PersonPredicates.NAME_TITLE)[0].value).toBe("Conde de Barcelona");
  });

  it("should heuristically extract untagged name metadata from strings", () => {
    const rawGedcom = `0 @I3@ INDI
1 NAME Sir Isaac /Newton/ III
0 TRLR`;
    const { document } = parseGedcomAnyVersion(rawGedcom);
    const { graph } = documentToGSchema(document!);
    const nodeUid = graph.allNodes().find(n => n.type === "Person")?.uid!;

    expect(graph.getClaims(nodeUid, PersonPredicates.NAME_GIVEN)[0].value).toBe("Isaac");
    expect(graph.getClaims(nodeUid, PersonPredicates.NAME_PREFIX)[0].value).toBe("Sir");
    expect(graph.getClaims(nodeUid, PersonPredicates.NAME_SUFFIX)[0].value).toBe("III");
  });

  it("should preserve canonical surnames and order through gsk projection", () => {
    const doc = makeMinimalDoc();
    doc.persons["@I3@"].name = "Ana Maria";
    doc.persons["@I3@"].surnamePaternal = "Garcia";
    doc.persons["@I3@"].surnameMaternal = "de la Rosa";
    doc.persons["@I3@"].surnameOrder = "paternal_first";
    doc.persons["@I3@"].surname = "Garcia de la Rosa";
    doc.persons["@I3@"].names = [{
      value: "Ana Maria /Garcia de la Rosa/",
      given: "Ana Maria",
      surname: "Garcia de la Rosa",
      type: "primary",
      primary: true
    }];

    const projected = roundTripDocument(doc);
    const person = projected.persons["@I3@"];
    expect(person.surnamePaternal).toBe("Garcia");
    expect(person.surnameMaternal).toBe("de la Rosa");
    expect(person.surnameOrder).toBe("paternal_first");
    expect(person.surname).toBe("Garcia de la Rosa");
  });

  it("should preserve person and family notes/events losslessly through gsk projection", () => {
    const doc = makeMinimalDoc();
    doc.notes = {
      "@N1@": { id: "@N1@", text: "Nota global 1" },
      "@N2@": { id: "@N2@", text: "Nota global 2" }
    };
    doc.persons["@I1@"].noteRefs = ["@N1@"];
    doc.persons["@I1@"].rawTags = { NOTE: ["Nota inline persona"] };
    doc.persons["@I1@"].events[0].noteRefs = ["@N2@"];
    doc.persons["@I1@"].events[0].notesInline = ["Nota evento persona"];
    doc.families["@F1@"].noteRefs = ["@N2@"];
    doc.families["@F1@"].rawTags = { NOTE: ["Nota inline familia"] };
    doc.families["@F1@"].events[0].noteRefs = ["@N1@"];
    doc.families["@F1@"].events[0].notesInline = ["Nota evento familia"];

    const projected = roundTripDocument(doc);
    const p1 = projected.persons["@I1@"];
    const f1 = projected.families["@F1@"];
    expect(projected.notes?.["@N1@"]?.text).toBe("Nota global 1");
    expect(projected.notes?.["@N2@"]?.text).toBe("Nota global 2");
    expect(p1.noteRefs).toEqual(["@N1@"]);
    expect(p1.rawTags?.NOTE).toEqual(["Nota inline persona"]);
    expect(p1.events[0].noteRefs).toEqual(["@N2@"]);
    expect(p1.events[0].notesInline).toEqual(["Nota evento persona"]);
    expect(f1.noteRefs).toEqual(["@N2@"]);
    expect(f1.rawTags?.NOTE).toEqual(["Nota inline familia"]);
    expect(f1.events[0].noteRefs).toEqual(["@N1@"]);
    expect(f1.events[0].notesInline).toEqual(["Nota evento familia"]);
  });
});

describe("GskPackage — strict import", () => {
  it("should fail to import a corrupted .gsk when integrity rules are violated", async () => {
    const doc = makeMinimalDoc();
    const { graph } = documentToGSchema(doc, "7.0.x");
    const data = graph.toData();

    const parentEdge = Object.values(data.edges).find((edge) => edge.type === "ParentChild");
    expect(parentEdge).toBeTruthy();
    parentEdge!.unionUid = "union-does-not-exist";

    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(graph.toManifest(), null, 2));
    zip.file("graph.json", JSON.stringify(data, null, 2));
    const payload = await zip.generateAsync({ type: "uint8array" });
    await expect(importGskPackage(payload, { strict: true })).rejects.toThrow(
      "parent-child union invariants in strict mode"
    );
  });
});

// ─────────────────────────────────────────────
// 4. Journal Serialization + Replay
// ─────────────────────────────────────────────

describe("Journal — serialization and replay", () => {
  it("should serialize and deserialize journal as JSONL", () => {
    const graph = GSchemaGraph.create();
    const nodeUid = uid();
    graph.addPersonNode({ uid: nodeUid, type: "Person", sex: "M", isLiving: false });
    graph.addClaim({
      uid: uid(), nodeUid,
      predicate: PersonPredicates.NAME_FULL,
      value: "Pedro",
      provenance: { actorId: "user", timestamp: 1000, method: "test" },
      quality: "raw", lifecycle: "active", isPreferred: true, createdAt: ""
    });

    const journal = graph.getJournal();
    const jsonl = serializeJournalToJsonl(journal);
    const parsed = parseJournalFromJsonl(jsonl);

    expect(parsed).toHaveLength(journal.length);
    expect(parsed[0].type).toBe("ADD_NODE");
    expect(parsed[1].type).toBe("ADD_CLAIM");
  });

  it("replayJournal should produce a graph with the same node count", () => {
    const graph = GSchemaGraph.create();
    const nodeUid = uid();
    graph.addPersonNode({ uid: nodeUid, type: "Person", sex: "F", isLiving: true });
    graph.addClaim({
      uid: uid(), nodeUid,
      predicate: PersonPredicates.NAME_FULL,
      value: "Sofía /Martín/",
      provenance: { actorId: "user", timestamp: 1000, method: "test" },
      quality: "raw", lifecycle: "active", isPreferred: true, createdAt: ""
    });

    const journalOps = [...graph.getJournal()];
    const fullReplayed = replayJournal(journalOps);
    expect(fullReplayed.nodeCount).toBe(1);
  });
});

// ─────────────────────────────────────────────
// 5. toData / fromData Round-Trip
// ─────────────────────────────────────────────

describe("GSchemaGraph — toData / fromData", () => {
  it("should serialize and deserialize a graph preserving all nodes and claims", () => {
    const graph = GSchemaGraph.create();
    const nodeUid = uid();
    graph.addPersonNode({ uid: nodeUid, type: "Person", sex: "M", isLiving: false });
    graph.addClaim({
      uid: uid(), nodeUid, predicate: PersonPredicates.NAME_FULL,
      value: "Carlos /Ruiz/",
      provenance: { actorId: "user", timestamp: Date.now() / 1000, method: "test" },
      quality: "reviewed", lifecycle: "active", isPreferred: true, createdAt: new Date().toISOString()
    });

    const data = graph.toData();
    const restored = GSchemaGraph.fromData(data);

    expect(restored.nodeCount).toBe(graph.nodeCount);
    const restoredName = restored.getValue<string>(nodeUid, PersonPredicates.NAME_FULL);
    expect(restoredName).toBe("Carlos /Ruiz/");
  });

  it("should restore adjacency index after fromData", () => {
    const doc = makeMinimalDoc();
    const { graph } = documentToGSchema(doc, "5.5.1");

    const data = graph.toData();
    const restored = GSchemaGraph.fromData(data);

    const unions = restored.allNodes().filter(n => n.type === "Union");
    expect(unions.length).toBeGreaterThan(0);
    const members = restored.getMembers(unions[0].uid);
    expect(members.length).toBe(2);
  });
});

// ─────────────────────────────────────────────
// 6. Dirty Data & Quarantine Scenarios
// ─────────────────────────────────────────────

describe("Phase D3: Dirty Data & Quarantine Scenarios", () => {
  it("quarantines unknown tags without failing import", () => {
    const doc = makeMinimalDoc();
    // Inject dirty data
    doc.persons["@I1@"].rawTags = {
      "UNKNOWN_TAG": ["Some weird value"],
      "ANOTHER_ONE": ["Value A", "Value B"]
    };

    const { graph, quarantineCount } = documentToGSchema(doc, "5.5.1");

    // The graph should still be valid
    const validation = validateGSchemaGraph(graph.toData());
    expect(validation.isValid).toBe(true);


    console.log("Q COUNT:", quarantineCount);
    console.log("Q DATA:", JSON.stringify(graph.toData().quarantine, null, 2));

    const quarantineData = graph.toData().quarantine;
    const unknownTags = quarantineData.filter(q => q.reason === "unknown_individual_tag");
    expect(unknownTags.length).toBeGreaterThan(0);
    expect(JSON.stringify(unknownTags)).toContain("UNKNOWN_TAG");
  });

  it("handles trailing spaces in claims gracefully", () => {
    const doc = makeMinimalDoc();
    doc.persons["@I1@"].names = [{ value: "John Doe   " }]; // Trailing spaces
    doc.persons["@I1@"].events[0].place = "Madrid, Spain  ";

    const { graph } = documentToGSchema(doc, "5.5.1");
    const projected = gschemaToDocument(graph);

    // Depending on design, we might trim or preserve.
    // Assuming we preserve verbatim but don't crash:
    expect(projected.persons["@I1@"]!.names![0].value).toBe("John Doe   ");
    expect(projected.persons["@I1@"]!.events![0].place).toBe("Madrid, Spain  ");
  });


});

describe("Journal - Fase 1 determinismo", () => {
  it("assigns opSeq as gap-free 0-based sequence", () => {
    const graph = GSchemaGraph.create();
    const p1 = uid();
    const p2 = uid();
    const u1 = uid();
    graph.addPersonNode({ uid: p1, type: "Person", sex: "M", isLiving: false });
    graph.addPersonNode({ uid: p2, type: "Person", sex: "F", isLiving: false });
    graph.addUnionNode({ uid: u1, type: "Union", unionType: "MARR" });
    graph.addMemberEdge({ uid: uid(), type: "Member", fromUid: p1, toUid: u1, role: "HUSB" });
    graph.addMemberEdge({ uid: uid(), type: "Member", fromUid: p2, toUid: u1, role: "WIFE" });

    const ops = [...graph.getJournal()];
    expect(ops.length).toBeGreaterThan(0);
    expect(ops.every((op, idx) => op.opSeq === idx)).toBe(true);
  });

  it("replayJournal rebuilds adjacency index", () => {
    const graph = GSchemaGraph.create();
    const p1 = uid();
    const p2 = uid();
    const u1 = uid();
    graph.addPersonNode({ uid: p1, type: "Person", sex: "M", isLiving: false });
    graph.addPersonNode({ uid: p2, type: "Person", sex: "F", isLiving: false });
    graph.addUnionNode({ uid: u1, type: "Union", unionType: "MARR" });
    graph.addMemberEdge({ uid: uid(), type: "Member", fromUid: p1, toUid: u1, role: "HUSB" });
    graph.addMemberEdge({ uid: uid(), type: "Member", fromUid: p2, toUid: u1, role: "WIFE" });

    const replayed = replayJournal([...graph.getJournal()]);
    expect(replayed.getMembers(u1)).toHaveLength(2);
    expect(replayed.edgesTo(u1)).toHaveLength(2);
  });

  it("applyJournalOps applies only missing tail ops for fast-forward", () => {
    const source = GSchemaGraph.create();
    const personUid = uid();
    source.addPersonNode({ uid: personUid, type: "Person", sex: "M", isLiving: false });
    source.addClaim({
      uid: uid(),
      nodeUid: personUid,
      predicate: PersonPredicates.NAME_FULL,
      value: "Juan FastForward",
      provenance: { actorId: "test", timestamp: 1, method: "test" },
      quality: "raw",
      lifecycle: "active",
      isPreferred: true,
      createdAt: new Date().toISOString()
    });
    const ops = [...source.getJournal()];
    const snapshot = replayJournal(ops.filter((op) => op.opSeq <= 0));
    applyJournalOps(snapshot, ops.filter((op) => op.opSeq > 0));
    expect(snapshot.getPreferred(personUid, PersonPredicates.NAME_FULL)?.value).toBe("Juan FastForward");
    expect(snapshot.journalLength).toBe(ops.length);
  });
});

describe("GskPackage - Fase 1 recovery matrix", () => {
  it("warns when snapshot is behind journal head", async () => {
    const doc = makeMinimalDoc();
    const { graph } = documentToGSchema(doc, "7.0.x");
    const blob = await exportGskPackage(graph);
    const zipPayload = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(zipPayload);
    const manifestRaw = await zip.file("manifest.json")!.async("string");
    const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
    manifest.graphDerivedFromOpSeq = -1;
    delete (manifest as any).integrity;
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    const payload = await zip.generateAsync({ type: "uint8array" });

    const result = await importGskPackage(payload, { strict: true });
    expect(result.warnings.some((w) => w.includes("Snapshot behind journal head"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("Fast-forward applied"))).toBe(true);
    expect(result.graph.nodeCount).toBeGreaterThan(0);
  });

  it("reconstructs from journal when graph is invalid and journal is valid", async () => {
    const doc = makeMinimalDoc();
    const { graph } = documentToGSchema(doc, "7.0.x");
    const blob = await exportGskPackage(graph);
    const zipPayload = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(zipPayload);
    const graphRaw = await zip.file("graph.json")!.async("string");
    const graphJson = JSON.parse(graphRaw) as { edges: Record<string, { type: string; unionUid?: string }> };
    const parentEdge = Object.values(graphJson.edges).find((edge) => edge.type === "ParentChild");
    expect(parentEdge).toBeTruthy();
    parentEdge!.unionUid = "union-does-not-exist";
    zip.file("graph.json", JSON.stringify(graphJson, null, 2));
    const payload = await zip.generateAsync({ type: "uint8array" });

    const result = await importGskPackage(payload, { strict: false });
    expect(result.warnings.some((w) => w.includes("Reconstructing graph from journal replay"))).toBe(true);
    expect(result.graph.nodeCount).toBeGreaterThan(0);
  });

  it("fails hard when both graph and journal are invalid", async () => {
    const doc = makeMinimalDoc();
    const { graph } = documentToGSchema(doc, "7.0.x");
    const blob = await exportGskPackage(graph);
    const zipPayload = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(zipPayload);
    zip.file("graph.json", "{ not-json");
    zip.file("journal.jsonl", "{\"broken\": true");
    const payload = await zip.generateAsync({ type: "uint8array" });

    await expect(importGskPackage(payload, { strict: false })).rejects.toThrow("both invalid");
  });

  it("emits warning on journalHash mismatch", async () => {
    const doc = makeMinimalDoc();
    const { graph } = documentToGSchema(doc, "7.0.x");
    const blob = await exportGskPackage(graph);
    const zipPayload = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(zipPayload);
    const manifestRaw = await zip.file("manifest.json")!.async("string");
    const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
    manifest.journalHash = "sha256:deadbeef";
    delete (manifest as any).integrity;
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    const payload = await zip.generateAsync({ type: "uint8array" });

    const result = await importGskPackage(payload, { strict: true });
    expect(result.warnings.some((w) => w.includes("hash mismatch"))).toBe(true);
  });
});

describe("Claims - Fase 2 quality/lifecycle", () => {
  it("migrates legacy status=retracted to lifecycle=retracted", async () => {
    const personUid = uid();
    const claimUid = uid();
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify({
      schemaVersion: "0.1.0",
      graphId: uid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      graphDerivedFromOpSeq: -1,
      journalHeadOpSeq: -1,
      stats: { personCount: 1, unionCount: 0, edgeCount: 0, claimCount: 1, mediaCount: 0 },
      mediaFiles: []
    }, null, 2));
    zip.file("graph.json", JSON.stringify({
      schemaVersion: "0.1.0",
      graphId: uid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: {
        [personUid]: { uid: personUid, type: "Person", sex: "M", isLiving: false, createdAt: new Date().toISOString() }
      },
      edges: {},
      claims: {
        [personUid]: {
          [PersonPredicates.NAME_FULL]: [{
            uid: claimUid,
            nodeUid: personUid,
            predicate: PersonPredicates.NAME_FULL,
            value: "Nombre Legacy",
            provenance: { actorId: "legacy", timestamp: 0, method: "legacy" },
            status: "retracted",
            isPreferred: true,
            createdAt: new Date().toISOString()
          }]
        }
      },
      quarantine: []
    }, null, 2));

    const payload = await zip.generateAsync({ type: "uint8array" });
    const result = await importGskPackage(payload, { strict: true });
    const migratedClaim = result.graph.getClaims(personUid, PersonPredicates.NAME_FULL)[0];

    expect(migratedClaim.value).toBe("Nombre Legacy");
    expect(migratedClaim.quality).toBe("raw");
    expect(migratedClaim.lifecycle).toBe("retracted");
    expect(migratedClaim.isPreferred).toBe(false);
  });

  it("migrates legacy status=disputed to quality=disputed lifecycle=active", async () => {
    const personUid = uid();
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify({
      schemaVersion: "0.1.0",
      graphId: uid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      graphDerivedFromOpSeq: -1,
      journalHeadOpSeq: -1,
      stats: { personCount: 1, unionCount: 0, edgeCount: 0, claimCount: 1, mediaCount: 0 },
      mediaFiles: []
    }, null, 2));
    zip.file("graph.json", JSON.stringify({
      schemaVersion: "0.1.0",
      graphId: uid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: {
        [personUid]: { uid: personUid, type: "Person", sex: "F", isLiving: true, createdAt: new Date().toISOString() }
      },
      edges: {},
      claims: {
        [personUid]: {
          [PersonPredicates.NAME_FULL]: [{
            uid: uid(),
            nodeUid: personUid,
            predicate: PersonPredicates.NAME_FULL,
            value: "Claim Disputed",
            provenance: { actorId: "legacy", timestamp: 0, method: "legacy" },
            status: "disputed",
            isPreferred: true,
            createdAt: new Date().toISOString()
          }]
        }
      },
      quarantine: []
    }, null, 2));

    const payload = await zip.generateAsync({ type: "uint8array" });
    const result = await importGskPackage(payload, { strict: true });
    const migratedClaim = result.graph.getClaims(personUid, PersonPredicates.NAME_FULL)[0];

    expect(migratedClaim.quality).toBe("disputed");
    expect(migratedClaim.lifecycle).toBe("active");
    expect(migratedClaim.isPreferred).toBe(true);
  });

  it("validates lifecycle=retracted + isPreferred=true as error", () => {
    const graph = GSchemaGraph.create();
    const personUid = uid();
    graph.addPersonNode({ uid: personUid, type: "Person", sex: "M", isLiving: false });

    const data = graph.toData();
    data.claims[personUid] = {
      [PersonPredicates.NAME_FULL]: [{
        uid: uid(),
        nodeUid: personUid,
        predicate: PersonPredicates.NAME_FULL,
        value: "Invalid",
        provenance: { actorId: "test", timestamp: 0, method: "test" },
        quality: "raw",
        lifecycle: "retracted",
        isPreferred: true,
        createdAt: new Date().toISOString()
      }]
    };

    const result = validateGSchemaGraph(data);
    expect(result.issues.some((i) => i.code === "RETRACTED_CLAIM_IS_PREFERRED")).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it("preserves quality/lifecycle on .gsk round-trip", async () => {
    const graph = GSchemaGraph.create();
    const personUid = uid();
    graph.addPersonNode({ uid: personUid, type: "Person", sex: "F", isLiving: true });
    graph.addClaim({
      uid: uid(),
      nodeUid: personUid,
      predicate: PersonPredicates.NAME_FULL,
      value: "Roundtrip",
      provenance: { actorId: "test", timestamp: 1, method: "test" },
      quality: "reviewed",
      lifecycle: "active",
      isPreferred: true,
      createdAt: new Date().toISOString()
    });

    const blob = await exportGskPackage(graph);
    const payload = new Uint8Array(await blob.arrayBuffer());
    const imported = await importGskPackage(payload, { strict: true });
    const importedClaim = imported.graph.getClaims(personUid, PersonPredicates.NAME_FULL)[0];
    expect(importedClaim.quality).toBe("reviewed");
    expect(importedClaim.lifecycle).toBe("active");
  });
});

describe("Fase 3 - Quarantine AST + Export conflictos", () => {
  it("imports GEDCOM 5.5.1 unknown tags into quarantine AST preserving hierarchy", () => {
    const raw = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 5.5.1",
      "1 CHAR UTF-8",
      "0 @I1@ INDI",
      "1 NAME Juan /Perez/",
      "1 SEX M",
      "1 _CUSTOM ROOT",
      "2 _CHILD A",
      "3 _GRAND B",
      "0 TRLR"
    ].join("\n");

    const parsed = parseGedcomAnyVersion(raw);
    expect(parsed.document).toBeTruthy();
    const projected = documentToGSchema(parsed.document!, "5.5.1");
    const quarantine = projected.graph.getQuarantine();
    expect(quarantine.length).toBeGreaterThan(0);
    const custom = quarantine.find((q) => q.ast.tag === "_CUSTOM");
    expect(custom).toBeTruthy();
    expect(custom!.ast.children[0]?.tag).toBe("_CHILD");
    expect(custom!.ast.children[0]?.children[0]?.tag).toBe("_GRAND");
  });

  it("imports GEDCOM 7.x extensions into quarantine AST preserving context", () => {
    const raw = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0.3",
      "1 CHAR UTF-8",
      "0 @F1@ FAM",
      "1 _ALTROOT R",
      "2 _ALTCHILD C",
      "0 TRLR"
    ].join("\n");

    const parsed = parseGedcomAnyVersion(raw);
    expect(parsed.document).toBeTruthy();
    const projected = documentToGSchema(parsed.document!, "7.0.x");
    const quarantine = projected.graph.getQuarantine();
    const alt = quarantine.find((q) => q.ast.tag === "_ALTROOT");
    expect(alt).toBeTruthy();
    expect(alt!.context).toBe("@F1@");
    expect(alt!.originalGedcomVersion).toBe("7.0.x");
    expect(alt!.ast.children[0]?.tag).toBe("_ALTCHILD");
  });

  it("exports non-preferred claims as NOTE _GSK_CONFLICT for GEDCOM 5.5.1", () => {
    const graph = GSchemaGraph.create();
    const pUid = uid();
    graph.addPersonNode({ uid: pUid, type: "Person", sex: "M", isLiving: false, xref: "@I1@" });
    graph.addClaim({
      uid: uid(),
      nodeUid: pUid,
      predicate: PersonPredicates.EVENT_BIRTH_DATE,
      value: { raw: "1 JAN 1900" },
      provenance: { actorId: "t", timestamp: 0, method: "t" },
      quality: "verified",
      lifecycle: "active",
      isPreferred: true,
      createdAt: new Date().toISOString()
    });
    graph.addClaim({
      uid: uid(),
      nodeUid: pUid,
      predicate: PersonPredicates.EVENT_BIRTH_DATE,
      value: { raw: "ABT 1901" },
      provenance: { actorId: "t", timestamp: 0, method: "t" },
      quality: "disputed",
      lifecycle: "active",
      isPreferred: false,
      createdAt: new Date().toISOString()
    });

    const doc = gschemaToDocument(graph, "5.5.1");
    const ged = serializeGedcom(doc, { version: "5.5.1" });
    expect(ged.includes("_GSK_CONFLICT")).toBe(true);
  });

  it("exports non-preferred claims as _GSK_ALT for GEDCOM 7.0.x", () => {
    const graph = GSchemaGraph.create();
    const pUid = uid();
    graph.addPersonNode({ uid: pUid, type: "Person", sex: "F", isLiving: true, xref: "@I2@" });
    graph.addClaim({
      uid: uid(),
      nodeUid: pUid,
      predicate: PersonPredicates.NAME_FULL,
      value: "Ana /Lopez/",
      provenance: { actorId: "t", timestamp: 0, method: "t" },
      quality: "verified",
      lifecycle: "active",
      isPreferred: true,
      createdAt: new Date().toISOString()
    });
    graph.addClaim({
      uid: uid(),
      nodeUid: pUid,
      predicate: PersonPredicates.NAME_FULL,
      value: "Ana /Lopes/",
      provenance: { actorId: "t", timestamp: 0, method: "t" },
      quality: "disputed",
      lifecycle: "active",
      isPreferred: false,
      createdAt: new Date().toISOString()
    });

    const doc = gschemaToDocument(graph, "7.0.x");
    const ged = serializeGedcom(doc, { version: "7.0.3" });
    expect(ged.includes("_GSK_ALT")).toBe(true);
  });

  it("migrates flat quarantine (0.2.x) to AST on import", async () => {
    const personUid = uid();
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify({
      schemaVersion: "0.2.0",
      graphId: uid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      graphDerivedFromOpSeq: -1,
      journalHeadOpSeq: -1,
      stats: { personCount: 1, unionCount: 0, edgeCount: 0, claimCount: 0, mediaCount: 0 },
      mediaFiles: []
    }, null, 2));
    zip.file("graph.json", JSON.stringify({
      schemaVersion: "0.2.0",
      graphId: uid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: {
        [personUid]: { uid: personUid, type: "Person", sex: "M", isLiving: false, createdAt: new Date().toISOString() }
      },
      edges: {},
      claims: {},
      quarantine: [{
        opId: uid(),
        opSeq: 0,
        type: "QUARANTINE",
        timestamp: 1,
        actorId: "legacy",
        importId: uid(),
        rawTag: "_LEGACY",
        rawValue: "v",
        reason: "legacy",
        context: "@I1@"
      }]
    }, null, 2));

    const payload = await zip.generateAsync({ type: "uint8array" });
    const result = await importGskPackage(payload, { strict: false });
    const q = result.graph.toData().quarantine[0];
    expect(q.ast.tag).toBe("_LEGACY");
    expect(q.ast.value).toBe("v");
  });
});

describe("Fase 4 - Citations first-class + evidence gate", () => {
  it("imports GEDCOM SOUR into claim citations", () => {
    const raw = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0.3",
      "1 CHAR UTF-8",
      "0 @S1@ SOUR",
      "1 TITL Registro Civil",
      "0 @I1@ INDI",
      "1 NAME Juan /Perez/",
      "1 SEX M",
      "1 BIRT",
      "2 DATE 1 JAN 1900",
      "2 SOUR @S1@",
      "3 PAGE Folio 12",
      "3 TEXT Acta legible",
      "0 TRLR"
    ].join("\n");

    const parsed = parseGedcomAnyVersion(raw);
    expect(parsed.document).toBeTruthy();
    const { graph, xrefMap } = documentToGSchema(parsed.document!, "7.0.x");
    const personUid = xrefMap["@I1@"];
    const sourceUid = xrefMap["@S1@"];
    const birthClaim = graph.getPreferred(personUid, PersonPredicates.EVENT_BIRTH_DATE);
    expect(birthClaim).toBeTruthy();
    expect(birthClaim!.citations?.length).toBeGreaterThan(0);
    expect(birthClaim!.citations?.[0].sourceUid).toBe(sourceUid);
    expect(birthClaim!.citations?.[0].page).toBe("Folio 12");
  });

  it("exports claim citations as GEDCOM SOUR pointers", () => {
    const graph = GSchemaGraph.create();
    const sourceUid = uid();
    graph.addNode({ uid: sourceUid, type: "Source", xref: "@S1@", title: "Registro Civil" } as any);
    const personUid = uid();
    graph.addPersonNode({ uid: personUid, type: "Person", xref: "@I1@", sex: "M", isLiving: false });
    graph.addClaim({
      uid: uid(),
      nodeUid: personUid,
      predicate: PersonPredicates.EVENT_BIRTH_DATE,
      value: { raw: "1 JAN 1900" },
      provenance: { actorId: "test", timestamp: 0, method: "test" },
      quality: "verified",
      lifecycle: "active",
      evidenceGate: "direct",
      citations: [{ sourceUid, page: "Folio 12", transcription: "Acta legible", confidence: 1 }],
      isPreferred: true,
      createdAt: new Date().toISOString()
    });

    const doc = gschemaToDocument(graph, "7.0.x");
    const ged = serializeGedcom(doc, { version: "7.0.3" });
    expect(ged.includes("2 SOUR @S1@")).toBe(true);
    expect(ged.includes("3 PAGE Folio 12")).toBe(true);
    expect(ged.includes("3 TEXT Acta legible")).toBe(true);
  });

  it("preserves citations across GEDCOM round-trip", () => {
    const raw = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0.3",
      "1 CHAR UTF-8",
      "0 @S1@ SOUR",
      "1 TITL Registro Civil",
      "0 @I1@ INDI",
      "1 NAME Juan /Perez/",
      "1 SEX M",
      "1 BIRT",
      "2 DATE 1 JAN 1900",
      "2 SOUR @S1@",
      "3 PAGE Folio 12",
      "3 TEXT Acta legible",
      "0 TRLR"
    ].join("\n");

    const parsed1 = parseGedcomAnyVersion(raw);
    const g1 = documentToGSchema(parsed1.document!, "7.0.x");
    const d2 = gschemaToDocument(g1.graph, "7.0.x");
    const ged2 = serializeGedcom(d2, { version: "7.0.3" });
    const parsed2 = parseGedcomAnyVersion(ged2);
    const g2 = documentToGSchema(parsed2.document!, "7.0.x");
    const c2 = g2.graph.getPreferred(g2.xrefMap["@I1@"], PersonPredicates.EVENT_BIRTH_DATE);

    expect(c2?.citations?.length).toBeGreaterThan(0);
    expect(c2?.citations?.[0].page).toBe("Folio 12");
    expect(c2?.citations?.[0].transcription).toContain("Acta legible");
  });

  it("emits info MISSING_CITATIONS for reviewed claims without citations", () => {
    const graph = GSchemaGraph.create();
    const personUid = uid();
    graph.addPersonNode({ uid: personUid, type: "Person", sex: "F", isLiving: true });
    graph.addClaim({
      uid: uid(),
      nodeUid: personUid,
      predicate: PersonPredicates.NAME_FULL,
      value: "Ana /Lopez/",
      provenance: { actorId: "test", timestamp: 0, method: "test" },
      quality: "reviewed",
      lifecycle: "active",
      evidenceGate: "unassessed",
      isPreferred: true,
      createdAt: new Date().toISOString()
    });

    const result = validateGSchemaGraph(graph.toData());
    expect(result.issues.some((i) => i.code === "MISSING_CITATIONS" && i.severity === "info")).toBe(true);
  });
});

describe("Fase 5 - container security + journal sync", () => {
  it("emits warning on graphHash mismatch (tamper)", async () => {
    const doc = makeMinimalDoc();
    const { graph } = documentToGSchema(doc, "7.0.x");
    const blob = await exportGskPackage(graph);
    const zipPayload = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(zipPayload);
    const graphRaw = await zip.file("graph.json")!.async("string");
    const graphJson = JSON.parse(graphRaw) as { nodes: Record<string, { type: string; deleted?: boolean }> };
    const firstNode = Object.values(graphJson.nodes)[0];
    firstNode.deleted = true;
    zip.file("graph.json", JSON.stringify(graphJson, null, 2));
    const payload = await zip.generateAsync({ type: "uint8array" });

    await expect(importGskPackage(payload, { strict: true })).rejects.toThrow("PACKAGE_HASH_MISMATCH");

    // Also verify it emits a warning instead in compat mode
    const resultCompat = await importGskPackage(payload, { strict: false });
    expect(resultCompat.warnings.some((w) => w.includes("PACKAGE_HASH_MISMATCH"))).toBe(true);
  });

  it("merges two journals with common ancestor into a valid sequence", () => {
    const nodeUid = uid();
    const base = GSchemaGraph.create();
    base.addPersonNode({ uid: nodeUid, type: "Person", sex: "M", isLiving: false });
    const baseOps = [...base.getJournal()];
    const baseHead = baseOps[baseOps.length - 1].opSeq;

    const left = [...baseOps, {
      opId: uid(),
      opSeq: baseHead + 1,
      type: "ADD_CLAIM" as const,
      timestamp: 10,
      actorId: "left",
      claim: {
        uid: uid(),
        nodeUid,
        predicate: PersonPredicates.NAME_FULL,
        value: "Juan",
        provenance: { actorId: "left", timestamp: 10, method: "test" },
        quality: "raw" as const,
        lifecycle: "active" as const,
        evidenceGate: "unassessed" as const,
        isPreferred: true,
        createdAt: new Date().toISOString()
      }
    }];
    const right = [...baseOps, {
      opId: uid(),
      opSeq: baseHead + 1,
      type: "ADD_CLAIM" as const,
      timestamp: 11,
      actorId: "right",
      claim: {
        uid: uid(),
        nodeUid,
        predicate: PersonPredicates.SEX,
        value: "M",
        provenance: { actorId: "right", timestamp: 11, method: "test" },
        quality: "raw" as const,
        lifecycle: "active" as const,
        evidenceGate: "unassessed" as const,
        isPreferred: true,
        createdAt: new Date().toISOString()
      }
    }];

    const merged = mergeJournalsThreeWay(baseOps, left, right);
    expect(merged.conflicts).toHaveLength(0);
    expect(merged.mergedOps.every((op, idx) => op.opSeq === idx)).toBe(true);
    expect(merged.mergedOps.length).toBe(baseOps.length + 2);
  });

  it("flags conflict when both branches edit same nodeUid+predicate", () => {
    const nodeUid = uid();
    const base = GSchemaGraph.create();
    base.addPersonNode({ uid: nodeUid, type: "Person", sex: "F", isLiving: true });
    const baseOps = [...base.getJournal()];
    const head = baseOps[baseOps.length - 1].opSeq;

    const left = [...baseOps, {
      opId: uid(),
      opSeq: head + 1,
      type: "ADD_CLAIM" as const,
      timestamp: 20,
      actorId: "left",
      claim: {
        uid: uid(),
        nodeUid,
        predicate: PersonPredicates.NAME_FULL,
        value: "Ana",
        provenance: { actorId: "left", timestamp: 20, method: "test" },
        quality: "reviewed" as const,
        lifecycle: "active" as const,
        evidenceGate: "unassessed" as const,
        isPreferred: true,
        createdAt: new Date().toISOString()
      }
    }];
    const right = [...baseOps, {
      opId: uid(),
      opSeq: head + 1,
      type: "ADD_CLAIM" as const,
      timestamp: 21,
      actorId: "right",
      claim: {
        uid: uid(),
        nodeUid,
        predicate: PersonPredicates.NAME_FULL,
        value: "Ana Maria",
        provenance: { actorId: "right", timestamp: 21, method: "test" },
        quality: "reviewed" as const,
        lifecycle: "active" as const,
        evidenceGate: "unassessed" as const,
        isPreferred: true,
        createdAt: new Date().toISOString()
      }
    }];

    const merged = mergeJournalsThreeWay(baseOps, left, right);
    expect(merged.conflicts.length).toBeGreaterThan(0);
    expect(merged.conflicts[0].key).toBe(`${nodeUid}::${PersonPredicates.NAME_FULL}`);
  });
});


describe("Extra interoperabilidad y Coerción (Issue 021)", () => {
  it("coerces informal dates and flags isInformal", () => {
    const doc: GeneaDocument = {
      ...makeMultiUnionDoc(),
      persons: {
        "@I1@": {
          ...makePerson({ id: "@I1@" }),
          birthDate: "Aprox el invierno de 1850",
          events: [
            { id: "e1", type: "BIRT", date: "Aprox el invierno de 1850", place: "Madrid", sourceRefs: [], mediaRefs: [], notesInline: [], noteRefs: [] }
          ]
        },
      },
    };

    const { graph, warnings } = documentToGSchema(doc, "5.5.1");
    const claim = graph.getPreferred(Object.keys(graph.toData().nodes).find(k => graph.node(k)?.xref === "@I1@")!, PersonPredicates.EVENT_BIRTH_DATE);

    expect(claim).toBeTruthy();
    expect((claim?.value as any).raw).toBe("Aprox el invierno de 1850");
    expect((claim?.value as any).isInformal).toBe(true);
    expect(warnings.some(w => w.code === "GED_DATE_INFORMAL")).toBe(true);
  });

  it("parses hierarchical places and flags flat places", () => {
    const doc: GeneaDocument = {
      ...makeMultiUnionDoc(),
      persons: {
        "@I1@": {
          ...makePerson({ id: "@I1@" }),
          birthPlace: "Parroquia de San Antón, Madrid, España",
          deathPlace: "Desconocido",
          events: [
            { id: "e1", type: "BIRT", date: "1850", place: "Parroquia de San Antón, Madrid, España", sourceRefs: [], mediaRefs: [], notesInline: [], noteRefs: [] },
            { id: "e2", type: "DEAT", date: "1910", place: "Desconocido", sourceRefs: [], mediaRefs: [], notesInline: [], noteRefs: [] }
          ]
        },
      },
    };

    const { graph, warnings } = documentToGSchema(doc, "5.5.1");
    const pUid = Object.keys(graph.toData().nodes).find(k => graph.node(k)?.xref === "@I1@")!;
    const birthPlace = graph.getPreferred(pUid, PersonPredicates.EVENT_BIRTH_PLACE);
    const deathPlace = graph.getPreferred(pUid, PersonPredicates.EVENT_DEATH_PLACE);

    expect(birthPlace).toBeTruthy();
    expect((birthPlace?.value as any).parts).toEqual(["Parroquia de San Antón", "Madrid", "España"]);

    expect(deathPlace).toBeTruthy();
    expect((deathPlace?.value as any).parts).toBeUndefined(); // Flat place
    expect(warnings.some(w => w.code === "GED_PLACE_FLAT")).toBe(true);
  });

  it("exports informal union date/place from typed raw values with optional mirror note", () => {
    const graph = GSchemaGraph.create();
    const unionUid = uid();
    graph.addUnionNode({ uid: unionUid, type: "Union", unionType: "MARR", xref: "@F1@" });
    graph.addClaim({
      uid: uid(),
      nodeUid: unionUid,
      predicate: UnionPredicates.EVENT_MARRIAGE_DATE,
      value: { raw: "durante la primavera", isInformal: true },
      provenance: { actorId: "test", timestamp: 0, method: "test" },
      quality: "raw",
      lifecycle: "active",
      evidenceGate: "unassessed",
      isPreferred: true,
      createdAt: new Date().toISOString()
    });
    graph.addClaim({
      uid: uid(),
      nodeUid: unionUid,
      predicate: UnionPredicates.EVENT_MARRIAGE_PLACE,
      value: { placeRaw: "Rancho Los Olivos" },
      provenance: { actorId: "test", timestamp: 0, method: "test" },
      quality: "raw",
      lifecycle: "active",
      evidenceGate: "unassessed",
      isPreferred: true,
      createdAt: new Date().toISOString()
    });

    const projected = gschemaToDocument(graph, "7.0.x");
    const fam = projected.families["@F1@"];
    expect(fam).toBeTruthy();
    const marriage = fam.events.find((event) => event.type === "MARR");
    expect(marriage?.date).toBe("durante la primavera");
    expect(marriage?.place).toBe("Rancho Los Olivos");
    expect(marriage?.notesInline).toContain("GSK_RAW_DATE durante la primavera");
  });
});
