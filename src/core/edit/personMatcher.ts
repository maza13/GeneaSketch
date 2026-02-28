import { buildRelationshipIndexes } from "../graph/indexes";
import type {
  GeneaDocument,
  MergeAction,
  MergeExplain,
  MergeHypothesis,
  MergeHypothesisType,
  MergeRiskLevel,
  Person,
  UnionV2
} from "@/types/domain";

export type Confidence = "high" | "medium" | "low";
export type MatchPreset = "strict" | "balanced" | "fast";

export type MatchAutoRules = {
  minScore: number;
  minDeltaVsSecond: number;
  minCoverage: number;
  blockerPolicy: "no-hard" | "no-critical";
  mediumAutoScoreMin: number;
  mediumAutoCoverageMin: number;
  mediumAutoDeltaMin: number;
  allowMediumAuto: boolean;
};

export type MatchOptions = {
  preset?: MatchPreset;
  autoRules?: Partial<MatchAutoRules>;
};

type MatchBlocker = {
  code: string;
  severity: "criticalHardConflict" | "nonCriticalHardConflict" | "soft";
  detail: string;
};

type CategoryKey = "identity" | "temporal" | "geography" | "familyNetwork" | "documentStructure";
type FamilySubKey = "familyParents" | "familyUnions" | "familyChildren" | "familySiblings" | "familyGrandparents";

type MatchSignal = {
  code: string;
  category: CategoryKey;
  subCategory?: FamilySubKey;
  points: number;
  detail: string;
  available: boolean;
  comparable: boolean;
};

export type MatchCandidate = {
  baseId: string;
  incomingId: string;
  score: number;
  signals: string[];
  confidence: Confidence;
  blockers: MatchBlocker[];
  qualityFlags: string[];
  categoryScores: {
    identity: number;
    temporal: number;
    geography: number;
    family: number;
    structure: number;
  };
  explain: MergeExplain;
  hypothesesTopK: MergeHypothesis[];
  chosenHypothesis: MergeHypothesis;
  requiredActions: MergeAction[];
  riskLevel: MergeRiskLevel;
};

export type MatchResult = {
  autoMatches: Map<string, string>;
  ambiguousMatches: Map<string, MatchCandidate[]>;
  unmatched: string[];
  blocked: Array<{ incomingId: string; blockers: MatchBlocker[] }>;
  reviewQueue: Array<{ incomingId: string; priority: number; reason: string }>;
  stats: {
    processed: number;
    total: number;
    autoConfirmed: number;
    needsReview: number;
    blocked: number;
    unmatched: number;
    globalIterations?: number;
  };
};

type StrictWeights = {
  identity: number;
  temporal: number;
  geography: number;
  familyNetwork: number;
  documentStructure: number;
};

const STRICT_WEIGHTS: StrictWeights = {
  identity: 30,
  temporal: 20,
  geography: 10,
  familyNetwork: 35,
  documentStructure: 5
};

const FAMILY_SUB_WEIGHTS: Record<FamilySubKey, number> = {
  familyParents: 14,
  familyUnions: 8,
  familyChildren: 8,
  familySiblings: 3,
  familyGrandparents: 2
};

const PRESET_AUTO_RULES: Record<MatchPreset, MatchAutoRules> = {
  strict: {
    minScore: 92,
    minDeltaVsSecond: 14,
    minCoverage: 0.7,
    blockerPolicy: "no-hard",
    mediumAutoScoreMin: 92,
    mediumAutoCoverageMin: 0.7,
    mediumAutoDeltaMin: 14,
    allowMediumAuto: false
  },
  balanced: {
    minScore: 86,
    minDeltaVsSecond: 12,
    minCoverage: 0.62,
    blockerPolicy: "no-hard",
    mediumAutoScoreMin: 86,
    mediumAutoCoverageMin: 0.62,
    mediumAutoDeltaMin: 12,
    allowMediumAuto: true
  },
  fast: {
    minScore: 80,
    minDeltaVsSecond: 10,
    minCoverage: 0.52,
    blockerPolicy: "no-critical",
    mediumAutoScoreMin: 80,
    mediumAutoCoverageMin: 0.52,
    mediumAutoDeltaMin: 10,
    allowMediumAuto: true
  }
};

const GLOBAL_LAYER_WEIGHTS = {
  local: 0.5,
  l2Nuclear: 0.2,
  l3Extended: 0.15,
  l4Global: 0.15
} as const;

const GLOBAL_ASSIGNMENT_MAX_ITERATIONS = 6;
const GLOBAL_ASSIGNMENT_STABLE_ROUNDS = 2;

const CRITICAL_OVERRIDE_RULES = {
  globalScoreMin: 94,
  propagationSupportMin: 0.93,
  anchorHitsMin: 5,
  anchorKindsMin: 3
} as const;

const NAME_VARIANTS: Record<string, string[]> = {
  jose: ["jose", "pepe", "josef", "joseph"],
  maria: ["maria", "ma", "mary"],
  juan: ["juan", "john", "joan"],
  francisco: ["francisco", "franco", "francis"],
  ana: ["ana", "anna", "anne"],
  carlos: ["carlos", "charles", "carl"]
};

function resolveAutoRules(options?: MatchOptions): MatchAutoRules {
  const preset = options?.preset ?? "balanced";
  const base = PRESET_AUTO_RULES[preset];
  if (!options?.autoRules) return base;
  return {
    ...base,
    ...options.autoRules
  };
}

type PersonProfile = {
  id: string;
  fullName: string;
  name: string;
  surname: string;
  surnamePhonetic: string;
  sex: Person["sex"];
  lifeStatus: Person["lifeStatus"];
  birthYear: number | null;
  deathYear: number | null;
  birthPlace: string;
  birthPlaceTokens: Set<string>;
  parentIds: Set<string>;
  spouseIds: Set<string>;
  childIds: Set<string>;
  siblingIds: Set<string>;
  grandparentIds: Set<string>;
  parentNames: Set<string>;
  spouseNames: Set<string>;
  childNames: Set<string>;
  siblingNames: Set<string>;
  grandparentNames: Set<string>;
  minChildBirthYear: number | null;
  spouseBirthMedian: number | null;
  parentBirthMedian: number | null;
  childBirthMedian: number | null;
  unionCount: number;
  eventCount: number;
  sourceRefCount: number;
  mediaRefCount: number;
  isSparse: boolean;
};

type MatcherContext = {
  incDoc: GeneaDocument;
  baseDoc: GeneaDocument;
  incProfiles: Map<string, PersonProfile>;
  baseProfiles: Map<string, PersonProfile>;
  baseByFullName: Map<string, string[]>;
  baseBySurname: Map<string, string[]>;
  baseByRelativeName: Map<string, string[]>;
  baseKnownNames: Set<string>;
};

function normalizeText(s: string | undefined): string {
  if (!s) return "";
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizePlace(s: string | undefined): string {
  if (!s) return "";
  return normalizeText(s)
    .replace(/\b(en|de|del|al|la|las|los|el)\b/g, "")
    .replace(/,+/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGivenName(name: string): string {
  return normalizeText(name).replace(/[^a-z\s]/g, "").trim();
}

function canonicalVariantKey(name: string): string {
  const norm = normalizeGivenName(name);
  if (!norm) return "";
  for (const [key, variants] of Object.entries(NAME_VARIANTS)) {
    if (variants.includes(norm)) return key;
  }
  return norm;
}

function areNameVariantsCompatible(left: string, right: string): boolean {
  const l = canonicalVariantKey(left);
  const r = canonicalVariantKey(right);
  return Boolean(l && r && l === r);
}

function tokenizePlace(place: string): Set<string> {
  return new Set(
    place
      .split(/[\s,;:/.-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
  );
}

function surnamePhoneticCode(value: string): string {
  const s = normalizeText(value).replace(/[^a-z]/g, "");
  if (!s) return "";
  const first = s[0];
  const mapped = s
    .slice(1)
    .replace(/[bfpv]/g, "1")
    .replace(/[cgjkqsxz]/g, "2")
    .replace(/[dt]/g, "3")
    .replace(/[l]/g, "4")
    .replace(/[mn]/g, "5")
    .replace(/[r]/g, "6")
    .replace(/[aeiouyhw]/g, "0")
    .replace(/(.)\1+/g, "$1");
  return `${first}${mapped}`.replace(/0/g, "").slice(0, 5);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return sorted[mid];
}

function fullName(name: string | undefined, surname: string | undefined): string {
  return normalizeText(`${name || ""} ${surname || ""}`.trim());
}

function extractYear(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : null;
}

function getEventYear(person: Person, type: "BIRT" | "DEAT"): number | null {
  const event = person.events.find((e) => e.type === type);
  return extractYear(event?.date);
}

function getBirthPlace(person: Person): string {
  const event = person.events.find((e) => e.type === "BIRT");
  return normalizePlace(event?.place);
}

function buildPersonProfiles(doc: GeneaDocument): Map<string, PersonProfile> {
  const indexes = buildRelationshipIndexes(doc);
  const profiles = new Map<string, PersonProfile>();

  const personNameById = new Map<string, string>();
  for (const person of Object.values(doc.persons)) {
    personNameById.set(person.id, fullName(person.name, person.surname));
  }

  const birthYearById = new Map<string, number | null>();
  for (const person of Object.values(doc.persons)) {
    birthYearById.set(person.id, getEventYear(person, "BIRT"));
  }

  for (const person of Object.values(doc.persons)) {
    const parentIds = indexes.parentsByPerson[person.id] ?? [];
    const spouseIds = indexes.spousesByPerson[person.id] ?? [];
    const childIds = indexes.childrenByPerson[person.id] ?? [];
    const siblingIds = indexes.siblingsByPerson[person.id] ?? [];

    const grandparentIds = new Set<string>();
    for (const parentId of parentIds) {
      const parentParents = indexes.parentsByPerson[parentId] ?? [];
      for (const gpId of parentParents) grandparentIds.add(gpId);
    }

    const childBirthYears = childIds
      .map((id) => birthYearById.get(id) ?? null)
      .filter((value): value is number => value !== null);
    const spouseBirthYears = spouseIds
      .map((id) => birthYearById.get(id) ?? null)
      .filter((value): value is number => value !== null);
    const parentBirthYears = parentIds
      .map((id) => birthYearById.get(id) ?? null)
      .filter((value): value is number => value !== null);

    profiles.set(person.id, {
      id: person.id,
      fullName: fullName(person.name, person.surname),
      name: normalizeGivenName(person.name),
      surname: normalizeText(person.surname),
      surnamePhonetic: surnamePhoneticCode(person.surname || ""),
      sex: person.sex,
      lifeStatus: person.lifeStatus,
      birthYear: getEventYear(person, "BIRT"),
      deathYear: getEventYear(person, "DEAT"),
      birthPlace: getBirthPlace(person),
      birthPlaceTokens: tokenizePlace(getBirthPlace(person)),
      parentIds: new Set(parentIds),
      spouseIds: new Set(spouseIds),
      childIds: new Set(childIds),
      siblingIds: new Set(siblingIds),
      grandparentIds: new Set(grandparentIds),
      parentNames: new Set(parentIds.map((id) => personNameById.get(id) || "").filter(Boolean)),
      spouseNames: new Set(spouseIds.map((id) => personNameById.get(id) || "").filter(Boolean)),
      childNames: new Set(childIds.map((id) => personNameById.get(id) || "").filter(Boolean)),
      siblingNames: new Set(siblingIds.map((id) => personNameById.get(id) || "").filter(Boolean)),
      grandparentNames: new Set(Array.from(grandparentIds).map((id) => personNameById.get(id) || "").filter(Boolean)),
      minChildBirthYear: childBirthYears.length > 0 ? Math.min(...childBirthYears) : null,
      spouseBirthMedian: median(spouseBirthYears),
      parentBirthMedian: median(parentBirthYears),
      childBirthMedian: median(childBirthYears),
      unionCount: person.fams.length,
      eventCount: person.events.length,
      sourceRefCount: person.sourceRefs.length,
      mediaRefCount: person.mediaRefs.length,
      isSparse: !person.name && !person.surname && person.events.length === 0
    });
  }

  return profiles;
}

function buildMatcherContext(baseDoc: GeneaDocument, incomingDoc: GeneaDocument): MatcherContext {
  const baseProfiles = buildPersonProfiles(baseDoc);
  const incProfiles = buildPersonProfiles(incomingDoc);
  const baseByFullName = new Map<string, string[]>();
  const baseBySurname = new Map<string, string[]>();
  const baseByRelativeName = new Map<string, string[]>();
  const baseKnownNames = new Set<string>();

  for (const profile of baseProfiles.values()) {
    if (profile.fullName) {
      if (!baseByFullName.has(profile.fullName)) baseByFullName.set(profile.fullName, []);
      baseByFullName.get(profile.fullName)!.push(profile.id);
      baseKnownNames.add(profile.fullName);
    }
    if (profile.surname) {
      if (!baseBySurname.has(profile.surname)) baseBySurname.set(profile.surname, []);
      baseBySurname.get(profile.surname)!.push(profile.id);
    }

    const relatedNames = [
      ...profile.parentNames,
      ...profile.spouseNames,
      ...profile.childNames,
      ...profile.siblingNames,
      ...profile.grandparentNames
    ];
    for (const relatedName of relatedNames) {
      if (!relatedName) continue;
      if (!baseByRelativeName.has(relatedName)) baseByRelativeName.set(relatedName, []);
      baseByRelativeName.get(relatedName)!.push(profile.id);
    }
  }

  return {
    incDoc: incomingDoc,
    baseDoc,
    incProfiles,
    baseProfiles,
    baseByFullName,
    baseBySurname,
    baseByRelativeName,
    baseKnownNames
  };
}

function overlapMetrics(a: Set<string>, b: Set<string>): { intersection: number; union: number; similarity: number } {
  const union = new Set<string>([...a, ...b]).size;
  if (union === 0) return { intersection: 0, union: 0, similarity: 0 };
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }
  return { intersection, union, similarity: intersection / union };
}

function coverageSignal(state: { available: number; comparable: number }, available: boolean, comparable: boolean): void {
  if (available) state.available += 1;
  if (comparable) state.comparable += 1;
}

function pushSignal(signals: MatchSignal[], signal: MatchSignal): void {
  signals.push(signal);
}

function addPenalty(penalties: MergeExplain["penalties"], code: string, points: number, detail: string): void {
  penalties.push({ code, points, detail });
}

function addBlocker(blockers: MatchBlocker[], code: string, severity: MatchBlocker["severity"], detail: string): void {
  blockers.push({ code, severity, detail });
}

function categoryTotals(signals: MatchSignal[]): {
  identity: number;
  temporal: number;
  geography: number;
  familyNetwork: number;
  documentStructure: number;
  subCategory: Record<FamilySubKey, number>;
} {
  const totals = {
    identity: 0,
    temporal: 0,
    geography: 0,
    familyNetwork: 0,
    documentStructure: 0,
    subCategory: {
      familyParents: 0,
      familyUnions: 0,
      familyChildren: 0,
      familySiblings: 0,
      familyGrandparents: 0
    } as Record<FamilySubKey, number>
  };

  for (const signal of signals) {
    totals[signal.category] += signal.points;
    if (signal.subCategory) totals.subCategory[signal.subCategory] += signal.points;
  }

  totals.identity = Math.max(0, Math.min(STRICT_WEIGHTS.identity, totals.identity));
  totals.temporal = Math.max(0, Math.min(STRICT_WEIGHTS.temporal, totals.temporal));
  totals.geography = Math.max(0, Math.min(STRICT_WEIGHTS.geography, totals.geography));
  totals.familyNetwork = Math.max(0, Math.min(STRICT_WEIGHTS.familyNetwork, totals.familyNetwork));
  totals.documentStructure = Math.max(0, Math.min(STRICT_WEIGHTS.documentStructure, totals.documentStructure));
  for (const key of Object.keys(totals.subCategory) as FamilySubKey[]) {
    totals.subCategory[key] = Math.max(0, Math.min(FAMILY_SUB_WEIGHTS[key], totals.subCategory[key]));
  }

  return totals;
}

function riskFromScore(score: number, blockers: MatchBlocker[], coverageRatio: number): MergeRiskLevel {
  const balanced = PRESET_AUTO_RULES.balanced;
  if (blockers.some((blocker) => blocker.severity === "criticalHardConflict")) return "high";
  if (score >= balanced.minScore && coverageRatio >= balanced.minCoverage) return "low";
  if (score >= 70) return "medium";
  return "high";
}

function actionCost(actions: MergeAction[]): number {
  const weights: Record<MergeAction["kind"], number> = {
    merge_person: 1,
    create_person: 2,
    create_union: 2,
    link_parent_child: 1,
    flag_pending_enrichment: 1,
    project_legacy: 3
  };
  return actions.reduce((sum, action) => sum + weights[action.kind], 0);
}

function hypothesisComparator(left: MergeHypothesis, right: MergeHypothesis): number {
  if (left.scoreFinal !== right.scoreFinal) return right.scoreFinal - left.scoreFinal;

  const blockerWeight = (hypothesis: MergeHypothesis): number =>
    hypothesis.explain.blockers.reduce((sum, blocker) => {
      if (blocker.severity === "criticalHardConflict") return sum + 3;
      if (blocker.severity === "nonCriticalHardConflict") return sum + 2;
      return sum + 1;
    }, 0);
  const blockerDelta = blockerWeight(left) - blockerWeight(right);
  if (blockerDelta !== 0) return blockerDelta;

  if (left.explain.coverage.coverageRatio !== right.explain.coverage.coverageRatio) {
    return right.explain.coverage.coverageRatio - left.explain.coverage.coverageRatio;
  }

  const costDelta = actionCost(left.explain.requiredActions) - actionCost(right.explain.requiredActions);
  if (costDelta !== 0) return costDelta;

  const leftKey = `${left.hypothesisType}:${left.baseId || ""}`;
  const rightKey = `${right.hypothesisType}:${right.baseId || ""}`;
  return leftKey.localeCompare(rightKey);
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeLayerScores(metrics: {
  parentSimilarity: number;
  unionSimilarity: number;
  childSimilarity: number;
  siblingSimilarity: number;
  grandparentSimilarity: number;
  categoryScores: {
    identity: number;
    temporal: number;
    geography: number;
  };
}, localScore: number): { l1Identity: number; l2Nuclear: number; l3Extended: number } {
  const identityWeighted =
    metrics.categoryScores.identity * 2 +
    metrics.categoryScores.temporal +
    metrics.categoryScores.geography;
  const identityMax = STRICT_WEIGHTS.identity * 2 + STRICT_WEIGHTS.temporal + STRICT_WEIGHTS.geography;
  const l1Identity = clampScore((identityWeighted / Math.max(1, identityMax)) * 100 * 0.55 + localScore * 0.45);
  const l2Nuclear = clampScore(
    (metrics.parentSimilarity * 0.42 + metrics.unionSimilarity * 0.24 + metrics.childSimilarity * 0.34) * 100
  );
  const l3Extended = clampScore(
    (metrics.siblingSimilarity * 0.55 + metrics.grandparentSimilarity * 0.45) * 100
  );
  return { l1Identity, l2Nuclear, l3Extended };
}

function evaluatePersonComparison(
  incoming: PersonProfile,
  base: PersonProfile
): {
  scoreFinal: number;
  confidence: Confidence;
  explain: MergeExplain;
  blockers: MatchBlocker[];
  qualityFlags: string[];
  metrics: {
    parentSimilarity: number;
    unionSimilarity: number;
    childSimilarity: number;
    siblingSimilarity: number;
    grandparentSimilarity: number;
    anchorHits: number;
    anchorKinds: string[];
    layerScores: {
      l1Identity: number;
      l2Nuclear: number;
      l3Extended: number;
    };
    coverageRatio: number;
    hasCriticalHard: boolean;
    hasNonCriticalHard: boolean;
    categoryScores: {
      identity: number;
      temporal: number;
      geography: number;
      family: number;
      structure: number;
    };
  };
  signals: string[];
} {
  const coverage = { available: 0, comparable: 0 };
  const matchSignals: MatchSignal[] = [];
  const penalties: MergeExplain["penalties"] = [];
  const blockers: MatchBlocker[] = [];
  const capsApplied: string[] = [];
  const qualityFlags: string[] = [];

  // Identity (30)
  const nameComparable = Boolean(incoming.name && base.name);
  coverageSignal(coverage, Boolean(incoming.name || base.name), nameComparable);
  if (incoming.name && base.name) {
    if (incoming.name === base.name) {
      pushSignal(matchSignals, {
        code: "IDENTITY_NAME_EXACT",
        category: "identity",
        points: 12,
        detail: "Exact first name match",
        available: true,
        comparable: true
      });
    } else if (areNameVariantsCompatible(incoming.name, base.name)) {
      pushSignal(matchSignals, {
        code: "IDENTITY_NAME_VARIANT_EQUIV",
        category: "identity",
        points: 8,
        detail: "Compatible first-name variant",
        available: true,
        comparable: true
      });
      addPenalty(penalties, "IDENTITY_NAME_VARIANT", 1, "Name variant normalization applied");
    } else if (incoming.name.startsWith(base.name) || base.name.startsWith(incoming.name)) {
      pushSignal(matchSignals, {
        code: "IDENTITY_NAME_PARTIAL",
        category: "identity",
        points: 5,
        detail: "Partial first name overlap",
        available: true,
        comparable: true
      });
      addPenalty(penalties, "IDENTITY_NAME_VARIANT", 2, "Different first name variants");
    } else {
      addPenalty(penalties, "IDENTITY_NAME_MISMATCH", 6, "First name mismatch");
    }
  }

  const surnameComparable = Boolean(incoming.surname && base.surname);
  coverageSignal(coverage, Boolean(incoming.surname || base.surname), surnameComparable);
  if (incoming.surname && base.surname) {
    if (incoming.surname === base.surname) {
      pushSignal(matchSignals, {
        code: "IDENTITY_SURNAME_EXACT",
        category: "identity",
        points: 10,
        detail: "Exact surname match",
        available: true,
        comparable: true
      });
    } else if (incoming.surnamePhonetic && incoming.surnamePhonetic === base.surnamePhonetic) {
      pushSignal(matchSignals, {
        code: "IDENTITY_SURNAME_PHONETIC",
        category: "identity",
        points: 6,
        detail: "Phonetic surname compatibility",
        available: true,
        comparable: true
      });
      addPenalty(penalties, "IDENTITY_SURNAME_VARIANT", 2, "Surname variant accepted via phonetic normalization");
    } else {
      addPenalty(penalties, "IDENTITY_SURNAME_MISMATCH", 5, "Surname mismatch");
    }
  }

  if (incoming.fullName && base.fullName) {
    coverageSignal(coverage, true, true);
    if (incoming.fullName === base.fullName) {
      pushSignal(matchSignals, {
        code: "IDENTITY_FULLNAME_EXACT",
        category: "identity",
        points: 4,
        detail: "Exact full name",
        available: true,
        comparable: true
      });
    }
  }

  const sexComparable = incoming.sex !== "U" && base.sex !== "U";
  coverageSignal(coverage, incoming.sex !== "U" || base.sex !== "U", sexComparable);
  if (sexComparable) {
    if (incoming.sex === base.sex) {
      pushSignal(matchSignals, {
        code: "IDENTITY_SEX_MATCH",
        category: "identity",
        points: 4,
        detail: "Known sex matches",
        available: true,
        comparable: true
      });
    } else {
      addBlocker(blockers, "SEX_CONFLICT", "criticalHardConflict", "Known sex is incompatible");
    }
  }

  // Temporal (20)
  const birthComparable = incoming.birthYear !== null && base.birthYear !== null;
  coverageSignal(coverage, incoming.birthYear !== null || base.birthYear !== null, birthComparable);
  if (birthComparable) {
    const delta = Math.abs(incoming.birthYear! - base.birthYear!);
    if (delta === 0) {
      pushSignal(matchSignals, {
        code: "TEMP_BIRTH_EXACT",
        category: "temporal",
        points: 12,
        detail: "Exact birth year match",
        available: true,
        comparable: true
      });
    } else if (delta <= 2) {
      pushSignal(matchSignals, {
        code: "TEMP_BIRTH_CLOSE_2",
        category: "temporal",
        points: 8,
        detail: "Birth year within 2 years",
        available: true,
        comparable: true
      });
    } else if (delta <= 5) {
      pushSignal(matchSignals, {
        code: "TEMP_BIRTH_CLOSE_5",
        category: "temporal",
        points: 4,
        detail: "Birth year within 5 years",
        available: true,
        comparable: true
      });
    } else if (delta > 15) {
      addBlocker(
        blockers,
        "BIRTH_YEAR_INCOMPATIBLE",
        "nonCriticalHardConflict",
        `Birth year mismatch (${incoming.birthYear} vs ${base.birthYear})`
      );
    } else {
      addPenalty(penalties, "BIRTH_YEAR_MISMATCH", 4, "Birth year mismatch outside tolerance");
    }
  }

  const deathComparable = incoming.deathYear !== null && base.deathYear !== null;
  coverageSignal(coverage, incoming.deathYear !== null || base.deathYear !== null, deathComparable);
  if (deathComparable) {
    const delta = Math.abs(incoming.deathYear! - base.deathYear!);
    if (delta === 0) {
      pushSignal(matchSignals, {
        code: "TEMP_DEATH_EXACT",
        category: "temporal",
        points: 6,
        detail: "Exact death year match",
        available: true,
        comparable: true
      });
    } else if (delta <= 2) {
      pushSignal(matchSignals, {
        code: "TEMP_DEATH_CLOSE_2",
        category: "temporal",
        points: 3,
        detail: "Death year within 2 years",
        available: true,
        comparable: true
      });
    } else if (delta > 15) {
      addBlocker(
        blockers,
        "DEATH_YEAR_INCOMPATIBLE",
        "nonCriticalHardConflict",
        `Death year mismatch (${incoming.deathYear} vs ${base.deathYear})`
      );
    } else {
      addPenalty(penalties, "DEATH_YEAR_MISMATCH", 2, "Death year mismatch");
    }
  }

  if (incoming.minChildBirthYear !== null && base.birthYear !== null) {
    coverageSignal(coverage, true, true);
    const age = incoming.minChildBirthYear - base.birthYear;
    if (age < 12) {
      addBlocker(blockers, "BIOLOGY_PARENT_TOO_YOUNG", "nonCriticalHardConflict", "Parent age is biologically implausible");
    }
  }
  if (base.minChildBirthYear !== null && incoming.birthYear !== null) {
    coverageSignal(coverage, true, true);
    const age = base.minChildBirthYear - incoming.birthYear;
    if (age < 12) {
      addBlocker(blockers, "BIOLOGY_PARENT_TOO_YOUNG", "nonCriticalHardConflict", "Parent age is biologically implausible");
    }
  }

  const spouseTemporalComparable = incoming.spouseBirthMedian !== null && base.spouseBirthMedian !== null;
  coverageSignal(coverage, incoming.spouseBirthMedian !== null || base.spouseBirthMedian !== null, spouseTemporalComparable);
  if (spouseTemporalComparable) {
    const spouseDelta = Math.abs(incoming.spouseBirthMedian! - base.spouseBirthMedian!);
    if (spouseDelta <= 2) {
      pushSignal(matchSignals, {
        code: "TEMP_SPOUSE_BIRTH_MEDIAN_CLOSE",
        category: "temporal",
        points: 2,
        detail: "Spouse generation timing aligns",
        available: true,
        comparable: true
      });
    } else if (spouseDelta > 12) {
      addPenalty(penalties, "TEMP_SPOUSE_TIMING_DIVERGENCE", 2, "Spouse generation timing diverges");
    }
  }

  const parentTemporalComparable = incoming.parentBirthMedian !== null && base.parentBirthMedian !== null;
  coverageSignal(coverage, incoming.parentBirthMedian !== null || base.parentBirthMedian !== null, parentTemporalComparable);
  if (parentTemporalComparable) {
    const parentDelta = Math.abs(incoming.parentBirthMedian! - base.parentBirthMedian!);
    if (parentDelta <= 3) {
      pushSignal(matchSignals, {
        code: "TEMP_PARENT_BIRTH_MEDIAN_CLOSE",
        category: "temporal",
        points: 2,
        detail: "Parent generation timing aligns",
        available: true,
        comparable: true
      });
    } else if (parentDelta > 18) {
      addPenalty(penalties, "TEMP_PARENT_TIMING_DIVERGENCE", 2, "Parent generation timing diverges");
    }
  }

  const childTemporalComparable = incoming.childBirthMedian !== null && base.childBirthMedian !== null;
  coverageSignal(coverage, incoming.childBirthMedian !== null || base.childBirthMedian !== null, childTemporalComparable);
  if (childTemporalComparable) {
    const childDelta = Math.abs(incoming.childBirthMedian! - base.childBirthMedian!);
    if (childDelta <= 3) {
      pushSignal(matchSignals, {
        code: "TEMP_CHILD_BIRTH_MEDIAN_CLOSE",
        category: "temporal",
        points: 2,
        detail: "Child generation timing aligns",
        available: true,
        comparable: true
      });
    } else if (childDelta > 18) {
      addPenalty(penalties, "TEMP_CHILD_TIMING_DIVERGENCE", 2, "Child generation timing diverges");
    }
  }

  // Geography (10)
  const placeComparable = Boolean(incoming.birthPlace && base.birthPlace);
  coverageSignal(coverage, Boolean(incoming.birthPlace || base.birthPlace), placeComparable);
  if (placeComparable) {
    if (incoming.birthPlace === base.birthPlace) {
      pushSignal(matchSignals, {
        code: "GEO_BIRTH_PLACE_EXACT",
        category: "geography",
        points: 10,
        detail: "Exact birth place match",
        available: true,
        comparable: true
      });
    } else if (incoming.birthPlace.includes(base.birthPlace) || base.birthPlace.includes(incoming.birthPlace)) {
      pushSignal(matchSignals, {
        code: "GEO_BIRTH_PLACE_PARTIAL",
        category: "geography",
        points: 5,
        detail: "Partial birth place overlap",
        available: true,
        comparable: true
      });
      addPenalty(penalties, "GEO_VARIANT", 1, "Birth place variant");
    } else {
      const tokenOverlap = overlapMetrics(incoming.birthPlaceTokens, base.birthPlaceTokens);
      if (tokenOverlap.similarity >= 0.5) {
        pushSignal(matchSignals, {
          code: "GEO_BIRTH_PLACE_TOKENS_CLOSE",
          category: "geography",
          points: 4,
          detail: "Birth place token overlap",
          available: true,
          comparable: true
        });
        addPenalty(penalties, "GEO_TOKENS_VARIANT", 1, "Token-level place variant");
      } else {
        addPenalty(penalties, "GEO_DIFFERENT_PLAUSIBLE", 2, "Different geography; treated as soft conflict");
      }
    }
  }

  // Family network (35)
  const parentOverlap = overlapMetrics(incoming.parentNames, base.parentNames);
  coverageSignal(
    coverage,
    incoming.parentNames.size > 0 || base.parentNames.size > 0,
    incoming.parentNames.size > 0 && base.parentNames.size > 0
  );
  pushSignal(matchSignals, {
    code: "FAM_PARENTS",
    category: "familyNetwork",
    subCategory: "familyParents",
    points: Math.round(FAMILY_SUB_WEIGHTS.familyParents * parentOverlap.similarity),
    detail: "Parent network similarity",
    available: incoming.parentNames.size > 0 || base.parentNames.size > 0,
    comparable: incoming.parentNames.size > 0 && base.parentNames.size > 0
  });
  if (incoming.parentNames.size > 0 && base.parentNames.size > 0 && parentOverlap.intersection === 0) {
    addPenalty(penalties, "FAM_PARENT_MISMATCH", 6, "Known parents do not overlap");
    if (incoming.parentNames.size >= 2 || base.parentNames.size >= 2) {
      addBlocker(blockers, "PARENTS_INCOMPATIBLE", "nonCriticalHardConflict", "Strong parent mismatch");
    }
  }

  const unionOverlap = overlapMetrics(incoming.spouseNames, base.spouseNames);
  coverageSignal(
    coverage,
    incoming.spouseNames.size > 0 || base.spouseNames.size > 0,
    incoming.spouseNames.size > 0 && base.spouseNames.size > 0
  );
  pushSignal(matchSignals, {
    code: "FAM_UNIONS",
    category: "familyNetwork",
    subCategory: "familyUnions",
    points: Math.round(FAMILY_SUB_WEIGHTS.familyUnions * unionOverlap.similarity),
    detail: "Union/spouse similarity",
    available: incoming.spouseNames.size > 0 || base.spouseNames.size > 0,
    comparable: incoming.spouseNames.size > 0 && base.spouseNames.size > 0
  });
  if (incoming.spouseNames.size > 0 && base.spouseNames.size > 0 && unionOverlap.intersection === 0) {
    addPenalty(penalties, "FAM_UNION_DIVERGENCE", 4, "Different spouses/unions; soft conflict");
  }

  const childOverlap = overlapMetrics(incoming.childNames, base.childNames);
  coverageSignal(
    coverage,
    incoming.childNames.size > 0 || base.childNames.size > 0,
    incoming.childNames.size > 0 && base.childNames.size > 0
  );
  pushSignal(matchSignals, {
    code: "FAM_CHILDREN",
    category: "familyNetwork",
    subCategory: "familyChildren",
    points: Math.round(FAMILY_SUB_WEIGHTS.familyChildren * childOverlap.similarity),
    detail: "Children similarity",
    available: incoming.childNames.size > 0 || base.childNames.size > 0,
    comparable: incoming.childNames.size > 0 && base.childNames.size > 0
  });
  if (incoming.childNames.size > 0 && base.childNames.size > 0 && childOverlap.intersection === 0) {
    addPenalty(penalties, "FAM_CHILD_DIVERGENCE", 4, "Different children sets; soft conflict");
  }

  const siblingOverlap = overlapMetrics(incoming.siblingNames, base.siblingNames);
  coverageSignal(
    coverage,
    incoming.siblingNames.size > 0 || base.siblingNames.size > 0,
    incoming.siblingNames.size > 0 && base.siblingNames.size > 0
  );
  pushSignal(matchSignals, {
    code: "FAM_SIBLINGS",
    category: "familyNetwork",
    subCategory: "familySiblings",
    points: Math.round(FAMILY_SUB_WEIGHTS.familySiblings * siblingOverlap.similarity),
    detail: "Sibling similarity",
    available: incoming.siblingNames.size > 0 || base.siblingNames.size > 0,
    comparable: incoming.siblingNames.size > 0 && base.siblingNames.size > 0
  });
  if (incoming.siblingNames.size > 0 && base.siblingNames.size > 0 && siblingOverlap.intersection === 0) {
    addPenalty(penalties, "FAM_SIBLING_DIVERGENCE", 2, "Different siblings; soft conflict");
  }

  const grandparentOverlap = overlapMetrics(incoming.grandparentNames, base.grandparentNames);
  coverageSignal(
    coverage,
    incoming.grandparentNames.size > 0 || base.grandparentNames.size > 0,
    incoming.grandparentNames.size > 0 && base.grandparentNames.size > 0
  );
  pushSignal(matchSignals, {
    code: "FAM_GRANDPARENTS",
    category: "familyNetwork",
    subCategory: "familyGrandparents",
    points: Math.round(FAMILY_SUB_WEIGHTS.familyGrandparents * grandparentOverlap.similarity),
    detail: "Grandparent similarity",
    available: incoming.grandparentNames.size > 0 || base.grandparentNames.size > 0,
    comparable: incoming.grandparentNames.size > 0 && base.grandparentNames.size > 0
  });
  if (incoming.grandparentNames.size > 0 && base.grandparentNames.size > 0 && grandparentOverlap.intersection === 0) {
    addPenalty(penalties, "FAM_GRANDPARENT_DIVERGENCE", 1, "Different grandparents; soft conflict");
  }

  const anchorKinds: string[] = [];
  if (parentOverlap.intersection > 0) anchorKinds.push("padres");
  if (unionOverlap.intersection > 0) anchorKinds.push("pareja");
  if (childOverlap.intersection > 0) anchorKinds.push("hijos");
  if (siblingOverlap.intersection > 0) anchorKinds.push("hermanos");
  if (grandparentOverlap.intersection > 0) anchorKinds.push("abuelos");
  const anchorHits =
    parentOverlap.intersection +
    unionOverlap.intersection +
    childOverlap.intersection +
    siblingOverlap.intersection +
    grandparentOverlap.intersection;

  // Document structure (5)
  coverageSignal(coverage, true, true);
  if (incoming.lifeStatus === base.lifeStatus) {
    pushSignal(matchSignals, {
      code: "STRUCT_LIFESTATUS_MATCH",
      category: "documentStructure",
      points: 2,
      detail: "Life status aligns",
      available: true,
      comparable: true
    });
  } else {
    addPenalty(penalties, "STRUCT_LIFESTATUS_VARIANT", 1, "Different life status");
  }

  coverageSignal(coverage, true, true);
  const incomingHasCoreData = incoming.birthYear !== null || incoming.deathYear !== null || incoming.parentNames.size > 0;
  const baseHasCoreData = base.birthYear !== null || base.deathYear !== null || base.parentNames.size > 0;
  if (incomingHasCoreData && baseHasCoreData) {
    pushSignal(matchSignals, {
      code: "STRUCT_CORE_EVIDENCE_PRESENT",
      category: "documentStructure",
      points: 2,
      detail: "Both sides include core documentary evidence",
      available: true,
      comparable: true
    });
  } else if (!incomingHasCoreData && !baseHasCoreData) {
    addPenalty(penalties, "STRUCT_LOW_EVIDENCE", 1, "Both sides have sparse structure");
    qualityFlags.push("sparse-both-sides");
  } else {
    addPenalty(penalties, "STRUCT_ASYMMETRIC_EVIDENCE", 1, "Asymmetric structure quality");
  }

  coverageSignal(coverage, true, true);
  if (incoming.unionCount === base.unionCount) {
    pushSignal(matchSignals, {
      code: "STRUCT_UNION_COUNT_ALIGN",
      category: "documentStructure",
      points: 1,
      detail: "Union count aligns",
      available: true,
      comparable: true
    });
  }

  coverageSignal(coverage, true, true);
  const eventDelta = Math.abs(incoming.eventCount - base.eventCount);
  if (eventDelta <= 1) {
    pushSignal(matchSignals, {
      code: "STRUCT_EVENT_CARDINALITY_ALIGN",
      category: "documentStructure",
      points: 1,
      detail: "Event cardinality aligns",
      available: true,
      comparable: true
    });
  } else if (eventDelta >= 4) {
    addPenalty(penalties, "STRUCT_EVENT_CARDINALITY_DIVERGENCE", 1, "Large event cardinality divergence");
  }

  coverageSignal(coverage, true, true);
  const evidenceDelta =
    Math.abs(incoming.sourceRefCount - base.sourceRefCount) +
    Math.abs(incoming.mediaRefCount - base.mediaRefCount);
  if (evidenceDelta === 0) {
    pushSignal(matchSignals, {
      code: "STRUCT_EVIDENCE_CARDINALITY_ALIGN",
      category: "documentStructure",
      points: 1,
      detail: "Source/media evidence cardinality aligns",
      available: true,
      comparable: true
    });
  } else if (evidenceDelta >= 4) {
    addPenalty(penalties, "STRUCT_EVIDENCE_CARDINALITY_DIVERGENCE", 1, "Evidence cardinality diverges significantly");
  }

  const totals = categoryTotals(matchSignals);
  const rawScore = totals.identity + totals.temporal + totals.geography + totals.familyNetwork + totals.documentStructure;
  const penaltiesTotal = penalties.reduce((sum, penalty) => sum + penalty.points, 0);
  const coverageRatio = coverage.comparable / Math.max(1, coverage.available);
  const coveragePenalty = Math.round((1 - coverageRatio) * 18);
  let scoreFinal = rawScore - penaltiesTotal - coveragePenalty;

  const hasCriticalHard = blockers.some((blocker) => blocker.severity === "criticalHardConflict");
  const hasNonCriticalHard = blockers.some((blocker) => blocker.severity === "nonCriticalHardConflict");
  let cap = 100;

  if (hasCriticalHard) {
    cap = Math.min(cap, 0);
    capsApplied.push("criticalHardConflict -> cap 0");
  } else if (hasNonCriticalHard) {
    cap = Math.min(cap, 49);
    capsApplied.push("nonCriticalHardConflict -> cap 49");
  }

  if (coverageRatio < 0.3) {
    cap = Math.min(cap, 59);
    capsApplied.push("coverageRatio < 0.30 -> cap 59");
    qualityFlags.push("low-coverage-critical");
  } else if (coverageRatio < 0.45) {
    cap = Math.min(cap, 74);
    capsApplied.push("coverageRatio < 0.45 -> cap 74");
    qualityFlags.push("low-coverage");
  }

  if (incoming.isSparse) qualityFlags.push("incoming-sparse");
  if (base.isSparse) qualityFlags.push("base-sparse");

  scoreFinal = Math.max(0, Math.min(cap, scoreFinal));
  const layerScores = computeLayerScores({
    parentSimilarity: parentOverlap.similarity,
    unionSimilarity: unionOverlap.similarity,
    childSimilarity: childOverlap.similarity,
    siblingSimilarity: siblingOverlap.similarity,
    grandparentSimilarity: grandparentOverlap.similarity,
    categoryScores: {
      identity: totals.identity,
      temporal: totals.temporal,
      geography: totals.geography
    }
  }, scoreFinal);

  let confidence: Confidence = "low";
  if (scoreFinal >= 85) confidence = "high";
  else if (scoreFinal >= 60) confidence = "medium";

  const explain: MergeExplain = {
    categoryPoints: {
      identity: totals.identity,
      temporal: totals.temporal,
      geography: totals.geography,
      familyNetwork: totals.familyNetwork,
      documentStructure: totals.documentStructure
    },
    subCategoryPoints: {
      familyParents: totals.subCategory.familyParents,
      familyUnions: totals.subCategory.familyUnions,
      familyChildren: totals.subCategory.familyChildren,
      familySiblings: totals.subCategory.familySiblings,
      familyGrandparents: totals.subCategory.familyGrandparents
    },
    penalties,
    coverage: {
      comparableSignals: coverage.comparable,
      availableSignals: coverage.available,
      coverageRatio,
      coveragePenalty
    },
    capsApplied,
    blockers,
    decisionReason: "",
    requiredActions: []
  };

  const signals = matchSignals.map((signal) => `${signal.code}: ${signal.detail} (+${signal.points})`);

  return {
    scoreFinal,
    confidence,
    explain,
    blockers,
    qualityFlags: Array.from(new Set(qualityFlags)),
    metrics: {
      parentSimilarity: parentOverlap.similarity,
      unionSimilarity: unionOverlap.similarity,
      childSimilarity: childOverlap.similarity,
      siblingSimilarity: siblingOverlap.similarity,
      grandparentSimilarity: grandparentOverlap.similarity,
      anchorHits,
      anchorKinds,
      layerScores,
      coverageRatio,
      hasCriticalHard,
      hasNonCriticalHard,
      categoryScores: {
        identity: totals.identity,
        temporal: totals.temporal,
        geography: totals.geography,
        family: totals.familyNetwork,
        structure: totals.documentStructure
      }
    },
    signals
  };
}

function hypothesis(
  type: MergeHypothesisType,
  baseId: string | undefined,
  scoreFinal: number,
  explain: MergeExplain,
  forcedRisk?: MergeRiskLevel
): MergeHypothesis {
  return {
    hypothesisType: type,
    baseId,
    scoreFinal: Math.max(0, Math.min(100, Math.round(scoreFinal))),
    riskLevel: forcedRisk || riskFromScore(scoreFinal, explain.blockers, explain.coverage.coverageRatio),
    explain
  };
}

function cloneExplain(baseExplain: MergeExplain): MergeExplain {
  return {
    categoryPoints: { ...baseExplain.categoryPoints },
    subCategoryPoints: { ...baseExplain.subCategoryPoints },
    penalties: [...baseExplain.penalties.map((penalty) => ({ ...penalty }))],
    coverage: { ...baseExplain.coverage },
    capsApplied: [...baseExplain.capsApplied],
    blockers: [...baseExplain.blockers.map((blocker) => ({ ...blocker }))],
    decisionReason: baseExplain.decisionReason,
    requiredActions: [...baseExplain.requiredActions.map((action) => ({ ...action }))],
    networkEvidence: baseExplain.networkEvidence
      ? {
        layerScores: { ...baseExplain.networkEvidence.layerScores },
        anchorHits: baseExplain.networkEvidence.anchorHits,
        anchorKinds: [...baseExplain.networkEvidence.anchorKinds],
        propagationSupport: baseExplain.networkEvidence.propagationSupport,
        iterationChosen: baseExplain.networkEvidence.iterationChosen,
        criticalOverride: baseExplain.networkEvidence.criticalOverride
      }
      : undefined
  };
}

function buildHypotheses(
  incoming: PersonProfile,
  base: PersonProfile,
  baseScore: number,
  baseExplain: MergeExplain,
  metrics: {
    parentSimilarity: number;
    unionSimilarity: number;
    childSimilarity: number;
    siblingSimilarity: number;
    grandparentSimilarity: number;
    anchorHits: number;
    anchorKinds: string[];
    layerScores: {
      l1Identity: number;
      l2Nuclear: number;
      l3Extended: number;
    };
    coverageRatio: number;
    hasCriticalHard: boolean;
    hasNonCriticalHard: boolean;
    categoryScores: {
      identity: number;
      temporal: number;
      geography: number;
      family: number;
      structure: number;
    };
  },
  context: MatcherContext,
  network: {
    propagationSupport: number;
    globalScore: number;
    iterationChosen: number;
    criticalOverride: boolean;
  }
): MergeHypothesis[] {
  const out: MergeHypothesis[] = [];
  const networkEvidence = {
    layerScores: {
      l1Identity: metrics.layerScores.l1Identity,
      l2Nuclear: metrics.layerScores.l2Nuclear,
      l3Extended: metrics.layerScores.l3Extended,
      l4Global: clampScore(network.propagationSupport * 100)
    },
    anchorHits: metrics.anchorHits,
    anchorKinds: [...metrics.anchorKinds],
    propagationSupport: Math.max(0, Math.min(1, network.propagationSupport)),
    iterationChosen: network.iterationChosen,
    criticalOverride: network.criticalOverride
  };

  const sameExplain = cloneExplain(baseExplain);
  sameExplain.decisionReason = "Identidad y estructura compatibles para tratarlo como la misma persona.";
  sameExplain.requiredActions = [
    { kind: "merge_person", incomingId: incoming.id, baseId: base.id },
    { kind: "project_legacy" }
  ];
  sameExplain.networkEvidence = networkEvidence;
  out.push(hypothesis("SamePerson", base.id, network.globalScore || baseScore, sameExplain));

  if (!metrics.hasCriticalHard && metrics.layerScores.l2Nuclear >= 60 && metrics.layerScores.l3Extended >= 30) {
    const networkConfirmed = cloneExplain(sameExplain);
    networkConfirmed.decisionReason =
      "Confirmacion por red familiar: nucleo y red extendida consistentes con alta evidencia.";
    networkConfirmed.networkEvidence = networkEvidence;
    out.push(hypothesis("SamePersonNetworkConfirmed", base.id, network.globalScore + 6, networkConfirmed, "low"));
  }

  if (!metrics.hasCriticalHard && metrics.parentSimilarity >= 0.45 && (metrics.unionSimilarity < 0.35 || metrics.childSimilarity < 0.35)) {
    const additionalUnionExplain = cloneExplain(baseExplain);
    additionalUnionExplain.decisionReason =
      "Padres alinean, pero uniones/hijos divergen; se modela como misma persona con union adicional.";
    const union: UnionV2 = {
      id: `U:auto:${incoming.id}:${base.id}`,
      partnerIds: [base.id],
      unionType: "unknown",
      confidence: 0.6
    };
    additionalUnionExplain.requiredActions = [
      { kind: "merge_person", incomingId: incoming.id, baseId: base.id },
      { kind: "create_union", union },
      { kind: "project_legacy" }
    ];
    const adjusted =
      baseScore +
      8 +
      Math.round(metrics.parentSimilarity * 6) -
      Math.round((1 - metrics.unionSimilarity) * 3) -
      Math.round((1 - metrics.childSimilarity) * 2);
    additionalUnionExplain.networkEvidence = networkEvidence;
    out.push(hypothesis("SamePersonAdditionalUnion", base.id, Math.max(adjusted, network.globalScore), additionalUnionExplain));
  }

  if (network.criticalOverride) {
    const criticalOverrideExplain = cloneExplain(sameExplain);
    criticalOverrideExplain.decisionReason =
      "Conflicto critico anulado por evidencia extrema de red y consistencia global.";
    criticalOverrideExplain.networkEvidence = { ...networkEvidence, criticalOverride: true };
    out.push(hypothesis("SamePersonCriticalOverride", base.id, Math.max(network.globalScore, 95), criticalOverrideExplain, "low"));
  }

  const homonymExplain = cloneExplain(baseExplain);
  homonymExplain.decisionReason = "Hay solapamiento de identidad, pero la red familiar/temporal sugiere homonimo.";
  homonymExplain.networkEvidence = networkEvidence;
  homonymExplain.requiredActions = [{ kind: "create_person", incomingId: incoming.id, preferredId: incoming.id }];
  const homonymScore =
    100 -
    (network.globalScore || baseScore) +
    (metrics.categoryScores.identity >= 16 ? 8 : 0) +
    (metrics.categoryScores.family <= 14 ? 6 : 0) +
    (metrics.hasNonCriticalHard ? 8 : 0);
  out.push(hypothesis("Homonym", base.id, homonymScore, homonymExplain));

  if (metrics.hasCriticalHard || metrics.hasNonCriticalHard) {
    const misExplain = cloneExplain(baseExplain);
    misExplain.decisionReason = "Conflictos duros localizados sugieren posible mala atribucion.";
    misExplain.networkEvidence = networkEvidence;
    misExplain.requiredActions = [{ kind: "create_person", incomingId: incoming.id, preferredId: incoming.id }];
    out.push(hypothesis("Misattribution", base.id, 72 + (metrics.hasCriticalHard ? 10 : 0), misExplain));
  }

  const createExplain = cloneExplain(baseExplain);
  createExplain.decisionReason = "La evidencia no alcanza para fusion segura; crear persona nueva.";
  createExplain.networkEvidence = networkEvidence;
  createExplain.requiredActions = [{ kind: "create_person", incomingId: incoming.id, preferredId: incoming.id }];
  const createScore =
    64 +
    (metrics.coverageRatio < 0.45 ? 12 : 0) +
    (metrics.hasCriticalHard ? 14 : 0) +
    (metrics.hasNonCriticalHard ? 8 : 0) -
    Math.round((network.globalScore || baseScore) * 0.2);
  out.push(hypothesis("CreateNewPerson", undefined, createScore, createExplain));

  const anchorNames = [
    ...incoming.parentNames,
    ...incoming.spouseNames,
    ...incoming.childNames
  ];
  const anchorHits = anchorNames.filter((name) => context.baseKnownNames.has(name)).length;
  if (anchorHits > 0 && metrics.categoryScores.identity < 15) {
    const anchorExplain = cloneExplain(baseExplain);
    anchorExplain.decisionReason =
      "La persona entrante tiene anclas en el arbol base pero identidad debil; sugerir insercion anclada.";
    anchorExplain.requiredActions = [
      { kind: "create_person", incomingId: incoming.id, preferredId: incoming.id },
      {
        kind: "flag_pending_enrichment",
        personId: incoming.id,
        reason: "anchor-insertion-low-identity",
        confidence: Math.max(0.35, Math.min(0.85, 0.45 + anchorHits * 0.08))
      },
      { kind: "project_legacy" }
    ];
    anchorExplain.networkEvidence = networkEvidence;
    const anchorScore =
      68 + Math.min(20, anchorHits * 5) + (metrics.coverageRatio < 0.45 ? 8 : 0) - Math.round((network.globalScore || baseScore) * 0.1);
    out.push(hypothesis("AnchorInsertion", undefined, anchorScore, anchorExplain));
  }

  out.sort(hypothesisComparator);
  return out.slice(0, 3);
}

function topHypothesisDelta(hypotheses: MergeHypothesis[]): number {
  if (hypotheses.length < 2) return 100;
  return hypotheses[0].scoreFinal - hypotheses[1].scoreFinal;
}

function isMergeHypothesisType(type: MergeHypothesis["hypothesisType"]): boolean {
  return (
    type === "SamePerson" ||
    type === "SamePersonAdditionalUnion" ||
    type === "SamePersonNetworkConfirmed" ||
    type === "SamePersonCriticalOverride"
  );
}

function isBlockedByPolicy(candidate: MatchCandidate, policy: MatchAutoRules["blockerPolicy"]): boolean {
  if (policy === "no-critical") {
    return candidate.blockers.some((blocker) => blocker.severity === "criticalHardConflict");
  }
  return candidate.blockers.some((blocker) => blocker.severity !== "soft");
}

function isAutoEligibleLow(candidate: MatchCandidate, rules: MatchAutoRules): boolean {
  if (!isMergeHypothesisType(candidate.chosenHypothesis.hypothesisType)) {
    return false;
  }
  if (candidate.score < rules.minScore) return false;
  if (candidate.explain.coverage.coverageRatio < rules.minCoverage) return false;
  if (candidate.riskLevel !== "low") return false;
  if (isBlockedByPolicy(candidate, rules.blockerPolicy)) return false;
  if (topHypothesisDelta(candidate.hypothesesTopK) < rules.minDeltaVsSecond) return false;
  return true;
}

function buildSearchSpace(profile: PersonProfile, context: MatcherContext): PersonProfile[] {
  const ids = new Set<string>();

  if (profile.fullName) {
    for (const id of context.baseByFullName.get(profile.fullName) ?? []) ids.add(id);
  }

  if (ids.size === 0 && profile.surname) {
    for (const id of context.baseBySurname.get(profile.surname) ?? []) ids.add(id);
  }

  if (ids.size === 0) {
    const anchorNames = [
      ...profile.parentNames,
      ...profile.spouseNames,
      ...profile.childNames,
      ...profile.siblingNames,
      ...profile.grandparentNames
    ];
    for (const name of anchorNames) {
      for (const id of context.baseByRelativeName.get(name) ?? []) ids.add(id);
    }
  }

  if (ids.size === 0) {
    for (const id of context.baseProfiles.keys()) ids.add(id);
  }

  return Array.from(ids)
    .map((id) => context.baseProfiles.get(id))
    .filter((candidate): candidate is PersonProfile => Boolean(candidate));
}

export function scoreMatch(
  incP: Person,
  baseP: Person,
  incDoc: GeneaDocument,
  baseDoc: GeneaDocument
): Omit<MatchCandidate, "incomingId" | "baseId"> {
  const context = buildMatcherContext(baseDoc, incDoc);
  const incoming = context.incProfiles.get(incP.id);
  const base = context.baseProfiles.get(baseP.id);

  if (!incoming || !base) {
    const emptyExplain: MergeExplain = {
      categoryPoints: { identity: 0, temporal: 0, geography: 0, familyNetwork: 0, documentStructure: 0 },
      subCategoryPoints: { familyParents: 0, familyUnions: 0, familyChildren: 0, familySiblings: 0, familyGrandparents: 0 },
      penalties: [{ code: "PROFILE_MISSING", points: 20, detail: "Missing profile context for scoring" }],
      coverage: { comparableSignals: 0, availableSignals: 1, coverageRatio: 0, coveragePenalty: 18 },
      capsApplied: ["profile-missing -> cap 59"],
      blockers: [],
      decisionReason: "Missing profile context",
      requiredActions: [{ kind: "create_person", incomingId: incP.id, preferredId: incP.id }]
    };
    const fallbackHypothesis = hypothesis("CreateNewPerson", undefined, 20, emptyExplain);
    return {
      score: 20,
      signals: ["PROFILE_MISSING: Missing profile context for scoring"],
      confidence: "low",
      blockers: [],
      qualityFlags: ["profile-missing"],
      categoryScores: { identity: 0, temporal: 0, geography: 0, family: 0, structure: 0 },
      explain: emptyExplain,
      hypothesesTopK: [fallbackHypothesis],
      chosenHypothesis: fallbackHypothesis,
      requiredActions: fallbackHypothesis.explain.requiredActions,
      riskLevel: "high"
    };
  }

  const evaluated = evaluatePersonComparison(incoming, base);
  const hypothesesTopK = buildHypotheses(
    incoming,
    base,
    evaluated.scoreFinal,
    evaluated.explain,
    evaluated.metrics,
    context,
    {
      propagationSupport: 0,
      globalScore: evaluated.scoreFinal,
      iterationChosen: 1,
      criticalOverride: false
    }
  );
  const chosenHypothesis = hypothesesTopK[0];

  return {
    score: chosenHypothesis.scoreFinal,
    signals: evaluated.signals,
    confidence: evaluated.confidence,
    blockers: evaluated.blockers,
    qualityFlags: evaluated.qualityFlags,
    categoryScores: evaluated.metrics.categoryScores,
    explain: chosenHypothesis.explain,
    hypothesesTopK,
    chosenHypothesis,
    requiredActions: chosenHypothesis.explain.requiredActions,
    riskLevel: chosenHypothesis.riskLevel
  };
}

function selectBestForIncoming(incoming: PersonProfile, context: MatcherContext): MatchCandidate[] {
  const searchSpace = buildSearchSpace(incoming, context);
  const candidates: MatchCandidate[] = [];

  for (const base of searchSpace) {
    const incP = context.incDoc.persons[incoming.id];
    const baseP = context.baseDoc.persons[base.id];
    const scored = scoreMatch(incP, baseP, context.incDoc, context.baseDoc);

    if (scored.score >= 35 || scored.chosenHypothesis.hypothesisType !== "SamePerson") {
      candidates.push({
        incomingId: incoming.id,
        baseId: base.id,
        score: scored.score,
        signals: scored.signals,
        confidence: scored.confidence,
        blockers: scored.blockers,
        qualityFlags: scored.qualityFlags,
        categoryScores: scored.categoryScores,
        explain: scored.explain,
        hypothesesTopK: scored.hypothesesTopK,
        chosenHypothesis: scored.chosenHypothesis,
        requiredActions: scored.requiredActions,
        riskLevel: scored.riskLevel
      });
    }
  }

  candidates.sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    return left.baseId.localeCompare(right.baseId);
  });
  return candidates.slice(0, 12);
}

function mapFromProfileSet(ids: Set<string>, assignment: Map<string, string>, targetSet: Set<string>): { matched: number; assigned: number } {
  let assigned = 0;
  let matched = 0;
  for (const incomingRelId of ids) {
    const mapped = assignment.get(incomingRelId);
    if (!mapped) continue;
    assigned += 1;
    if (targetSet.has(mapped)) matched += 1;
  }
  return { matched, assigned };
}

function propagationSupportForCandidate(
  incoming: PersonProfile,
  base: PersonProfile,
  assignment: Map<string, string>
): number {
  const buckets = [
    { weight: 0.3, values: mapFromProfileSet(incoming.parentIds, assignment, base.parentIds) },
    { weight: 0.24, values: mapFromProfileSet(incoming.spouseIds, assignment, base.spouseIds) },
    { weight: 0.24, values: mapFromProfileSet(incoming.childIds, assignment, base.childIds) },
    { weight: 0.12, values: mapFromProfileSet(incoming.siblingIds, assignment, base.siblingIds) },
    { weight: 0.1, values: mapFromProfileSet(incoming.grandparentIds, assignment, base.grandparentIds) }
  ];
  let weightedScore = 0;
  let weightedAvailable = 0;
  for (const bucket of buckets) {
    if (bucket.values.assigned === 0) continue;
    weightedAvailable += bucket.weight;
    weightedScore += bucket.weight * (bucket.values.matched / Math.max(1, bucket.values.assigned));
  }
  if (weightedAvailable === 0) return 0;
  return Math.max(0, Math.min(1, weightedScore / weightedAvailable));
}

function criticalOverrideAllowed(
  globalScore: number,
  propagationSupport: number,
  metrics: {
    hasCriticalHard: boolean;
    anchorHits: number;
    anchorKinds: string[];
  }
): boolean {
  if (!metrics.hasCriticalHard) return false;
  if (globalScore < CRITICAL_OVERRIDE_RULES.globalScoreMin) return false;
  if (propagationSupport < CRITICAL_OVERRIDE_RULES.propagationSupportMin) return false;
  if (metrics.anchorHits < CRITICAL_OVERRIDE_RULES.anchorHitsMin) return false;
  if (metrics.anchorKinds.length < CRITICAL_OVERRIDE_RULES.anchorKindsMin) return false;
  return true;
}

function isMergeCandidate(candidate: MatchCandidate): boolean {
  return isMergeHypothesisType(candidate.chosenHypothesis.hypothesisType);
}

function buildGlobalAssignment(
  incomingIds: string[],
  candidatesByIncoming: Map<string, MatchCandidate[]>
): Map<string, string> {
  const edges: Array<{ incomingId: string; baseId: string; score: number; support: number }> = [];
  for (const incomingId of incomingIds) {
    const candidates = candidatesByIncoming.get(incomingId) ?? [];
    for (const candidate of candidates) {
      if (!isMergeCandidate(candidate)) continue;
      const support = candidate.explain.networkEvidence?.propagationSupport ?? 0;
      edges.push({ incomingId, baseId: candidate.baseId, score: candidate.score, support });
    }
  }
  edges.sort((left, right) =>
    right.score - left.score ||
    right.support - left.support ||
    left.incomingId.localeCompare(right.incomingId) ||
    left.baseId.localeCompare(right.baseId)
  );

  const usedIncoming = new Set<string>();
  const usedBase = new Set<string>();
  const assignment = new Map<string, string>();
  for (const edge of edges) {
    if (usedIncoming.has(edge.incomingId) || usedBase.has(edge.baseId)) continue;
    if (edge.score < 70) continue;
    assignment.set(edge.incomingId, edge.baseId);
    usedIncoming.add(edge.incomingId);
    usedBase.add(edge.baseId);
  }
  return assignment;
}

function assignmentEquals(left: Map<string, string>, right: Map<string, string>): boolean {
  if (left.size !== right.size) return false;
  for (const [incomingId, baseId] of left.entries()) {
    if (right.get(incomingId) !== baseId) return false;
  }
  return true;
}

function withNetworkEvidence(
  explain: MergeExplain,
  networkEvidence: NonNullable<MergeExplain["networkEvidence"]>
): MergeExplain {
  const next = cloneExplain(explain);
  next.networkEvidence = {
    layerScores: { ...networkEvidence.layerScores },
    anchorHits: networkEvidence.anchorHits,
    anchorKinds: [...networkEvidence.anchorKinds],
    propagationSupport: networkEvidence.propagationSupport,
    iterationChosen: networkEvidence.iterationChosen,
    criticalOverride: networkEvidence.criticalOverride
  };
  return next;
}

function hypothesisFromBase(
  base: MergeHypothesis,
  type: MergeHypothesisType,
  scoreFinal: number,
  riskLevel: MergeRiskLevel,
  networkEvidence: NonNullable<MergeExplain["networkEvidence"]>,
  decisionReason?: string
): MergeHypothesis {
  const explain = withNetworkEvidence(base.explain, networkEvidence);
  if (decisionReason) explain.decisionReason = decisionReason;
  return {
    hypothesisType: type,
    baseId: base.baseId,
    scoreFinal: clampScore(scoreFinal),
    riskLevel,
    explain
  };
}

function recalculateCandidateForIteration(
  candidate: MatchCandidate,
  propagationSupport: number,
  iteration: number
): MatchCandidate {
  const chosen = candidate.chosenHypothesis;
  const mergeReference = candidate.hypothesesTopK.find((hypothesis) => isMergeHypothesisType(hypothesis.hypothesisType)) || null;
  const currentEvidence = chosen.explain.networkEvidence;
  const layerScores = currentEvidence?.layerScores || {
    l1Identity: clampScore(candidate.score),
    l2Nuclear: clampScore(candidate.categoryScores.family * 2),
    l3Extended: clampScore(candidate.categoryScores.family),
    l4Global: 0
  };
  const anchorHits = currentEvidence?.anchorHits ?? 0;
  const anchorKinds = currentEvidence?.anchorKinds ?? [];

  const globalScore = clampScore(
    candidate.score * GLOBAL_LAYER_WEIGHTS.local +
    layerScores.l2Nuclear * GLOBAL_LAYER_WEIGHTS.l2Nuclear +
    layerScores.l3Extended * GLOBAL_LAYER_WEIGHTS.l3Extended +
    clampScore(propagationSupport * 100) * GLOBAL_LAYER_WEIGHTS.l4Global
  );
  const hasCritical = candidate.blockers.some((blocker) => blocker.severity === "criticalHardConflict");
  const criticalOverride = criticalOverrideAllowed(globalScore, propagationSupport, {
    hasCriticalHard: hasCritical,
    anchorHits,
    anchorKinds
  });

  const networkEvidence: NonNullable<MergeExplain["networkEvidence"]> = {
    layerScores: {
      l1Identity: layerScores.l1Identity,
      l2Nuclear: layerScores.l2Nuclear,
      l3Extended: layerScores.l3Extended,
      l4Global: clampScore(propagationSupport * 100)
    },
    anchorHits,
    anchorKinds: [...anchorKinds],
    propagationSupport: Math.max(0, Math.min(1, propagationSupport)),
    iterationChosen: iteration,
    criticalOverride
  };

  const topBaseScore = candidate.hypothesesTopK[0]?.scoreFinal ?? candidate.score;
  const nextHypotheses = candidate.hypothesesTopK.map((hypothesis) => {
    const offset = hypothesis.scoreFinal - topBaseScore;
    const nextScore = isMergeHypothesisType(hypothesis.hypothesisType)
      ? globalScore + offset
      : hypothesis.scoreFinal;
    const riskLevel =
      hypothesis.hypothesisType === "SamePersonCriticalOverride"
        ? "low"
        : riskFromScore(nextScore, hypothesis.explain.blockers, hypothesis.explain.coverage.coverageRatio);
    return hypothesisFromBase(hypothesis, hypothesis.hypothesisType, nextScore, riskLevel, networkEvidence);
  });

  if (
    !hasCritical &&
    Boolean(mergeReference) &&
    layerScores.l2Nuclear >= 60 &&
    layerScores.l3Extended >= 30 &&
    propagationSupport >= 0.35
  ) {
    nextHypotheses.push(
      hypothesisFromBase(
        mergeReference!,
        "SamePersonNetworkConfirmed",
        globalScore + 6,
        "low",
        networkEvidence,
        "Confirmacion por red familiar y consistencia global."
      )
    );
  }

  if (criticalOverride && mergeReference) {
    const currentTopScore = nextHypotheses.length > 0 ? nextHypotheses[0].scoreFinal : 95;
    nextHypotheses.push(
      hypothesisFromBase(
        mergeReference,
        "SamePersonCriticalOverride",
        Math.max(100, currentTopScore + 1),
        "low",
        { ...networkEvidence, criticalOverride: true },
        "Excepcion critica permitida por evidencia extrema de red."
      )
    );
  }

  nextHypotheses.sort(hypothesisComparator);
  const hypothesesTopK = nextHypotheses.slice(0, 3);
  const chosenHypothesis = hypothesesTopK[0];

  return {
    ...candidate,
    score: chosenHypothesis.scoreFinal,
    explain: cloneExplain(chosenHypothesis.explain),
    chosenHypothesis: structuredClone(chosenHypothesis),
    hypothesesTopK: hypothesesTopK.map((hypothesis) => structuredClone(hypothesis)),
    requiredActions: chosenHypothesis.explain.requiredActions.map((action) => structuredClone(action)),
    riskLevel: chosenHypothesis.riskLevel,
    signals: Array.from(new Set([
      ...candidate.signals,
      `L4_PROPAGACION: soporte ${(propagationSupport * 100).toFixed(1)}%`,
      `GLOBAL_SCORE: ${globalScore}`
    ])),
    qualityFlags: Array.from(new Set([
      ...candidate.qualityFlags,
      chosenHypothesis.hypothesisType === "SamePersonCriticalOverride" ? "critical-override" : "",
      chosenHypothesis.hypothesisType === "SamePersonNetworkConfirmed" ? "network-confirmed" : ""
    ].filter(Boolean)))
  };
}

export function findAllMatches(baseDoc: GeneaDocument, incomingDoc: GeneaDocument, options?: MatchOptions): MatchResult {
  const context = buildMatcherContext(baseDoc, incomingDoc);
  const autoRules = resolveAutoRules(options);
  const result: MatchResult = {
    autoMatches: new Map(),
    ambiguousMatches: new Map(),
    unmatched: [],
    blocked: [],
    reviewQueue: [],
    stats: {
      processed: 0,
      total: Object.keys(incomingDoc.persons).length,
      autoConfirmed: 0,
      needsReview: 0,
      blocked: 0,
      unmatched: 0,
      globalIterations: 0
    }
  };

  const incomingProfiles = Array.from(context.incProfiles.values()).sort((a, b) => a.id.localeCompare(b.id));
  const baseCandidatesByIncoming = new Map<string, MatchCandidate[]>();
  for (const incoming of incomingProfiles) {
    baseCandidatesByIncoming.set(incoming.id, selectBestForIncoming(incoming, context));
  }

  let assignment = new Map<string, string>();
  let stableRounds = 0;
  let finalCandidatesByIncoming = new Map<string, MatchCandidate[]>();
  for (let iteration = 1; iteration <= GLOBAL_ASSIGNMENT_MAX_ITERATIONS; iteration += 1) {
    const iterCandidates = new Map<string, MatchCandidate[]>();
    for (const incoming of incomingProfiles) {
      const baseCandidates = baseCandidatesByIncoming.get(incoming.id) ?? [];
      const rescored = baseCandidates
        .map((candidate) => {
          const baseProfile = context.baseProfiles.get(candidate.baseId);
          if (!baseProfile) return candidate;
          const propagationSupport = propagationSupportForCandidate(incoming, baseProfile, assignment);
          return recalculateCandidateForIteration(candidate, propagationSupport, iteration);
        })
        .sort((left, right) => right.score - left.score || left.baseId.localeCompare(right.baseId))
        .slice(0, 12);
      iterCandidates.set(incoming.id, rescored);
    }
    const nextAssignment = buildGlobalAssignment(
      incomingProfiles.map((incoming) => incoming.id),
      iterCandidates
    );
    if (assignmentEquals(nextAssignment, assignment)) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
    }
    assignment = nextAssignment;
    finalCandidatesByIncoming = iterCandidates;
    result.stats.globalIterations = iteration;
    if (stableRounds >= GLOBAL_ASSIGNMENT_STABLE_ROUNDS) break;
  }

  for (const incoming of incomingProfiles) {
    const candidates = finalCandidatesByIncoming.get(incoming.id) ?? [];
    result.stats.processed += 1;

    if (candidates.length === 0) {
      result.unmatched.push(incoming.id);
      result.stats.unmatched += 1;
      result.reviewQueue.push({
        incomingId: incoming.id,
        priority: 95,
        reason: "Sin candidatos viables; crear persona nueva o insercion anclada."
      });
      continue;
    }

    const best = candidates[0];
    const deltaVsSecond = candidates.length > 1 ? best.score - candidates[1].score : 100;
    const isCriticalOverride = best.chosenHypothesis.hypothesisType === "SamePersonCriticalOverride";
    if ((isAutoEligibleLow(best, autoRules) && deltaVsSecond >= autoRules.minDeltaVsSecond) || isCriticalOverride) {
      result.autoMatches.set(incoming.id, best.baseId);
      result.stats.autoConfirmed += 1;
      continue;
    }

    const hasHardConflict = best.blockers.some((blocker) => blocker.severity !== "soft");
    if (best.riskLevel === "high" || hasHardConflict) {
      result.blocked.push({ incomingId: incoming.id, blockers: best.blockers });
      result.stats.blocked += 1;
    } else {
      result.stats.needsReview += 1;
    }
    result.ambiguousMatches.set(incoming.id, candidates.slice(0, 6));
    result.reviewQueue.push({
      incomingId: incoming.id,
      priority: Math.max(1, 120 - best.score + (best.riskLevel === "high" ? 25 : best.riskLevel === "medium" ? 10 : 0)),
      reason: best.chosenHypothesis.explain.decisionReason || "Requiere revision asistida."
    });
  }

  // one-to-one auto match enforcement
  const usedBase = new Set<string>();
  const sortedAuto = Array.from(result.autoMatches.entries())
    .map(([incomingId, baseId]) => ({ incomingId, baseId }))
    .sort((a, b) => a.baseId.localeCompare(b.baseId));

  const finalAuto = new Map<string, string>();
  for (const item of sortedAuto) {
    if (!usedBase.has(item.baseId)) {
      finalAuto.set(item.incomingId, item.baseId);
      usedBase.add(item.baseId);
      continue;
    }
    const existing = result.ambiguousMatches.get(item.incomingId) ?? [];
    if (existing.length > 0) {
      result.ambiguousMatches.set(item.incomingId, existing);
      result.reviewQueue.push({
        incomingId: item.incomingId,
        priority: 85,
        reason: "Colision en auto-fusion; movido a revision asistida."
      });
    } else {
      result.unmatched.push(item.incomingId);
      result.stats.unmatched += 1;
    }
  }

  result.autoMatches = finalAuto;
  result.stats.autoConfirmed = finalAuto.size;
  result.reviewQueue.sort((a, b) => b.priority - a.priority || a.incomingId.localeCompare(b.incomingId));
  return result;
}
