import { describe, expect, it } from "vitest";
import { parseGedcomAnyVersion } from "@/core/gedcom/parser";
import { serializeGedcom } from "@/core/gedcom/serializer";
import { documentToGSchema, gschemaToDocument } from "@/core/gschema/GedcomBridge";
import { expandGraph } from "@/core/graph/expand";
import type { ViewConfig } from "@/types/domain";

const SAMPLE_GED = `0 HEAD
1 GEDC
2 VERS 7.0.3
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME Jane /Doe/
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Baby /Doe/
1 SEX U
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 DIV
2 DATE 1 JAN 2020
0 TRLR`;

describe("GED parser + serializer", () => {
  it("parses valid GED 7.0.x", () => {
    const parsed = parseGedcomAnyVersion(SAMPLE_GED);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.document).not.toBeNull();
    expect(Object.keys(parsed.document!.persons)).toHaveLength(3);
    expect(parsed.document!.persons["@I1@"].lifeStatus).toBe("alive");
    expect(parsed.document!.persons["@I1@"].sex).toBe("M");
  });

  it("serializes and parses back", () => {
    const parsed = parseGedcomAnyVersion(SAMPLE_GED);
    const serialized = serializeGedcom(parsed.document!);
    const reparsed = parseGedcomAnyVersion(serialized);
    expect(reparsed.errors).toHaveLength(0);
    expect(Object.keys(reparsed.document!.families)).toHaveLength(1);
    expect(reparsed.document!.families["@F1@"].events.some((event) => event.type === "DIV")).toBe(true);
  });

  it("expands ancestors and descendants", () => {
    const parsed = parseGedcomAnyVersion(SAMPLE_GED);
    const config: ViewConfig = {
      mode: "tree",
      preset: "all_direct_ancestors",
      focusPersonId: "@I1@",
      focusFamilyId: null,
      homePersonId: "@I1@",
      rightPanelView: "details",
      timeline: {
        scope: "visible",
        view: "list",
        scaleZoom: 1,
        scaleOffset: 0
      },
      depth: {
        ancestors: 4,
        descendants: 2,
        unclesGreatUncles: 0,
        siblingsNephews: 0,
        unclesCousins: 0
      },
      showSpouses: true
    };
    const graph = expandGraph(parsed.document!, config);
    expect(graph.nodes.length).toBeGreaterThanOrEqual(3);
    expect(graph.edges.some((e) => e.type === "spouse")).toBe(true);
    expect(graph.edges.some((e) => e.type === "child")).toBe(true);
  });

  it("imports GED 5.5.1 with conversion warnings model", () => {
    const ged551 = SAMPLE_GED.replace("7.0.3", "5.5.1");
    const parsed = parseGedcomAnyVersion(ged551);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.document).not.toBeNull();
    expect(parsed.sourceVersion).toBe("5.5.1");
  });

  it("parses FAMC with PEDI into famcLinks", () => {
    const ged = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Child /Adopted/
1 SEX U
1 FAMC @F1@
2 PEDI ADOPTED
0 @I2@ INDI
1 NAME Father /Bio/
1 SEX M
1 FAMS @F1@
0 @I3@ INDI
1 NAME Mother /Bio/
1 SEX F
1 FAMS @F1@
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 CHIL @I1@
0 TRLR`;
    const parsed = parseGedcomAnyVersion(ged);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.document?.persons["@I1@"].famcLinks?.[0]?.familyId).toBe("@F1@");
    expect(parsed.document?.persons["@I1@"].famcLinks?.[0]?.pedi).toBe("ADOPTED");
  });

  it("coerces unknown PEDI value to UNKNOWN with warning", () => {
    const ged = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Child /X/
1 SEX U
1 FAMC @F1@
2 PEDI MYSTERY
0 @I2@ INDI
1 NAME Father /Bio/
1 SEX M
1 FAMS @F1@
0 @I3@ INDI
1 NAME Mother /Bio/
1 SEX F
1 FAMS @F1@
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 CHIL @I1@
0 TRLR`;
    const parsed = parseGedcomAnyVersion(ged);
    expect(parsed.document?.persons["@I1@"].famcLinks?.[0]?.pedi).toBe("UNKNOWN");
    expect(parsed.warnings.some((w) => w.code === "PEDI_UNKNOWN_VALUE_COERCED")).toBe(true);
  });

  it("serializes structured FAMC PEDI/QUAY from famcLinks", () => {
    const parsed = parseGedcomAnyVersion(SAMPLE_GED);
    const doc = parsed.document!;
    doc.persons["@I3@"].famcLinks = [{ familyId: "@F1@", pedi: "ADOPTED", quality: "1" }];

    const warnings: Array<{ code: string; message: string }> = [];
    const ged = serializeGedcom(doc, {
      warnings: { push: (warning) => warnings.push({ code: warning.code, message: warning.message }) }
    });
    expect(ged).toContain("1 FAMC @F1@");
    expect(ged).toContain("2 PEDI ADOPTED");
    expect(ged).toContain("2 QUAY 1");
    expect(warnings.some((w) => w.code === "GED_PEDI_STRUCT_DROPPED")).toBe(false);
  });

  it("maps PEDI/QUAY to ParentChild nature/certainty in GSchema bridge", () => {
    const ged = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Child /Adopted/
1 SEX U
1 FAMC @F1@
2 PEDI ADOPTED
2 QUAY 1
0 @I2@ INDI
1 NAME Father /Bio/
1 SEX M
1 FAMS @F1@
0 @I3@ INDI
1 NAME Mother /Bio/
1 SEX F
1 FAMS @F1@
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 CHIL @I1@
0 TRLR`;
    const parsed = parseGedcomAnyVersion(ged);
    const { graph } = documentToGSchema(parsed.document!, "5.5.1");
    const pc = graph.allEdges().find((edge) => edge.type === "ParentChild");
    expect(pc?.type).toBe("ParentChild");
    if (pc?.type !== "ParentChild") throw new Error("Missing ParentChild");
    expect(pc.nature).toBe("ADO");
    expect(pc.certainty).toBe("low");
  });

  it("defaults to UNK when PEDI is absent under conservative policy", () => {
    const parsed = parseGedcomAnyVersion(SAMPLE_GED);
    const { graph } = documentToGSchema(parsed.document!, "7.0.x");
    const pc = graph.allEdges().find((edge) => edge.type === "ParentChild");
    expect(pc?.type).toBe("ParentChild");
    if (pc?.type !== "ParentChild") throw new Error("Missing ParentChild");
    expect(pc.nature).toBe("UNK");
  });

  it("roundtrips ParentChild UNKNOWN/uncertain into PEDI/QUAY", () => {
    const parsed = parseGedcomAnyVersion(SAMPLE_GED);
    const { graph } = documentToGSchema(parsed.document!, "7.0.x");
    const pces = graph.allEdges().filter((edge) => edge.type === "ParentChild");
    for (const edge of pces) {
      edge.nature = "UNK";
      edge.certainty = "uncertain";
    }
    const projected = gschemaToDocument(graph, "5.5.1");
    const ged = serializeGedcom(projected, { version: "5.5.1" });
    expect(ged).toContain("2 PEDI UNKNOWN");
    expect(ged).toContain("2 QUAY 0");
  });

  it("degrades STE to PEDI UNKNOWN with explicit warning", () => {
    const parsed = parseGedcomAnyVersion(SAMPLE_GED);
    const { graph } = documentToGSchema(parsed.document!, "7.0.x");
    const pces = graph.allEdges().filter((edge) => edge.type === "ParentChild");
    for (const edge of pces) {
      edge.nature = "STE";
      edge.certainty = "medium";
    }
    const projected = gschemaToDocument(graph, "5.5.1");
    const warnings: Array<{ code: string; message: string }> = [];
    const ged = serializeGedcom(projected, {
      version: "5.5.1",
      warnings: { push: (warning) => warnings.push({ code: warning.code, message: warning.message }) }
    });
    expect(ged).toContain("2 PEDI UNKNOWN");
    expect(ged).toContain("2 QUAY 2");
    expect(warnings.some((w) => w.code === "PEDI_STE_DEGRADED_TO_UNKNOWN")).toBe(true);
  });

});
