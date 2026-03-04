import type { GeneaDocument, Person, Family, Event, MergeAction, MergeExplain, MergeHypothesis, MergeRiskLevel } from "@/types/domain";

import type { MatchResult } from "@/core/edit/personMatcher";
import { scoreMatch } from "@/core/edit/personMatcher";

export type DiffResolution = "pending" | "keep_base" | "accept_incoming";

export type Conflict<T> = {
    base: T;
    incoming: T;
    resolution: DiffResolution;
};

export type EventConflict = {
    baseEvent: Event;
    incomingEvent: Event;
    resolution: DiffResolution;
    reason: string;
};

export type ChildMembershipConflict = {
    childId: string;
    kind: "missing_in_base" | "missing_in_incoming";
    resolution: DiffResolution;
};

export type PersonDiff = {
    id: string;
    incomingId: string;
    status: "new" | "modified" | "identical";
    basePerson?: Person;
    incomingPerson: Person;
    conflicts: {
        name?: Conflict<string>;
        surname?: Conflict<string | undefined>;
        sex?: Conflict<Person["sex"]>;
        lifeStatus?: Conflict<Person["lifeStatus"]>;
    };
    eventConflicts: EventConflict[];
    newEvents: Event[];
};

export type FamilyDiff = {
    id: string;
    incomingId: string;
    status: "new" | "modified" | "identical";
    baseFamily?: Family;
    incomingFamily: Family;
    conflicts: {
        husbandId?: Conflict<string | undefined>;
        wifeId?: Conflict<string | undefined>;
        childrenConflicts: ChildMembershipConflict[];
        eventConflicts: EventConflict[];
    };
    newChildrenIds: string[];
    newEvents: Event[];
};

export type DiffSummary = {
    totalIncomingPersons: number;
    matchedHigh: number;
    ambiguous: number;
    unmatched: number;
    personConflicts: number;
    familyConflicts: number;
    estimatedRisk: number;
    compatibilitySummary?: {
        baseFormat: GeneaDocument["metadata"]["sourceFormat"];
        incomingFormat: GeneaDocument["metadata"]["sourceFormat"];
        baseVersion: string;
        incomingVersion: string;
        normalizedTo: {
            sourceFormat: "GSK";
            gedVersion: "7.0.x";
        };
    };
};

export type DataDiff = {
  persons: Record<string, PersonDiff>;
  families: Record<string, FamilyDiff>;
    idRemap: {
        persons: Record<string, string>;
        families: Record<string, string>;
    };
    summary: DiffSummary;
    globalSimilarity?: {
        personIdentitySimilarity: number;
        familyStructureSimilarity: number;
        modeHint: "mostly_equal" | "mixed" | "mostly_different";
    };
    changeBuckets?: {
        unchanged: string[];
        cleanAdds: string[];
        safeUpdates: string[];
        riskyUpdates: string[];
        blocked: string[];
    };
    matchEvidence?: Record<string, {
        candidates: Array<{
            baseId: string;
            score: number;
            confidence: "high" | "medium" | "low";
            blockers: string[];
            signals: string[];
            qualityFlags?: string[];
            riskLevel?: MergeRiskLevel;
            chosenHypothesisType?: string;
            requiredActions?: MergeAction[];
            explain?: MergeExplain;
            chosenHypothesis?: MergeHypothesis;
            hypothesesTopK?: MergeHypothesis[];
        }>;
    }>;
    reviewConfig?: {
        version: "v3" | "v4";
        preset: "strict" | "balanced" | "fast";
        thresholds: {
            autoScoreMin: number;
            minDeltaVsSecond: number;
            minCoverage: number;
            mediumAutoScoreMin?: number;
            mediumAutoCoverageMin?: number;
            mediumAutoDeltaMin?: number;
            globalScoreMin?: number;
            globalSupportMin?: number;
            criticalOverrideScoreMin?: number;
            criticalOverrideSupportMin?: number;
            criticalOverrideAnchorMin?: number;
        };
        stats?: {
            autoAppliedMedium: number;
            revertedActions: number;
            networkConfirmed?: number;
            criticalOverrides?: number;
            globalIterations?: number;
        };
    };
};

export type DiffMatchStats = {
    matchedHigh: number;
    ambiguous: number;
    unmatched: number;
};

function areEventsEqual(e1: Event, e2: Event): boolean {
    return e1.type === e2.type && e1.date === e2.date && e1.place === e2.place;
}

function findByType(events: Event[], type: Event["type"]): Event[] {
    return events.filter((e) => e.type === type);
}

function splitEvents(baseEvents: Event[], incomingEvents: Event[]): { newEvents: Event[]; eventConflicts: EventConflict[] } {
    const newEvents: Event[] = [];
    const eventConflicts: EventConflict[] = [];

    for (const incoming of incomingEvents) {
        if (baseEvents.some((base) => areEventsEqual(base, incoming))) {
            continue;
        }

        const sameType = findByType(baseEvents, incoming.type);
        if (sameType.length > 0) {
            eventConflicts.push({
                baseEvent: sameType[0],
                incomingEvent: incoming,
                resolution: "pending",
                reason: `Evento ${incoming.type} con fecha/lugar divergente`
            });
        } else {
            newEvents.push(incoming);
        }
    }

    return { newEvents, eventConflicts };
}

function uniqueStringList(a: string[], b: string[]): string[] {
    return Array.from(new Set([...a, ...b]));
}

function cloneAction(action: MergeAction): MergeAction {
    return structuredClone(action);
}

function buildFallbackExplain(incomingId: string, reason: string): MergeExplain {
    return {
        categoryPoints: {
            identity: 0,
            temporal: 0,
            geography: 0,
            familyNetwork: 0,
            documentStructure: 0
        },
        subCategoryPoints: {
            familyParents: 0,
            familyUnions: 0,
            familyChildren: 0,
            familySiblings: 0,
            familyGrandparents: 0
        },
        penalties: [],
        coverage: {
            comparableSignals: 0,
            availableSignals: 1,
            coverageRatio: 0,
            coveragePenalty: 18
        },
        capsApplied: [],
        blockers: [],
        decisionReason: reason,
        requiredActions: [{ kind: "create_person", incomingId, preferredId: incomingId }]
    };
}

function nextNumericId(existing: Set<string>, prefix: "@I" | "@F", fallbackSeed: string): string {
    const regex = prefix === "@I" ? /^@I(\d+)@$/ : /^@F(\d+)@$/;
    let max = 0;
    existing.forEach((id) => {
        const m = id.match(regex);
        if (m) {
            const n = Number(m[1]);
            if (n > max) max = n;
        }
    });
    let candidate = `${prefix}${max + 1}@`;
    while (existing.has(candidate)) {
        max += 1;
        candidate = `${prefix}${max + 1}@`;
    }
    if (!existing.has(candidate)) return candidate;

    let i = 1;
    let alt = `${fallbackSeed}_m${i}`;
    while (existing.has(alt)) {
        i += 1;
        alt = `${fallbackSeed}_m${i}`;
    }
    return alt;
}

function generateUniqueId(existing: Set<string>, preferred: string, kind: "person" | "family"): string {
    if (!existing.has(preferred)) return preferred;

    const numeric = kind === "person" ? nextNumericId(existing, "@I", preferred) : nextNumericId(existing, "@F", preferred);
    if (!existing.has(numeric)) return numeric;

    let i = 1;
    let candidate = `${preferred}_m${i}`;
    while (existing.has(candidate)) {
        i += 1;
        candidate = `${preferred}_m${i}`;
    }
    return candidate;
}

function ensureReferencedPersons(doc: GeneaDocument): GeneaDocument {
    const next: GeneaDocument = {
        persons: { ...doc.persons },
        families: { ...doc.families },
        unions: doc.unions ? { ...doc.unions } : undefined,
        parentChildLinks: doc.parentChildLinks ? { ...doc.parentChildLinks } : undefined,
        siblingLinks: doc.siblingLinks ? { ...doc.siblingLinks } : undefined,
        media: { ...doc.media },
        metadata: { ...doc.metadata }
    };

    const ensurePerson = (personId: string, reason: string) => {
        if (!personId || next.persons[personId]) return;
        next.persons[personId] = {
            id: personId,
            name: "(Pending)",
            surname: undefined,
            sex: "U",
            lifeStatus: "alive",
            pendingEnrichment: {
                reason,
                confidence: 0.45,
                createdAt: new Date().toISOString()
            },
            events: [],
            famc: [],
            fams: [],
            mediaRefs: [],
            sourceRefs: []
        };
    };

    for (const family of Object.values(next.families)) {
        if (family.husbandId) {
            ensurePerson(family.husbandId, "anchor-insertion-missing-husband");
            if (!next.persons[family.husbandId].fams.includes(family.id)) next.persons[family.husbandId].fams.push(family.id);
        }
        if (family.wifeId) {
            ensurePerson(family.wifeId, "anchor-insertion-missing-wife");
            if (!next.persons[family.wifeId].fams.includes(family.id)) next.persons[family.wifeId].fams.push(family.id);
        }
        for (const childId of family.childrenIds) {
            ensurePerson(childId, "anchor-insertion-missing-child");
            if (!next.persons[childId].famc.includes(family.id)) next.persons[childId].famc.push(family.id);
        }
    }
    return next;
}

function buildPersonRemap(
    baseDoc: GeneaDocument,
    incomingDoc: GeneaDocument,
    resolvedMatches: Map<string, string>
): Record<string, string> {
    const remap: Record<string, string> = {};
    const used = new Set<string>(Object.keys(baseDoc.persons));
    const incomingIds = Object.keys(incomingDoc.persons).sort((a, b) => a.localeCompare(b));

    for (const incomingId of incomingIds) {
        const matchedBase = resolvedMatches.get(incomingId);
        if (matchedBase && baseDoc.persons[matchedBase]) {
            remap[incomingId] = matchedBase;
            continue;
        }

        const mapped = generateUniqueId(used, incomingId, "person");
        remap[incomingId] = mapped;
        used.add(mapped);
    }

    return remap;
}

function shouldKeepFamilyIdOnCollision(base: Family, mappedHusband?: string, mappedWife?: string, mappedChildren: string[] = []): boolean {
    const sharedSpouse = Boolean((mappedHusband && base.husbandId === mappedHusband) || (mappedWife && base.wifeId === mappedWife));
    const exactParents = base.husbandId === mappedHusband && base.wifeId === mappedWife;
    const sharedChild = mappedChildren.some((c) => base.childrenIds.includes(c));
    return exactParents || sharedSpouse || sharedChild;
}

function buildFamilyRemap(baseDoc: GeneaDocument, incomingDoc: GeneaDocument, personRemap: Record<string, string>): Record<string, string> {
    const remap: Record<string, string> = {};
    const used = new Set<string>(Object.keys(baseDoc.families));
    const incomingFamilies = Object.values(incomingDoc.families).sort((a, b) => a.id.localeCompare(b.id));

    for (const fam of incomingFamilies) {
        const mappedHusband = fam.husbandId ? personRemap[fam.husbandId] : undefined;
        const mappedWife = fam.wifeId ? personRemap[fam.wifeId] : undefined;
        const mappedChildren = fam.childrenIds.map((c) => personRemap[c]).filter(Boolean);

        if (!used.has(fam.id)) {
            remap[fam.id] = fam.id;
            used.add(fam.id);
            continue;
        }

        const baseColliding = baseDoc.families[fam.id];
        if (baseColliding && shouldKeepFamilyIdOnCollision(baseColliding, mappedHusband, mappedWife, mappedChildren)) {
            remap[fam.id] = fam.id;
            continue;
        }

        const mapped = generateUniqueId(used, fam.id, "family");
        remap[fam.id] = mapped;
        used.add(mapped);
    }

    return remap;
}

export function calculateDiff(
    baseDoc: GeneaDocument,
    incomingDoc: GeneaDocument,
    resolvedMatches?: Map<string, string>,
    matchStats?: DiffMatchStats,
    matchResult?: MatchResult
): DataDiff {
    const incomingSafe = ensureReferencedPersons(incomingDoc);
    const resolved = resolvedMatches ? new Map(resolvedMatches) : new Map<string, string>();
    const personRemap = buildPersonRemap(baseDoc, incomingSafe, resolved);
    const familyRemap = buildFamilyRemap(baseDoc, incomingSafe, personRemap);

    const diff: DataDiff = {
        persons: {},
        families: {},
        idRemap: {
            persons: personRemap,
            families: familyRemap
        },
        summary: {
            totalIncomingPersons: Object.keys(incomingSafe.persons).length,
            matchedHigh: matchStats?.matchedHigh ?? matchResult?.autoMatches.size ?? resolved.size,
            ambiguous: matchStats?.ambiguous ?? matchResult?.ambiguousMatches.size ?? 0,
            unmatched: matchStats?.unmatched ?? matchResult?.unmatched.length ?? 0,
            personConflicts: 0,
            familyConflicts: 0,
            estimatedRisk: 0,
            compatibilitySummary: {
                baseFormat: baseDoc.metadata.sourceFormat,
                incomingFormat: incomingSafe.metadata.sourceFormat,
                baseVersion: baseDoc.metadata.gedVersion,
                incomingVersion: incomingSafe.metadata.gedVersion,
                normalizedTo: {
                    sourceFormat: "GSK",
                    gedVersion: "7.0.x"
                }
            }
        },
        globalSimilarity: {
            personIdentitySimilarity: 0,
            familyStructureSimilarity: 0,
            modeHint: "mixed"
        },
        changeBuckets: {
            unchanged: [],
            cleanAdds: [],
            safeUpdates: [],
            riskyUpdates: [],
            blocked: []
        },
        matchEvidence: {}
    };

    for (const incP of Object.values(incomingSafe.persons)) {
        const mappedId = personRemap[incP.id];
        const isMatchedToBase = baseDoc.persons[mappedId] !== undefined;

        if (isMatchedToBase) {
            const baseP = baseDoc.persons[mappedId];
            const split = splitEvents(baseP.events, incP.events);
            const conflicts: PersonDiff["conflicts"] = {};

            if (baseP.name !== incP.name && incP.name.trim() !== "") {
                conflicts.name = { base: baseP.name, incoming: incP.name, resolution: "pending" };
            }
            if (baseP.surname !== incP.surname && (incP.surname || "").trim() !== "") {
                conflicts.surname = { base: baseP.surname, incoming: incP.surname, resolution: "pending" };
            }
            if (baseP.sex !== incP.sex && incP.sex !== "U") {
                conflicts.sex = { base: baseP.sex, incoming: incP.sex, resolution: "pending" };
            }
            if (baseP.lifeStatus !== incP.lifeStatus) {
                conflicts.lifeStatus = { base: baseP.lifeStatus, incoming: incP.lifeStatus, resolution: "pending" };
            }

            const fieldConflictCount = Object.keys(conflicts).length;
            const personConflictCount = fieldConflictCount + split.eventConflicts.length;
            diff.summary.personConflicts += personConflictCount;

            const modified = personConflictCount > 0 || split.newEvents.length > 0;

            diff.persons[mappedId] = {
                id: mappedId,
                incomingId: incP.id,
                status: modified ? "modified" : "identical",
                basePerson: baseP,
                incomingPerson: { ...incP, id: mappedId },
                conflicts,
                eventConflicts: split.eventConflicts,
                newEvents: split.newEvents
            };
        } else {
            diff.persons[mappedId] = {
                id: mappedId,
                incomingId: incP.id,
                status: "new",
                incomingPerson: { ...incP, id: mappedId },
                conflicts: {},
                eventConflicts: [],
                newEvents: [...incP.events]
            };
        }
    }

    for (const incF of Object.values(incomingSafe.families)) {
        const mappedFamilyId = familyRemap[incF.id];
        const mappedHusband = incF.husbandId ? personRemap[incF.husbandId] : undefined;
        const mappedWife = incF.wifeId ? personRemap[incF.wifeId] : undefined;
        const mappedChildren = uniqueStringList([], incF.childrenIds.map((c) => personRemap[c]).filter(Boolean));

        const existingByMappedId = baseDoc.families[mappedFamilyId];
        const existingBySpouse = Object.values(baseDoc.families).find((f) => f.husbandId === mappedHusband && f.wifeId === mappedWife);
        const existingFamily = existingByMappedId || existingBySpouse;
        const finalFamilyId = existingFamily ? existingFamily.id : mappedFamilyId;

        if (existingFamily) {
            const split = splitEvents(existingFamily.events, incF.events);
            const childrenConflicts: ChildMembershipConflict[] = [];

            for (const childId of mappedChildren) {
                if (!existingFamily.childrenIds.includes(childId)) {
                    childrenConflicts.push({ childId, kind: "missing_in_base", resolution: "pending" });
                }
            }
            for (const childId of existingFamily.childrenIds) {
                if (!mappedChildren.includes(childId)) {
                    childrenConflicts.push({ childId, kind: "missing_in_incoming", resolution: "pending" });
                }
            }

            const conflicts: FamilyDiff["conflicts"] = {
                childrenConflicts,
                eventConflicts: split.eventConflicts
            };

            if ((mappedHusband || existingFamily.husbandId) && mappedHusband !== existingFamily.husbandId) {
                conflicts.husbandId = { base: existingFamily.husbandId, incoming: mappedHusband, resolution: "pending" };
            }
            if ((mappedWife || existingFamily.wifeId) && mappedWife !== existingFamily.wifeId) {
                conflicts.wifeId = { base: existingFamily.wifeId, incoming: mappedWife, resolution: "pending" };
            }

            const familyConflictCount =
                (conflicts.husbandId ? 1 : 0) +
                (conflicts.wifeId ? 1 : 0) +
                childrenConflicts.length +
                split.eventConflicts.length;

            diff.summary.familyConflicts += familyConflictCount;

            const newChildrenIds = childrenConflicts.filter((c) => c.kind === "missing_in_base").map((c) => c.childId);
            const modified = familyConflictCount > 0 || split.newEvents.length > 0 || newChildrenIds.length > 0;

            diff.families[finalFamilyId] = {
                id: finalFamilyId,
                incomingId: incF.id,
                status: modified ? "modified" : "identical",
                baseFamily: existingFamily,
                incomingFamily: {
                    ...incF,
                    id: finalFamilyId,
                    husbandId: mappedHusband,
                    wifeId: mappedWife,
                    childrenIds: mappedChildren
                },
                conflicts,
                newChildrenIds,
                newEvents: split.newEvents
            };
        } else {
            diff.families[finalFamilyId] = {
                id: finalFamilyId,
                incomingId: incF.id,
                status: "new",
                incomingFamily: {
                    ...incF,
                    id: finalFamilyId,
                    husbandId: mappedHusband,
                    wifeId: mappedWife,
                    childrenIds: mappedChildren
                },
                conflicts: {
                    childrenConflicts: [],
                    eventConflicts: []
                },
                newChildrenIds: mappedChildren,
                newEvents: [...incF.events]
            };
        }
    }

    diff.summary.estimatedRisk = Math.min(
        100,
        diff.summary.personConflicts * 8 + diff.summary.familyConflicts * 10 + diff.summary.ambiguous * 5
    );

    const incomingIsLegacy = incomingSafe.metadata.gedVersion === "5.5" || incomingSafe.metadata.gedVersion === "5.5.1";
    for (const incomingId of Object.keys(incomingSafe.persons)) {
        const candidatesFromMatch = matchResult?.ambiguousMatches.get(incomingId);
        const autoBaseId = matchResult?.autoMatches.get(incomingId);

        if (candidatesFromMatch && candidatesFromMatch.length > 0) {
            diff.matchEvidence![incomingId] = {
                candidates: candidatesFromMatch.map((candidate) => ({
                    baseId: candidate.baseId,
                    score: candidate.score,
                    confidence: candidate.confidence,
                    blockers: candidate.blockers.map((blocker) => `${blocker.severity}:${blocker.code}`),
                    signals: candidate.signals,
                    qualityFlags: [...(candidate.qualityFlags || []), ...(incomingIsLegacy ? ["legacy-converted"] : [])],
                    riskLevel: candidate.riskLevel,
                    chosenHypothesisType: candidate.chosenHypothesis.hypothesisType,
                    requiredActions: candidate.requiredActions.map((action) => cloneAction(action)),
                    explain: structuredClone(candidate.explain),
                    chosenHypothesis: structuredClone(candidate.chosenHypothesis),
                    hypothesesTopK: candidate.hypothesesTopK.map((hypothesis) => structuredClone(hypothesis))
                }))
            };
            continue;
        }

        if (autoBaseId) {
            const scored = scoreMatch(incomingSafe.persons[incomingId], baseDoc.persons[autoBaseId], incomingSafe, baseDoc);
            diff.matchEvidence![incomingId] = {
                candidates: [
                    {
                        baseId: autoBaseId,
                        score: scored.score,
                        confidence: scored.confidence,
                        blockers: scored.blockers.map((blocker) => `${blocker.severity}:${blocker.code}`),
                        signals: scored.signals,
                        qualityFlags: [...(scored.qualityFlags || []), ...(incomingIsLegacy ? ["legacy-converted"] : [])],
                        riskLevel: scored.riskLevel,
                        chosenHypothesisType: scored.chosenHypothesis.hypothesisType,
                        requiredActions: scored.requiredActions.map((action) => cloneAction(action)),
                        explain: structuredClone(scored.explain),
                        chosenHypothesis: structuredClone(scored.chosenHypothesis),
                        hypothesesTopK: scored.hypothesesTopK.map((hypothesis) => structuredClone(hypothesis))
                    }
                ]
            };
            continue;
        }

        const mappedId = personRemap[incomingId];
        const fallbackExplain = buildFallbackExplain(incomingId, "No high-confidence automatic match.");
        diff.matchEvidence![incomingId] = {
            candidates: [
                {
                    baseId: mappedId,
                    score: 0,
                    confidence: "low",
                    blockers: [],
                    signals: ["No high-confidence automatic match"],
                    qualityFlags: incomingIsLegacy ? ["legacy-converted"] : [],
                    riskLevel: "medium",
                    chosenHypothesisType: "CreateNewPerson",
                    requiredActions: fallbackExplain.requiredActions.map((action) => cloneAction(action)),
                    explain: fallbackExplain,
                    chosenHypothesis: {
                        hypothesisType: "CreateNewPerson",
                        baseId: mappedId,
                        scoreFinal: 0,
                        riskLevel: "medium",
                        explain: structuredClone(fallbackExplain)
                    },
                    hypothesesTopK: [
                        {
                            hypothesisType: "CreateNewPerson",
                            baseId: mappedId,
                            scoreFinal: 0,
                            riskLevel: "medium",
                            explain: structuredClone(fallbackExplain)
                        }
                    ]
                }
            ]
        };
    }

    for (const p of Object.values(diff.persons)) {
        if (p.status === "identical") {
            diff.changeBuckets!.unchanged.push(`person:${p.id}`);
        } else if (p.status === "new") {
            diff.changeBuckets!.cleanAdds.push(`person:${p.id}`);
        } else if (Object.keys(p.conflicts).length === 0 && p.eventConflicts.length === 0) {
            diff.changeBuckets!.safeUpdates.push(`person:${p.id}`);
        } else {
            diff.changeBuckets!.riskyUpdates.push(`person:${p.id}`);
        }
    }
    for (const f of Object.values(diff.families)) {
        if (f.status === "identical") {
            diff.changeBuckets!.unchanged.push(`family:${f.id}`);
        } else if (f.status === "new") {
            diff.changeBuckets!.cleanAdds.push(`family:${f.id}`);
        } else if (!f.conflicts.husbandId && !f.conflicts.wifeId && f.conflicts.childrenConflicts.length === 0 && f.conflicts.eventConflicts.length === 0) {
            diff.changeBuckets!.safeUpdates.push(`family:${f.id}`);
        } else {
            diff.changeBuckets!.riskyUpdates.push(`family:${f.id}`);
        }
    }

    const totalIncomingPersons = Math.max(1, Object.keys(incomingSafe.persons).length);
    const totalIncomingFamilies = Math.max(1, Object.keys(incomingSafe.families).length);
    const matchedPersons = Object.values(diff.persons).filter((p) => p.status !== "new").length;
    const structurallySimilarFamilies = Object.values(diff.families).filter((f) => f.status !== "new").length;

    diff.globalSimilarity = {
        personIdentitySimilarity: Math.round((matchedPersons / totalIncomingPersons) * 100),
        familyStructureSimilarity: Math.round((structurallySimilarFamilies / totalIncomingFamilies) * 100),
        modeHint:
            matchedPersons / totalIncomingPersons > 0.8 && structurallySimilarFamilies / totalIncomingFamilies > 0.8
                ? "mostly_equal"
                : matchedPersons / totalIncomingPersons < 0.3
                    ? "mostly_different"
                    : "mixed"
    };

    return diff;
}
