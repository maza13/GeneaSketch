import type { GeneaDocument, PendingRelationType } from "@/types/domain";

/**
 * Normalizes a place string to Title Case and trims whitespace.
 */
export function normalizePlace(place: string): string {
    return place
        .split(',')
        // Correct types for map: string, number, string[]
        .map((part: string) => part.trim().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '))
        .filter(Boolean)
        .join(', ');
}

/**
 * Retrieves surname suggestions based on the anchor person and relationship type.
 * Useful for Hispanic double-surname conventions.
 */
export function getSurnameSuggestions(
    document: GeneaDocument | null,
    anchorId: string | null,
    relationType: PendingRelationType | null
): { paternal: string; maternal: string }[] {
    if (!document || !anchorId || !relationType) return [];

    const anchor = document.persons[anchorId];
    if (!anchor) return [];

    const results: { paternal: string; maternal: string }[] = [];

    // Anchor's parts
    const anchorSurnameParts = (anchor.surname || "").split(" ").filter(Boolean);
    const anchorPaternal = anchorSurnameParts[0] || "";
    const anchorMaternal = anchorSurnameParts.slice(1).join(" ") || "";

    if (relationType === "child") {
        // If we are adding a child to the anchor:
        // Paternal = Anchor's primary surname (if anchor is male)
        // Maternal = Partner's primary surname
        // However, the anchor might be the mother or the father.

        // We search for families where anchor is head
        const families = Object.values(document.families).filter(f => f.husbandId === anchorId || f.wifeId === anchorId);

        for (const fam of families) {
            const partnerId = fam.husbandId === anchorId ? fam.wifeId : fam.husbandId;
            const partner = partnerId ? document.persons[partnerId] : null;
            const partnerSurnameParts = (partner?.surname || "").split(" ").filter(Boolean);
            const partnerPaternal = partnerSurnameParts[0] || "";

            if (anchor.sex === "M") {
                results.push({ paternal: anchorPaternal, maternal: partnerPaternal });
            } else if (anchor.sex === "F") {
                results.push({ paternal: partnerPaternal, maternal: anchorPaternal });
            } else {
                // Ambiguous, suggest both ways if possible
                results.push({ paternal: anchorPaternal, maternal: partnerPaternal });
                if (partnerPaternal) results.push({ paternal: partnerPaternal, maternal: anchorPaternal });
            }
        }

        // If no families yet, just suggest anchor's as paternal if male, maternal if female
        if (results.length === 0) {
            if (anchor.sex === "M") results.push({ paternal: anchorPaternal, maternal: "" });
            else if (anchor.sex === "F") results.push({ paternal: "", maternal: anchorPaternal });
        }
    } else if (relationType === "sibling") {
        // Sibling should have the same surnames
        results.push({ paternal: anchorPaternal, maternal: anchorMaternal });
    } else if (relationType === "father") {
        // Anchor's father likely has anchor's paternal surname as his paternal surname
        results.push({ paternal: anchorPaternal, maternal: "" });
    } else if (relationType === "mother") {
        // Anchor's mother likely has anchor's maternal surname as her paternal surname (in many cultures)
        results.push({ paternal: anchorMaternal, maternal: "" });
    }

    return results.filter(r => r.paternal || r.maternal);
}

/**
 * Gets unique first names from the document for autocompletion.
 */
export function getNameSuggestions(document: GeneaDocument | null, query: string): string[] {
    if (!document) return [];
    const q = query.toLowerCase().trim();
    const names = new Set<string>();

    Object.values(document.persons).forEach(p => {
        if (p.name && p.name !== "(Sin nombre)") {
            names.add(p.name);
        }
    });

    return Array.from(names)
        .filter(n => n.toLowerCase().includes(q))
        .sort((a, b) => {
            const aStarts = a.toLowerCase().startsWith(q);
            const bStarts = b.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.localeCompare(b);
        })
        .slice(0, 10);
}

/**
 * Gets unique places from the document for autocompletion.
 * Ranks by frequency.
 */
export function getPlaceSuggestions(document: GeneaDocument | null, query: string): string[] {
    if (!document) return [];
    const q = query.toLowerCase().trim();
    const placeCounts: Record<string, number> = {};

    const processPlace = (p: string | undefined) => {
        if (!p) return;
        const norm = normalizePlace(p);
        placeCounts[norm] = (placeCounts[norm] || 0) + 1;
    };

    Object.values(document.persons).forEach(p => {
        processPlace(p.birthPlace);
        processPlace(p.deathPlace);
        processPlace(p.residence);
        p.events.forEach(e => processPlace(e.place));
    });

    Object.values(document.families).forEach(f => {
        f.events.forEach(e => processPlace(e.place));
    });

    return Array.from(Object.keys(placeCounts))
        .filter(p => p.toLowerCase().includes(q))
        .sort((a, b) => {
            const aStarts = a.toLowerCase().startsWith(q);
            const bStarts = b.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            // Then by frequency
            return placeCounts[b] - placeCounts[a];
        })
        .slice(0, 10);
}
