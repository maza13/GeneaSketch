import { GgId, GeneGraph } from "./types";

export type GgSelectType =
    | "self"
    | "parents"
    | "father"
    | "mother"
    | "children"
    | "partners"
    | "parentsFamily";

export type GgPickType =
    | "all"
    | "one"
    | "first"
    | "last"
    | "nth"
    | "eldest"
    | "youngest";

export interface GgSelectorOrder {
    by: "birthDate" | "marriageDate" | "stable";
    dir: "asc" | "desc";
}

export interface GgRelationshipSelector {
    anchor: GgId;
    select: GgSelectType;
    constraints?: {
        withPartner?: GgId;
    };
    pick: GgPickType;
    n?: number;
    order?: GgSelectorOrder;
}

export type GgResolutionQuality = "certain" | "partial" | "fallback";

export interface GgResolvedSelection {
    targets: GgId[];
    quality: GgResolutionQuality;
    explain: string;
    warnings: string[];
}

/**
 * Resolves a RelationshipSelector against a GeneGraph.
 * Phase 1: Direct family, deterministic rules.
 */
export function resolveSelector(
    graph: GeneGraph,
    selector: GgRelationshipSelector
): GgResolvedSelection {
    const { anchor, select, pick, constraints } = selector;
    const person = graph.persons[anchor];
    const warnings: string[] = [];
    let quality: GgResolutionQuality = "certain";
    let explain = "";

    if (!person) {
        return {
            targets: [],
            quality: "certain",
            explain: "Anchor person not found.",
            warnings: ["Anchor ID invalid."]
        };
    }

    let candidates: string[] = [];

    switch (select) {
        case "self":
            candidates = [anchor];
            explain = "Self selection.";
            break;

        case "parents": {
            const fam = person.parentsFamilyId ? graph.families[person.parentsFamilyId] : undefined;
            if (fam) {
                candidates = [...fam.partners];
            }
            explain = "Parents from core FAMC link.";
            break;
        }

        case "father": {
            const fam = person.parentsFamilyId ? graph.families[person.parentsFamilyId] : undefined;
            if (fam) {
                const father = fam.partners.find(p => graph.persons[p]?.sex === "M");
                if (father) candidates = [father];
                else warnings.push("No partner with sex=M found in parents family.");
            }
            explain = "Father selection (by sex=M in parents family).";
            break;
        }

        case "mother": {
            const fam = person.parentsFamilyId ? graph.families[person.parentsFamilyId] : undefined;
            if (fam) {
                const mother = fam.partners.find(p => graph.persons[p]?.sex === "F");
                if (mother) candidates = [mother];
                else warnings.push("No partner with sex=F found in parents family.");
            }
            explain = "Mother selection (by sex=F in parents family).";
            break;
        }

        case "children": {
            let allChildren: string[] = [];
            for (const famId of person.familyIds) {
                const fam = graph.families[famId];
                if (!fam) continue;
                if (constraints?.withPartner) {
                    if (fam.partners.includes(constraints.withPartner)) {
                        allChildren.push(...fam.children);
                    }
                } else {
                    allChildren.push(...fam.children);
                }
            }
            // Remove duplicates (e.g. if the graph has redundant FAMs, which it shouldn't)
            candidates = Array.from(new Set(allChildren));
            explain = constraints?.withPartner
                ? `Children with partner ${constraints.withPartner}.`
                : "All children from all families.";
            break;
        }

        case "partners": {
            let allPartners: string[] = [];
            for (const famId of person.familyIds) {
                const fam = graph.families[famId];
                if (!fam) continue;
                const other = fam.partners.find(p => p !== anchor);
                if (other) allPartners.push(other);
            }
            candidates = Array.from(new Set(allPartners));
            explain = "All partners from all families.";
            break;
        }

        case "parentsFamily": {
            if (person.parentsFamilyId) {
                candidates = [person.parentsFamilyId];
                explain = "Anchor's parents family.";
            }
            break;
        }

        default:
            warnings.push(`Selector type ${select} not implemented in Phase 1.`);
    }

    // Apply Ordering (Determinism)
    if (candidates.length > 1) {
        const sortResult = sortCandidates(graph, candidates, pick, select);
        candidates = sortResult.targets;
        if (sortResult.quality === "fallback") {
            quality = "fallback";
            warnings.push(sortResult.warning || "Order depends on insertion/stable fallback.");
        }
    }

    // Apply Picking
    let finalTargets: GgId[] = [];
    if (pick === "all") {
        finalTargets = candidates;
    } else if (pick === "one" || pick === "first") {
        finalTargets = candidates.length > 0 ? [candidates[0]] : [];
    } else if (pick === "last") {
        finalTargets = candidates.length > 0 ? [candidates[candidates.length - 1]] : [];
    } else if (pick === "nth" && selector.n !== undefined) {
        const idx = selector.n - 1;
        finalTargets = candidates[idx] ? [candidates[idx]] : [];
    } else if (pick === "eldest") {
        finalTargets = candidates.length > 0 ? [candidates[0]] : []; // sorted asc
    } else if (pick === "youngest") {
        finalTargets = candidates.length > 0 ? [candidates[candidates.length - 1]] : []; // sorted asc
    }

    return { targets: finalTargets, quality, explain, warnings };
}

function sortCandidates(
  graph: GeneGraph,
  targets: GgId[],
  _pick: GgPickType,
  select: GgSelectType
): { targets: GgId[]; quality: GgResolutionQuality; warning?: string } {
  // Determine primary sort key
  const isChildren = select === "children";

  if (isChildren) {
        // 1. Birth Date
        const withDates = targets.map(id => ({ id, date: graph.persons[id]?.birthDate }));
        const hasAnyDates = withDates.some(p => !!p.date);

        if (!hasAnyDates) {
            return { targets, quality: "fallback", warning: "No birth dates for children ordering." };
        }

        // Attempt date sort
        const sorted = [...targets].sort((a, b) => {
            const dA = graph.persons[a]?.birthDate;
            const dB = graph.persons[b]?.birthDate;
            if (dA && dB) return dA.localeCompare(dB);
            if (dA) return -1;
            if (dB) return 1;
            return 0; // Stable
        });

        const isCertain = withDates.every(p => !!p.date && p.date.length >= 4);
        return {
            targets: sorted,
            quality: isCertain ? "certain" : "partial",
            warning: isCertain ? undefined : "Partial dates used for children ordering."
        };
    }

    return { targets, quality: "certain" };
}
