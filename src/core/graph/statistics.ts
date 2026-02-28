import { GeneaDocument } from "../../types/domain";
import { resolveStatisticsBucketLabel } from "@/core/kinship/nomenclature";

export type RelativeGroup = {
    key: string;
    label: string;
    count: number;
    order: number;
    category: "ancestors" | "descendants" | "collateral";
};

export type ChildEventSummary = {
    childId: string;
    childName: string;
    childBirthRaw?: string;
    childBirthYear?: number;
    parentAgeAtBirth?: number;
    estimated: boolean;
};

export type ChildbearingSummary = {
    firstChild?: ChildEventSummary;
    lastChild?: ChildEventSummary;
    phrase: string;
    ageStart?: number;
    ageEnd?: number;
    estimated: boolean;
};

export type PersonStatistics = {
    totalAncestors: number;
    totalDescendants: number;
    averageAncestralLifespan: number | null;
    ancestorsWithLifespanData: number;
    relativesBreakdown: RelativeGroup[];
    childbearingSummary?: ChildbearingSummary;
};

function parseYearInfo(dateRaw?: string): { year?: number; estimated: boolean } {
    if (!dateRaw) return { year: undefined, estimated: true };
    const match = dateRaw.match(/\b(\d{4})\b/);
    if (!match) return { year: undefined, estimated: true };
    const year = parseInt(match[1], 10);
    const exact = /^\s*\d{4}\s*$/.test(dateRaw.trim());
    return { year, estimated: !exact };
}

function getPersonBirthYear(personId: string, doc: GeneaDocument): { year?: number; estimated: boolean } {
    const person = doc.persons[personId];
    const birtRaw = person?.events.find(e => e.type === "BIRT")?.date;
    return parseYearInfo(birtRaw);
}

function getBiologicalParents(personId: string, doc: GeneaDocument): { fatherId?: string, motherId?: string } {
    let fatherId: string | undefined;
    let motherId: string | undefined;

    const person = doc.persons[personId];
    if (person && person.famc.length > 0) {
        const famc = doc.families[person.famc[0]];
        if (famc) {
            fatherId = famc.husbandId;
            motherId = famc.wifeId;
        }
    }
    return { fatherId, motherId };
}

function getBiologicalChildren(personId: string, doc: GeneaDocument): string[] {
    const person = doc.persons[personId];
    if (!person) return [];

    const children = new Set<string>();
    for (const famId of person.fams) {
        const fam = doc.families[famId];
        if (fam) {
            fam.childrenIds.forEach(id => children.add(id));
        }
    }
    return Array.from(children);
}

function toChildSummary(childId: string, doc: GeneaDocument, parentBirthYear?: number, forceEstimated = false): ChildEventSummary {
    const child = doc.persons[childId];
    const childBirthRaw = child?.events.find(e => e.type === "BIRT")?.date;
    const parsed = parseYearInfo(childBirthRaw);
    const parentAgeAtBirth = parentBirthYear !== undefined && parsed.year !== undefined ? parsed.year - parentBirthYear : undefined;

    return {
        childId,
        childName: child?.name || childId,
        childBirthRaw,
        childBirthYear: parsed.year,
        parentAgeAtBirth,
        estimated: forceEstimated || parsed.estimated
    };
}

function buildChildbearingSummary(doc: GeneaDocument, targetId: string): ChildbearingSummary | undefined {
    const children = getBiologicalChildren(targetId, doc);
    if (children.length === 0) {
        return {
            phrase: "No registra hijos.",
            estimated: false
        };
    }

    const parentBirth = getPersonBirthYear(targetId, doc);
    const parentBirthYear = parentBirth.year;

    const entries = children
        .slice()
        .sort((a, b) => a.localeCompare(b))
        .map((childId) => {
            const child = doc.persons[childId];
            const childBirthRaw = child?.events.find(e => e.type === "BIRT")?.date;
            const parsed = parseYearInfo(childBirthRaw);
            return {
                childId,
                childName: child?.name || childId,
                childBirthRaw,
                year: parsed.year,
                estimated: parsed.estimated
            };
        });

    const entriesWithYear = entries.filter((entry) => entry.year !== undefined);
    let firstChild: ChildEventSummary | undefined;
    let lastChild: ChildEventSummary | undefined;

    if (entriesWithYear.length > 0) {
        const sortedByYear = entriesWithYear
            .slice()
            .sort((a, b) => (a.year! - b.year!) || a.childId.localeCompare(b.childId));

        firstChild = toChildSummary(sortedByYear[0].childId, doc, parentBirthYear, sortedByYear[0].estimated);
        lastChild = toChildSummary(sortedByYear[sortedByYear.length - 1].childId, doc, parentBirthYear, sortedByYear[sortedByYear.length - 1].estimated);
    } else {
        firstChild = toChildSummary(entries[0].childId, doc, parentBirthYear, true);
        lastChild = toChildSummary(entries[entries.length - 1].childId, doc, parentBirthYear, true);
    }

    const ageStart = firstChild?.parentAgeAtBirth;
    const ageEnd = lastChild?.parentAgeAtBirth;
    const yStart = firstChild?.childBirthYear;
    const yEnd = lastChild?.childBirthYear;
    const estimated = Boolean(parentBirth.estimated || firstChild?.estimated || lastChild?.estimated);

    let phrase = "Tiene hijos registrados, sin fechas suficientes.";

    if (ageStart !== undefined && ageEnd !== undefined && yStart !== undefined && yEnd !== undefined) {
        phrase = `Tuvo hijos entre los ${ageStart} (${yStart}) y ${ageEnd} (${yEnd}) años.`;
    } else if (ageStart !== undefined && yStart !== undefined) {
        phrase = `Tuvo hijos desde los ${ageStart} años (${yStart}).`;
    } else if (ageEnd !== undefined && yEnd !== undefined) {
        phrase = `Tuvo hijos hasta los ${ageEnd} años (${yEnd}).`;
    } else if (yStart !== undefined && yEnd !== undefined) {
        phrase = `Tuvo hijos entre ${yStart} y ${yEnd}.`;
    } else if (yStart !== undefined) {
        phrase = `Tuvo hijos desde ${yStart}.`;
    } else if (yEnd !== undefined) {
        phrase = `Tuvo hijos hasta ${yEnd}.`;
    }

    if (estimated && phrase !== "No registra hijos.") {
        phrase = `${phrase} Estimado.`;
    }

    return {
        firstChild,
        lastChild,
        phrase,
        ageStart,
        ageEnd,
        estimated
    };
}

export function calculateDetailedStatistics(doc: GeneaDocument, targetId: string): PersonStatistics {
    const stats: PersonStatistics = {
        totalAncestors: 0,
        totalDescendants: 0,
        averageAncestralLifespan: null,
        ancestorsWithLifespanData: 0,
        relativesBreakdown: [],
        childbearingSummary: buildChildbearingSummary(doc, targetId)
    };

    if (!doc.persons[targetId]) return stats;

    const ancestorsDistance = new Map<string, number>();
    let totalLifespanYears = 0;

    const queueUp: { id: string, dist: number }[] = [{ id: targetId, dist: 0 }];
    while (queueUp.length > 0) {
        const { id, dist } = queueUp.shift()!;

        if (ancestorsDistance.has(id) && ancestorsDistance.get(id)! <= dist) continue;

        ancestorsDistance.set(id, dist);

        if (dist > 0) {
            stats.totalAncestors++;

            const p = doc.persons[id];
            if (p) {
                const birtStr = p.events?.find(e => e.type === "BIRT")?.date;
                const deatStr = p.events?.find(e => e.type === "DEAT")?.date;

                const birtMatch = birtStr?.match(/\b(\d{4})\b/);
                const deatMatch = deatStr?.match(/\b(\d{4})\b/);

                const birt = birtMatch ? parseInt(birtMatch[1], 10) : undefined;
                const deat = deatMatch ? parseInt(deatMatch[1], 10) : undefined;

                if (birt !== undefined && deat !== undefined && deat >= birt) {
                    totalLifespanYears += (deat - birt);
                    stats.ancestorsWithLifespanData++;
                }
            }
        }

        const parents = getBiologicalParents(id, doc);
        if (parents.fatherId) queueUp.push({ id: parents.fatherId, dist: dist + 1 });
        if (parents.motherId) queueUp.push({ id: parents.motherId, dist: dist + 1 });
    }

    if (stats.ancestorsWithLifespanData > 0) {
        stats.averageAncestralLifespan = Math.round((totalLifespanYears / stats.ancestorsWithLifespanData) * 10) / 10;
    }

    const visitedDescendants = new Map<string, { d1: number, d2: number }>();

    for (const [ancId, d1] of ancestorsDistance.entries()) {
        const queueDown: { id: string, dist: number }[] = [{ id: ancId, dist: 0 }];
        const currentDownVisited = new Set<string>();

        while (queueDown.length > 0) {
            const { id: descId, dist: d2 } = queueDown.shift()!;

            if (currentDownVisited.has(descId)) continue;
            currentDownVisited.add(descId);

            const existing = visitedDescendants.get(descId);
            const currentTotal = d1 + d2;
            const existingTotal = existing ? existing.d1 + existing.d2 : Infinity;

            if (!existing || currentTotal < existingTotal || (currentTotal === existingTotal && d1 < existing.d1)) {
                visitedDescendants.set(descId, { d1, d2 });
            }

            const children = getBiologicalChildren(descId, doc);
            for (const c of children) {
                queueDown.push({ id: c, dist: d2 + 1 });
            }
        }
    }

    const breakdownMap = new Map<string, { key: string; label: string; count: number; order: number; category: "ancestors" | "descendants" | "collateral" }>();

    Array.from(visitedDescendants.values()).forEach(({ d1, d2 }) => {
        if (d1 === 0 && d2 > 0) {
            stats.totalDescendants++;
        }

        const bucket = resolveStatisticsBucketLabel(d1, d2);
        if (!bucket) return;

        const existing = breakdownMap.get(bucket.key);
        if (existing) {
            existing.count++;
        } else {
            breakdownMap.set(bucket.key, { key: bucket.key, label: bucket.label, count: 1, order: bucket.order, category: bucket.category });
        }
    });

    stats.relativesBreakdown = Array.from(breakdownMap.values())
        .map(({ key, label, count, order, category }) => ({ key, label, count, order, category }))
        .sort((a, b) => a.order - b.order);

    return stats;
}
