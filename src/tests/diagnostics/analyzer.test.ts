import { expect, test } from "vitest";
import { analyzeGeneaDocument } from "../../core/diagnostics/analyzer";
import { createNewTree, createPerson, linkExistingRelation } from "../../core/edit/commands";

test("analyzer basic integrity errors", () => {
    let doc = createNewTree();

    const p1 = createPerson(doc, { name: "John", sex: "M" }); doc = p1.next;
    const p2 = createPerson(doc, { name: "Mary", sex: "F" }); doc = p2.next;
    const child = createPerson(doc, { name: "Kid", sex: "M" }); doc = child.next;

    // Correct family
    doc = linkExistingRelation(doc, child.personId, p1.personId, "father");
    doc = linkExistingRelation(doc, child.personId, p2.personId, "mother");

    let report = analyzeGeneaDocument(doc);
    expect(report.counts.error).toBe(0); // All good, just info/warnings about dates or whatever

    // Corrupt the document intentionally
    // 1. Missing person in famc
    doc.families[Object.keys(doc.families)[0]].husbandId = "@I_DONT_EXIST@";

    report = analyzeGeneaDocument(doc);
    expect(report.issues.some(i => i.code === "ERR_FAM_MISSING_HUSB")).toBe(true);

    // 2. Asymmetry
    doc.families[Object.keys(doc.families)[0]].husbandId = p1.personId; // restore
    doc.persons[p1.personId].fams = []; // remove family from person

    report = analyzeGeneaDocument(doc);
    expect(report.issues.some(i => i.code === "ERR_ASYM_SPOUSE_MISSING_FAMS")).toBe(true);
});

test("analyzer cycle detection", () => {
    let doc = createNewTree();

    const p1 = createPerson(doc, { name: "A", sex: "M" }); doc = p1.next;
    const p2 = createPerson(doc, { name: "B", sex: "M" }); doc = p2.next;
    const p3 = createPerson(doc, { name: "C", sex: "M" }); doc = p3.next;

    doc = linkExistingRelation(doc, p2.personId, p1.personId, "father"); // B son of A
    doc = linkExistingRelation(doc, p3.personId, p2.personId, "father"); // C son of B

    let report = analyzeGeneaDocument(doc);
    expect(report.issues.some(i => i.code === "ERR_CYCLE_DETECTED")).toBe(false);

    // Create cycle: A son of C
    // We have to mutate directly as the UI might prevent this, but we want to test the analyzer
    // The family where C is child
    // Add A as child of C's family? No, create a new family for C to be father of A
    doc.families["@F_CYCLE@"] = { id: "@F_CYCLE@", husbandId: p3.personId, wifeId: undefined, childrenIds: [p1.personId], events: [] };
    doc.persons[p1.personId].famc.push("@F_CYCLE@");
    doc.persons[p3.personId].fams.push("@F_CYCLE@");

    report = analyzeGeneaDocument(doc);
    expect(report.issues.some(i => i.code === "ERR_CYCLE_DETECTED")).toBe(true);
});

test("analyzer multiple roles and empty tags", () => {
    let doc = createNewTree();

    const p1 = createPerson(doc, { name: "Alex", sex: "M" }); doc = p1.next;
    const p2 = createPerson(doc, { name: "", sex: "M" }); doc = p2.next; // empty name

    doc.families["@F_TEST@"] = { id: "@F_TEST@", husbandId: p1.personId, wifeId: p1.personId, childrenIds: [], events: [] };
    doc.persons[p1.personId].fams.push("@F_TEST@");

    let report = analyzeGeneaDocument(doc);
    expect(report.issues.some(i => i.code === "INFO_EMPTY_NAME")).toBe(true);
    expect(report.issues.some(i => i.code === "ERR_SELF_REF_PARENT")).toBe(true);
    expect(report.issues.some(i => i.code === "WARN_CONFLICTING_ROLES")).toBe(true);
});
