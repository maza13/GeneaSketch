import { describe, expect, it } from "vitest";
import { ERROR_CATALOG, ERROR_CODES, getErrorCatalogEntry, isGskModeEntry } from "../core/gschema/errorCatalog";

describe("GSchema error catalog", () => {
    it("contains required gsk and ged codes", () => {
        const required = [
            ERROR_CODES.EDGE_TYPE_UNKNOWN,
            ERROR_CODES.EDGE_TYPE_UNKNOWN_IN_JOURNAL,
            ERROR_CODES.QUARANTINE_MIRROR_MISSING,
            ERROR_CODES.PARENT_CHILD_MISSING_UNION,
            ERROR_CODES.GRAPH_HASH_MISMATCH,
            ERROR_CODES.JOURNAL_HASH_MISMATCH,
            ERROR_CODES.PACKAGE_HASH_MISMATCH,
            ERROR_CODES.SECURITY_MODE_UNSUPPORTED,
            ERROR_CODES.PREFERRED_CLAIM_REQUIRED,
            ERROR_CODES.MULTIPLE_PREFERRED_CLAIMS,
            ERROR_CODES.CLAIMS_NOT_CANONICAL_ORDER,
            ERROR_CODES.RETRACTED_CLAIM_IS_PREFERRED,
            ERROR_CODES.GED_VERSION_MISSING,
            ERROR_CODES.GED_VERSION_UNKNOWN,
            ERROR_CODES.PEDI_UNKNOWN_VALUE_COERCED,
            ERROR_CODES.PEDI_STE_DEGRADED_TO_UNKNOWN,
            ERROR_CODES.GED_MEDIA_BINARY_NOT_EMBEDDED,
        ];
        for (const code of required) {
            expect(ERROR_CATALOG[code]).toBeTruthy();
            expect(getErrorCatalogEntry(code)?.code).toBe(code);
        }
    });

    it("defines mode severity for gsk entries and contextual severity for ged entries", () => {
        for (const entry of Object.values(ERROR_CATALOG)) {
            expect(entry.scope).toBeTruthy();
            expect(entry.context).toBeTruthy();
            if (isGskModeEntry(entry)) {
                expect(entry.severityByMode["strict-lossless"]).toBeTruthy();
                expect(entry.severityByMode["strict-lossless-audit"]).toBeTruthy();
                expect(entry.severityByMode.compat).toBeTruthy();
            } else {
                expect(entry.severity).toBeTruthy();
            }
        }
    });

    it("exports unique canonical code constants", () => {
        const values = Object.values(ERROR_CODES);
        expect(new Set(values).size).toBe(values.length);
    });
});
