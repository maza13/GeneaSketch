import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function extractOperationTypesFromTypesFile(source: string): Set<string> {
    const blockMatch = source.match(/export type GenraphOperationType =([\s\S]*?);/);
    if (!blockMatch) return new Set<string>();
    const values = [...blockMatch[1].matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]);
    return new Set(values);
}

function extractOperationTypesFromWiki(source: string): Set<string> {
    const section = source.match(/## Tipos de operaciones \(canonicos\)([\s\S]*?)## Politica de recuperacion operativa/);
    if (!section) return new Set<string>();
    const values = [...section[1].matchAll(/- `([A-Z_]+)`/g)].map((m) => m[1]);
    return new Set(values);
}

describe("Wiki Genraph operations parity", () => {
    it("keeps 04_operaciones operation list aligned with types.ts", () => {
        const typesSource = fs.readFileSync(path.resolve("src/core/genraph/types.ts"), "utf8");
        const wikiSource = fs.readFileSync(path.resolve("docs/wiki-gsk/04_operaciones.md"), "utf8");

        const runtimeOps = extractOperationTypesFromTypesFile(typesSource);
        const documentedOps = extractOperationTypesFromWiki(wikiSource);

        const missingInDocs = [...runtimeOps].filter((op) => !documentedOps.has(op));
        const extraInDocs = [...documentedOps].filter((op) => !runtimeOps.has(op));

        expect(missingInDocs).toEqual([]);
        expect(extraInDocs).toEqual([]);
    });
});

