/**
 * Genraph 0.1.x — Predicate Catalog
 *
 * A "predicate" is a dot-separated path that identifies what type of
 * attribute a Claim is asserting. The catalog below is the canonical
 * set of predicates used in GeneaSketch 0.2.0+.
 *
 * Extensions are allowed with the prefix "ext." (e.g., "ext.myapp.customField").
 * Unknown predicates are valid but will be captured in the quarantine for review.
 */

import type { ParsedDate, GeoRef } from "./types";

// ─────────────────────────────────────────────
// Predicate Constants (type-safe string literals)
// ─────────────────────────────────────────────

/** All standard predicates for Person nodes. */
export const PersonPredicates = {
    // Identity
    NAME_FULL: "person.name.full",
    NAME_GIVEN: "person.name.given",
    NAME_SURNAME: "person.name.surname",
    NAME_NICKNAME: "person.name.nickname",
    NAME_PREFIX: "person.name.prefix",
    NAME_SUFFIX: "person.name.suffix",
    NAME_TITLE: "person.name.title",
    NAME_TYPE: "person.name.type",
    SEX: "person.sex",
    LIFE_STATUS: "person.lifeStatus",

    // Vital Events
    EVENT_BIRTH_DATE: "person.event.birth.date",
    EVENT_BIRTH_PLACE: "person.event.birth.place",
    EVENT_BIRTH_ADDR: "person.event.birth.addr",
    EVENT_DEATH_DATE: "person.event.death.date",
    EVENT_DEATH_PLACE: "person.event.death.place",
    EVENT_DEATH_ADDR: "person.event.death.addr",
    EVENT_BURIAL_DATE: "person.event.burial.date",
    EVENT_BURIAL_PLACE: "person.event.burial.place",
    EVENT_CHRISTENING_DATE: "person.event.christening.date",
    EVENT_CHRISTENING_PLACE: "person.event.christening.place",
    EVENT_BAPTISM_DATE: "person.event.baptism.date",
    EVENT_BAPTISM_PLACE: "person.event.baptism.place",

    // Attributes
    ATTR_OCCUPATION: "person.attr.occupation",
    ATTR_RESIDENCE_PLACE: "person.attr.residence.place",
    ATTR_RESIDENCE_DATE: "person.attr.residence.date",
    ATTR_EDUCATION: "person.attr.education",
    ATTR_RELIGION: "person.attr.religion",
    ATTR_NATIONALITY: "person.attr.nationality",
    ATTR_PHOTO_PRIMARY: "person.attr.photo.primary",

    // Census
    EVENT_CENSUS_DATE: "person.event.census.date",
    EVENT_CENSUS_PLACE: "person.event.census.place",

    // Custom event (type embedded in predicate, e.g. "person.event.custom.NATU.date")
    EVENT_CUSTOM_PREFIX: "person.event.custom",

    // App extensions (lossless projection / structured naming)
    EXT_SURNAME_PATERNAL: "ext.person.name.surname_paternal",
    EXT_SURNAME_MATERNAL: "ext.person.name.surname_maternal",
    EXT_SURNAME_ORDER: "ext.person.name.surname_order",
    EXT_NOTES_RAWTAGS: "ext.person.notes.rawTags",
    EXT_NOTES_REFS: "ext.person.notes.noteRefs",
    EXT_EVENTS_FULL: "ext.person.events.full",
    EXT_NAMES_FULL: "ext.person.names.full",
} as const;

/** All standard predicates for Union nodes. */
export const UnionPredicates = {
    EVENT_MARRIAGE_DATE: "union.event.marriage.date",
    EVENT_MARRIAGE_PLACE: "union.event.marriage.place",
    EVENT_MARRIAGE_TYPE: "union.event.marriage.type",
    EVENT_DIVORCE_DATE: "union.event.divorce.date",
    EVENT_DIVORCE_PLACE: "union.event.divorce.place",
    ATTR_STATUS: "union.attr.status",
    EXT_NOTES_RAWTAGS: "ext.family.notes.rawTags",
    EXT_NOTES_REFS: "ext.family.notes.noteRefs",
    EXT_EVENTS_FULL: "ext.family.events.full",
} as const;

export type PersonPredicate = typeof PersonPredicates[keyof typeof PersonPredicates];
export type UnionPredicate = typeof UnionPredicates[keyof typeof UnionPredicates];
export type StandardPredicate = PersonPredicate | UnionPredicate;

// ─────────────────────────────────────────────
// GEDCOM Tag ↔ Genraph Predicate Mapping
// ─────────────────────────────────────────────

/**
 * Maps a GEDCOM tag path to a Genraph predicate.
 * Tag paths use "." as separator, e.g., "INDI.BIRT.DATE".
 *
 * Bidirectional: use `gedcomToGenraph` and `genraphToGedcom` helpers below.
 */
export const GEDCOM_TO_PREDICATE: Record<string, string> = {
    // Person identity
    "INDI.NAME": PersonPredicates.NAME_FULL,
    "INDI.NAME.GIVN": PersonPredicates.NAME_GIVEN,
    "INDI.NAME.SURN": PersonPredicates.NAME_SURNAME,
    "INDI.NAME.NICK": PersonPredicates.NAME_NICKNAME,
    "INDI.NAME.NPFX": PersonPredicates.NAME_PREFIX,
    "INDI.NAME.NSFX": PersonPredicates.NAME_SUFFIX,
    "INDI.TITL": PersonPredicates.NAME_TITLE,
    "INDI.NAME.TYPE": PersonPredicates.NAME_TYPE,
    "INDI.SEX": PersonPredicates.SEX,

    // Person vital events
    "INDI.BIRT.DATE": PersonPredicates.EVENT_BIRTH_DATE,
    "INDI.BIRT.PLAC": PersonPredicates.EVENT_BIRTH_PLACE,
    "INDI.BIRT.ADDR": PersonPredicates.EVENT_BIRTH_ADDR,
    "INDI.DEAT.DATE": PersonPredicates.EVENT_DEATH_DATE,
    "INDI.DEAT.PLAC": PersonPredicates.EVENT_DEATH_PLACE,
    "INDI.DEAT.ADDR": PersonPredicates.EVENT_DEATH_ADDR,
    "INDI.BURI.DATE": PersonPredicates.EVENT_BURIAL_DATE,
    "INDI.BURI.PLAC": PersonPredicates.EVENT_BURIAL_PLACE,
    "INDI.CHR.DATE": PersonPredicates.EVENT_CHRISTENING_DATE,
    "INDI.CHR.PLAC": PersonPredicates.EVENT_CHRISTENING_PLACE,
    "INDI.BAPM.DATE": PersonPredicates.EVENT_BAPTISM_DATE,
    "INDI.BAPM.PLAC": PersonPredicates.EVENT_BAPTISM_PLACE,

    // Person attributes
    "INDI.OCCU": PersonPredicates.ATTR_OCCUPATION,
    "INDI.RESI.PLAC": PersonPredicates.ATTR_RESIDENCE_PLACE,
    "INDI.RESI.DATE": PersonPredicates.ATTR_RESIDENCE_DATE,
    "INDI.EDUC": PersonPredicates.ATTR_EDUCATION,
    "INDI.RELI": PersonPredicates.ATTR_RELIGION,
    "INDI.NATI": PersonPredicates.ATTR_NATIONALITY,

    // Census
    "INDI.CENS.DATE": PersonPredicates.EVENT_CENSUS_DATE,
    "INDI.CENS.PLAC": PersonPredicates.EVENT_CENSUS_PLACE,

    // Union (Family) events
    "FAM.MARR.DATE": UnionPredicates.EVENT_MARRIAGE_DATE,
    "FAM.MARR.PLAC": UnionPredicates.EVENT_MARRIAGE_PLACE,
    "FAM.MARR.TYPE": UnionPredicates.EVENT_MARRIAGE_TYPE,
    "FAM.DIV.DATE": UnionPredicates.EVENT_DIVORCE_DATE,
    "FAM.DIV.PLAC": UnionPredicates.EVENT_DIVORCE_PLACE,
};

/** Reverse mapping: Genraph predicate → GEDCOM tag path. */
export const PREDICATE_TO_GEDCOM: Record<string, string> = Object.fromEntries(
    Object.entries(GEDCOM_TO_PREDICATE).map(([ged, pred]) => [pred, ged])
);

// ─────────────────────────────────────────────
// Predicate Helpers
// ─────────────────────────────────────────────

/**
 * Look up the Genraph predicate for a given GEDCOM tag path.
 * Returns null if the tag is not in the standard catalog.
 */
export function gedcomTagToPredicate(gedcomPath: string): string | null {
    return GEDCOM_TO_PREDICATE[gedcomPath] ?? null;
}

/**
 * Look up the GEDCOM tag path for a given Genraph predicate.
 * Returns null if the predicate has no standard GEDCOM mapping.
 */
export function predicateToGedcomTag(predicate: string): string | null {
    return PREDICATE_TO_GEDCOM[predicate] ?? null;
}

/** Returns true if a predicate name is a known standard predicate. */
export function isStandardPredicate(predicate: string): predicate is StandardPredicate {
    return predicate in PREDICATE_TO_GEDCOM;
}

/** Returns true if a predicate is an extension (starts with "ext."). */
export function isExtensionPredicate(predicate: string): boolean {
    return predicate.startsWith("ext.");
}

// ─────────────────────────────────────────────
// Claim Value Type Guards
// ─────────────────────────────────────────────

export function isParsedDate(value: unknown): value is ParsedDate {
    return typeof value === "object" && value !== null && "raw" in value;
}

export function isGeoRef(value: unknown): value is GeoRef {
    return typeof value === "object" && value !== null && "placeRaw" in value;
}
