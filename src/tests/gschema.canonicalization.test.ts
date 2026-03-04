import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { canonicalizeJson } from "../core/gschema/canonicalJson";

function sha256(input: string): string {
    return `sha256:${createHash("sha256").update(new TextEncoder().encode(input)).digest("hex")}`;
}

describe("GSchema canonical JSON", () => {
    it("serializes semantically-equal objects deterministically", () => {
        const a = { z: 1, a: { b: true, a: [3, 2, 1] } };
        const b = { a: { a: [3, 2, 1], b: true }, z: 1 };
        const ca = canonicalizeJson(a);
        const cb = canonicalizeJson(b);
        expect(ca).toBe(cb);
        expect(sha256(ca)).toBe(sha256(cb));
    });

    it("keeps array order and sorts object keys", () => {
        const value = { b: 1, a: [{ d: 2, c: 1 }, { y: 2, x: 1 }] };
        expect(canonicalizeJson(value)).toBe('{"a":[{"c":1,"d":2},{"x":1,"y":2}],"b":1}');
    });
});

