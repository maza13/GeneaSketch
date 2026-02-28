import type { GeneaDocument } from "@/types/domain";

export type ExtractDirection =
    | "paternal_ancestors"
    | "maternal_ancestors"
    | "all_ancestors"
    | "all_descendants";

function collectAncestors(doc: GeneaDocument, startId: string, direction: "all" | "paternal" | "maternal", outPersons: Set<string>, outFamilies: Set<string>) {
    const q = [startId];
    const visited = new Set<string>();

    while (q.length > 0) {
        const curId = q.shift()!;
        if (visited.has(curId)) continue;
        visited.add(curId);
        outPersons.add(curId);

        const p = doc.persons[curId];
        if (!p) continue;

        for (const fId of p.famc) {
            const fam = doc.families[fId];
            if (!fam) continue;

            outFamilies.add(fId);

            if (direction === "all" || direction === "paternal") {
                if (fam.husbandId && !visited.has(fam.husbandId)) {
                    q.push(fam.husbandId);
                }
            }

            if (direction === "all" || direction === "maternal") {
                if (fam.wifeId && !visited.has(fam.wifeId)) {
                    q.push(fam.wifeId);
                }
            }
        }
    }
}

function collectDescendants(doc: GeneaDocument, startId: string, outPersons: Set<string>, outFamilies: Set<string>) {
    const q = [startId];
    const visited = new Set<string>();

    while (q.length > 0) {
        const curId = q.shift()!;
        if (visited.has(curId)) continue;
        visited.add(curId);
        outPersons.add(curId);

        const p = doc.persons[curId];
        if (!p) continue;

        for (const fId of p.fams) {
            const fam = doc.families[fId];
            if (!fam) continue;

            outFamilies.add(fId);

            // Also grab the spouse so the tree makes sense
            if (fam.husbandId && fam.husbandId !== curId) outPersons.add(fam.husbandId);
            if (fam.wifeId && fam.wifeId !== curId) outPersons.add(fam.wifeId);

            for (const childId of fam.childrenIds) {
                if (!visited.has(childId)) {
                    q.push(childId);
                }
            }
        }
    }
}

export function extractSubTree(doc: GeneaDocument, startId: string, direction: ExtractDirection): GeneaDocument {
    const keepPersons = new Set<string>();
    const keepFamilies = new Set<string>();
    const keepMedia = new Set<string>();

    if (direction === "all_ancestors") {
        collectAncestors(doc, startId, "all", keepPersons, keepFamilies);
    } else if (direction === "paternal_ancestors") {
        keepPersons.add(startId);
        const p = doc.persons[startId];
        if (p) {
            for (const fId of p.famc) {
                keepFamilies.add(fId);
                const fam = doc.families[fId];
                if (fam?.husbandId) collectAncestors(doc, fam.husbandId, "all", keepPersons, keepFamilies);
            }
        }
    } else if (direction === "maternal_ancestors") {
        keepPersons.add(startId);
        const p = doc.persons[startId];
        if (p) {
            for (const fId of p.famc) {
                keepFamilies.add(fId);
                const fam = doc.families[fId];
                if (fam?.wifeId) collectAncestors(doc, fam.wifeId, "all", keepPersons, keepFamilies);
            }
        }
    } else if (direction === "all_descendants") {
        collectDescendants(doc, startId, keepPersons, keepFamilies);
    }

    // Sweep and filter
    const next: GeneaDocument = {
        persons: {},
        families: {},
        media: {},
        metadata: { ...doc.metadata }
    };

    keepPersons.forEach(pid => {
        const p = doc.persons[pid];
        if (p) {
            // Filter famc / fams to what we kept
            const copy = { ...p, famc: [...p.famc], fams: [...p.fams] };
            copy.famc = copy.famc.filter(f => keepFamilies.has(f));
            copy.fams = copy.fams.filter(f => keepFamilies.has(f));
            next.persons[pid] = copy;

            copy.mediaRefs.forEach(mid => keepMedia.add(mid));
        }
    });

    keepFamilies.forEach(fid => {
        const f = doc.families[fid];
        if (f) {
            const copy = { ...f, childrenIds: [...f.childrenIds] };
            if (copy.husbandId && !keepPersons.has(copy.husbandId)) copy.husbandId = undefined;
            if (copy.wifeId && !keepPersons.has(copy.wifeId)) copy.wifeId = undefined;
            copy.childrenIds = copy.childrenIds.filter(c => keepPersons.has(c));
            next.families[fid] = copy;
        }
    });

    keepMedia.forEach(mid => {
        if (doc.media[mid]) {
            next.media[mid] = doc.media[mid];
        }
    });

    return next;
}
