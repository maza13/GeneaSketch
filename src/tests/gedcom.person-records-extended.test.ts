import { describe, expect, it } from "vitest";
import { parseGedcomAnyVersion } from "@/core/gedcom/parser";
import { serializeGedcom } from "@/core/gedcom/serializer";

const GED_EXTENDED = `0 HEAD
1 GEDC
2 VERS 7.0.3
1 CHAR UTF-8
1 SCHMA
2 URI https://example.com/schema.ged
0 @S1@ SOUR
1 TITL Registro civil
1 TEXT Libro 2
0 @N1@ NOTE Nota compartida
1 CONT segunda linea
0 @I1@ INDI
1 NAME Juan /Perez/
2 GIVN Juan
2 SURN Perez
1 SEX M
1 SOUR @S1@
2 PAGE f.10
1 NOTE @N1@
1 NOTE nota inline
1 CHAN
2 DATE 1 JAN 2026
2 TIME 12:30:00
1 BIRT
2 DATE BET 1980 AND 1981
2 PLAC Puebla
2 ADDR Centro
2 SOUR @S1@
2 NOTE evidencia evento
2 OBJE @M1@
0 @M1@ OBJE
1 FILE foto.jpg
0 TRLR`;

describe("gedcom extended person records", () => {
  it("parses INDI with event-level structures and CHAN", () => {
    const parsed = parseGedcomAnyVersion(GED_EXTENDED);
    expect(parsed.errors).toHaveLength(0);
    const person = parsed.document!.persons["@I1@"];
    expect(person.sourceRefs[0]?.id).toBe("@S1@");
    expect(person.noteRefs?.includes("@N1@")).toBe(true);
    expect(person.change?.date).toBe("1 JAN 2026");
    const birth = person.events.find((event) => event.type === "BIRT");
    expect(birth?.addr).toBe("Centro");
    expect(birth?.sourceRefs?.[0]?.id).toBe("@S1@");
    expect(birth?.mediaRefs?.[0]).toBe("@M1@");
  });

  it("serializes and reparses keeping core structures", () => {
    const parsed = parseGedcomAnyVersion(GED_EXTENDED);
    const serialized = serializeGedcom(parsed.document!);
    const reparsed = parseGedcomAnyVersion(serialized);
    expect(reparsed.errors).toHaveLength(0);
    expect(reparsed.document?.metadata.schemaUris?.length).toBeGreaterThan(0);
    const person = reparsed.document!.persons["@I1@"];
    expect(person.events.some((event) => event.type === "BIRT")).toBe(true);
    expect(person.sourceRefs.some((ref) => ref.id === "@S1@")).toBe(true);
  });
});

