import { describe, expect, it } from "vitest";
import { tryFastTrack } from "@/core/ai/fastTrack";
import type { AiInputContext } from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

function doc(): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Juan",
        surname: "Perez",
        sex: "M",
        lifeStatus: "alive",
        events: [],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: [],
      },
    },
    families: {},
    media: {},
    metadata: { sourceFormat: "GSK", gedVersion: "7.0.x" },
  };
}

const context: AiInputContext = { kind: "local", anchorPersonId: "@I1@" };

describe("ai fastTrack encoding", () => {
  it("matches accented and plain birth place phrases", () => {
    const accented = tryFastTrack("nació en Puebla", context, doc());
    const plain = tryFastTrack("nacio en Puebla", context, doc());
    const present = tryFastTrack("nace en Puebla", context, doc());

    expect(accented?.items[0].action.patch.birthPlace).toBe("puebla");
    expect(plain?.items[0].action.patch.birthPlace).toBe("puebla");
    expect(present?.items[0].action.patch.birthPlace).toBe("puebla");
    expect(accented?.items[0].description).toContain("Detección automática");
  });

  it("matches accented and plain birth date phrases", () => {
    const yearOnly = tryFastTrack("nació el 1990", context, doc());
    const fullDate = tryFastTrack("nació el 3 de mayo de 1990", context, doc());

    expect(yearOnly?.items[0].action.patch.birthDate).toBe("1990");
    expect(fullDate?.items[0].action.patch.birthDate).toBe("3 de mayo de 1990");
  });

  it("matches accented and plain death phrases", () => {
    const diedPlace = tryFastTrack("murió en Puebla", context, doc());
    const diedDate = tryFastTrack("falleció el 2001", context, doc());
    const plainDate = tryFastTrack("fallecio el 2001", context, doc());

    expect(diedPlace?.items[0].action.patch.deathPlace).toBe("puebla");
    expect(diedPlace?.items[0].action.patch.lifeStatus).toBe("deceased");
    expect(diedDate?.items[0].title).toContain("defunción");
    expect(diedDate?.items[0].action.patch.deathDate).toBe("2001");
    expect(plainDate?.items[0].action.patch.deathDate).toBe("2001");
  });

  it("matches accented and plain masculine phrases", () => {
    const accented = tryFastTrack("es varón", context, doc());
    const plain = tryFastTrack("es varon", context, doc());
    const masculine = tryFastTrack("es hombre", context, doc());

    expect(accented?.items[0].action.patch.sex).toBe("M");
    expect(plain?.items[0].action.patch.sex).toBe("M");
    expect(masculine?.items[0].action.patch.sex).toBe("M");
  });

  it("matches feminine phrase", () => {
    const result = tryFastTrack("es mujer", context, doc());
    expect(result?.items[0].action.patch.sex).toBe("F");
  });
});
