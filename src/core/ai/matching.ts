import type { GraphDocument, Person } from "@/types/domain";

export type PersonCandidate = {
  id: string;
  label: string;
  score: number;
  reason: string;
};

export type PersonMatchLevel = "strong_match" | "ambiguous_match" | "no_match";

export type PersonMatchResolution = {
  id: string | null;
  level: PersonMatchLevel;
  candidates: PersonCandidate[];
};

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fullName(person: Person): string {
  return `${person.name}${person.surname ? ` ${person.surname}` : ""}`.trim();
}

function yearFromDate(raw?: string): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d{4})/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function personBirthYear(person: Person): number | null {
  return yearFromDate(person.events.find((event) => event.type === "BIRT")?.date);
}

function personDeathYear(person: Person): number | null {
  return yearFromDate(person.events.find((event) => event.type === "DEAT")?.date);
}

function dateCompatibilityScore(left: number | null, right: number | null): number {
  if (left === null || right === null) return 0;
  const delta = Math.abs(left - right);
  if (delta === 0) return 1;
  if (delta <= 1) return 0.7;
  if (delta <= 3) return 0.4;
  return -0.8;
}

function tokenOverlapScore(query: string, candidate: string): number {
  const qTokens = new Set(normalizeToken(query).split(" ").filter(Boolean));
  const cTokens = new Set(normalizeToken(candidate).split(" ").filter(Boolean));
  if (qTokens.size === 0 || cTokens.size === 0) return 0;
  let hits = 0;
  for (const token of qTokens) {
    if (cTokens.has(token)) hits += 1;
  }
  return hits / Math.max(qTokens.size, cTokens.size);
}

function containsBonus(query: string, candidate: string): number {
  const q = normalizeToken(query);
  const c = normalizeToken(candidate);
  if (!q || !c) return 0;
  if (c === q) return 1;
  if (c.includes(q)) return 0.7;
  return 0;
}

export function rankPersonCandidates(doc: GraphDocument, query: string, limit = 5): PersonCandidate[] {
  return rankPersonCandidatesWithContext(doc, query, undefined, limit);
}

export function rankFocusCandidatesByName(query: string, doc: GraphDocument, limit = 8): PersonCandidate[] {
  return rankPersonCandidatesWithContext(doc, query, undefined, limit);
}

export function rankPersonCandidatesWithContext(
  doc: GraphDocument,
  query: string,
  hints?: {
    surname?: string;
    sex?: "M" | "F" | "U";
    birthDate?: string;
    deathDate?: string;
    eventYear?: number;
    relationToAnchor?: "parent" | "child" | "spouse" | "sibling";
    anchorBirthDate?: string;
    anchorDeathDate?: string;
    candidateIds?: string[];
  },
  limit = 5
): PersonCandidate[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const out: PersonCandidate[] = [];
  const normalizedSurname = normalizeToken(hints?.surname || "");
  const hintBirthYear = yearFromDate(hints?.birthDate);
  const hintDeathYear = yearFromDate(hints?.deathDate);
  const scopedIds = hints?.candidateIds ? new Set(hints.candidateIds) : null;
  const anchorBirthYear = yearFromDate(hints?.anchorBirthDate);
  const anchorDeathYear = yearFromDate(hints?.anchorDeathDate);
  for (const person of Object.values(doc.persons)) {
    if (scopedIds && !scopedIds.has(person.id)) continue;
    const label = fullName(person);
    const overlap = tokenOverlapScore(trimmed, label);
    const contains = containsBonus(trimmed, label);
    let score = Math.min(1, overlap * 0.7 + contains * 0.3);
    if (normalizedSurname) {
      const personSurname = normalizeToken(person.surname || "");
      if (personSurname && personSurname === normalizedSurname) score += 0.08;
      else if (personSurname && normalizedSurname && personSurname !== normalizedSurname) score -= 0.1;
    }
    if (hints?.sex && hints.sex !== "U") {
      if (person.sex === hints.sex) score += 0.06;
      else score -= 0.12;
    }
    score += dateCompatibilityScore(hintBirthYear, personBirthYear(person)) * 0.08;
    score += dateCompatibilityScore(hintDeathYear, personDeathYear(person)) * 0.08;
    if (hints?.eventYear) {
      const birthYear = personBirthYear(person);
      if (birthYear !== null) {
        const ageAtEvent = hints.eventYear - birthYear;
        if (ageAtEvent < 0) score -= 0.25;
        if (ageAtEvent > 120) score -= 0.2;
      }
      const deathYear = personDeathYear(person);
      if (deathYear !== null && hints.eventYear > deathYear) score -= 0.3;
    }
    if (hints?.relationToAnchor && anchorBirthYear !== null) {
      const candidateBirthYear = personBirthYear(person);
      if (candidateBirthYear !== null) {
        if (hints.relationToAnchor === "parent" && candidateBirthYear > anchorBirthYear - 10) score -= 0.25;
        if (hints.relationToAnchor === "child" && candidateBirthYear < anchorBirthYear + 10) score -= 0.25;
        if (hints.relationToAnchor === "sibling" && Math.abs(candidateBirthYear - anchorBirthYear) > 35) score -= 0.18;
      }
      if (anchorDeathYear !== null && hints.relationToAnchor === "spouse") {
        const candidateDeathYear = personDeathYear(person);
        if (candidateDeathYear !== null && candidateDeathYear < anchorBirthYear) score -= 0.2;
      }
    }
    score = Math.max(0, Math.min(1, score));
    if (score <= 0) continue;
    out.push({
      id: person.id,
      label: `${label} (${person.id})`,
      score,
      reason: score > 0.85 ? "Exact/near-exact name match." : "Token overlap match."
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function resolvePersonId(
  doc: GraphDocument,
  preferredId: string | undefined,
  query: string | undefined
): { id: string | null; candidates: PersonCandidate[] } {
  const resolved = resolvePersonMatch(doc, preferredId, query);
  return { id: resolved.id, candidates: resolved.candidates };
}

export function resolvePersonMatch(
  doc: GraphDocument,
  preferredId: string | undefined,
  query: string | undefined,
  hints?: {
    surname?: string;
    sex?: "M" | "F" | "U";
    birthDate?: string;
    deathDate?: string;
    eventYear?: number;
    relationToAnchor?: "parent" | "child" | "spouse" | "sibling";
    anchorBirthDate?: string;
    anchorDeathDate?: string;
    candidateIds?: string[];
  }
): PersonMatchResolution {
  if (preferredId && doc.persons[preferredId]) return { id: preferredId, level: "strong_match", candidates: [] };
  if (!query) return { id: null, level: "no_match", candidates: [] };
  const candidates = rankPersonCandidatesWithContext(doc, query, hints);
  const top = candidates[0];
  if (!top) return { id: null, level: "no_match", candidates };
  const second = candidates[1];
  const margin = second ? top.score - second.score : top.score;
  if (top.score >= 0.9 && margin >= 0.12) {
    return { id: top.id, level: "strong_match", candidates };
  }
  if (top.score >= 0.75) {
    return { id: null, level: "ambiguous_match", candidates };
  }
  return { id: null, level: "no_match", candidates };
}

