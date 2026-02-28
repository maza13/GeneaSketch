import { describe, expect, it } from "vitest";
import { findAllMatches } from "@/core/edit/personMatcher";
import type { GeneaDocument, Person } from "@/types/domain";

function makePerson(input: Partial<Person> & Pick<Person, "id" | "name">): Person {
  return {
    id: input.id,
    name: input.name,
    surname: input.surname,
    sex: input.sex ?? "U",
    lifeStatus: input.lifeStatus ?? "alive",
    events: input.events ?? [],
    famc: input.famc ?? [],
    fams: input.fams ?? [],
    mediaRefs: [],
    sourceRefs: []
  };
}

function emptyDoc(): GeneaDocument {
  return {
    persons: {},
    families: {},
    unions: {},
    parentChildLinks: {},
    siblingLinks: {},
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("person matcher v2 strict", () => {
  it("proposes SamePersonAdditionalUnion when parents align but spouse/children diverge", () => {
    const base = emptyDoc();
    base.persons["@I1@"] = makePerson({ id: "@I1@", name: "Juan", surname: "Perez", sex: "M", famc: ["@F1@"], fams: ["@F2@"] });
    base.persons["@I2@"] = makePerson({ id: "@I2@", name: "Carlos", surname: "Perez", sex: "M", fams: ["@F1@"] });
    base.persons["@I3@"] = makePerson({ id: "@I3@", name: "Maria", surname: "Lopez", sex: "F", fams: ["@F1@"] });
    base.persons["@I4@"] = makePerson({ id: "@I4@", name: "Ana", surname: "Diaz", sex: "F", fams: ["@F2@"] });
    base.persons["@I5@"] = makePerson({ id: "@I5@", name: "Hijo1", surname: "Perez", famc: ["@F2@"] });
    base.families["@F1@"] = { id: "@F1@", husbandId: "@I2@", wifeId: "@I3@", childrenIds: ["@I1@"], events: [] };
    base.families["@F2@"] = { id: "@F2@", husbandId: "@I1@", wifeId: "@I4@", childrenIds: ["@I5@"], events: [] };

    const incoming = emptyDoc();
    incoming.persons["@X1@"] = makePerson({ id: "@X1@", name: "Juan", surname: "Perez", sex: "M", famc: ["@XF1@"], fams: ["@XF2@"] });
    incoming.persons["@X2@"] = makePerson({ id: "@X2@", name: "Carlos", surname: "Perez", sex: "M", fams: ["@XF1@"] });
    incoming.persons["@X3@"] = makePerson({ id: "@X3@", name: "Maria", surname: "Lopez", sex: "F", fams: ["@XF1@"] });
    incoming.persons["@X4@"] = makePerson({ id: "@X4@", name: "Luisa", surname: "Ramos", sex: "F", fams: ["@XF2@"] });
    incoming.persons["@X5@"] = makePerson({ id: "@X5@", name: "Hijo2", surname: "Perez", famc: ["@XF2@"] });
    incoming.families["@XF1@"] = { id: "@XF1@", husbandId: "@X2@", wifeId: "@X3@", childrenIds: ["@X1@"], events: [] };
    incoming.families["@XF2@"] = { id: "@XF2@", husbandId: "@X1@", wifeId: "@X4@", childrenIds: ["@X5@"], events: [] };

    const result = findAllMatches(base, incoming);
    const candidates = result.ambiguousMatches.get("@X1@") ?? [];
    expect(candidates.length).toBeGreaterThan(0);
    const top = candidates[0];
    expect(top.hypothesesTopK.some((h) => h.hypothesisType === "SamePersonAdditionalUnion")).toBe(true);
  });

  it("blocks strong sex conflict", () => {
    const base = emptyDoc();
    base.persons["@I1@"] = makePerson({ id: "@I1@", name: "Alex", surname: "Mora", sex: "M" });

    const incoming = emptyDoc();
    incoming.persons["@X1@"] = makePerson({ id: "@X1@", name: "Alex", surname: "Mora", sex: "F" });

    const result = findAllMatches(base, incoming);
    expect(result.autoMatches.size).toBe(0);
    expect(result.blocked.some((item) => item.incomingId === "@X1@")).toBe(true);
  });

  it("does not auto-merge exact name only with low evidence coverage", () => {
    const base = emptyDoc();
    base.persons["@I1@"] = makePerson({ id: "@I1@", name: "Jose", surname: "Ruiz", sex: "M" });

    const incoming = emptyDoc();
    incoming.persons["@X1@"] = makePerson({ id: "@X1@", name: "Jose", surname: "Ruiz", sex: "M" });

    const result = findAllMatches(base, incoming);
    expect(result.autoMatches.size).toBe(0);
    expect(result.ambiguousMatches.has("@X1@") || result.blocked.some((b) => b.incomingId === "@X1@")).toBe(true);
  });

  it("supports preset-driven thresholds (strict <= fast auto decisions)", () => {
    const base = emptyDoc();
    base.persons["@I1@"] = makePerson({ id: "@I1@", name: "Laura", surname: "Mendez", sex: "F", famc: ["@F1@"] });
    base.persons["@I2@"] = makePerson({ id: "@I2@", name: "Carlos", surname: "Mendez", sex: "M", fams: ["@F1@"] });
    base.persons["@I3@"] = makePerson({ id: "@I3@", name: "Elena", surname: "Rojas", sex: "F", fams: ["@F1@"] });
    base.families["@F1@"] = { id: "@F1@", husbandId: "@I2@", wifeId: "@I3@", childrenIds: ["@I1@"], events: [] };

    const incoming = emptyDoc();
    incoming.persons["@X1@"] = makePerson({ id: "@X1@", name: "Laura", surname: "Mendes", sex: "F", famc: ["@XF1@"] });
    incoming.persons["@X2@"] = makePerson({ id: "@X2@", name: "Carlos", surname: "Mendez", sex: "M", fams: ["@XF1@"] });
    incoming.persons["@X3@"] = makePerson({ id: "@X3@", name: "Elena", surname: "Rojas", sex: "F", fams: ["@XF1@"] });
    incoming.families["@XF1@"] = { id: "@XF1@", husbandId: "@X2@", wifeId: "@X3@", childrenIds: ["@X1@"], events: [] };

    const strict = findAllMatches(base, incoming, { preset: "strict" });
    const fast = findAllMatches(base, incoming, { preset: "fast" });
    expect(fast.autoMatches.size).toBeGreaterThanOrEqual(strict.autoMatches.size);
  });

  it("confirms same person by strong family network with incomplete identity", () => {
    const base = emptyDoc();
    base.persons["@I1@"] = makePerson({ id: "@I1@", name: "Jose Antonio", surname: "Lopez", sex: "M", famc: ["@F1@"], fams: ["@F2@"] });
    base.persons["@I2@"] = makePerson({ id: "@I2@", name: "Carlos", surname: "Lopez", sex: "M", famc: ["@F3@"], fams: ["@F1@"] });
    base.persons["@I3@"] = makePerson({ id: "@I3@", name: "Maria", surname: "Ruiz", sex: "F", fams: ["@F1@"] });
    base.persons["@I4@"] = makePerson({ id: "@I4@", name: "Ana", surname: "Diaz", sex: "F", fams: ["@F2@"] });
    base.persons["@I5@"] = makePerson({ id: "@I5@", name: "Luisa", surname: "Lopez", sex: "F", famc: ["@F2@"] });
    base.persons["@I6@"] = makePerson({ id: "@I6@", name: "Pedro", surname: "Lopez", sex: "M", famc: ["@F1@"] });
    base.persons["@I7@"] = makePerson({ id: "@I7@", name: "Ramon", surname: "Lopez", sex: "M", fams: ["@F3@"] });
    base.persons["@I8@"] = makePerson({ id: "@I8@", name: "Elena", surname: "Mora", sex: "F", fams: ["@F3@"] });
    base.persons["@I9@"] = makePerson({ id: "@I9@", name: "Jose", surname: "Lopez", sex: "M" });
    base.families["@F1@"] = { id: "@F1@", husbandId: "@I2@", wifeId: "@I3@", childrenIds: ["@I1@", "@I6@"], events: [] };
    base.families["@F2@"] = { id: "@F2@", husbandId: "@I1@", wifeId: "@I4@", childrenIds: ["@I5@"], events: [] };
    base.families["@F3@"] = { id: "@F3@", husbandId: "@I7@", wifeId: "@I8@", childrenIds: ["@I2@"], events: [] };

    const incoming = emptyDoc();
    incoming.persons["@X1@"] = makePerson({ id: "@X1@", name: "Jose", sex: "M", famc: ["@XF1@"], fams: ["@XF2@"] });
    incoming.persons["@X2@"] = makePerson({ id: "@X2@", name: "Carlos", surname: "Lopez", sex: "M", famc: ["@XF3@"], fams: ["@XF1@"] });
    incoming.persons["@X3@"] = makePerson({ id: "@X3@", name: "Maria", surname: "Ruiz", sex: "F", fams: ["@XF1@"] });
    incoming.persons["@X4@"] = makePerson({ id: "@X4@", name: "Ana", surname: "Diaz", sex: "F", fams: ["@XF2@"] });
    incoming.persons["@X5@"] = makePerson({ id: "@X5@", name: "Luisa", surname: "Lopez", sex: "F", famc: ["@XF2@"] });
    incoming.persons["@X6@"] = makePerson({ id: "@X6@", name: "Pedro", surname: "Lopez", sex: "M", famc: ["@XF1@"] });
    incoming.persons["@X7@"] = makePerson({ id: "@X7@", name: "Ramon", surname: "Lopez", sex: "M", fams: ["@XF3@"] });
    incoming.persons["@X8@"] = makePerson({ id: "@X8@", name: "Elena", surname: "Mora", sex: "F", fams: ["@XF3@"] });
    incoming.families["@XF1@"] = { id: "@XF1@", husbandId: "@X2@", wifeId: "@X3@", childrenIds: ["@X1@", "@X6@"], events: [] };
    incoming.families["@XF2@"] = { id: "@XF2@", husbandId: "@X1@", wifeId: "@X4@", childrenIds: ["@X5@"], events: [] };
    incoming.families["@XF3@"] = { id: "@XF3@", husbandId: "@X7@", wifeId: "@X8@", childrenIds: ["@X2@"], events: [] };

    const result = findAllMatches(base, incoming, { preset: "balanced", autoRules: { minScore: 101 } });
    const candidates = result.ambiguousMatches.get("@X1@") ?? [];
    expect(candidates.length).toBeGreaterThan(0);
    expect(
      candidates.some((candidate) =>
        candidate.hypothesesTopK.some((hypothesis) => Boolean(hypothesis.explain.networkEvidence))
      )
    ).toBe(true);
  });

  it("allows critical override only under extreme family evidence", () => {
    const base = emptyDoc();
    base.persons["@I1@"] = makePerson({ id: "@I1@", name: "Alberto", surname: "Lopez", sex: "M", famc: ["@F1@"], fams: ["@F2@"] });
    base.persons["@I2@"] = makePerson({ id: "@I2@", name: "Carlos", surname: "Lopez", sex: "M", famc: ["@F3@"], fams: ["@F1@"] });
    base.persons["@I3@"] = makePerson({ id: "@I3@", name: "Maria", surname: "Ruiz", sex: "F", fams: ["@F1@"] });
    base.persons["@I4@"] = makePerson({ id: "@I4@", name: "Ana", surname: "Diaz", sex: "F", fams: ["@F2@"] });
    base.persons["@I5@"] = makePerson({ id: "@I5@", name: "Luisa", surname: "Lopez", sex: "F", famc: ["@F2@"] });
    base.persons["@I6@"] = makePerson({ id: "@I6@", name: "Pedro", surname: "Lopez", sex: "M", famc: ["@F1@"] });
    base.persons["@I7@"] = makePerson({ id: "@I7@", name: "Ramon", surname: "Lopez", sex: "M", fams: ["@F3@"] });
    base.persons["@I8@"] = makePerson({ id: "@I8@", name: "Elena", surname: "Mora", sex: "F", fams: ["@F3@"] });
    base.families["@F1@"] = { id: "@F1@", husbandId: "@I2@", wifeId: "@I3@", childrenIds: ["@I1@", "@I6@"], events: [] };
    base.families["@F2@"] = { id: "@F2@", husbandId: "@I1@", wifeId: "@I4@", childrenIds: ["@I5@"], events: [] };
    base.families["@F3@"] = { id: "@F3@", husbandId: "@I7@", wifeId: "@I8@", childrenIds: ["@I2@"], events: [] };

    const incoming = emptyDoc();
    incoming.persons["@X1@"] = makePerson({ id: "@X1@", name: "Alberto", surname: "Lopez", sex: "F", famc: ["@XF1@"], fams: ["@XF2@"] });
    incoming.persons["@X2@"] = makePerson({ id: "@X2@", name: "Carlos", surname: "Lopez", sex: "M", famc: ["@XF3@"], fams: ["@XF1@"] });
    incoming.persons["@X3@"] = makePerson({ id: "@X3@", name: "Maria", surname: "Ruiz", sex: "F", fams: ["@XF1@"] });
    incoming.persons["@X4@"] = makePerson({ id: "@X4@", name: "Ana", surname: "Diaz", sex: "F", fams: ["@XF2@"] });
    incoming.persons["@X5@"] = makePerson({ id: "@X5@", name: "Luisa", surname: "Lopez", sex: "F", famc: ["@XF2@"] });
    incoming.persons["@X6@"] = makePerson({ id: "@X6@", name: "Pedro", surname: "Lopez", sex: "M", famc: ["@XF1@"] });
    incoming.persons["@X7@"] = makePerson({ id: "@X7@", name: "Ramon", surname: "Lopez", sex: "M", fams: ["@XF3@"] });
    incoming.persons["@X8@"] = makePerson({ id: "@X8@", name: "Elena", surname: "Mora", sex: "F", fams: ["@XF3@"] });
    incoming.families["@XF1@"] = { id: "@XF1@", husbandId: "@X2@", wifeId: "@X3@", childrenIds: ["@X1@", "@X6@"], events: [] };
    incoming.families["@XF2@"] = { id: "@XF2@", husbandId: "@X1@", wifeId: "@X4@", childrenIds: ["@X5@"], events: [] };
    incoming.families["@XF3@"] = { id: "@XF3@", husbandId: "@X7@", wifeId: "@X8@", childrenIds: ["@X2@"], events: [] };

    const result = findAllMatches(base, incoming, { preset: "fast", autoRules: { minScore: 101 } });
    const candidates = result.ambiguousMatches.get("@X1@") ?? [];
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].blockers.some((blocker) => blocker.severity === "criticalHardConflict")).toBe(true);
    const hasOverride = candidates[0].hypothesesTopK.some((h) => h.hypothesisType === "SamePersonCriticalOverride");
    if (hasOverride) {
      const override = candidates[0].hypothesesTopK.find((h) => h.hypothesisType === "SamePersonCriticalOverride");
      expect((override?.scoreFinal || 0) >= 95).toBe(true);
    } else {
      expect(candidates[0].hypothesesTopK[0].hypothesisType).toBe("Homonym");
    }
  });
});
