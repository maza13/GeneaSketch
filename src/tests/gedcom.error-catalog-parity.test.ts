import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ERROR_CATALOG, ERROR_CODES, isGskModeEntry } from "../core/gschema/errorCatalog";

const GED_PARSER_CODES = [
    ERROR_CODES.PEDI_UNKNOWN_VALUE_COERCED,
    ERROR_CODES.GED_VERSION_MISSING,
    ERROR_CODES.GED_VERSION_UNKNOWN,
];

const GED_SERIALIZER_CODES = [
    ERROR_CODES.PEDI_STE_DEGRADED_TO_UNKNOWN,
    ERROR_CODES.GED_EVENT_OTHER_DROPPED,
    ERROR_CODES.GED_DEAT_IMPLICIT,
    ERROR_CODES.GED_FAM_EVENT_DROPPED,
    ERROR_CODES.GED_RELATION_NOTES_DROPPED,
    ERROR_CODES.GED_MEDIA_BINARY_NOT_EMBEDDED,
    ERROR_CODES.GED_METADATA_EXTENSION_DROPPED,
];

describe("GEDCOM error catalog parity", () => {
    it("defines parser codes as contextual gedcom-parser entries", () => {
        for (const code of GED_PARSER_CODES) {
            const entry = ERROR_CATALOG[code];
            expect(entry).toBeTruthy();
            expect(entry.scope).toBe("gedcom-parser");
            expect(entry.context).toBe("gedcom-import");
            expect(isGskModeEntry(entry)).toBe(false);
        }
    });

    it("defines serializer codes as contextual gedcom-serializer entries", () => {
        for (const code of GED_SERIALIZER_CODES) {
            const entry = ERROR_CATALOG[code];
            expect(entry).toBeTruthy();
            expect(entry.scope).toBe("gedcom-serializer");
            expect(entry.context).toBe("gedcom-export");
            expect(isGskModeEntry(entry)).toBe(false);
        }
    });

    it("parser and serializer do not declare literal code strings", () => {
        const parserSource = fs.readFileSync(path.resolve("src/core/gedcom/parser.ts"), "utf8");
        const serializerSource = fs.readFileSync(path.resolve("src/core/gedcom/serializer.ts"), "utf8");
        const codeLiteralPattern = /code:\s*"([A-Z0-9_]+)"/g;

        expect(parserSource.match(codeLiteralPattern) ?? []).toHaveLength(0);
        expect(serializerSource.match(codeLiteralPattern) ?? []).toHaveLength(0);
    });
});

