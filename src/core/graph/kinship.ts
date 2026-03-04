import { GraphDocument, Person } from "@/types/domain";
import type { ResolvedKinshipRelationship } from "@/types/kinship";
import { resolveKinshipLabelFromDistances, resolveUiDisplayLabel } from "@/core/kinship/nomenclature";

export type KinshipResult = {
    relationshipText: string;
    relationship: ResolvedKinshipRelationship;
    sharedDnaPercentage: number;
    pathPersonIds: string[];
    yDnaShared: boolean;
    mtDnaShared: boolean;
};

// Helper to reliably extract the biological parents for a node.
// This prevents mathematical overestimations (e.g., > 50% for a child) caused by
// duplicate `FAMC` records or adoptive families in a GEDCOM file.
function getBiologicalParents(person: Person, doc: GraphDocument): { fatherId?: string; motherId?: string } {
    let fatherId: string | undefined = undefined;
    let motherId: string | undefined = undefined;

    if (person && person.famc) {
        for (const fId of person.famc) {
            const fam = doc.families[fId];
            if (fam) {
                if (!fatherId && fam.husbandId) fatherId = fam.husbandId;
                if (!motherId && fam.wifeId) motherId = fam.wifeId;
            }
            if (fatherId && motherId) break;
        }
    }
    return { fatherId, motherId };
}

type HeatmapResult = { dnaMap: Map<string, number>, inbreedingMap: Map<string, number> };

// Internal cache for genetic heatmaps and kinship values to avoid redundant deep recursive calculations.
// heatmapCache: doc -> basePersonId -> result
const heatmapCache = new WeakMap<GraphDocument, Map<string, HeatmapResult>>();
// globalKinshipCache: doc -> "idA|idB" -> coefficient
const globalKinshipCache = new WeakMap<GraphDocument, Map<string, number>>();
// globalGenerationCache: doc -> personId -> depth
const globalGenerationCache = new WeakMap<GraphDocument, Map<string, number>>();

/**
 * Calculates the genetic shared DNA and endogamy between a base person and everyone else.
 * Uses exact recursive Kinship calculation (Tabular Method equivalent) natively handling complex endogamy.
 */
export function calculateGeneticHeatmap(doc: GraphDocument, baseId: string): HeatmapResult {
    // 1. Check top-level heatmap cache
    let docHeatmapCache = heatmapCache.get(doc);
    if (!docHeatmapCache) {
        docHeatmapCache = new Map();
        heatmapCache.set(doc, docHeatmapCache);
    }
    const cachedHeatmap = docHeatmapCache.get(baseId);
    if (cachedHeatmap) return cachedHeatmap;

    // 2. Initialize global document caches if they don't exist
    let kinshipMemo = globalKinshipCache.get(doc);
    if (!kinshipMemo) {
        kinshipMemo = new Map();
        globalKinshipCache.set(doc, kinshipMemo);
    }

    let genCache = globalGenerationCache.get(doc);
    if (!genCache) {
        genCache = new Map();
        globalGenerationCache.set(doc, genCache);
    }

    const dnaMap = new Map<string, number>();
    const inbreedingMap = new Map<string, number>();

    // 3. Find connected component (Population)
    const connected = new Set<string>();
    const q = [baseId];
    connected.add(baseId);
    while (q.length > 0) {
        const id = q.shift()!;
        const p = doc.persons[id];
        if (!p) continue;
        const { fatherId, motherId } = getBiologicalParents(p, doc);
        if (fatherId && !connected.has(fatherId)) { connected.add(fatherId); q.push(fatherId); }
        if (motherId && !connected.has(motherId)) { connected.add(motherId); q.push(motherId); }
        if (p.fams) {
            p.fams.forEach(fId => {
                const fam = doc.families[fId];
                if (fam && fam.childrenIds) {
                    fam.childrenIds.forEach(c => {
                        if (!connected.has(c)) { connected.add(c); q.push(c); }
                    });
                }
            });
        }
    }

    // 4. Assign Generational Depth (Iterative BFS to prevent stack overflow in deep trees)
    // We use a simple topological-like approach for depth
    const stack = Array.from(connected);
    const sorted: string[] = [];
    const inDegree = new Map<string, number>();

    stack.forEach(id => {
        const p = doc.persons[id];
        const { fatherId, motherId } = getBiologicalParents(p, doc);
        let count = 0;
        if (fatherId && connected.has(fatherId)) count++;
        if (motherId && connected.has(motherId)) count++;
        inDegree.set(id, count);
    });

    const ready = stack.filter(id => (inDegree.get(id) || 0) === 0);
    while (ready.length > 0) {
        const id = ready.shift()!;
        sorted.push(id);
        // Find children in connected set
        const p = doc.persons[id];
        if (p && p.fams) {
            p.fams.forEach(fId => {
                const fam = doc.families[fId];
                if (fam) fam.childrenIds.forEach(cId => {
                    if (connected.has(cId)) {
                        const d = (inDegree.get(cId) || 0) - 1;
                        inDegree.set(cId, d);
                        if (d === 0) ready.push(cId);
                    }
                });
            });
        }
    }

    sorted.forEach(id => {
        if (genCache!.has(id)) return;
        const p = doc.persons[id];
        const { fatherId, motherId } = getBiologicalParents(p, doc);
        const gf = fatherId ? (genCache!.get(fatherId) || 0) : 0;
        const gm = motherId ? (genCache!.get(motherId) || 0) : 0;
        genCache!.set(id, Math.max(gf, gm) + 1);
    });

    function getGen(id: string): number {
        return genCache!.get(id) || 0;
    }

    // 5. Exact Recursive Kinship Calculation (Memoized Globally)
    const visitingK = new Set<string>();

    function getKinship(idA: string, idB: string): number {
        if (!idA || !idB) return 0;
        const key = idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
        if (kinshipMemo!.has(key)) return kinshipMemo!.get(key)!;
        if (visitingK.has(key)) return 0;

        visitingK.add(key);
        let val = 0;

        if (idA === idB) {
            val = 0.5;
            const p = doc.persons[idA];
            if (p) {
                const { fatherId, motherId } = getBiologicalParents(p, doc);
                if (fatherId && motherId) {
                    val += 0.5 * getKinship(fatherId, motherId);
                }
            }
        } else {
            const genA = getGen(idA);
            const genB = getGen(idB);

            if (genA >= genB) {
                const p = doc.persons[idA];
                if (p) {
                    const { fatherId, motherId } = getBiologicalParents(p, doc);
                    const kF = fatherId ? getKinship(fatherId, idB) : 0;
                    const kM = motherId ? getKinship(motherId, idB) : 0;
                    val = (kF + kM) / 2;
                }
            } else {
                const p = doc.persons[idB];
                if (p) {
                    const { fatherId, motherId } = getBiologicalParents(p, doc);
                    const kF = fatherId ? getKinship(idA, fatherId) : 0;
                    const kM = motherId ? getKinship(idA, motherId) : 0;
                    val = (kF + kM) / 2;
                }
            }
        }

        visitingK.delete(key);
        kinshipMemo!.set(key, val);
        return val;
    }

    // 6. Populate results
    connected.forEach(id => {
        const phi = getKinship(baseId, id);
        if (phi > 0.0000000001) {
            let shared = phi * 2;
            if (id === baseId) shared = 1.0;
            dnaMap.set(id, Math.min(shared, 1.0));
        }

        const phiSelf = getKinship(id, id);
        const inbreeding = (2 * phiSelf) - 1;
        if (inbreeding > 0.0000000001) {
            inbreedingMap.set(id, inbreeding);
        }
    });

    const result = { dnaMap, inbreedingMap };
    docHeatmapCache.set(baseId, result);
    return result;
}

/**
 * Finds the kinship relationship between two people.
 */
export function findKinship(doc: GraphDocument, p1Id: string, p2Id: string): KinshipResult | null {
    if (p1Id === p2Id) {
        const relationship = resolveKinshipLabelFromDistances({
            d1: 0,
            d2: 0,
            sex1: doc.persons[p1Id]?.sex,
            sex2: doc.persons[p2Id]?.sex,
            isHalf: false
        });

        return {
            relationshipText: resolveUiDisplayLabel(relationship),
            relationship,
            sharedDnaPercentage: 100,
            pathPersonIds: [p1Id],
            yDnaShared: true,
            mtDnaShared: true
        };
    }

    const ancestors1 = getAncestorsWithPaths(doc, p1Id);
    const ancestors2 = getAncestorsWithPaths(doc, p2Id);

    // Find common ancestors
    const common = Array.from(ancestors1.keys()).filter(id => ancestors2.has(id));
    if (common.length === 0) return null;

    let minDistance = Infinity;
    let minDistAncestors = new Set<string>();

    common.forEach(ancId => {
        const paths1 = ancestors1.get(ancId)!;
        const paths2 = ancestors2.get(ancId)!;

        paths1.forEach(d1 => {
            paths2.forEach(d2 => {
                const totalDist = d1 + d2;
                if (totalDist < minDistance) {
                    minDistance = totalDist;
                    minDistAncestors = new Set([ancId]);
                } else if (totalDist === minDistance) {
                    minDistAncestors.add(ancId);
                }
            });
        });
    });

    const mrcaId = Array.from(minDistAncestors)[0];
    const exactSharedDna = calculateGeneticHeatmap(doc, p1Id).dnaMap.get(p2Id) || 0;

    // A relationship is "half" if they only share ONE ancestor at the minimum distance (e.g. only share the grandfather, but different grandmothers).
    // If they share exactly 1 ancestor at that level, it's a half relationship.
    // If they share 2 (or more in complex endogamy), it's a full relationship.
    const isHalf = minDistAncestors.size === 1;

    // Genetic markers
    const yDna = checkLineage(doc, p1Id, mrcaId, "M") && checkLineage(doc, p2Id, mrcaId, "M");
    const mtDna = checkLineage(doc, p1Id, mrcaId, "F") && checkLineage(doc, p2Id, mrcaId, "F");

    const d1 = Math.min(...ancestors1.get(mrcaId)!);
    const d2 = Math.min(...ancestors2.get(mrcaId)!);

    const relationship = resolveKinshipLabelFromDistances({
        d1,
        d2,
        sex1: doc.persons[p1Id]?.sex || "U",
        sex2: doc.persons[p2Id]?.sex || "U",
        isHalf
    });

    return {
        relationshipText: resolveUiDisplayLabel(relationship),
        relationship,
        sharedDnaPercentage: exactSharedDna,
        pathPersonIds: findPathIds(doc, p1Id, p2Id, minDistAncestors),
        yDnaShared: yDna,
        mtDnaShared: mtDna
    };
}

function getAncestorsWithPaths(doc: GraphDocument, startId: string): Map<string, number[]> {
    const map = new Map<string, number[]>();
    const queue: { id: string, dist: number }[] = [{ id: startId, dist: 0 }];
    map.set(startId, [0]);

    while (queue.length > 0) {
        const { id, dist } = queue.shift()!;
        if (dist > 50) continue; // Prevent infinite loops
        const p = doc.persons[id];
        if (!p) continue;

        const { fatherId, motherId } = getBiologicalParents(p, doc);

        [fatherId, motherId].forEach(pid => {
            if (pid) {
                const existing = map.get(pid) || [];
                existing.push(dist + 1);
                map.set(pid, existing);
                queue.push({ id: pid, dist: dist + 1 });
            }
        });
    }
    return map;
}

function checkLineage(doc: GraphDocument, startId: string, ancestorId: string, sex: "M" | "F"): boolean {
    if (startId === ancestorId) return true;
    const p = doc.persons[startId];
    if (!p) return false;

    const { fatherId, motherId } = getBiologicalParents(p, doc);
    const parentId = sex === "M" ? fatherId : motherId;

    if (!parentId) return false;
    return checkLineage(doc, parentId, ancestorId, sex);
}

function findPathIds(doc: GraphDocument, p1: string, p2: string, targets: Set<string>): string[] {
    const getPathToTargets = (start: string) => {
        const validPathNodes = new Set<string>();

        const dfs = (curr: string, visited: Set<string>): boolean => {
            if (targets.has(curr)) {
                validPathNodes.add(curr);
                return true;
            }
            if (visited.has(curr)) return false;

            visited.add(curr);
            let reachesTarget = false;

            const p = doc.persons[curr];
            if (p) {
                const { fatherId, motherId } = getBiologicalParents(p, doc);
                if (fatherId && dfs(fatherId, visited)) reachesTarget = true;
                if (motherId && dfs(motherId, visited)) reachesTarget = true;
            }

            if (reachesTarget) {
                validPathNodes.add(curr);
            }
            return reachesTarget;
        };

        dfs(start, new Set());
        return validPathNodes;
    };

    const set1 = getPathToTargets(p1);
    const set2 = getPathToTargets(p2);

    return Array.from(new Set([...set1, ...set2]));
}

/**
 * Finds the oldest ancestor in a pure patrilineal (M) or matrilineal (F) line.
 */
export function getOldestLinealAncestor(doc: GraphDocument, startId: string, mode: "patrilineal" | "matrilineal"): string {
    let curr = startId;
    while (true) {
        const p = doc.persons[curr];
        if (!p || p.famc.length === 0) break;
        let foundParent = false;
        for (const fId of p.famc) {
            const fam = doc.families[fId];
            if (fam) {
                const parentId = mode === "patrilineal" ? fam.husbandId : fam.wifeId;
                if (parentId) {
                    curr = parentId;
                    foundParent = true;
                    break;
                }
            }
        }
        if (!foundParent) break;
    }
    return curr;
}

/**
 * Returns all persons in a lineage (descendants) starting from a specific ancestor,
 * strictly following the sex rule of the mode.
 */
export function getLineagePath(doc: GraphDocument, startId: string, mode: "patrilineal" | "matrilineal"): { personIds: Set<string>, oldestId: string } {
    const oldestId = getOldestLinealAncestor(doc, startId, mode);
    const personIds = new Set<string>();
    const visited = new Set<string>();

    const dfs = (currId: string) => {
        if (visited.has(currId)) return;
        visited.add(currId);

        const p = doc.persons[currId];
        if (!p) return;

        // Strict Rule: Only males continue Patrilineal, only females continue Matrilineal.
        if (mode === "patrilineal" && p.sex !== "M") return;
        if (mode === "matrilineal" && p.sex !== "F") return;

        personIds.add(currId);

        p.fams.forEach(fId => {
            const fam = doc.families[fId];
            if (fam) fam.childrenIds.forEach(childId => dfs(childId));
        });
    };

    dfs(oldestId);
    return { personIds, oldestId };
}

/**
 * Extracts a numeric year from a GEDCOM date string.
 */
function extractYearNumber(date?: string): number | null {
    if (!date) return null;
    const match = date.match(/\d{4}/);
    if (!match) return null;
    const y = parseInt(match[0], 10);
    return isNaN(y) ? null : y;
}

/**
 * Calculates if and how much two people's lives overlapped in time.
 */
export function getLifeOverlapInfo(p1: Person, p2: Person): string | null {
    const b1 = extractYearNumber(p1.events.find(e => e.type === "BIRT")?.date);
    const d1_raw = p1.events.find(e => e.type === "DEAT")?.date;
    const isL1 = p1.lifeStatus !== "deceased";
    const d1 = isL1 ? new Date().getFullYear() : extractYearNumber(d1_raw);

    const b2 = extractYearNumber(p2.events.find(e => e.type === "BIRT")?.date);
    const d2_raw = p2.events.find(e => e.type === "DEAT")?.date;
    const isL2 = p2.lifeStatus !== "deceased";
    const d2 = isL2 ? new Date().getFullYear() : extractYearNumber(d2_raw);

    if (b1 === null || b2 === null) return null;

    // Cases where one was born after the other died
    if (d1 !== null && b2 > d1) {
        return `${p2.name} nació ${b2 - d1} años después del fallecimiento de ${p1.name}.`;
    }
    if (d2 !== null && b1 > d2) {
        return `${p1.name} nació ${b1 - d2} años después del fallecimiento de ${p2.name}.`;
    }

    // Overlap case
    const start = Math.max(b1, b2);
    const end = (d1 !== null && d2 !== null) ? Math.min(d1, d2) : (d1 ?? d2);

    if (end !== null && start <= end) {
        const years = end - start;
        if (years === 0) return "Fueron contemporáneos por menos de un año.";
        return `Fueron contemporáneos por aproximadamente ${years} años.`;
    }

    return "Vivieron en épocas similares.";
}

