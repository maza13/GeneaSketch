import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ERROR_CATALOG } from "../core/genraph/errorCatalog";

function extractCatalogCodesFromWiki(source: string): Set<string> {
    const values = [...source.matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((m) => m[1]);
    return new Set(values);
}

describe("Wiki error catalog parity", () => {
    it("keeps 07_error_catalog codes aligned with runtime catalog", () => {
        const wikiSource = fs.readFileSync(path.resolve("docs/wiki-gsk/07_error_catalog.md"), "utf8");
        const docCodes = extractCatalogCodesFromWiki(wikiSource);
        const runtimeCodes = new Set(Object.keys(ERROR_CATALOG));

        const missingInDocs = [...runtimeCodes].filter((code) => !docCodes.has(code));
        const extraInDocs = [...docCodes].filter((code) => !runtimeCodes.has(code));

        expect(missingInDocs).toEqual([]);
        expect(extraInDocs).toEqual([]);
    });
});

