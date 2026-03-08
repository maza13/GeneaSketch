import type { GClaim } from "./types";

function toSortableTimestamp(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toSortableIso(value: unknown): string {
    return typeof value === "string" ? value : "";
}

export function compareClaimCanonical(a: GClaim, b: GClaim): number {
    const tsA = toSortableTimestamp(a.provenance?.timestamp);
    const tsB = toSortableTimestamp(b.provenance?.timestamp);
    if (tsA !== tsB) return tsA - tsB;

    const createdA = toSortableIso(a.createdAt);
    const createdB = toSortableIso(b.createdAt);
    if (createdA !== createdB) return createdA < createdB ? -1 : 1;

    const uidA = a.uid ?? "";
    const uidB = b.uid ?? "";
    if (uidA === uidB) return 0;
    return uidA < uidB ? -1 : 1;
}

export function sortClaimsCanonical(claims: GClaim[]): void {
    claims.sort(compareClaimCanonical);
}

function pickMostRecentActive(claims: GClaim[]): GClaim | null {
    const activeClaims = claims.filter((claim) => claim.lifecycle !== "retracted");
    if (activeClaims.length === 0) return null;
    return activeClaims.reduce((latest, current) => (compareClaimCanonical(current, latest) > 0 ? current : latest));
}

export function enforcePreferredCardinality(claims: GClaim[]): void {
    for (const claim of claims) {
        if (claim.lifecycle === "retracted") {
            claim.isPreferred = false;
        }
    }

    const activeClaims = claims.filter((claim) => claim.lifecycle !== "retracted");
    if (activeClaims.length === 0) return;

    const preferredActive = activeClaims.filter((claim) => claim.isPreferred);
    if (preferredActive.length === 1) {
        for (const claim of activeClaims) {
            if (!preferredActive.includes(claim)) {
                claim.isPreferred = false;
            }
        }
        return;
    }

    const winner = pickMostRecentActive(claims);
    for (const claim of activeClaims) {
        claim.isPreferred = winner !== null && claim.uid === winner.uid;
    }
}

export function normalizeClaims(claims: GClaim[]): void {
    sortClaimsCanonical(claims);
    enforcePreferredCardinality(claims);
}

export function isClaimsCanonical(claims: readonly GClaim[]): boolean {
    for (let i = 1; i < claims.length; i++) {
        if (compareClaimCanonical(claims[i - 1], claims[i]) > 0) {
            return false;
        }
    }
    return true;
}
