import { findKinship } from "../core/graph/kinship";
import { createNewTree, createPerson, linkExistingRelation } from "../core/edit/commands";

let doc = createNewTree();

// Grandparents
const ggfRes = createPerson(doc, { name: "GGF", sex: "M" }); doc = ggfRes.next;
const ggmRes = createPerson(doc, { name: "GGM", sex: "F" }); doc = ggmRes.next;

const gfRes = createPerson(doc, { name: "GF", sex: "M" }); doc = gfRes.next;
const gmRes = createPerson(doc, { name: "GM", sex: "F" }); doc = gmRes.next;

doc = linkExistingRelation(doc, gfRes.personId, ggfRes.personId, "father");
doc = linkExistingRelation(doc, gfRes.personId, ggmRes.personId, "mother");

// Parents
const fRes = createPerson(doc, { name: "Father", sex: "M" }); doc = fRes.next;
const mRes = createPerson(doc, { name: "Mother", sex: "F" }); doc = mRes.next;

// Link Father to Grandparents
doc = linkExistingRelation(doc, fRes.personId, gfRes.personId, "father");
doc = linkExistingRelation(doc, fRes.personId, gmRes.personId, "mother");

// Children
const c1Res = createPerson(doc, { name: "Child 1", sex: "M" }); doc = c1Res.next;

// Link Children to Parents
doc = linkExistingRelation(doc, c1Res.personId, fRes.personId, "father");
doc = linkExistingRelation(doc, c1Res.personId, mRes.personId, "mother");

const res = findKinship(doc, c1Res.personId, ggfRes.personId);
console.log("==> Shared DNA:", res!.sharedDnaPercentage);
console.log("==> PATH: ", res!.pathPersonIds);
console.log("MRCA relation text:", res!.relationshipText);
