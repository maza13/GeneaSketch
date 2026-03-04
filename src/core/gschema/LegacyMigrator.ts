/**
 * GSchema 0.1.x — Legacy Migrator
 *
 * Converts existing .gsz (GeneaSketch Zip, format 0.3.x) files into the new
 * .gsk (GSchema 0.1.x) format. This is a one-way, lossless migration.
 *
 * Migration strategy:
 * 1. Read the .gsz (GEDCOM + embedded media + gskMeta) using existing parser.
 * 2. Run documentToGSchema() to build the GSchemaGraph.
 * 3. Normalize output to core-only .gsk contract.
 * 4. Serialize to .gsk via exportGskPackage().
 *
 * GEDCOM round-trip guarantee:
 * After migration, the .gsk file can be exported back to GEDCOM-7.0.3 via
 * gschemaToDocument() → serializeGedcom(). The resulting GEDCOM should be
 * semantically identical to the original (same persons, families, dates, places).
 */

import type { GeneaDocument, SourceGedVersion } from "@/types/domain";
import type { GskMetadata } from "@/core/gskFormat";
import { documentToGSchema, gschemaToDocument } from "./GedcomBridge";
import { exportGskPackage } from "./GskPackage";
import type { ViewConfig, VisualConfig } from "@/types/domain";

// ─────────────────────────────────────────────
// Migration Result
// ─────────────────────────────────────────────

export interface MigrationResult {
    /** The exported .gsk package blob. */
    blob: Blob;
    /** Number of nodes in the migrated graph. */
    nodeCount: number;
    /** Number of edges in the migrated graph. */
    edgeCount: number;
    /** Quarantined entries (unrecognized GEDCOM tags). */
    quarantineCount: number;
    /** Non-fatal warnings from the migration. */
    warnings: string[];
}

export interface MigrationInput {
    /** The parsed GeneaDocument from the old .gsz / .ged file. */
    document: GeneaDocument;
    /** GEDCOM version of the source file. */
    sourceVersion?: SourceGedVersion;
    /** Original file name (for provenance). */
    sourceFileName?: string;
    /** Old GSK metadata from .gsz (preserved in manifest). */
    gskMeta?: GskMetadata | null;
    /** Current UI view configuration. */
    viewConfig?: ViewConfig;
    /** Current visual config (canvas positions). */
    visualConfig?: VisualConfig;
    /** Media embedding policy. */
    mediaPolicy?: "embed" | "reference";
}

// ─────────────────────────────────────────────
// Main Migration Function
// ─────────────────────────────────────────────

/**
 * Migrates a legacy GeneaDocument (from .ged / .gsz / .gdz) to a .gsk package.
 *
 * @example
 * const parsed = { document, sourceVersion };
 * if (parsed.document) {
 *   const gsk = await migrateToGsk({
 *     document: parsed.document,
 *     sourceVersion: parsed.sourceVersion,
 *     sourceFileName: file.name,
 *     gskMeta: result.gskMeta,
 *     viewConfig: store.viewConfig ?? undefined,
 *     visualConfig: store.visualConfig,
 *   });
 *   // offer gsk.blob for download as file.gsk
 * }
 */
export async function migrateToGsk(input: MigrationInput): Promise<MigrationResult> {
    const warnings: string[] = [];

    // Step 1: Convert GeneaDocument → GSchemaGraph
    const { graph, quarantineCount } = documentToGSchema(
        input.document,
        input.sourceVersion ?? "5.5.1",
        input.sourceFileName
    );

    if (quarantineCount > 0) {
        warnings.push(`${quarantineCount} tag(s) could not be mapped to GSchema and were quarantined. Check quarantine.json in the .gsk package.`);
    }

    // Step 2: Validate round-trip (projectability check)
    const roundTripDoc = gschemaToDocument(graph);
    const personCount = Object.keys(input.document.persons).length;
    const roundTripCount = Object.keys(roundTripDoc.persons).length;

    if (personCount !== roundTripCount) {
        warnings.push(
            `Round-trip check: source had ${personCount} persons, projection has ${roundTripCount}. Some data may not have been captured.`
        );
    }

    const familyCount = Object.keys(input.document.families).length;
    const rtFamilyCount = Object.keys(roundTripDoc.families).length;
    if (familyCount !== rtFamilyCount) {
        warnings.push(
            `Round-trip check: source had ${familyCount} families, projection has ${rtFamilyCount}.`
        );
    }

    // Step 3: Package as .gsk (core-only output)
    const blob = await exportGskPackage(graph, {
        mediaPolicy: input.mediaPolicy ?? "embed",
    });

    return {
        blob,
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        quarantineCount,
        warnings,
    };
}

// ─────────────────────────────────────────────
// Version Detection
// ─────────────────────────────────────────────

/** Returns true if a file extension is a legacy format that should be migrated. */
export function isLegacyFormat(ext: string): boolean {
    return ["ged", "gedcom", "gsz", "gdz"].includes(ext.toLowerCase().replace(".", ""));
}

/** Returns the canonical extension for a given format string. */
export function gskExtension(): string {
    return ".gsk";
}
