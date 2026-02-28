import { describe, expect, it } from "vitest";
import { createNewTree, createPerson, linkExistingRelation } from "@/core/edit/commands";
import { findKinship } from "@/core/graph/kinship";
import {
  resolveDirectTerm,
  resolveKinshipLabelFromDistances,
  resolveStatisticsBucketLabel,
  validateKinshipAtlas
} from "@/core/kinship/nomenclature";

describe("kinship nomenclature", () => {
  it("resolves direct ancestor grade 3 as standard+technical", () => {
    const term = resolveDirectTerm("ancestor", 3, "M");
    expect(term.primary).toBe("Bisabuelo");
    expect(term.secondary).toBe("Abuelo 2°");
    expect(term.style).toBe("standard+technical");
  });

  it("resolves direct ancestor grade 11 as technical only", () => {
    const term = resolveDirectTerm("ancestor", 11, "F");
    expect(term.primary).toBe("Abuela 10°");
    expect(term.secondary).toBeUndefined();
    expect(term.style).toBe("technical");
  });

  it("resolves half sibling with prefix", () => {
    const rel = resolveKinshipLabelFromDistances({ d1: 1, d2: 1, sex2: "F", isHalf: true });
    expect(rel.primary).toBe("Media Hermana");
    expect(rel.canonicalKey).toBe("half-sibling");
  });

  it("resolves distant uncle branch naming", () => {
    const rel = resolveKinshipLabelFromDistances({ d1: 3, d2: 2, sex2: "M", isHalf: false });
    expect(rel.primary).toMatch(/T[ií]o/i);
    expect(rel.primary).toContain("Segundo");
  });

  it("provides statistics buckets from shared nomenclature", () => {
    expect(resolveStatisticsBucketLabel(1, 1)?.label).toBe("Hermanos");
    expect(resolveStatisticsBucketLabel(2, 2)?.label).toBe("Primos 1°");
    expect(resolveStatisticsBucketLabel(3, 2)?.label).toBe("Primos 1° (1x removido)");
  });

  it("validates atlas required sections", () => {
    expect(validateKinshipAtlas()).toEqual([]);
  });
});

describe("findKinship integration", () => {
  it("returns relationship object and backward-compatible relationshipText", () => {
    let doc = createNewTree();

    const ggfRes = createPerson(doc, { name: "GGF", sex: "M" });
    doc = ggfRes.next;
    const ggmRes = createPerson(doc, { name: "GGM", sex: "F" });
    doc = ggmRes.next;
    const gfRes = createPerson(doc, { name: "GF", sex: "M" });
    doc = gfRes.next;
    const gmRes = createPerson(doc, { name: "GM", sex: "F" });
    doc = gmRes.next;
    const fRes = createPerson(doc, { name: "Father", sex: "M" });
    doc = fRes.next;
    const mRes = createPerson(doc, { name: "Mother", sex: "F" });
    doc = mRes.next;
    const cRes = createPerson(doc, { name: "Child", sex: "M" });
    doc = cRes.next;

    doc = linkExistingRelation(doc, gfRes.personId, ggfRes.personId, "father");
    doc = linkExistingRelation(doc, gfRes.personId, ggmRes.personId, "mother");
    doc = linkExistingRelation(doc, fRes.personId, gfRes.personId, "father");
    doc = linkExistingRelation(doc, fRes.personId, gmRes.personId, "mother");
    doc = linkExistingRelation(doc, cRes.personId, fRes.personId, "father");
    doc = linkExistingRelation(doc, cRes.personId, mRes.personId, "mother");

    const result = findKinship(doc, cRes.personId, ggfRes.personId);
    expect(result).not.toBeNull();
    expect(result?.relationship).toBeDefined();
    expect(result?.relationship.primary.length).toBeGreaterThan(0);
    expect(result?.relationshipText).toContain(result!.relationship.primary);
  });
});
