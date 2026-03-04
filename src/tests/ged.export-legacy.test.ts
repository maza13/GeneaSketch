import { describe, expect, it } from "vitest";
import { serializeGedcom } from "@/core/gedcom/serializer";
import { FileIOService } from "@/io/fileIOService";
import type { GeneaDocument } from "@/types/domain";

function sampleDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Legacy",
        surname: "Tester",
        sex: "M",
        lifeStatus: "deceased",
        events: [{ type: "OTHER", date: "ABT 1900" }],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {},
    media: {},
    metadata: {
      sourceFormat: "GSK",
      gedVersion: "7.0.x",
      importProvenance: [
        {
          fileName: "source.gsk",
          sourceFormat: "GSK",
          sourceGedVersion: "7.0.x",
          importedAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    }
  };
}

describe("ged legacy export", () => {
  it("serializes with GED 5.5.1 header when requested", () => {
    const ged = serializeGedcom(sampleDoc(), { version: "5.5.1" });
    expect(ged).toContain("2 VERS 5.5.1");
  });

  it("returns warnings for lossy legacy export", async () => {
    const result = await FileIOService.exportGed(sampleDoc(), { version: "5.5.1" });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.code === "GED_EVENT_OTHER_DROPPED")).toBe(true);
    expect(result.warnings.some((w) => w.code === "GED_DEAT_IMPLICIT")).toBe(true);
  });
});

