import { describe, expect, it } from "vitest";
import { parseGedcomAnyVersion } from "@/core/gedcom/parser";
import { serializeGedcom } from "@/core/gedcom/serializer";

const GED_SOURCE_NOTE = `0 HEAD
1 GEDC
2 VERS 7.0.3
1 CHAR UTF-8
0 @S1@ SOUR
1 TITL Parish book
1 TEXT p.44
0 @N1@ NOTE Shared note
1 CONT detail
0 @I1@ INDI
1 NAME Ana /Lopez/
1 SEX F
1 SOUR @S1@
1 NOTE @N1@
0 TRLR`;

describe("gedcom source and note records", () => {
  it("parses top-level SOUR and NOTE records", () => {
    const parsed = parseGedcomAnyVersion(GED_SOURCE_NOTE);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.document?.sources?.["@S1@"]?.title).toBe("Parish book");
    expect(parsed.document?.notes?.["@N1@"]?.text.includes("Shared note")).toBe(true);
    expect(parsed.document?.persons["@I1@"].noteRefs?.includes("@N1@")).toBe(true);
  });

  it("serializes sources and notes records", () => {
    const parsed = parseGedcomAnyVersion(GED_SOURCE_NOTE);
    const serialized = serializeGedcom(parsed.document!);
    expect(serialized.includes("0 @S1@ SOUR")).toBe(true);
    expect(serialized.includes("0 @N1@ NOTE")).toBe(true);
  });
});

