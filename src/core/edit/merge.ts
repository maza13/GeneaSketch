import { syncGraphV2FromLegacy, syncLegacyProjectionFromGraphV2 } from "@/core/graph/v2Adapters";
import type {
    GraphDocument,
    Event,
    MergeAction,
    MergeAuditReport,
    MergeExplain,
    MergeHypothesis,
    ParentChildLink,
    UnionV2
} from "@/types/domain";
import type { DataDiff, DiffResolution, EventConflict, ChildMembershipConflict } from "./diff";

export type MergeStats = {
    addedPersons: number;
    updatedPersons: number;
    addedFamilies: number;
    resolvedPersonConflicts: number;
    resolvedFamilyConflicts: number;
    renamedPersonIds: Array<{ incomingId: string; finalId: string }>;
    renamedFamilyIds: Array<{ incomingId: string; finalId: string }>;
    skippedPersons: number;
    skippedFamilies: number;
    appliedSafeAdds: number;
    appliedSafeUpdates: number;
    blockedItems: number;
};

type MatchEvidenceCandidate = {
    baseId: string;
    score: number;
    blockers: string[];
    signals: string[];
    riskLevel?: "low" | "medium" | "high";
    chosenHypothesisType?: string;
    requiredActions?: MergeAction[];
    explain?: MergeExplain;
    chosenHypothesis?: MergeHypothesis;
    hypothesesTopK?: MergeHypothesis[];
};

function uniqueStringList(a: string[], b: string[]): string[] {
    return Array.from(new Set([...a, ...b]));
}

function areEventsEqual(e1: Event, e2: Event): boolean {
    return e1.type === e2.type && e1.date === e2.date && e1.place === e2.place;
}

function removeOneEvent(events: Event[], target: Event): Event[] {
    const next = [...events];
    const idx = next.findIndex((e) => areEventsEqual(e, target));
    if (idx >= 0) next.splice(idx, 1);
    return next;
}

function textCompletenessScore(value: string | undefined): number {
    if (!value) return 0;
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized) return 0;
    const tokens = normalized.split(" ").filter(Boolean);
    return tokens.length * 4 + normalized.length;
}

function chooseBetterText(base: string | undefined, incoming: string | undefined): string | undefined {
    if (!base && !incoming) return base;
    if (!base) return incoming;
    if (!incoming) return base;
    const baseScore = textCompletenessScore(base);
    const incomingScore = textCompletenessScore(incoming);
    if (incomingScore > baseScore) return incoming;
    if (incomingScore < baseScore) return base;
    return incoming.localeCompare(base) >= 0 ? incoming : base;
}

function chooseFieldResolution<T>(
    base: T,
    incoming: T,
    explicitResolution: DiffResolution | undefined,
    fallbackPolicy: () => T
): T {
    if (explicitResolution === "accept_incoming") return incoming;
    if (explicitResolution === "keep_base") return base;
    return fallbackPolicy();
}

function eventQuality(event: Event): number {
    const date = (event.date || "").trim();
    const place = (event.place || "").trim();
    const hasFullDate = /\d{1,2}/.test(date) && /\d{4}/.test(date);
    const yearOnly = /\b\d{4}\b/.test(date);
    const placeParts = place ? place.split(",").map((item) => item.trim()).filter(Boolean).length : 0;
    return (hasFullDate ? 8 : yearOnly ? 4 : 0) + placeParts * 2 + place.length * 0.05;
}

function applyEventConflicts(baseEvents: Event[], eventConflicts: EventConflict[]): { events: Event[]; resolved: number } {
    let events = [...baseEvents];
    let resolved = 0;

    for (const conflict of eventConflicts) {
        const shouldAcceptIncoming =
            conflict.resolution === "accept_incoming" ||
            (conflict.resolution === "pending" && eventQuality(conflict.incomingEvent) > eventQuality(conflict.baseEvent));
        if (shouldAcceptIncoming) {
            events = removeOneEvent(events, conflict.baseEvent);
            if (!events.some((e) => areEventsEqual(e, conflict.incomingEvent))) {
                events.push(conflict.incomingEvent);
            }
            resolved += 1;
        } else if (conflict.resolution === "keep_base" || conflict.resolution === "pending") {
            resolved += 1;
        }
    }

    return { events, resolved };
}

function applyChildrenConflicts(baseChildren: string[], conflicts: ChildMembershipConflict[]): { children: string[]; resolved: number } {
    const set = new Set(baseChildren);
    let resolved = 0;

    for (const conflict of conflicts) {
        const acceptIncoming = conflict.resolution === "accept_incoming" || (conflict.resolution === "pending" && conflict.kind === "missing_in_base");
        if (conflict.kind === "missing_in_base" && acceptIncoming) {
            set.add(conflict.childId);
            resolved += 1;
        } else if (conflict.kind === "missing_in_incoming" && conflict.resolution === "accept_incoming") {
            set.delete(conflict.childId);
            resolved += 1;
        } else if (conflict.resolution === "keep_base" || conflict.resolution === "pending") {
            resolved += 1;
        }
    }

    return { children: Array.from(set), resolved };
}

function isResolved(resolution: DiffResolution): boolean {
    return resolution === "keep_base" || resolution === "accept_incoming";
}

function parseBlocker(raw: string): { severity: "criticalHardConflict" | "nonCriticalHardConflict" | "soft"; code: string; detail: string } {
    const [severityRaw, codeRaw] = raw.split(":");
    const severity =
        severityRaw === "criticalHardConflict" || severityRaw === "nonCriticalHardConflict" || severityRaw === "soft"
            ? severityRaw
            : "soft";
    return {
        severity,
        code: codeRaw || "UNKNOWN",
        detail: codeRaw || "UNKNOWN"
    };
}

function buildFallbackExplain(decisionReason: string, blockers: string[]): MergeExplain {
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
            coveragePenalty: 0
        },
        capsApplied: [],
        blockers: blockers.map((item) => parseBlocker(item)),
        decisionReason,
        requiredActions: [{ kind: "project_legacy" }]
    };
}

function cloneAction(action: MergeAction): MergeAction {
    return structuredClone(action);
}

function cloneHypothesis(hypothesis: MergeHypothesis): MergeHypothesis {
    return structuredClone(hypothesis);
}

function sortEvidenceCandidates(candidates: MatchEvidenceCandidate[]): MatchEvidenceCandidate[] {
    return [...candidates].sort((a, b) => b.score - a.score || a.baseId.localeCompare(b.baseId));
}

function toFallbackHypothesis(candidate: MatchEvidenceCandidate): MergeHypothesis {
    return {
        hypothesisType: (candidate.chosenHypothesisType as MergeHypothesis["hypothesisType"]) || "CreateNewPerson",
        baseId: candidate.baseId,
        scoreFinal: candidate.score,
        riskLevel: candidate.riskLevel || "high",
        explain: candidate.explain
            ? structuredClone(candidate.explain)
            : buildFallbackExplain(candidate.signals.join(" | "), candidate.blockers)
    };
}

function chooseEvidenceCandidate(incomingId: string, diff: DataDiff, candidates: MatchEvidenceCandidate[]): MatchEvidenceCandidate {
    const sorted = sortEvidenceCandidates(candidates);
    const remappedPersonId = diff.idRemap.persons[incomingId];
    if (remappedPersonId) {
        const selected = sorted.find((candidate) => candidate.baseId === remappedPersonId);
        if (selected) return selected;
        const manualCreateExplain = buildFallbackExplain("Manual decision: keep as new person.", []);
        manualCreateExplain.requiredActions = [{ kind: "create_person", incomingId, preferredId: remappedPersonId }];
        return {
            baseId: remappedPersonId,
            score: 0,
            blockers: [],
            signals: ["Manual decision: create new person"],
            riskLevel: "low",
            chosenHypothesisType: "CreateNewPerson",
            requiredActions: manualCreateExplain.requiredActions,
            explain: manualCreateExplain
        };
    }
    return sorted[0];
}

function buildMergeAudit(diff: DataDiff): MergeAuditReport {
    const reviewConfig = diff.reviewConfig;
    const decisions: MergeAuditReport["decisions"] = [];
    for (const [incomingId, evidence] of Object.entries(diff.matchEvidence ?? {})) {
        if (!evidence.candidates || evidence.candidates.length === 0) continue;

        const candidates = evidence.candidates as MatchEvidenceCandidate[];
        const chosenCandidate = chooseEvidenceCandidate(incomingId, diff, candidates);
        const sorted = sortEvidenceCandidates(candidates).slice(0, 3);

        const chosenHypothesis = chosenCandidate.chosenHypothesis
            ? cloneHypothesis(chosenCandidate.chosenHypothesis)
            : toFallbackHypothesis(chosenCandidate);

        let topHypotheses = chosenCandidate.hypothesesTopK && chosenCandidate.hypothesesTopK.length > 0
            ? chosenCandidate.hypothesesTopK.map((hypothesis) => cloneHypothesis(hypothesis)).slice(0, 3)
            : sorted.map((candidate) => toFallbackHypothesis(candidate));

        if (!topHypotheses.some((hypothesis) => hypothesis.hypothesisType === chosenHypothesis.hypothesisType && hypothesis.baseId === chosenHypothesis.baseId)) {
            topHypotheses = [chosenHypothesis, ...topHypotheses].slice(0, 3);
        }

        decisions.push({
            incomingId,
            chosenHypothesis,
            topHypotheses,
            decidedAt: new Date().toISOString(),
            decidedBy: "system"
        });
    }
    const blockedCount = decisions.filter((decision) =>
        decision.chosenHypothesis.riskLevel === "high" ||
        decision.chosenHypothesis.explain.blockers.some((blocker) => blocker.severity !== "soft")
    ).length;
    const networkConfirmed = decisions.filter((decision) => decision.chosenHypothesis.hypothesisType === "SamePersonNetworkConfirmed").length;
    const criticalOverrides = decisions.filter((decision) => decision.chosenHypothesis.hypothesisType === "SamePersonCriticalOverride").length;

    return {
        version: reviewConfig?.version ?? "v2",
        preset: reviewConfig?.preset ?? "strict",
        thresholds: {
            autoScoreMin: reviewConfig?.thresholds.autoScoreMin ?? 88,
            minDeltaVsSecond: reviewConfig?.thresholds.minDeltaVsSecond ?? 12,
            minCoverage: reviewConfig?.thresholds.minCoverage ?? 0.6,
            mediumAutoScoreMin: reviewConfig?.thresholds.mediumAutoScoreMin,
            mediumAutoCoverageMin: reviewConfig?.thresholds.mediumAutoCoverageMin,
            mediumAutoDeltaMin: reviewConfig?.thresholds.mediumAutoDeltaMin,
            globalScoreMin: reviewConfig?.thresholds.globalScoreMin,
            globalSupportMin: reviewConfig?.thresholds.globalSupportMin,
            criticalOverrideScoreMin: reviewConfig?.thresholds.criticalOverrideScoreMin,
            criticalOverrideSupportMin: reviewConfig?.thresholds.criticalOverrideSupportMin,
            criticalOverrideAnchorMin: reviewConfig?.thresholds.criticalOverrideAnchorMin
        },
        decisions,
        summary: {
            totalIncoming: diff.summary.totalIncomingPersons,
            autoDecided: diff.summary.matchedHigh,
            manualDecided: diff.summary.ambiguous,
            blocked: blockedCount,
            autoAppliedMedium: reviewConfig?.stats?.autoAppliedMedium ?? 0,
            revertedActions: reviewConfig?.stats?.revertedActions ?? 0,
            networkConfirmed: reviewConfig?.stats?.networkConfirmed ?? networkConfirmed,
            criticalOverrides: reviewConfig?.stats?.criticalOverrides ?? criticalOverrides,
            globalIterations: reviewConfig?.stats?.globalIterations ?? 0
        },
        createdAt: new Date().toISOString()
    };
}

function normalizeActionId(existing: Set<string>, preferredId: string, fallbackPrefix: string): string {
    if (!existing.has(preferredId)) {
        existing.add(preferredId);
        return preferredId;
    }
    let i = 1;
    let candidate = `${preferredId}_m${i}`;
    while (existing.has(candidate)) {
        i += 1;
        candidate = `${fallbackPrefix}_${i}`;
    }
    existing.add(candidate);
    return candidate;
}

function resolvePersonId(rawId: string, personRemap: Record<string, string>): string {
    return personRemap[rawId] || rawId;
}

function collectRequiredActions(diff: DataDiff): Array<{ incomingId: string; action: MergeAction }> {
    const queue: Array<{ incomingId: string; action: MergeAction }> = [];
    const evidenceByIncoming = diff.matchEvidence ?? {};
    const incomingIds = Object.keys(evidenceByIncoming).sort((a, b) => a.localeCompare(b));
    for (const incomingId of incomingIds) {
        const evidence = evidenceByIncoming[incomingId];
        if (!evidence?.candidates?.length) continue;
        const chosen = chooseEvidenceCandidate(incomingId, diff, evidence.candidates as MatchEvidenceCandidate[]);
        for (const action of chosen.requiredActions ?? []) {
            queue.push({ incomingId, action: cloneAction(action) });
        }
    }
    return queue;
}

function applyRequiredActionsInOrder(merged: GraphDocument, diff: DataDiff): void {
    const actionQueue = collectRequiredActions(diff);
    if (actionQueue.length === 0) return;

    const personRemap = diff.idRemap.persons;

    const identityStage = actionQueue
        .filter(({ action }) => action.kind === "merge_person" || action.kind === "create_person" || action.kind === "flag_pending_enrichment")
        .sort((a, b) => a.incomingId.localeCompare(b.incomingId) || a.action.kind.localeCompare(b.action.kind));
    for (const { incomingId, action } of identityStage) {
        if (action.kind !== "flag_pending_enrichment") continue;
        const resolvedPersonId = resolvePersonId(action.personId || incomingId, personRemap);
        const target = merged.persons[resolvedPersonId];
        if (!target) continue;
        target.pendingEnrichment = {
            reason: action.reason,
            confidence: Math.max(0, Math.min(1, action.confidence)),
            createdAt: new Date().toISOString()
        };
    }

    const unionStage = actionQueue
        .filter(({ action }) => action.kind === "create_union")
        .sort((a, b) => {
            const left = a.action.kind === "create_union" ? a.action.union.id : "";
            const right = b.action.kind === "create_union" ? b.action.union.id : "";
            return left.localeCompare(right) || a.incomingId.localeCompare(b.incomingId);
        });
    if (!merged.unions) merged.unions = {};
    const existingUnionIds = new Set(Object.keys(merged.unions));
    for (const { incomingId, action } of unionStage) {
        if (action.kind !== "create_union") continue;
        const remappedPartners = Array.from(
            new Set(
                action.union.partnerIds
                    .map((partnerId) => resolvePersonId(partnerId, personRemap))
                    .filter((partnerId) => Boolean(merged.persons[partnerId]))
            )
        );
        if (remappedPartners.length === 0) {
            remappedPartners.push(resolvePersonId(incomingId, personRemap));
        }
        const preferredId = action.union.id || `U:auto:${incomingId}`;
        const finalId = normalizeActionId(existingUnionIds, preferredId, `U:auto:${incomingId}`);
        const normalizedUnion: UnionV2 = {
            ...action.union,
            id: finalId,
            partnerIds: remappedPartners
        };
        merged.unions[finalId] = normalizedUnion;
    }

    const parentChildStage = actionQueue
        .filter(({ action }) => action.kind === "link_parent_child")
        .sort((a, b) => {
            const left = a.action.kind === "link_parent_child" ? a.action.link.id : "";
            const right = b.action.kind === "link_parent_child" ? b.action.link.id : "";
            return left.localeCompare(right) || a.incomingId.localeCompare(b.incomingId);
        });
    if (!merged.parentChildLinks) merged.parentChildLinks = {};
    const existingLinkIds = new Set(Object.keys(merged.parentChildLinks));
    for (const { incomingId, action } of parentChildStage) {
        if (action.kind !== "link_parent_child") continue;
        const remappedParentId = resolvePersonId(action.link.parentId, personRemap);
        const remappedChildId = resolvePersonId(action.link.childId, personRemap);
        if (!merged.persons[remappedParentId] || !merged.persons[remappedChildId]) continue;
        const preferredId = action.link.id || `PCL:auto:${remappedParentId}:${remappedChildId}`;
        const finalId = normalizeActionId(existingLinkIds, preferredId, `PCL:auto:${incomingId}`);
        const normalizedLink: ParentChildLink = {
            ...action.link,
            id: finalId,
            parentId: remappedParentId,
            childId: remappedChildId
        };
        merged.parentChildLinks[finalId] = normalizedLink;
    }
}

export function applyDiff(baseDoc: GraphDocument, diff: DataDiff): { merged: GraphDocument; stats: MergeStats } {
    const merged: GraphDocument = {
        persons: { ...baseDoc.persons },
        families: { ...baseDoc.families },
        unions: baseDoc.unions ? { ...baseDoc.unions } : undefined,
        parentChildLinks: baseDoc.parentChildLinks ? { ...baseDoc.parentChildLinks } : undefined,
        siblingLinks: baseDoc.siblingLinks ? { ...baseDoc.siblingLinks } : undefined,
        media: { ...baseDoc.media },
        metadata: { ...baseDoc.metadata }
    };

    const stats: MergeStats = {
        addedPersons: 0,
        updatedPersons: 0,
        addedFamilies: 0,
        resolvedPersonConflicts: 0,
        resolvedFamilyConflicts: 0,
        renamedPersonIds: [],
        renamedFamilyIds: [],
        skippedPersons: 0,
        skippedFamilies: 0,
        appliedSafeAdds: 0,
        appliedSafeUpdates: 0,
        blockedItems: 0
    };

    for (const [incomingId, finalId] of Object.entries(diff.idRemap.persons)) {
        if (incomingId !== finalId) {
            stats.renamedPersonIds.push({ incomingId, finalId });
        }
    }
    for (const [incomingId, finalId] of Object.entries(diff.idRemap.families)) {
        if (incomingId !== finalId) {
            stats.renamedFamilyIds.push({ incomingId, finalId });
        }
    }

    for (const pDiff of Object.values(diff.persons)) {
        if (pDiff.status === "new") {
            merged.persons[pDiff.id] = {
                ...pDiff.incomingPerson,
                id: pDiff.id,
                famc: [...pDiff.incomingPerson.famc],
                fams: [...pDiff.incomingPerson.fams],
                events: [...pDiff.incomingPerson.events]
            };
            stats.addedPersons += 1;
            stats.appliedSafeAdds += 1;
            continue;
        }

        if (pDiff.status === "identical") continue;

        const base = merged.persons[pDiff.id];
        if (!base) continue;

        const name = pDiff.conflicts.name
            ? chooseFieldResolution(
                pDiff.conflicts.name.base,
                pDiff.conflicts.name.incoming,
                pDiff.conflicts.name.resolution,
                () => chooseBetterText(pDiff.conflicts.name!.base, pDiff.conflicts.name!.incoming) || pDiff.conflicts.name!.base
            )
            : base.name;
        const surname = pDiff.conflicts.surname
            ? chooseFieldResolution(
                pDiff.conflicts.surname.base,
                pDiff.conflicts.surname.incoming,
                pDiff.conflicts.surname.resolution,
                () => chooseBetterText(pDiff.conflicts.surname!.base, pDiff.conflicts.surname!.incoming)
            )
            : base.surname;
        const sex = pDiff.conflicts.sex
            ? chooseFieldResolution(
                pDiff.conflicts.sex.base,
                pDiff.conflicts.sex.incoming,
                pDiff.conflicts.sex.resolution,
                () => (pDiff.conflicts.sex!.incoming !== "U" ? pDiff.conflicts.sex!.incoming : pDiff.conflicts.sex!.base)
            )
            : base.sex;
        const lifeStatus = pDiff.conflicts.lifeStatus
            ? chooseFieldResolution(
                pDiff.conflicts.lifeStatus.base,
                pDiff.conflicts.lifeStatus.incoming,
                pDiff.conflicts.lifeStatus.resolution,
                () => (pDiff.conflicts.lifeStatus!.incoming !== "alive" ? pDiff.conflicts.lifeStatus!.incoming : pDiff.conflicts.lifeStatus!.base)
            )
            : base.lifeStatus;

        const eventApply = applyEventConflicts(base.events, pDiff.eventConflicts);
        const events = [...eventApply.events];
        for (const ev of pDiff.newEvents) {
            if (!events.some((e) => areEventsEqual(e, ev))) events.push(ev);
        }

        merged.persons[pDiff.id] = {
            ...base,
            name,
            surname,
            sex,
            lifeStatus,
            events,
            famc: uniqueStringList(base.famc, pDiff.incomingPerson.famc.map((f) => diff.idRemap.families[f] || f)),
            fams: uniqueStringList(base.fams, pDiff.incomingPerson.fams.map((f) => diff.idRemap.families[f] || f))
        };

        stats.updatedPersons += 1;
        if (Object.keys(pDiff.conflicts).length === 0 && pDiff.eventConflicts.length === 0) {
            stats.appliedSafeUpdates += 1;
        }
        stats.resolvedPersonConflicts += eventApply.resolved;

        const fieldResolutions = [
            pDiff.conflicts.name?.resolution,
            pDiff.conflicts.surname?.resolution,
            pDiff.conflicts.sex?.resolution,
            pDiff.conflicts.lifeStatus?.resolution
        ].filter((r): r is DiffResolution => Boolean(r));
        stats.resolvedPersonConflicts += fieldResolutions.filter(isResolved).length;
    }

    for (const fDiff of Object.values(diff.families)) {
        if (fDiff.status === "new") {
            merged.families[fDiff.id] = {
                ...fDiff.incomingFamily,
                id: fDiff.id,
                husbandId: fDiff.incomingFamily.husbandId,
                wifeId: fDiff.incomingFamily.wifeId,
                childrenIds: [...fDiff.newChildrenIds],
                events: [...fDiff.newEvents]
            };
            stats.addedFamilies += 1;
            stats.appliedSafeAdds += 1;
            continue;
        }

        if (fDiff.status === "identical") continue;

        const base = merged.families[fDiff.id];
        if (!base) continue;

        const husbandId = fDiff.conflicts.husbandId
            ? chooseFieldResolution(
                fDiff.conflicts.husbandId.base,
                fDiff.conflicts.husbandId.incoming,
                fDiff.conflicts.husbandId.resolution,
                () => fDiff.conflicts.husbandId!.incoming || fDiff.conflicts.husbandId!.base
            )
            : base.husbandId;
        const wifeId = fDiff.conflicts.wifeId
            ? chooseFieldResolution(
                fDiff.conflicts.wifeId.base,
                fDiff.conflicts.wifeId.incoming,
                fDiff.conflicts.wifeId.resolution,
                () => fDiff.conflicts.wifeId!.incoming || fDiff.conflicts.wifeId!.base
            )
            : base.wifeId;

        const childApply = applyChildrenConflicts(base.childrenIds, fDiff.conflicts.childrenConflicts);
        const eventApply = applyEventConflicts(base.events, fDiff.conflicts.eventConflicts);

        const childrenIds = uniqueStringList(childApply.children, fDiff.newChildrenIds);
        const events = [...eventApply.events];
        for (const ev of fDiff.newEvents) {
            if (!events.some((e) => areEventsEqual(e, ev))) events.push(ev);
        }

        merged.families[fDiff.id] = {
            ...base,
            husbandId,
            wifeId,
            childrenIds,
            events
        };

        stats.resolvedFamilyConflicts += childApply.resolved + eventApply.resolved;
        if (!fDiff.conflicts.husbandId && !fDiff.conflicts.wifeId && fDiff.conflicts.childrenConflicts.length === 0 && fDiff.conflicts.eventConflicts.length === 0) {
            stats.appliedSafeUpdates += 1;
        }
        if (fDiff.conflicts.husbandId && isResolved(fDiff.conflicts.husbandId.resolution)) stats.resolvedFamilyConflicts += 1;
        if (fDiff.conflicts.wifeId && isResolved(fDiff.conflicts.wifeId.resolution)) stats.resolvedFamilyConflicts += 1;
    }

    // Final reconciliation of famc/fams pointers from family structure.
    const rebuiltPersons: GraphDocument["persons"] = {};
    for (const person of Object.values(merged.persons)) {
        rebuiltPersons[person.id] = {
            ...person,
            famc: [],
            fams: []
        };
    }

    for (const family of Object.values(merged.families)) {
        if (family.husbandId && rebuiltPersons[family.husbandId]) {
            rebuiltPersons[family.husbandId].fams.push(family.id);
        }
        if (family.wifeId && rebuiltPersons[family.wifeId]) {
            rebuiltPersons[family.wifeId].fams.push(family.id);
        }
        for (const childId of family.childrenIds) {
            if (rebuiltPersons[childId]) {
                rebuiltPersons[childId].famc.push(family.id);
            }
        }
    }

    for (const person of Object.values(rebuiltPersons)) {
        person.famc = Array.from(new Set(person.famc));
        person.fams = Array.from(new Set(person.fams));
    }

    merged.persons = rebuiltPersons;

    const compatibility = diff.summary.compatibilitySummary;
    const existingProvenance = merged.metadata.importProvenance ?? [];
    const mergedProvenance = [
        ...existingProvenance,
        compatibility
            ? {
                sourceFormat: compatibility.incomingFormat,
                sourceGedVersion: (compatibility.incomingVersion === "5.5" || compatibility.incomingVersion === "5.5.1" || compatibility.incomingVersion === "7.0.x")
                    ? compatibility.incomingVersion
                    : "unknown",
                importedAt: new Date().toISOString()
            }
            : undefined
    ].filter(Boolean) as NonNullable<GraphDocument["metadata"]["importProvenance"]>;

    merged.metadata = {
        ...merged.metadata,
        sourceFormat: "GSK",
        gedVersion: "7.0.x",
        importProvenance: mergedProvenance,
        mergeAudit: buildMergeAudit(diff)
    };
    let synced = syncGraphV2FromLegacy(merged);
    applyRequiredActionsInOrder(synced, diff);
    synced = syncLegacyProjectionFromGraphV2(synced);
    synced = syncGraphV2FromLegacy(synced);
    return { merged: synced, stats };
}


