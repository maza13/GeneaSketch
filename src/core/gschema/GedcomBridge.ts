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
    SourceRecord,
    NoteRecord,
    Media,
    SourceGedVersion,
} from "@/types/domain";
import { GSchemaGraph } from "./GSchemaGraph";
import type {
    PersonNode,
    UnionNode,
    SourceNode,
    NoteNode,
    MediaNode,
    ParentChildEdge,
    MemberEdge,
    GClaim,
    ParsedDate,
    GeoRef,
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
        status: "raw",
        isPreferred,
        createdAt: nowIso(),
    };
}

/** Parse a GEDCOM date string into a loose ParsedDate. Preserves raw for lossless export. */
function parseGedDate(raw: string | undefined): ParsedDate | null {
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
    sourceFileName?: string
): BridgeImportResult {
    const graph = GSchemaGraph.create();
    const xrefMap: Record<string, string> = {};
    const method = `parsing:gedcom:${sourceVersion}`;
    const importId = uid();

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

        // Name claims
        if (person.names && person.names.length > 0) {
            for (let i = 0; i < person.names.length; i++) {
                const n = person.names[i];
                graph.addClaim(claim(nodeUid, PersonPredicates.NAME_FULL, n.value || person.name, method, i === 0));
                if (n.given) graph.addClaim(claim(nodeUid, PersonPredicates.NAME_GIVEN, n.given, method, i === 0));
                if (n.surname) graph.addClaim(claim(nodeUid, PersonPredicates.NAME_SURNAME, n.surname, method, i === 0));
                if (n.nickname) graph.addClaim(claim(nodeUid, PersonPredicates.NAME_NICKNAME, n.nickname, method, i === 0));
            }
        } else {
            // Fallback: use flat name fields
            graph.addClaim(claim(nodeUid, PersonPredicates.NAME_FULL, person.name, method));
            if (person.surname) graph.addClaim(claim(nodeUid, PersonPredicates.NAME_SURNAME, person.surname, method));
        }

        // Sex
        graph.addClaim(claim(nodeUid, PersonPredicates.SEX, person.sex ?? "U", method));

        // Events → Claims
        importPersonEvents(graph, nodeUid, person, method, xrefMap, importId);

        // Raw unknown tags → Quarantine
        if (person.rawTags) {
            for (const [tag, values] of Object.entries(person.rawTags)) {
                const gedPath = `INDI.${tag}`;
                if (!gedcomTagToPredicate(gedPath)) {
                    graph.quarantine({
                        importId,
                        rawTag: tag,
                        rawValue: values.join("; "),
                        reason: "unknown_individual_tag",
                        context: xref,
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
            const natCode = pediToNature(famcLink?.pedi);

            // Create edges from each parent to child
            if (family.husbandId && xrefMap[family.husbandId]) {
                const parentUid = xrefMap[family.husbandId];
                graph.addEdge(buildParentChildEdge(parentUid, childUid, "father", natCode));
            }
            if (family.wifeId && xrefMap[family.wifeId]) {
                const parentUid = xrefMap[family.wifeId];
                graph.addEdge(buildParentChildEdge(parentUid, childUid, "mother", natCode));
            }
        }

        // Family events → Union claims
        importFamilyEvents(graph, unionUid, family, method, importId);
    }

    // ── 6. Initial Import operation ──────────
    const initOp = {
        opId: uid(), type: "INITIAL_IMPORT" as const,
        timestamp: nowSec(), actorId: "system_importer",
        sourceFormat: (sourceVersion === "5.5.1" ? "GEDCOM_551" : "GEDCOM_703") as
            "GEDCOM_551" | "GEDCOM_703" | "GSZ_03x" | "GSK_01x",
        sourceFileName,
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        claimCount: 0, // filled in below
    };
    (graph as unknown as { _journal: unknown[] })._journal.push(initOp);

    return { graph, xrefMap, quarantineCount: graph.quarantineCount };
}

// ─────────────────────────────────────────────
// Helper: Person events → Claims
// ─────────────────────────────────────────────

function importPersonEvents(
    graph: GSchemaGraph,
    nodeUid: string,
    person: Person,
    method: string,
    _xrefMap: Record<string, string>,
    _importId: string
): void {
    for (const event of (person.events ?? [])) {
        const { type } = event;

        // Map known event types to predicates
        const datePred = getPersonEventDatePred(type);
        const placePred = getPersonEventPlacePred(type);

        if (datePred && event.date) {
            const parsed = parseGedDate(event.date);
            if (parsed) graph.addClaim(claim(nodeUid, datePred, parsed, method));
        }
        if (placePred && event.place) {
            const geo: GeoRef = { placeRaw: event.place };
            graph.addClaim(claim(nodeUid, placePred, geo, method));
        }
    }

    // Flat fields (legacy, kept for backward compat)
    if (person.birthDate && !person.events?.find(e => e.type === "BIRT" && e.date === person.birthDate)) {
        const parsed = parseGedDate(person.birthDate);
        if (parsed) graph.addClaim(claim(nodeUid, PersonPredicates.EVENT_BIRTH_DATE, parsed, method));
    }
    if (person.birthPlace && !person.events?.find(e => e.type === "BIRT" && e.place === person.birthPlace)) {
        const geo: GeoRef = { placeRaw: person.birthPlace };
        graph.addClaim(claim(nodeUid, PersonPredicates.EVENT_BIRTH_PLACE, geo, method));
    }
    if (person.deathDate) {
        const parsed = parseGedDate(person.deathDate);
        if (parsed) graph.addClaim(claim(nodeUid, PersonPredicates.EVENT_DEATH_DATE, parsed, method));
    }
    if (person.deathPlace) {
        const geo: GeoRef = { placeRaw: person.deathPlace };
        graph.addClaim(claim(nodeUid, PersonPredicates.EVENT_DEATH_PLACE, geo, method));
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
    _importId: string
): void {
    for (const event of (family.events ?? [])) {
        if (event.type === "MARR") {
            if (event.date) {
                const parsed = parseGedDate(event.date);
                if (parsed) graph.addClaim(claim(unionUid, UnionPredicates.EVENT_MARRIAGE_DATE, parsed, method));
            }
            if (event.place) {
                graph.addClaim(claim(unionUid, UnionPredicates.EVENT_MARRIAGE_PLACE, event.place, method));
            }
        } else if (event.type === "DIV") {
            if (event.date) {
                const parsed = parseGedDate(event.date);
                if (parsed) graph.addClaim(claim(unionUid, UnionPredicates.EVENT_DIVORCE_DATE, parsed, method));
            }
            if (event.place) {
                graph.addClaim(claim(unionUid, UnionPredicates.EVENT_DIVORCE_PLACE, event.place, method));
            }
        }
    }
}

// ─────────────────────────────────────────────
// Helper: Pedigree code conversion
// ─────────────────────────────────────────────

function pediToNature(pedi?: string): ParentChildEdge["nature"] {
    const map: Record<string, ParentChildEdge["nature"]> = {
        BIRTH: "BIO", ADOPTED: "ADO", FOSTER: "FOS", SEALING: "SEAL", UNKNOWN: "UNK",
    };
    return pedi ? (map[pedi.toUpperCase()] ?? "BIO") : "BIO";
}

function buildParentChildEdge(
    parentUid: string,
    childUid: string,
    role: "father" | "mother",
    nature: ParentChildEdge["nature"]
): Omit<ParentChildEdge, "createdAt"> {
    return {
        uid: uid(),
        type: "ParentChild",
        fromUid: parentUid,
        toUid: childUid,
        parentRole: role,
        nature,
        certainty: "high",
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
export function gschemaToDocument(graph: GSchemaGraph): GeneaDocument {
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
        const v = getValue<GeoRef>(nodeUid, predicate);
        return typeof v === "string" ? v : v?.placeRaw;
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

        const name = getStringValue(p.uid, PersonPredicates.NAME_FULL) ?? "";
        const surname = getStringValue(p.uid, PersonPredicates.NAME_SURNAME);
        const lifeStatus: Person["lifeStatus"] = p.isLiving ? "alive" : "deceased";

        // Build events array from claims
        const events = buildPersonEventsFromClaims(p.uid, graph);

        persons[xref] = {
            id: xref,
            name,
            surname,
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
        };
    }

    // ── Unions → Families ────────────────────
    for (const node of graph.allNodes().filter(n => n.type === "Union")) {
        const u = node as UnionNode;
        const xref = xrefOf(u.uid, "F");
        const members = graph.getMembers(u.uid);
        const husband = members.find(m => m.edge.role === "HUSB");
        const wife = members.find(m => m.edge.role === "WIFE");

        const husbandXref = husband ? xrefOf(husband.person.uid, "I") : undefined;
        const wifeXref = wife ? xrefOf(wife.person.uid, "I") : undefined;

        // Collect children via ParentChild edges into the union
        // Children of this union = persons with ParentChild edges from both parents (or any parent) pointing to the same set
        const childrenXrefs = collectChildrenForUnion(u.uid, graph, xrefOf);

        // Build family marriage/divorce events from claims
        const events = buildUnionEventsFromClaims(u.uid, graph);

        families[xref] = {
            id: xref,
            husbandId: husbandXref,
            wifeId: wifeXref,
            childrenIds: childrenXrefs,
            events,
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
    }

    return {
        persons,
        families,
        sources: Object.keys(sources).length > 0 ? sources : undefined,
        notes: Object.keys(notes).length > 0 ? notes : undefined,
        media,
        metadata: {
            sourceFormat: "GSZ",
            gedVersion: "0.4.0-gschema",
        },
    };
}

// ─────────────────────────────────────────────
// Helper: Build Person events from claims
// ─────────────────────────────────────────────

function buildPersonEventsFromClaims(nodeUid: string, graph: GSchemaGraph): GeneaEvent[] {
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
            events.push({
                id: uid(),
                type,
                date: (dateClaim?.value as ParsedDate | null)?.raw,
                place: (placeClaim?.value as GeoRef | null)?.placeRaw,
                sourceRefs: [],
                mediaRefs: [],
                notesInline: [],
                noteRefs: [],
            });
        }
    }

    return events;
}

// ─────────────────────────────────────────────
// Helper: Build Union events from claims
// ─────────────────────────────────────────────

function buildUnionEventsFromClaims(nodeUid: string, graph: GSchemaGraph): GeneaEvent[] {
    const events: GeneaEvent[] = [];

    const marriageDateClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_MARRIAGE_DATE);
    const marriagePlaceClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_MARRIAGE_PLACE);
    if (marriageDateClaim || marriagePlaceClaim) {
        events.push({
            id: uid(), type: "MARR",
            date: (marriageDateClaim?.value as ParsedDate | null)?.raw,
            place: (marriagePlaceClaim?.value as string | null) ?? undefined,
            sourceRefs: [], mediaRefs: [], notesInline: [], noteRefs: [],
        });
    }

    const divorceDateClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_DIVORCE_DATE);
    const divorcePlaceClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_DIVORCE_PLACE);
    if (divorceDateClaim || divorcePlaceClaim) {
        events.push({
            id: uid(), type: "DIV",
            date: (divorceDateClaim?.value as ParsedDate | null)?.raw,
            place: (divorcePlaceClaim?.value as string | null) ?? undefined,
            sourceRefs: [], mediaRefs: [], notesInline: [], noteRefs: [],
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
    const members = graph.getMembers(unionUid);
    if (members.length === 0) return [];

    // Collect all children of each parent
    const parentUids = members.map(m => m.person.uid);
    if (parentUids.length === 0) return [];

    // Children = persons that have a ParentChild edge from ANY member of this union
    const childUidSets = parentUids.map(parentUid =>
        new Set(graph.getChildren(parentUid).map(c => c.child.uid))
    );

    // Use union of all children sets (any parent in this union → child is associated)
    const allChildUids = new Set<string>();
    for (const childSet of childUidSets) {
        for (const childUid of childSet) allChildUids.add(childUid);
    }

    return [...allChildUids]
        .filter(uid => graph.node(uid)?.type === "Person")
        .map(uid => xrefOf(uid, "I"));
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
