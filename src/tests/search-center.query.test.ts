import { describe, expect, it } from "vitest";
import { buildSearchResults } from "@/ui/search/searchEngine";
import { parseSemanticQuery } from "@/ui/search/searchQueryParser";
import type { GeneaDocument } from "@/types/domain";

function buildRelationalDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Juan",
        surname: "Nunez",
        sex: "M",
        lifeStatus: "alive",
        events: [],
        famc: [],
        fams: ["@F1@"],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I2@": {
        id: "@I2@",
        name: "Johana",
        surname: "Torres",
        sex: "F",
        lifeStatus: "alive",
        events: [],
        famc: [],
        fams: ["@F1@"],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I3@": {
        id: "@I3@",
        name: "Ana",
        surname: "Nunez",
        sex: "F",
        lifeStatus: "alive",
        events: [],
        famc: ["@F1@"],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I4@": {
        id: "@I4@",
        name: "Luis",
        surname: "Martinez",
        sex: "M",
        lifeStatus: "alive",
        events: [],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {
      "@F1@": {
        id: "@F1@",
        husbandId: "@I1@",
        wifeId: "@I2@",
        childrenIds: ["@I3@"],
        events: []
      }
    },
    media: {},
    metadata: {
      sourceFormat: "GED",
      gedVersion: "5.5.1"
    }
  };
}

describe("search center query modes", () => {
  it("parses relational query modes", () => {
    expect(parseSemanticQuery("hijos de juan").mode).toBe("children_of");
    expect(parseSemanticQuery("padres de ana").mode).toBe("parents_of");
    expect(parseSemanticQuery("pareja de juan").mode).toBe("spouse_of");
  });

  it("finds children with relational query", () => {
    const rows = buildSearchResults(buildRelationalDoc(), "hijos de juan", "id", "asc");
    expect(rows.map((row) => row.personId)).toEqual(["@I3@"]);
  });

  it("finds parents with relational query", () => {
    const rows = buildSearchResults(buildRelationalDoc(), "padres de ana", "id", "asc");
    expect(rows.map((row) => row.personId)).toEqual(["@I1@", "@I2@"]);
  });

  it("finds spouse with relational query", () => {
    const rows = buildSearchResults(buildRelationalDoc(), "pareja de juan", "id", "asc");
    expect(rows.map((row) => row.personId)).toEqual(["@I2@"]);
  });

  it("finds people in free query by surname/name/id (accent-insensitive)", () => {
    const doc = buildRelationalDoc();
    const bySurname = buildSearchResults(doc, "nunez", "id", "asc").map((row) => row.personId);
    const byId = buildSearchResults(doc, "@i4@", "id", "asc").map((row) => row.personId);

    expect(bySurname).toEqual(["@I1@", "@I3@"]);
    expect(byId).toEqual(["@I4@"]);
  });
});
