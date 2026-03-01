import { describe, expect, it } from "vitest";
import { buildSearchResults } from "@/ui/search/searchEngine";
import type { GeneaDocument } from "@/types/domain";

function buildSearchDoc(): GeneaDocument {
  return {
    persons: {
      "@I10@": {
        id: "@I10@",
        name: "Ana",
        surname: "Martinez",
        sex: "F",
        lifeStatus: "alive",
        events: [],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I2@": {
        id: "@I2@",
        name: "juan",
        surname: "Nunez",
        sex: "M",
        lifeStatus: "alive",
        events: [],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I3@": {
        id: "@I3@",
        name: "Álvaro",
        surname: "Méndez",
        sex: "M",
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

describe("search center sorting", () => {
  it("returns all people when query is empty", () => {
    const rows = buildSearchResults(buildSearchDoc(), "", "id", "asc");
    expect(rows).toHaveLength(3);
  });

  it("sorts by id asc/desc", () => {
    const doc = buildSearchDoc();
    const asc = buildSearchResults(doc, "", "id", "asc").map((row) => row.personId);
    const desc = buildSearchResults(doc, "", "id", "desc").map((row) => row.personId);

    expect(asc).toEqual(["@I10@", "@I2@", "@I3@"]);
    expect(desc).toEqual(["@I3@", "@I2@", "@I10@"]);
  });

  it("sorts by normalized name and surname", () => {
    const doc = buildSearchDoc();

    const byNameAsc = buildSearchResults(doc, "", "name", "asc").map((row) => row.personId);
    const bySurnameAsc = buildSearchResults(doc, "", "surname", "asc").map((row) => row.personId);

    expect(byNameAsc).toEqual(["@I3@", "@I10@", "@I2@"]);
    expect(bySurnameAsc).toEqual(["@I10@", "@I3@", "@I2@"]);
  });
});
