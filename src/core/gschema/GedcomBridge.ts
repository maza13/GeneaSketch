/**
 * GSchema 0.1.x — GedcomBridge
 *
 * Bidirectional conversion between a `GeneaDocument` (the current internal
 * format, produced by the existing GEDCOM parser) and a `GSchemaGraph`.
 *
 * Architecture decision: Rather than rewriting the GEDCOM parser, we reuse
 * the battle-tested `parseGedcomAnyVersion` and `serializeGedcom` functions,
 * and convert at the `GeneaDocument` level. This means:
 *
 *   IMPORT: File → parser.ts → GeneaDocument → GedcomBridge → GSchemaGraph
 *   EXPORT: GSchemaGraph → GedcomBridge → GeneaDocument → serializer.ts → File
 *
 * This design is:
 * 1. Safe: the parser/serializer are unchanged.
 * 2. Incremental: the bridge can be improved without touching I/O.
 * 3. Verifiable: round-trip test = import → export and diff the GeneaDocument.
 */

import type {
    GeneaDocument,
    Person,
    Family,
    Event as GeneaEvent,
    SourceRef,
    SourceRecord,
    NoteRecord,
    Media,
    SourceGedVersion,
    GedExportVersion,
    ImportWarning,
} from "@/types/domain";
import { inferCanonicalSurnameFields, normalizePersonSurnames } from "@/core/naming/surname";
import { ERROR_CODES } from "./errorCatalog";
import { GSchemaGraph } from "./GSchemaGraph";
import { ensureParentChildUnionLinks } from "./FamilyNormalization";
import type {
    PersonNode,
    UnionNode,
    SourceNode,
    NoteNode,
    MediaNode,
    ParentChildEdge,
    MemberEdge,
    GClaim,
    ClaimCitation,
    ParsedDate,
    GeoRef,
    QuarantineAstNode,
} from "./types";
import {
    PersonPredicates,
    UnionPredicates,
    gedcomTagToPredicate,
} from "./predicates";

// ─────────────────────────────────────────────
// UID helpers
// ─────────────────────────────────────────────

function uid(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function nowIso(): string { return new Date().toISOString(); }
function nowSec(): number { return Math.floor(Date.now() / 1000); }
function normalizeDisplayName(raw: string | undefined): string {
    if (!raw) return "";
    return raw.replaceAll("/", " ").replace(/\s+/g, " ").trim();
}
function safeJsonParse<T>(raw: string | undefined): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

function buildQuarantineAst(tag: string, values: string[]): QuarantineAstNode {
    const root: QuarantineAstNode = { level: 1, tag, children: [] };
    const first = values[0]?.trim();
    const startIndex = first && !/^\d+\s+/.test(first) ? 1 : 0;
    if (startIndex === 1) root.value = first;
    const stack: QuarantineAstNode[] = [root];

    for (let i = startIndex; i < values.length; i++) {
        const raw = values[i]?.trim();
        if (!raw) continue;
        const match = raw.match(/^(\d+)\s+([A-Z0-9_]+)(?:\s+(.*))?$/);
        if (!match) {
            root.sourceLines = [...(root.sourceLines ?? []), raw];
            continue;
        }
        const level = Number(match[1]);
        const node: QuarantineAstNode = {
            level,
            tag: match[2],
            value: match[3],
            children: [],
        };
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }
        const parent = stack[stack.length - 1] ?? root;
        parent.children.push(node);
        stack.push(node);
    }

    return root;
}


function collectNonPreferredClaimMarkers(graph: GSchemaGraph, nodeUid: string): string[] {
    const byPredicate = graph.toData().claims[nodeUid] ?? {};
    const markers: string[] = [];
    for (const [predicate, claims] of Object.entries(byPredicate)) {
        for (const claim of claims) {
            if (claim.lifecycle === "retracted" || claim.isPreferred) continue;
            // GSK_CONFLICT|v1|<predicate>|<json_payload>
            markers.push(`GSK_CONFLICT|v1|${predicate}|${JSON.stringify(claim)}`);
        }
    }
    return markers;
}

/**
 * Decodes a GSK_CONFLICT|v1 marker and adds it to the graph.
 * Returns true if the marker was successfully handled.
 */
function decodeConflictMarker(graph: GSchemaGraph, nodeUid: string, raw: string): boolean {
    if (!raw.startsWith("GSK_CONFLICT|v1|")) return false;
    const parts = raw.split("|");
    if (parts.length < 4) return false;
    const predicate = parts[2];
    const json = parts.slice(3).join("|"); // Rejoin in case JSON contains pipes
    try {
        const claimData = JSON.parse(json);
        // Ensure the claim is NOT preferred when imported as a conflict
        const c = { ...claimData, nodeUid, predicate, isPreferred: false };
        graph.addClaim(c);
        return true;
    } catch {
        return false;
    }
}

function claim<T>(
    nodeUid: string,
    predicate: string,
    value: T,
    method: string,
    isPreferred = true
): GClaim<T> {
    return {
        uid: uid(),
        nodeUid,
        predicate,
        value,
        provenance: {
            actorId: "system_importer",
            timestamp: nowSec(),
            method,
        },
        quality: "raw",
        lifecycle: "active",
        evidenceGate: "unassessed",
        isPreferred,
        createdAt: nowIso(),
    };
}

function parseSourceQualityToConfidence(quay?: string): number | undefined {
    if (quay === "3") return 1.0;
    if (quay === "2") return 0.75;
    if (quay === "1") return 0.5;
    if (quay === "0") return 0.25;
    return undefined;
}

function confidenceToQuay(confidence?: number): SourceRef["quality"] | undefined {
    if (confidence === undefined || Number.isNaN(confidence)) return undefined;
    if (confidence >= 0.9) return "3";
    if (confidence >= 0.7) return "2";
    if (confidence >= 0.4) return "1";
    return "0";
}

function extractPlaceRaw(value: unknown): string | undefined {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    if (value && typeof value === "object" && "placeRaw" in (value as Record<string, unknown>)) {
        const raw = (value as { placeRaw?: unknown }).placeRaw;
        if (typeof raw === "string") {
            const trimmed = raw.trim();
            return trimmed.length > 0 ? trimmed : undefined;
        }
    }
    return undefined;
}

function buildInformalMirrorNotes(dateValue: ParsedDate | null | undefined): string[] {
    const raw = dateValue?.raw?.trim();
    if (!raw || !dateValue?.isInformal) return [];
    // Mirror only when no explicit year exists to avoid duplicating near-standard content.
    if (/\b\d{4}\b/.test(raw)) return [];
    return [`GSK_RAW_DATE ${raw}`];
}

export type GedcomDefaultPolicy = "conservative" | "legacy-aggressive";

type PedigreeMappingResult = {
    value: ParentChildEdge["nature"];
    defaultApplied: boolean;
    input?: string;
};

type CertaintyMappingResult = {
    value: ParentChildEdge["certainty"];
    defaultApplied: boolean;
    input?: string;
};

function pediToNature(pedi: string | undefined, policy: GedcomDefaultPolicy): PedigreeMappingResult {
    const map: Record<string, ParentChildEdge["nature"]> = {
        BIRTH: "BIO",
        ADOPTED: "ADO",
        FOSTER: "FOS",
        SEALING: "SEAL",
        UNKNOWN: "UNK",
    };
    if (!pedi) {
        return {
            value: policy === "legacy-aggressive" ? "BIO" : "UNK",
            defaultApplied: true,
            input: pedi,
        };
    }
    return {
        value: map[pedi.toUpperCase()] ?? "UNK",
        defaultApplied: false,
        input: pedi,
    };
}

function quayToCertainty(quay: string | undefined, policy: GedcomDefaultPolicy): CertaintyMappingResult {
    if (quay === "3") return { value: "high", defaultApplied: false, input: quay };
    if (quay === "2") return { value: "medium", defaultApplied: false, input: quay };
    if (quay === "1") return { value: "low", defaultApplied: false, input: quay };
    if (quay === "0") return { value: "uncertain", defaultApplied: false, input: quay };
    return {
        value: policy === "legacy-aggressive" ? "high" : "uncertain",
        defaultApplied: true,
        input: quay,
    };
}

function natureToPedi(nature: ParentChildEdge["nature"]): "BIRTH" | "ADOPTED" | "FOSTER" | "SEALING" | "UNKNOWN" {
    if (nature === "BIO") return "BIRTH";
    if (nature === "ADO") return "ADOPTED";
    if (nature === "FOS") return "FOSTER";
    if (nature === "SEAL") return "SEALING";
    return "UNKNOWN";
}

function certaintyToQuay(certainty: ParentChildEdge["certainty"]): "0" | "1" | "2" | "3" {
    if (certainty === "high") return "3";
    if (certainty === "medium") return "2";
    if (certainty === "low") return "1";
    return "0";
}

function sourceRefsToCitations(
    refs: SourceRef[] | undefined,
    xrefMap: Record<string, string>
): ClaimCitation[] {
    if (!refs || refs.length === 0) return [];
    const citations: ClaimCitation[] = [];
    for (const ref of refs) {
        const sourceUid = xrefMap[ref.id];
        if (!sourceUid) continue;
        citations.push({
            sourceUid,
            transcription: ref.text ?? ref.note,
            page: ref.page,
            confidence: parseSourceQualityToConfidence(ref.quality),
        });
    }
    return citations;
}

/** Parse a GEDCOM date string into a loose ParsedDate. Preserves raw for lossless export. */
export function parseGedDate(raw: string | undefined): ParsedDate | null {
    if (!raw) return null;
    const s = raw.trim();
    if (!s) return null;

    const prefixRe = /^(ABT|EST|CAL|BEF|AFT|BET)\s+/i;
    const qualMatch = s.match(prefixRe);
    const qualifier = qualMatch
        ? (qualMatch[1].toUpperCase() as ParsedDate["qualifier"])
        : undefined;
    const rest = qualMatch ? s.slice(qualMatch[0].length) : s;

    // BET X AND Y
    const betMatch = rest.match(/^(\d{1,4}(?:[^\d].+?)?)\s+AND\s+(.+)$/i);
    if (betMatch) {
        const y1 = parseInt(betMatch[1]);
        const y2 = parseInt(betMatch[2]);
        return {
            year: isNaN(y1) ? undefined : y1,
            yearEnd: isNaN(y2) ? undefined : y2,
            qualifier: "BET",
            raw: s,
        };
    }

    // Day Month Year or Month Year or just Year
    const parts = rest.split(/\s+/);
    let year: number | undefined, month: number | undefined, day: number | undefined;
    const MONTHS: Record<string, number> = {
        JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
        JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
    };

    if (parts.length >= 3 && MONTHS[parts[1]?.toUpperCase()]) {
        day = parseInt(parts[0]);
        month = MONTHS[parts[1].toUpperCase()];
        year = parseInt(parts[2]);
    } else if (parts.length === 2 && MONTHS[parts[0]?.toUpperCase()]) {
        month = MONTHS[parts[0].toUpperCase()];
        year = parseInt(parts[1]);
    } else if (parts.length === 1) {
        year = parseInt(parts[0]);
    }

    return {
        year: isNaN(year ?? NaN) ? undefined : year,
        month: isNaN(month ?? NaN) ? undefined : month,
        day: isNaN(day ?? NaN) ? undefined : day,
        qualifier: qualifier ?? undefined,
        raw: s,
        isInformal: isNaN(year ?? NaN) && isNaN(month ?? NaN) && isNaN(day ?? NaN),
    };
}

/** Parses a place string into a GeoRef with hierarchical parts. */
export function parsePlaceParts(raw: string | undefined): GeoRef | null {
    if (!raw) return null;
    const s = raw.trim();
    if (!s) return null;

    const parts = s.split(",").map(p => p.trim()).filter(p => p.length > 0);
    return {
        placeRaw: s,
        parts: parts.length > 1 ? parts : undefined,
    };
}

/** Parse a family's events to detect if a union has a divorce marker. */
function inferUnionType(family: Family): UnionNode["unionType"] {
    const hasDivorce = family.events?.some(e => e.type === "DIV");
    const hasMarriage = family.events?.some(e => e.type === "MARR");
    if (hasDivorce) return "DIV";
    if (hasMarriage) return "MARR";
    return "UNM";
}

// ─────────────────────────────────────────────
// GeneaDocument → GSchemaGraph  (IMPORT PATH)
// ─────────────────────────────────────────────

export interface BridgeImportResult {
    graph: GSchemaGraph;
    /** XREF to GSchema node UID mapping for verification and index. */
    xrefMap: Record<string, string>;
    /** Count of quarantined tags (for UI feedback). */
    quarantineCount: number;
    /** Non-fatal import warnings generated by bridge mapping defaults/degradations. */
    warnings: ImportWarning[];
}

export interface BridgeImportOptions {
    gedcomDefaultPolicy?: GedcomDefaultPolicy;
}

/**
 * Converts a GeneaDocument (from the GEDCOM parser) into a GSchemaGraph.
 *
 * @param doc - The GeneaDocument produced by parseGedcomAnyVersion.
 * @param sourceVersion - The source GEDCOM version for provenance tracking.
 * @param sourceFileName - Optional file name for provenance tracking.
 */
export function documentToGSchema(
    doc: GeneaDocument,
    sourceVersion: SourceGedVersion = "unknown",
    sourceFileName?: string,
    options: BridgeImportOptions = {}
): BridgeImportResult {
    const graph = GSchemaGraph.create();
    const xrefMap: Record<string, string> = {};
    const method = `parsing:gedcom:${sourceVersion}`;
    const importId = uid();
    const warnings: ImportWarning[] = [];
    const gedcomDefaultPolicy: GedcomDefaultPolicy = options.gedcomDefaultPolicy ?? "conservative";

    // ── 1. Sources ───────────────────────────
    for (const [xref, src] of Object.entries(doc.sources ?? {})) {
        const nodeUid = uid();
        xrefMap[xref] = nodeUid;
        const node: Omit<SourceNode, "createdAt"> = {
            uid: nodeUid, type: "Source", xref,
            title: src.title,
            abbreviation: undefined,
            author: undefined,
        };
        graph.addNode(node);
    }

    // ── 2. Notes ─────────────────────────────
    for (const [xref, note] of Object.entries(doc.notes ?? {})) {
        const nodeUid = uid();
        xrefMap[xref] = nodeUid;
        const node: Omit<NoteNode, "createdAt"> = {
            uid: nodeUid, type: "Note", xref, text: note.text ?? "",
        };
        graph.addNode(node);
    }

    // ── 3. Media ─────────────────────────────
    for (const [xref, media] of Object.entries(doc.media ?? {})) {
        const nodeUid = uid();
        xrefMap[xref] = nodeUid;
        const node: Omit<MediaNode, "createdAt"> = {
            uid: nodeUid, type: "Media", xref,
            fileName: media.fileName,
            title: media.title,
            mimeType: media.mimeType,
            dataUrl: media.dataUrl,
        };
        graph.addNode(node);
    }

    // ── 4. Persons ────────────────────────────
    for (const [xref, person] of Object.entries(doc.persons)) {
        const nodeUid = uid();
        xrefMap[xref] = nodeUid;

        const node: Omit<PersonNode, "createdAt"> = {
            uid: nodeUid,
            type: "Person",
            xref,
            sex: (person.sex as PersonNode["sex"]) ?? "U",
            isLiving: person.lifeStatus === "alive",
            isPlaceholder: person.isPlaceholder ?? false,
        };
        graph.addNode(node);

        const canonicalSurnames = normalizePersonSurnames(person);

        // Name claims
        if (person.names && person.names.length > 0) {
            for (let i = 0; i < person.names.length; i++) {
                const n = person.names[i];
                graph.addClaim(claim(nodeUid, PersonPredicates.NAME_FULL, n.value || person.name, method, i === 0));
                if (n.given) graph.addClaim(claim(nodeUid, PersonPredicates.NAME_GIVEN, n.given, method, i === 0));
                if (n.surname) graph.addClaim(claim(nodeUid, PersonPredicates.NAME_SURNAME, n.surname, method, i === 0));
                if (n.nickname) graph.addClaim(claim(nodeUid, PersonPredicates.NAME_NICKNAME, n.nickname, method, i === 0));
                if (n.prefix) graph.addClaim(claim(nodeUid, (PersonPredicates as any).NAME_PREFIX, n.prefix, method, i === 0));
                if (n.suffix) graph.addClaim(claim(nodeUid, (PersonPredicates as any).NAME_SUFFIX, n.suffix, method, i === 0));
                if (n.title) graph.addClaim(claim(nodeUid, (PersonPredicates as any).NAME_TITLE, n.title, method, i === 0));
            }
        } else {
            // Fallback: use flat name fields
            graph.addClaim(claim(nodeUid, PersonPredicates.NAME_FULL, person.name, method));
            if (person.name && !person.name.includes("/")) {
                // If it looks like a given name, store it as such to avoid UI fallback
                graph.addClaim(claim(nodeUid, PersonPredicates.NAME_GIVEN, person.name, method));
            }
            if (canonicalSurnames.surname) graph.addClaim(claim(nodeUid, PersonPredicates.NAME_SURNAME, canonicalSurnames.surname, method));
        }
        if (canonicalSurnames.surnamePaternal) {
            graph.addClaim(claim(nodeUid, PersonPredicates.EXT_SURNAME_PATERNAL, canonicalSurnames.surnamePaternal, method));
        }
        if (canonicalSurnames.surnameMaternal) {
            graph.addClaim(claim(nodeUid, PersonPredicates.EXT_SURNAME_MATERNAL, canonicalSurnames.surnameMaternal, method));
        }
        if (canonicalSurnames.surnameOrder) {
            graph.addClaim(claim(nodeUid, PersonPredicates.EXT_SURNAME_ORDER, canonicalSurnames.surnameOrder, method));
        }
        graph.addClaim(claim(nodeUid, PersonPredicates.EXT_NAMES_FULL, JSON.stringify(person.names || []), method));
        graph.addClaim(claim(nodeUid, PersonPredicates.EXT_NOTES_REFS, JSON.stringify(person.noteRefs || []), method));
        graph.addClaim(claim(nodeUid, PersonPredicates.EXT_NOTES_RAWTAGS, JSON.stringify(person.rawTags?.NOTE || []), method));
        graph.addClaim(claim(nodeUid, PersonPredicates.EXT_EVENTS_FULL, JSON.stringify(person.events || []), method));

        // Sex

        // Sex
        graph.addClaim(claim(nodeUid, PersonPredicates.SEX, person.sex ?? "U", method));

        // Events → Claims
        importPersonEvents(graph, nodeUid, person, method, xrefMap, importId, warnings);

        // Raw unknown tags → Quarantine or Conflict recovery
        if (person.rawTags) {
            for (const [tag, values] of Object.entries(person.rawTags)) {
                // Try to decode as conflict first
                if (tag === "NOTE" || tag === "_GSK_ALT" || tag === "_GSK_CONFLICT") {
                    let handledCount = 0;
                    for (const v of values) {
                        if (decodeConflictMarker(graph, nodeUid, v)) handledCount++;
                    }
                    if (handledCount > 0 && tag !== "NOTE") continue; // notes might have other info
                }

                const gedPath = `INDI.${tag}`;
                if (!gedcomTagToPredicate(gedPath)) {
                    graph.quarantine({
                        importId,
                        ast: buildQuarantineAst(tag, values),
                        reason: "unknown_individual_tag",
                        context: xref,
                        originalGedcomVersion: sourceVersion,
                    });
                }
            }
        }
    }

    // ── 5. Families → Union nodes + edges ────
    for (const [xref, family] of Object.entries(doc.families)) {
        const unionUid = uid();
        xrefMap[xref] = unionUid;

        const node: Omit<UnionNode, "createdAt"> = {
            uid: unionUid,
            type: "Union",
            xref,
            unionType: inferUnionType(family),
        };
        graph.addNode(node);

        // Member edges — husband
        if (family.husbandId && xrefMap[family.husbandId]) {
            const memberEdge: Omit<MemberEdge, "createdAt"> = {
                uid: uid(), type: "Member",
                fromUid: xrefMap[family.husbandId],
                toUid: unionUid,
                role: "HUSB", isPrimary: true,
            };
            graph.addEdge(memberEdge);
        }

        // Member edges — wife
        if (family.wifeId && xrefMap[family.wifeId]) {
            const memberEdge: Omit<MemberEdge, "createdAt"> = {
                uid: uid(), type: "Member",
                fromUid: xrefMap[family.wifeId],
                toUid: unionUid,
                role: "WIFE", isPrimary: true,
            };
            graph.addEdge(memberEdge);
        }

        // ParentChild edges — children
        for (const childId of family.childrenIds ?? []) {
            const childUid = xrefMap[childId];
            if (!childUid) continue;

            // Determine pedigree nature for this child in this family
            const famcLink = doc.persons[childId]?.famcLinks?.find(
                fl => fl.familyId === xref
            );
            const natCode = pediToNature(famcLink?.pedi, gedcomDefaultPolicy);
            const certainty = quayToCertainty(famcLink?.quality, gedcomDefaultPolicy);
            if (natCode.defaultApplied) {
                warnings.push({
                    code: ERROR_CODES.GED_VERSION_UNKNOWN, // Fallback for lack of a specific PEDI_MISSING code
                    message: `GEDCOM default applied: PEDI missing -> nature=${natCode.value} (policy=${gedcomDefaultPolicy}, child=${childId}, family=${xref})`
                });
            }
            if (certainty.defaultApplied) {
                warnings.push({
                    code: ERROR_CODES.GED_VERSION_UNKNOWN, // Fallback
                    message: `GEDCOM default applied: QUAY missing -> certainty=${certainty.value} (policy=${gedcomDefaultPolicy}, child=${childId}, family=${xref})`
                });
            }

            // Create edges from each parent to child
            if (family.husbandId && xrefMap[family.husbandId]) {
                const parentUid = xrefMap[family.husbandId];
                graph.addEdge(buildParentChildEdge(
                    parentUid,
                    childUid,
                    "father",
                    natCode.value,
                    certainty.value,
                    unionUid,
                    {
                        defaultPolicy: gedcomDefaultPolicy,
                        pediDefaultApplied: natCode.defaultApplied,
                        quayDefaultApplied: certainty.defaultApplied,
                        pediInput: natCode.input,
                        quayInput: certainty.input,
                    }
                ));
            }
            if (family.wifeId && xrefMap[family.wifeId]) {
                const parentUid = xrefMap[family.wifeId];
                graph.addEdge(buildParentChildEdge(
                    parentUid,
                    childUid,
                    "mother",
                    natCode.value,
                    certainty.value,
                    unionUid,
                    {
                        defaultPolicy: gedcomDefaultPolicy,
                        pediDefaultApplied: natCode.defaultApplied,
                        quayDefaultApplied: certainty.defaultApplied,
                        pediInput: natCode.input,
                        quayInput: certainty.input,
                    }
                ));
            }
        }

        // Family events → Union claims
        importFamilyEvents(graph, unionUid, family, method, xrefMap, importId, warnings);
        graph.addClaim(claim(unionUid, UnionPredicates.EXT_NOTES_REFS, JSON.stringify(family.noteRefs || []), method));
        graph.addClaim(claim(unionUid, UnionPredicates.EXT_NOTES_RAWTAGS, JSON.stringify(family.rawTags?.NOTE || []), method));
        graph.addClaim(claim(unionUid, UnionPredicates.EXT_EVENTS_FULL, JSON.stringify(family.events || []), method));
        if (family.rawTags) {
            for (const [tag, values] of Object.entries(family.rawTags)) {
                // Try to decode as conflict first
                if (tag === "NOTE" || tag === "_GSK_ALT" || tag === "_GSK_CONFLICT") {
                    let handledCount = 0;
                    for (const v of values) {
                        if (decodeConflictMarker(graph, unionUid, v)) handledCount++;
                    }
                    if (handledCount > 0 && tag !== "NOTE") continue;
                }

                const gedPath = `FAM.${tag}`;
                if (!gedcomTagToPredicate(gedPath)) {
                    graph.quarantine({
                        importId,
                        ast: buildQuarantineAst(tag, values),
                        reason: "unknown_family_tag",
                        context: xref,
                        originalGedcomVersion: sourceVersion,
                    });
                }
            }
        }
    }

    // ── 6. Initial Import operation ──────────
    const initOp = {
        opId: uid(), opSeq: (graph as unknown as { _nextOpSeq: number })._nextOpSeq ?? 0, type: "INITIAL_IMPORT" as const,
        timestamp: nowSec(), actorId: "system_importer",
        sourceFormat: (sourceVersion === "5.5.1" ? "GEDCOM_551" : "GEDCOM_703") as
            "GEDCOM_551" | "GEDCOM_703" | "GSZ_03x" | "GSK_01x",
        sourceFileName,
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        claimCount: Object.values(graph.toData().claims).reduce(
            (sum, byPredicate) => sum + Object.values(byPredicate).reduce((inner, claims) => inner + claims.length, 0),
            0
        ),
    };
    const internals = graph as unknown as { _journal: unknown[]; _nextOpSeq: number };
    internals._journal.push(initOp);
    internals._nextOpSeq = initOp.opSeq + 1;

    return { graph, xrefMap, quarantineCount: graph.quarantineCount, warnings };
}

// ─────────────────────────────────────────────
// Helper: Person events → Claims
// ─────────────────────────────────────────────

function importPersonEvents(
    graph: GSchemaGraph,
    nodeUid: string,
    person: Person,
    method: string,
    xrefMap: Record<string, string>,
    _importId: string,
    warnings: ImportWarning[]
): void {
    for (const event of (person.events ?? [])) {
        const { type } = event;
        const citations = sourceRefsToCitations(event.sourceRefs, xrefMap);

        // Map known event types to predicates
        const datePred = getPersonEventDatePred(type);
        const placePred = getPersonEventPlacePred(type);

        if (datePred && event.date) {
            const parsed = parseGedDate(event.date);
            if (parsed) {
                const c = claim(nodeUid, datePred, parsed, method);
                if (citations.length > 0) c.citations = citations;
                graph.addClaim(c);
                if (parsed.isInformal) {
                    warnings.push({
                        code: ERROR_CODES.GED_DATE_INFORMAL,
                        message: `Fecha informal coerciva detectada: "${event.date}"`,
                    });
                }
            }
        }
        if (placePred && event.place) {
            const geo = parsePlaceParts(event.place);
            if (geo) {
                const c = claim(nodeUid, placePred, geo, method);
                if (citations.length > 0) c.citations = citations;
                graph.addClaim(c);
                if (!geo.parts || geo.parts.length < 2) {
                    warnings.push({
                        code: ERROR_CODES.GED_PLACE_FLAT,
                        message: `Lugar sin jerarquía clara detectado: "${event.place}"`,
                    });
                }
            }
        }
    }

    // Flat fields (legacy, kept for backward compat)
    if (person.birthDate && !person.events?.find(e => e.type === "BIRT" && e.date === person.birthDate)) {
        const parsed = parseGedDate(person.birthDate);
        if (parsed) graph.addClaim(claim(nodeUid, PersonPredicates.EVENT_BIRTH_DATE, parsed, method));
    }
    if (person.birthPlace && !person.events?.find(e => e.type === "BIRT" && e.place === person.birthPlace)) {
        const geo = parsePlaceParts(person.birthPlace);
        if (geo) graph.addClaim(claim(nodeUid, PersonPredicates.EVENT_BIRTH_PLACE, geo, method));
    }
    if (person.deathDate) {
        const parsed = parseGedDate(person.deathDate);
        if (parsed) graph.addClaim(claim(nodeUid, PersonPredicates.EVENT_DEATH_DATE, parsed, method));
    }
    if (person.deathPlace) {
        const geo = parsePlaceParts(person.deathPlace);
        if (geo) graph.addClaim(claim(nodeUid, PersonPredicates.EVENT_DEATH_PLACE, geo, method));
    }
    if (person.residence) {
        graph.addClaim(claim(nodeUid, PersonPredicates.ATTR_RESIDENCE_PLACE, person.residence, method));
    }
}

function getPersonEventDatePred(eventType: GeneaEvent["type"]): string | null {
    const map: Partial<Record<GeneaEvent["type"], string>> = {
        BIRT: PersonPredicates.EVENT_BIRTH_DATE,
        DEAT: PersonPredicates.EVENT_DEATH_DATE,
        BURI: PersonPredicates.EVENT_BURIAL_DATE,
        CHR: PersonPredicates.EVENT_CHRISTENING_DATE,
        BAPM: PersonPredicates.EVENT_BAPTISM_DATE,
        CENS: PersonPredicates.EVENT_CENSUS_DATE,
        RESI: PersonPredicates.ATTR_RESIDENCE_DATE,
    };
    return map[eventType] ?? null;
}

function getPersonEventPlacePred(eventType: GeneaEvent["type"]): string | null {
    const map: Partial<Record<GeneaEvent["type"], string>> = {
        BIRT: PersonPredicates.EVENT_BIRTH_PLACE,
        DEAT: PersonPredicates.EVENT_DEATH_PLACE,
        BURI: PersonPredicates.EVENT_BURIAL_PLACE,
        CHR: PersonPredicates.EVENT_CHRISTENING_PLACE,
        BAPM: PersonPredicates.EVENT_BAPTISM_PLACE,
        CENS: PersonPredicates.EVENT_CENSUS_PLACE,
        RESI: PersonPredicates.ATTR_RESIDENCE_PLACE,
    };
    return map[eventType] ?? null;
}

// ─────────────────────────────────────────────
// Helper: Family events → Union claims
// ─────────────────────────────────────────────

function importFamilyEvents(
    graph: GSchemaGraph,
    unionUid: string,
    family: Family,
    method: string,
    xrefMap: Record<string, string>,
    _importId: string,
    warnings: ImportWarning[]
): void {
    for (const event of (family.events ?? [])) {
        const citations = sourceRefsToCitations(event.sourceRefs, xrefMap);
        if (event.type === "MARR") {
            if (event.date) {
                const parsed = parseGedDate(event.date);
                if (parsed) {
                    const c = claim(unionUid, UnionPredicates.EVENT_MARRIAGE_DATE, parsed, method);
                    if (citations.length > 0) c.citations = citations;
                    graph.addClaim(c);
                    if (parsed.isInformal) {
                        warnings.push({
                            code: ERROR_CODES.GED_DATE_INFORMAL,
                            message: `Fecha de matrimonio informal: "${event.date}"`,
                        });
                    }
                }
            }
            if (event.place) {
                const geo = parsePlaceParts(event.place);
                if (geo) {
                    const c = claim(unionUid, UnionPredicates.EVENT_MARRIAGE_PLACE, geo, method);
                    if (citations.length > 0) c.citations = citations;
                    graph.addClaim(c);
                    if (!geo.parts || geo.parts.length < 2) {
                        warnings.push({
                            code: ERROR_CODES.GED_PLACE_FLAT,
                            message: `Lugar de matrimonio sin jerarquía clara: "${event.place}"`,
                        });
                    }
                }
            }
        } else if (event.type === "DIV") {
            if (event.date) {
                const parsed = parseGedDate(event.date);
                if (parsed) {
                    const c = claim(unionUid, UnionPredicates.EVENT_DIVORCE_DATE, parsed, method);
                    if (citations.length > 0) c.citations = citations;
                    graph.addClaim(c);
                    if (parsed.isInformal) {
                        warnings.push({
                            code: ERROR_CODES.GED_DATE_INFORMAL,
                            message: `Fecha de divorcio informal: "${event.date}"`,
                        });
                    }
                }
            }
            if (event.place) {
                const geo = parsePlaceParts(event.place);
                if (geo) {
                    const c = claim(unionUid, UnionPredicates.EVENT_DIVORCE_PLACE, geo, method);
                    if (citations.length > 0) c.citations = citations;
                    graph.addClaim(c);
                    if (!geo.parts || geo.parts.length < 2) {
                        warnings.push({
                            code: ERROR_CODES.GED_PLACE_FLAT,
                            message: `Lugar de divorcio sin jerarquía clara: "${event.place}"`,
                        });
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────
// Helper: Pedigree code conversion
// ─────────────────────────────────────────────

function buildParentChildEdge(
    parentUid: string,
    childUid: string,
    role: "father" | "mother",
    nature: ParentChildEdge["nature"],
    certainty: ParentChildEdge["certainty"],
    unionUid: string,
    gedcomAssumptions?: ParentChildEdge["gedcomAssumptions"]
): Omit<ParentChildEdge, "createdAt"> {
    return {
        uid: uid(),
        type: "ParentChild",
        fromUid: parentUid,
        toUid: childUid,
        parentRole: role,
        unionUid,
        nature,
        certainty,
        gedcomAssumptions,
    };
}

// ─────────────────────────────────────────────
// GSchemaGraph → GeneaDocument  (EXPORT PATH)
// ─────────────────────────────────────────────

/**
 * Converts a GSchemaGraph back into a GeneaDocument.
 *
 * This is the "compat projection" — the output is used directly by:
 * - The existing serializer.ts to produce GEDCOM files.
 * - The DocSlice to provide the UI with its expected data format.
 * - expand.ts, DTreeView, PersonDetailPanel, etc. (no changes needed there).
 */
export function gschemaToDocument(
    graph: GSchemaGraph,
    targetVersion: Extract<GedExportVersion, "5.5.1"> | "7.0.x" = "7.0.x"
): GeneaDocument & { xrefToUid: Record<string, string>; uidToXref: Record<string, string> } {
    const exportData = graph.toData();
    const repair = ensureParentChildUnionLinks(exportData);
    if (repair.repairedEdges > 0) {
        // Keep export deterministic even for legacy in-memory graphs.
        graph = GSchemaGraph.fromData(exportData, graph.getJournal());
    }

    const persons: Record<string, Person> = {};
    const families: Record<string, Family> = {};
    const sources: Record<string, SourceRecord> = {};
    const notes: Record<string, NoteRecord> = {};
    const media: Record<string, Media> = {};

    // Build reverse UID→xref map from the graph nodes' xref fields
    const uidToXref = new Map<string, string>();
    for (const node of graph.allNodes()) {
        if (node.xref) uidToXref.set(node.uid, node.xref);
    }

    /**
     * Get the XREF for a node UID, generating a stable one if not imported from GEDCOM.
     * This ensures exported files are always valid GEDCOM.
     */
    function xrefOf(nodeUid: string, prefix: "I" | "F" | "S" | "N" | "M"): string {
        if (uidToXref.has(nodeUid)) return uidToXref.get(nodeUid)!;
        const short = nodeUid.slice(0, 8).toUpperCase().replace(/-/g, "");
        const xref = `${prefix}${short}`;
        uidToXref.set(nodeUid, xref);
        return xref;
    }

    function getValue<T>(nodeUid: string, predicate: string): T | null {
        return graph.getValue<T>(nodeUid, predicate);
    }

    function getStringValue(nodeUid: string, predicate: string): string | undefined {
        const v = getValue<string>(nodeUid, predicate);
        return typeof v === "string" ? v : undefined;
    }

    function getDateString(nodeUid: string, predicate: string): string | undefined {
        const v = getValue<ParsedDate>(nodeUid, predicate);
        return v?.raw;
    }

    function getPlaceString(nodeUid: string, predicate: string): string | undefined {
        const v = getValue<GeoRef | string>(nodeUid, predicate);
        return extractPlaceRaw(v);
    }

    function sourceRefsFromClaim(claim: GClaim | null | undefined): SourceRef[] {
        if (!claim?.citations || claim.citations.length === 0) return [];
        const refs: SourceRef[] = [];
        const seen = new Set<string>();
        for (const citation of claim.citations) {
            const sourceNode = graph.node(citation.sourceUid);
            if (!sourceNode || sourceNode.type !== "Source") continue;
            const id = xrefOf(citation.sourceUid, "S");
            const key = `${id}:${citation.page ?? ""}:${citation.transcription ?? ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            refs.push({
                id,
                page: citation.page,
                text: citation.transcription,
                quality: confidenceToQuay(citation.confidence),
            });
        }
        return refs;
    }

    // ── Sources ──────────────────────────────
    for (const node of graph.allNodes().filter(n => n.type === "Source")) {
        const src = node as SourceNode;
        const xref = xrefOf(src.uid, "S");
        sources[xref] = { id: xref, title: src.title };
    }

    // ── Notes ────────────────────────────────
    for (const node of graph.allNodes().filter(n => n.type === "Note")) {
        const n = node as NoteNode;
        const xref = xrefOf(n.uid, "N");
        notes[xref] = { id: xref, text: n.text };
    }

    // ── Media ────────────────────────────────
    for (const node of graph.allNodes().filter(n => n.type === "Media")) {
        const m = node as MediaNode;
        const xref = xrefOf(m.uid, "M");
        media[xref] = {
            id: xref,
            fileName: m.fileName,
            title: m.title,
            mimeType: m.mimeType,
            dataUrl: m.dataUrl,
        };
    }

    // ── Persons ──────────────────────────────
    for (const node of graph.allNodes().filter(n => n.type === "Person")) {
        const p = node as PersonNode;
        const xref = xrefOf(p.uid, "I");

        const given = getStringValue(p.uid, PersonPredicates.NAME_GIVEN)?.trim();
        const surnameFromClaim = getStringValue(p.uid, PersonPredicates.NAME_SURNAME)?.trim();
        const full = getStringValue(p.uid, PersonPredicates.NAME_FULL)?.trim();
        const extPaternal = getStringValue(p.uid, PersonPredicates.EXT_SURNAME_PATERNAL)?.trim();
        const extMaternal = getStringValue(p.uid, PersonPredicates.EXT_SURNAME_MATERNAL)?.trim();
        const extOrder = getStringValue(p.uid, PersonPredicates.EXT_SURNAME_ORDER)?.trim() as Person["surnameOrder"] | undefined;
        const parsedNames = safeJsonParse<Person["names"]>(getStringValue(p.uid, PersonPredicates.EXT_NAMES_FULL));
        const eventProjection = safeJsonParse<GeneaEvent[]>(getStringValue(p.uid, PersonPredicates.EXT_EVENTS_FULL));
        const noteRefsProjection = safeJsonParse<string[]>(getStringValue(p.uid, PersonPredicates.EXT_NOTES_REFS));
        const inlineNotesProjection = safeJsonParse<string[]>(getStringValue(p.uid, PersonPredicates.EXT_NOTES_RAWTAGS));

        const inferred = inferCanonicalSurnameFields({
            rawSurname: surnameFromClaim,
            preferredOrder: "paternal_first"
        });
        const canonical = normalizePersonSurnames({
            surname: surnameFromClaim,
            surnamePaternal: extPaternal || inferred.surnamePaternal,
            surnameMaternal: extMaternal || inferred.surnameMaternal,
            surnameOrder: extOrder || inferred.surnameOrder
        });
        const synthesized = given ? [given, canonical.surname].filter(Boolean).join(" ").trim() : undefined;
        const fullDisplay = normalizeDisplayName(full);

        // UI expects `person.name` to be ONLY the given name(s).
        const name = normalizeDisplayName(given) || fullDisplay || "(Sin nombre)";
        const lifeStatus: Person["lifeStatus"] = p.isLiving ? "alive" : "deceased";

        // Build events array from claims
        const events = eventProjection || buildPersonEventsFromClaims(p.uid, graph, sourceRefsFromClaim);
        const names = (parsedNames && parsedNames.length > 0)
            ? parsedNames
            : [{
                value: synthesized || fullDisplay || name,
                given: given || undefined,
                surname: canonical.surname || undefined,
                type: "primary" as const,
                primary: true
            }];

        persons[xref] = {
            id: xref,
            name,
            surname: canonical.surname,
            surnamePaternal: canonical.surnamePaternal,
            surnameMaternal: canonical.surnameMaternal,
            surnameOrder: canonical.surnameOrder,
            names,
            sex: (p.sex as Person["sex"]) ?? "U",
            lifeStatus,
            isPlaceholder: p.isPlaceholder,
            birthDate: getDateString(p.uid, PersonPredicates.EVENT_BIRTH_DATE),
            birthPlace: getPlaceString(p.uid, PersonPredicates.EVENT_BIRTH_PLACE),
            deathDate: getDateString(p.uid, PersonPredicates.EVENT_DEATH_DATE),
            deathPlace: getPlaceString(p.uid, PersonPredicates.EVENT_DEATH_PLACE),
            residence: getPlaceString(p.uid, PersonPredicates.ATTR_RESIDENCE_PLACE),
            events,
            famc: [],   // filled when processing unions
            fams: [],   // filled when processing unions
            mediaRefs: [],
            sourceRefs: [],
            noteRefs: noteRefsProjection || [],
            rawTags: inlineNotesProjection && inlineNotesProjection.length > 0 ? { NOTE: inlineNotesProjection } : undefined,
        };

        const conflictMarkers = collectNonPreferredClaimMarkers(graph, p.uid);
        if (conflictMarkers.length > 0) {
            const rawTags = persons[xref].rawTags ?? {};
            if (targetVersion === "5.5.1") {
                const notes = rawTags.NOTE ?? [];
                for (const marker of conflictMarkers) {
                    notes.push(`_GSK_CONFLICT: ${marker}`);
                }
                rawTags.NOTE = notes;
            } else {
                const alts = rawTags._GSK_ALT ?? [];
                for (const marker of conflictMarkers) {
                    alts.push(marker);
                }
                rawTags._GSK_ALT = alts;
            }
            persons[xref].rawTags = rawTags;
        }
    }

    // ── Unions → Families ────────────────────
    for (const node of graph.allNodes().filter(n => n.type === "Union")) {
        const u = node as UnionNode;
        const xref = xrefOf(u.uid, "F");
        const members = graph.getMembers(u.uid);
        const husband = members.find(m => m.edge.role === "HUSB")
            || members.find(m => m.edge.role === "PART" && (m.person as PersonNode).sex === "M")
            || (members.some(m => m.edge.role === "WIFE") ? undefined : members.find(m => m.edge.role === "PART"));

        const wife = members.find(m => m.edge.role === "WIFE")
            || members.find(m => m.edge.role === "PART" && (m.person as PersonNode).sex === "F" && m !== husband)
            || (husband && members.length > 1 ? members.find(m => m !== husband) : undefined);

        const husbandXref = husband ? xrefOf(husband.person.uid, "I") : undefined;
        const wifeXref = wife ? xrefOf(wife.person.uid, "I") : undefined;

        // Collect children via ParentChild edges into the union
        // Children of this union = persons with ParentChild edges from both parents (or any parent) pointing to the same set
        const childrenXrefs = collectChildrenForUnion(u.uid, graph, xrefOf);
        const familyChildLinks = collectFamcLinksForUnion(u.uid, graph, xrefOf);

        // Build family marriage/divorce events from claims
        const projectedEvents = safeJsonParse<GeneaEvent[]>(getStringValue(u.uid, UnionPredicates.EXT_EVENTS_FULL));
        const projectedNoteRefs = safeJsonParse<string[]>(getStringValue(u.uid, UnionPredicates.EXT_NOTES_REFS));
        const projectedInlineNotes = safeJsonParse<string[]>(getStringValue(u.uid, UnionPredicates.EXT_NOTES_RAWTAGS));
        const events = projectedEvents || buildUnionEventsFromClaims(u.uid, graph, sourceRefsFromClaim);

        families[xref] = {
            id: xref,
            husbandId: husbandXref,
            wifeId: wifeXref,
            childrenIds: childrenXrefs,
            events,
            noteRefs: projectedNoteRefs || [],
            rawTags: projectedInlineNotes && projectedInlineNotes.length > 0 ? { NOTE: projectedInlineNotes } : undefined
        };

        // Back-link: update fams on person records
        if (husbandXref && persons[husbandXref]) {
            if (!persons[husbandXref].fams.includes(xref)) persons[husbandXref].fams.push(xref);
        }
        if (wifeXref && persons[wifeXref]) {
            if (!persons[wifeXref].fams.includes(xref)) persons[wifeXref].fams.push(xref);
        }
        for (const childXref of childrenXrefs) {
            if (persons[childXref] && !persons[childXref].famc.includes(xref)) {
                persons[childXref].famc.push(xref);
            }
        }
        for (const link of familyChildLinks) {
            const person = persons[link.personId];
            if (!person) continue;
            if (!person.famc.includes(link.familyId)) {
                person.famc.push(link.familyId);
            }
            if (!person.famcLinks) person.famcLinks = [];
            const existing = person.famcLinks.find((entry) => entry.familyId === link.familyId);
            if (existing) {
                existing.pedi = link.pedi;
                existing.quality = link.quality;
                existing.reference = link.reference;
            } else {
                person.famcLinks.push({
                    familyId: link.familyId,
                    pedi: link.pedi,
                    quality: link.quality,
                    reference: link.reference,
                });
            }
        }
    }

    // Legacy fallback: refine surname split using parent evidence when explicit canonical fields are missing.
    for (const person of Object.values(persons)) {
        if (person.surnamePaternal || person.surnameMaternal) continue;
        const firstFamc = person.famc[0];
        const family = firstFamc ? families[firstFamc] : undefined;
        const fatherSurname = family?.husbandId ? persons[family.husbandId]?.surname : undefined;
        const motherSurname = family?.wifeId ? persons[family.wifeId]?.surname : undefined;
        const inferred = inferCanonicalSurnameFields({
            rawSurname: person.surname,
            fatherSurname,
            motherSurname,
            preferredOrder: "paternal_first"
        });
        person.surnamePaternal = inferred.surnamePaternal;
        person.surnameMaternal = inferred.surnameMaternal;
        person.surnameOrder = inferred.surnameOrder || person.surnameOrder;
        person.surname = inferred.surname || person.surname;
        if (person.names && person.names.length > 0) {
            const primary = person.names.find((entry) => entry.primary) || person.names[0];
            if (primary) {
                primary.given = primary.given || person.name;
                primary.surname = primary.surname || person.surname;
                primary.value = primary.value || (person.surname ? `${person.name} /${person.surname}/` : person.name);
            }
        }
    }

    const finalXrefToUid: Record<string, string> = {};
    const finalUidToXref: Record<string, string> = {};
    for (const [uid, xref] of uidToXref.entries()) {
        finalXrefToUid[xref] = uid;
        finalUidToXref[uid] = xref;
    }

    return {
        persons,
        families,
        sources: Object.keys(sources).length > 0 ? sources : undefined,
        notes: Object.keys(notes).length > 0 ? notes : undefined,
        media,
        metadata: {
            sourceFormat: "GSK",
            gedVersion: targetVersion,
        },
        xrefToUid: finalXrefToUid,
        uidToXref: finalUidToXref,
    } as GeneaDocument & { xrefToUid: Record<string, string>; uidToXref: Record<string, string> };
}

// ─────────────────────────────────────────────
// Helper: Build Person events from claims
// ─────────────────────────────────────────────

function buildPersonEventsFromClaims(
    nodeUid: string,
    graph: GSchemaGraph,
    sourceRefsFromClaim: (claim: GClaim | null | undefined) => SourceRef[]
): GeneaEvent[] {
    const events: GeneaEvent[] = [];

    const eventMap: Array<{ type: GeneaEvent["type"]; datePred: string; placePred: string }> = [
        { type: "BIRT", datePred: PersonPredicates.EVENT_BIRTH_DATE, placePred: PersonPredicates.EVENT_BIRTH_PLACE },
        { type: "DEAT", datePred: PersonPredicates.EVENT_DEATH_DATE, placePred: PersonPredicates.EVENT_DEATH_PLACE },
        { type: "BURI", datePred: PersonPredicates.EVENT_BURIAL_DATE, placePred: PersonPredicates.EVENT_BURIAL_PLACE },
        { type: "CHR", datePred: PersonPredicates.EVENT_CHRISTENING_DATE, placePred: PersonPredicates.EVENT_CHRISTENING_PLACE },
        { type: "BAPM", datePred: PersonPredicates.EVENT_BAPTISM_DATE, placePred: PersonPredicates.EVENT_BAPTISM_PLACE },
        { type: "CENS", datePred: PersonPredicates.EVENT_CENSUS_DATE, placePred: PersonPredicates.EVENT_CENSUS_PLACE },
    ];

    for (const { type, datePred, placePred } of eventMap) {
        const dateClaim = graph.getPreferred(nodeUid, datePred);
        const placeClaim = graph.getPreferred(nodeUid, placePred);
        if (dateClaim || placeClaim) {
            const mergedRefs = [...sourceRefsFromClaim(dateClaim), ...sourceRefsFromClaim(placeClaim)];
            const dateValue = (dateClaim?.value as ParsedDate | null) ?? null;
            events.push({
                id: uid(),
                type,
                date: dateValue?.raw,
                place: extractPlaceRaw(placeClaim?.value),
                sourceRefs: mergedRefs,
                mediaRefs: [],
                notesInline: buildInformalMirrorNotes(dateValue),
                noteRefs: [],
            });
        }
    }

    return events;
}

// ─────────────────────────────────────────────
// Helper: Build Union events from claims
// ─────────────────────────────────────────────

function buildUnionEventsFromClaims(
    nodeUid: string,
    graph: GSchemaGraph,
    sourceRefsFromClaim: (claim: GClaim | null | undefined) => SourceRef[]
): GeneaEvent[] {
    const events: GeneaEvent[] = [];

    const marriageDateClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_MARRIAGE_DATE);
    const marriagePlaceClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_MARRIAGE_PLACE);
    if (marriageDateClaim || marriagePlaceClaim) {
        const mergedRefs = [...sourceRefsFromClaim(marriageDateClaim), ...sourceRefsFromClaim(marriagePlaceClaim)];
        const marriageDateValue = (marriageDateClaim?.value as ParsedDate | null) ?? null;
        events.push({
            id: uid(), type: "MARR",
            date: marriageDateValue?.raw,
            place: extractPlaceRaw(marriagePlaceClaim?.value),
            sourceRefs: mergedRefs,
            mediaRefs: [],
            notesInline: buildInformalMirrorNotes(marriageDateValue),
            noteRefs: [],
        });
    }

    const divorceDateClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_DIVORCE_DATE);
    const divorcePlaceClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_DIVORCE_PLACE);
    if (divorceDateClaim || divorcePlaceClaim) {
        const mergedRefs = [...sourceRefsFromClaim(divorceDateClaim), ...sourceRefsFromClaim(divorcePlaceClaim)];
        const divorceDateValue = (divorceDateClaim?.value as ParsedDate | null) ?? null;
        events.push({
            id: uid(), type: "DIV",
            date: divorceDateValue?.raw,
            place: extractPlaceRaw(divorcePlaceClaim?.value),
            sourceRefs: mergedRefs,
            mediaRefs: [],
            notesInline: buildInformalMirrorNotes(divorceDateValue),
            noteRefs: [],
        });
    }

    return events;
}

// ─────────────────────────────────────────────
// Helper: Collect children for a union
// ─────────────────────────────────────────────

function collectChildrenForUnion(
    unionUid: string,
    graph: GSchemaGraph,
    xrefOf: (uid: string, prefix: "I" | "F" | "S" | "N" | "M") => string
): string[] {
    return collectChildrenForUnionStrict(unionUid, graph, xrefOf);
}

function collectFamcLinksForUnion(
    unionUid: string,
    graph: GSchemaGraph,
    xrefOf: (uid: string, prefix: "I" | "F" | "S" | "N" | "M") => string
): Array<{ personId: string; familyId: string; pedi: "BIRTH" | "ADOPTED" | "FOSTER" | "SEALING" | "UNKNOWN"; quality: "0" | "1" | "2" | "3"; reference?: string }> {
    const familyId = xrefOf(unionUid, "F");
    const byChild = new Map<string, ParentChildEdge[]>();
    const parentChildEdges = graph.allEdges().filter((edge): edge is ParentChildEdge => edge.type === "ParentChild");

    for (const edge of parentChildEdges) {
        if (edge.unionUid !== unionUid) continue;
        if (!byChild.has(edge.toUid)) byChild.set(edge.toUid, []);
        byChild.get(edge.toUid)!.push(edge);
    }

    const links: Array<{ personId: string; familyId: string; pedi: "BIRTH" | "ADOPTED" | "FOSTER" | "SEALING" | "UNKNOWN"; quality: "0" | "1" | "2" | "3"; reference?: string }> = [];
    for (const [childUid, edges] of byChild.entries()) {
        const sorted = [...edges].sort((a, b) => {
            const roleRank = (role: ParentChildEdge["parentRole"]) =>
                role === "father" ? 0 : role === "mother" ? 1 : 2;
            const roleDiff = roleRank(a.parentRole) - roleRank(b.parentRole);
            if (roleDiff !== 0) return roleDiff;
            return a.uid.localeCompare(b.uid);
        });
        const selected = sorted[0];
        links.push({
            personId: xrefOf(childUid, "I"),
            familyId,
            pedi: natureToPedi(selected.nature),
            quality: certaintyToQuay(selected.certainty),
            reference: selected.nature === "STE" ? "gsk:nature:STE" : undefined,
        });
    }
    return links;
}

function collectChildrenForUnionStrict(
    unionUid: string,
    graph: GSchemaGraph,
    xrefOf: (uid: string, prefix: "I" | "F" | "S" | "N" | "M") => string
): string[] {
    const members = graph.getMembers(unionUid);
    if (members.length === 0) return [];

    const parentUidSet = new Set(members.map((m) => m.person.uid));
    const husbandUid = members.find((m) => m.edge.role === "HUSB")?.person.uid;
    const wifeUid = members.find((m) => m.edge.role === "WIFE")?.person.uid;
    const parentChildEdges = graph.allEdges().filter((edge): edge is ParentChildEdge => edge.type === "ParentChild");

    const explicitChildren = new Set<string>();
    for (const edge of parentChildEdges) {
        if (edge.unionUid !== unionUid) continue;
        if (graph.node(edge.toUid)?.type !== "Person") continue;
        explicitChildren.add(edge.toUid);
    }
    if (explicitChildren.size > 0) {
        return [...explicitChildren].map((uid) => xrefOf(uid, "I"));
    }

    const candidateChildren = new Set<string>();
    for (const edge of parentChildEdges) {
        if (!parentUidSet.has(edge.fromUid)) continue;
        if (graph.node(edge.toUid)?.type !== "Person") continue;
        candidateChildren.add(edge.toUid);
    }

    const accepted = new Set<string>();
    for (const childUid of candidateChildren) {
        const edgesToChild = parentChildEdges.filter((edge) => edge.toUid === childUid);
        const memberEdgesToChild = edgesToChild.filter((edge) => parentUidSet.has(edge.fromUid));
        if (memberEdgesToChild.length === 0) continue;

        const externalFather = edgesToChild.some(
            (edge) => edge.parentRole === "father" && !parentUidSet.has(edge.fromUid)
        );
        if (externalFather) continue;

        const externalMother = edgesToChild.some(
            (edge) => edge.parentRole === "mother" && !parentUidSet.has(edge.fromUid)
        );
        if (externalMother) continue;

        if (husbandUid) {
            const conflictingFather = edgesToChild.some(
                (edge) => edge.parentRole === "father" && edge.fromUid !== husbandUid
            );
            if (conflictingFather) continue;
        }
        if (wifeUid) {
            const conflictingMother = edgesToChild.some(
                (edge) => edge.parentRole === "mother" && edge.fromUid !== wifeUid
            );
            if (conflictingMother) continue;
        }

        accepted.add(childUid);
    }

    return [...accepted].map((uid) => xrefOf(uid, "I"));
}

// ─────────────────────────────────────────────
// Convenience round-trip helpers
// ─────────────────────────────────────────────

/**
 * Round-trip: GeneaDocument → GSchemaGraph → GeneaDocument.
 * Used for the "Golden Test: Projection Fidelity".
 * The returned document should be semantically equivalent to the input.
 */
export function roundTripDocument(doc: GeneaDocument): GeneaDocument {
    const { graph } = documentToGSchema(doc, "7.0.x");
    return gschemaToDocument(graph);
}
