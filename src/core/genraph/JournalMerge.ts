import type { GenraphOperation } from "./types";
import { reindexJournal } from "./Journal";

export interface JournalMergeConflict {
    key: string;
    leftOpIds: string[];
    rightOpIds: string[];
}

export interface JournalMergeResult {
    ancestorOpSeq: number;
    mergedOps: GenraphOperation[];
    conflicts: JournalMergeConflict[];
}

function bySeq(ops: readonly GenraphOperation[]): Map<number, GenraphOperation> {
    const m = new Map<number, GenraphOperation>();
    for (const op of ops) m.set(op.opSeq, op);
    return m;
}

function findCommonAncestorOpSeq(
    base: readonly GenraphOperation[],
    left: readonly GenraphOperation[],
    right: readonly GenraphOperation[]
): number {
    const b = bySeq(base);
    const l = bySeq(left);
    const r = bySeq(right);
    const maxSeq = Math.min(
        Math.max(...base.map((op) => op.opSeq), -1),
        Math.max(...left.map((op) => op.opSeq), -1),
        Math.max(...right.map((op) => op.opSeq), -1)
    );
    let ancestor = -1;
    for (let seq = 0; seq <= maxSeq; seq++) {
        const bo = b.get(seq);
        const lo = l.get(seq);
        const ro = r.get(seq);
        if (!bo || !lo || !ro) break;
        if (bo.opId !== lo.opId || bo.opId !== ro.opId) break;
        ancestor = seq;
    }
    return ancestor;
}

function opTargetKey(op: GenraphOperation): string | null {
    if (op.type === "ADD_CLAIM") return `${op.claim.nodeUid}::${op.claim.predicate}`;
    if (op.type === "SET_PREF_CLAIM") return `${op.nodeUid}::${op.predicate}`;
    return null;
}

export function mergeJournalsThreeWay(
    base: readonly GenraphOperation[],
    left: readonly GenraphOperation[],
    right: readonly GenraphOperation[]
): JournalMergeResult {
    const ancestorOpSeq = findCommonAncestorOpSeq(base, left, right);
    const ancestorOps = base
        .filter((op) => op.opSeq <= ancestorOpSeq)
        .sort((a, b) => a.opSeq - b.opSeq);
    const ancestorOpIds = new Set(ancestorOps.map((op) => op.opId));

    const leftOnly = left.filter((op) => op.opSeq > ancestorOpSeq && !ancestorOpIds.has(op.opId));
    const rightOnly = right.filter((op) => op.opSeq > ancestorOpSeq && !ancestorOpIds.has(op.opId));

    const leftByKey = new Map<string, string[]>();
    const rightByKey = new Map<string, string[]>();
    for (const op of leftOnly) {
        const key = opTargetKey(op);
        if (!key) continue;
        leftByKey.set(key, [...(leftByKey.get(key) ?? []), op.opId]);
    }
    for (const op of rightOnly) {
        const key = opTargetKey(op);
        if (!key) continue;
        rightByKey.set(key, [...(rightByKey.get(key) ?? []), op.opId]);
    }

    const conflicts: JournalMergeConflict[] = [];
    for (const [key, leftOpIds] of leftByKey.entries()) {
        const rightOpIds = rightByKey.get(key);
        if (!rightOpIds || rightOpIds.length === 0) continue;
        conflicts.push({ key, leftOpIds, rightOpIds });
    }

    const tail = [...leftOnly, ...rightOnly]
        .sort((a, b) => (a.timestamp - b.timestamp) || a.opId.localeCompare(b.opId));
    const seenTail = new Set<string>();
    const dedupTail: GenraphOperation[] = [];
    for (const op of tail) {
        if (seenTail.has(op.opId)) continue;
        seenTail.add(op.opId);
        dedupTail.push(op);
    }

    const mergedRaw = [...ancestorOps, ...dedupTail];
    const mergedOps = reindexJournal(mergedRaw);

    return { ancestorOpSeq, mergedOps, conflicts };
}

