/**
 * Canonical JSON serialization for GSK integrity checks.
 *
 * This follows RFC 8785 principles for deterministic ordering and JSON output:
 * - Objects are serialized with lexicographically sorted keys.
 * - Arrays keep insertion order.
 * - Primitive values use JSON canonical primitives.
 *
 * Note: This implementation is scoped to plain JSON-compatible values used by GSK.
 */

type JsonLike =
    | null
    | boolean
    | number
    | string
    | JsonLike[]
    | { [key: string]: JsonLike | undefined };

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalizeNumber(value: number): string {
    if (!Number.isFinite(value)) {
        throw new Error("Non-finite numbers are not valid in canonical JSON");
    }
    if (Object.is(value, -0)) return "0";
    return JSON.stringify(value);
}

function canonicalizeInternal(value: unknown): string {
    if (value === null) return "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number") return canonicalizeNumber(value);
    if (typeof value === "string") return JSON.stringify(value);

    if (Array.isArray(value)) {
        const serialized = value.map((item) => {
            if (typeof item === "undefined" || typeof item === "function" || typeof item === "symbol") {
                return "null";
            }
            return canonicalizeInternal(item);
        });
        return `[${serialized.join(",")}]`;
    }

    if (isObject(value)) {
        const keys = Object.keys(value).sort();
        const props: string[] = [];
        for (const key of keys) {
            const prop = value[key];
            if (typeof prop === "undefined" || typeof prop === "function" || typeof prop === "symbol") {
                continue;
            }
            props.push(`${JSON.stringify(key)}:${canonicalizeInternal(prop)}`);
        }
        return `{${props.join(",")}}`;
    }

    return "null";
}

export function canonicalizeJson(value: JsonLike | unknown): string {
    return canonicalizeInternal(value);
}

export function canonicalizeJsonToBytes(value: JsonLike | unknown): Uint8Array {
    return new TextEncoder().encode(canonicalizeJson(value));
}

