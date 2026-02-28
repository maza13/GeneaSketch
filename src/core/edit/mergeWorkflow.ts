import type { DataDiff } from "@/core/edit/diff";

export function hasPendingPersonConflicts(diff: DataDiff): boolean {
    for (const person of Object.values(diff.persons)) {
        if (person.status !== "modified") continue;
        if (Object.values(person.conflicts).some((c) => c && c.resolution === "pending")) return true;
        if (person.eventConflicts.some((c) => c.resolution === "pending")) return true;
    }
    return false;
}

export function hasPendingFamilyConflicts(diff: DataDiff): boolean {
    for (const family of Object.values(diff.families)) {
        if (family.status !== "modified") continue;
        if (family.conflicts.husbandId?.resolution === "pending") return true;
        if (family.conflicts.wifeId?.resolution === "pending") return true;
        if (family.conflicts.childrenConflicts.some((c) => c.resolution === "pending")) return true;
        if (family.conflicts.eventConflicts.some((c) => c.resolution === "pending")) return true;
    }
    return false;
}
