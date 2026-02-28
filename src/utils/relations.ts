import type { Family, PendingRelationType } from "@/types/domain";

export function resolveFamilyChildAction(family: Family): { anchorId: string; relationType: PendingRelationType } | null {
    if (family.husbandId) return { anchorId: family.husbandId, relationType: "child" };
    if (family.wifeId) return { anchorId: family.wifeId, relationType: "child" };
    return null;
}
