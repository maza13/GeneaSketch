import { parseGedcomAnyVersion, parseGedzipAnyVersion } from "@/core/gedcom/parser";
import { serializeGedcom, serializeGedzip } from "@/core/gedcom/serializer";
import type { GedExportVersion, GedExportWarning, GedParseError, GeneaDocument, ImportWarning, SourceGedVersion } from "@/types/domain";
import type { GskMetadata } from "@/core/gskFormat";

export type ImportResult = {
  document: GeneaDocument | null;
  errors: GedParseError[];
  warnings: ImportWarning[];
  sourceVersion?: SourceGedVersion;
  gskMeta?: GskMetadata | null;
};

export type GedExportResult = {
  blob: Blob;
  warnings: GedExportWarning[];
};

export class FileIOService {
  static async importGedAnyVersion(file: File): Promise<ImportResult> {
    const raw = await file.text();
    return parseGedcomAnyVersion(raw);
  }

  static async importZippedGeneaAnyVersion(file: File | Blob | ArrayBuffer | Uint8Array, sourceExt: "gdz" | "gsz"): Promise<ImportResult> {
    // Both .gdz and .gsz use zip+gedcom; metadata format differs by extension.
    return parseGedzipAnyVersion(file, sourceExt);
  }

  static async importGdzAnyVersion(file: File | Blob | ArrayBuffer | Uint8Array): Promise<ImportResult> {
    // Legacy alias kept to avoid breaking callers.
    return FileIOService.importZippedGeneaAnyVersion(file, "gdz");
  }

  static async exportGed(doc: GeneaDocument, options?: { version?: GedExportVersion }): Promise<GedExportResult> {
    const warnings: GedExportWarning[] = [];
    const serialized = serializeGedcom(doc, {
      version: options?.version ?? "7.0.3",
      legacyPolicy: "safe",
      warnings: { push: (w) => warnings.push(w) }
    });
    return {
      blob: new Blob([serialized], { type: "text/plain;charset=utf-8" }),
      warnings
    };
  }

  static async exportGsz(doc: GeneaDocument, mediaPolicy: "embed" | "reference", gskMeta?: GskMetadata): Promise<Blob> {
    // .gsz (GeneaSketch Zip) is our native v0.1 format
    return serializeGedzip(doc, mediaPolicy, gskMeta);
  }
}
