import { describe, expect, it } from "vitest";
import { EVENT_FIELD_META, EVENT_TYPE_META, getEventTypeMeta } from "@/ui/person/personDetailUtils";

describe("person events friendly labels", () => {
  it("provides human labels for event types with GEDCOM tags", () => {
    expect(getEventTypeMeta("BIRT").labelHuman).toBe("Nacimiento");
    expect(getEventTypeMeta("DEAT").labelHuman).toBe("Defunción");
    expect(getEventTypeMeta("RESI").labelHuman).toBe("Residencia");
    expect(EVENT_TYPE_META.BIRT.type).toBe("BIRT");
  });

  it("defines human labels and GEDCOM tags for fields", () => {
    expect(EVENT_FIELD_META.date.labelHuman).toBe("Fecha");
    expect(EVENT_FIELD_META.date.gedcomTag).toBe("DATE");
    expect(EVENT_FIELD_META.place.gedcomTag).toBe("PLAC");
    expect(EVENT_FIELD_META.sourceRefs.gedcomTag).toBe("SOUR");
  });
});
