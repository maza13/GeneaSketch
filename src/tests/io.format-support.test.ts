import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { FileIOService } from "@/io/fileIOService";

const SAMPLE_GED = `0 HEAD
1 GEDC
2 VERS 7.0.3
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
0 TRLR
`;

async function makeZipPayload(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("data.ged", SAMPLE_GED);
  return zip.generateAsync({ type: "uint8array" });
}

describe("io format support", () => {
  it("imports .gdz as GDZ source format", async () => {
    const bytes = await makeZipPayload();
    const result = await FileIOService.importZippedGeneaAnyVersion(bytes, "gdz");
    expect(result.errors).toHaveLength(0);
    expect(result.document?.metadata.sourceFormat).toBe("GDZ");
  });

  it("imports .gsz as GSZ source format", async () => {
    const bytes = await makeZipPayload();
    const result = await FileIOService.importZippedGeneaAnyVersion(bytes, "gsz");
    expect(result.errors).toHaveLength(0);
    expect(result.document?.metadata.sourceFormat).toBe("GSZ");
  });
});
