import { describe, expect, it } from "vitest";
import { buildSearchResults } from "@/ui/search/searchEngine";
import { parseSemanticQuery } from "@/ui/search/searchQueryParser";
import type { GeneaDocument } from "@/types/domain";

function buildDoc(): GeneaDocument {
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
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I2@": {
        id: "@I2@",
        name: "Ana",
        surname: "Nunez",
        sex: "F",
        lifeStatus: "deceased",
        events: [],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I3@": {
        id: "@I3@",
        name: "Alex",
        sex: "U",
        lifeStatus: "alive",
        events: [],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {},
    media: {},
    metadata: {
      sourceFormat: "GED",
      gedVersion: "5.5.1"
    }
  };
}

describe("search center filters and parser", () => {
  it("parses inline filters from natural query", () => {
    const parsed = parseSemanticQuery("vivos con apellido");
    expect(parsed.mode).toBe("free");
    expect(parsed.target).toBe("");
    expect(parsed.filters.lifeStatus).toBe("alive");
    expect(parsed.filters.surname).toBe("with");
  });

  it("applies UI filters over full list", () => {
    const doc = buildDoc();
    const rows = buildSearchResults(doc, "", "id", "asc", {
      sex: "F",
      lifeStatus: "deceased",
      surname: "with"
    });
    expect(rows.map((row) => row.personId)).toEqual(["@I2@"]);
  });

  it("combines relational/free query with filters", () => {
    const doc = buildDoc();
    const rows = buildSearchResults(doc, "nunez", "id", "asc", {
      sex: "M",
      lifeStatus: "any",
      surname: "any"
    });
    expect(rows.map((row) => row.personId)).toEqual(["@I1@"]);
  });
});

