import { parseGedcomAnyVersion } from "@/core/gedcom/parser";
import { serializeGedcom } from "@/core/gedcom/serializer";
import type { GedExportVersion, GedExportWarning, GedParseError, GeneaDocument, ImportWarning, SourceGedVersion } from "@/types/domain";
import type { GskImportResult, GskExportOptions } from "@/core/gschema/GskPackage";

export type { GskImportResult } from "@/core/gschema/GskPackage";

export type ImportResult = {
  document: GeneaDocument | null;
  errors: GedParseError[];
  warnings: ImportWarning[];
  sourceVersion?: SourceGedVersion;
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

  /**
   * Import a .gsk package.
   */
  static async importGsk(file: File | Blob | ArrayBuffer | Uint8Array): Promise<GskImportResult> {
    const { importGskPackage } = await import("@/core/gschema/GskPackage");
    return importGskPackage(file, { strict: true });
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

  /**
   * Export a GSchemaGraph as a .gsk package.
   * For schema >= 0.5.0, app metadata in options.meta is ignored (core-only export).
   */
  static async exportGsk(
    graph: import("@/core/gschema/GSchemaGraph").GSchemaGraph,
    options?: GskExportOptions
  ): Promise<Blob> {
    const { exportGskPackage } = await import("@/core/gschema/GskPackage");
    return exportGskPackage(graph, options);
  }
}
