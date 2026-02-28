import { describe, expect, it } from "vitest";
import { analyzeGeneaDocument } from "@/core/diagnostics/analyzer";
import { createNewTree, createPerson } from "@/core/edit/commands";

describe("diagnostics fix planner", () => {
  it("offers two options for missing husband and recommends placeholder", () => {
    let doc = createNewTree();
    const spouse = createPerson(doc, { name: "Spouse", sex: "F" });
    doc = spouse.next;

    doc.families["@F1@"] = { id: "@F1@", husbandId: "@I404@", wifeId: spouse.personId, childrenIds: [], events: [] };
    doc.persons[spouse.personId].fams.push("@F1@");

    const report = analyzeGeneaDocument(doc);
    const issue = report.issues.find((item) => item.code === "ERR_FAM_MISSING_HUSB");

    expect(issue).toBeDefined();
    expect(issue?.fixOptions?.length).toBeGreaterThanOrEqual(2);
    expect(issue?.fixOptions?.some((opt) => opt.recommended && opt.action.kind === "create_placeholder_person")).toBe(true);
  });
});
