import { GSchemaGraph } from "./GSchemaGraph";
import type { PersonInput, PersonPatch } from "@/core/engine/GeneaEngine";
import type { FamilyPatch } from "@/core/edit/commands";
import { PersonPredicates, UnionPredicates } from "./predicates";
import { parseGedDate } from "./GedcomBridge";
import type { PersonNode, ParentChildEdge, MemberEdge, GClaim, GeoRef } from "./types";

function uuidv4(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function createClaim<T>(
    nodeUid: string,
    predicate: string,
    value: T,
    method = "ui_mutation",
    isPreferred = true
): GClaim<T> {
    return {
        uid: uuidv4(),
        nodeUid,
        predicate,
        value,
        provenance: {
            actorId: "system_ui",
            timestamp: Math.floor(Date.now() / 1000),
            method,
        },
        quality: "raw",
        lifecycle: "active",
        evidenceGate: "unassessed",
        isPreferred,
        createdAt: new Date().toISOString(),
    };
}

export const GraphMutations = {
    updatePersonInGraph(graph: GSchemaGraph, personUid: string, patch: PersonPatch, actorId = "system_ui"): void {
        const node = graph.node(personUid);
        if (!node || node.type !== "Person") return;

        // Name
        if (patch.name !== undefined) {
            if (patch.name.trim() === "") {
                const pref = graph.getPreferred(personUid, PersonPredicates.NAME_GIVEN);
                if (pref) graph.retractClaim(pref.uid, "UI clear", actorId);
            } else {
                graph.addClaim(createClaim(personUid, PersonPredicates.NAME_GIVEN, patch.name.trim()), actorId);
            }
        }

        // Surname
        if (patch.surname !== undefined) {
            if (patch.surname.trim() === "") {
                const pref = graph.getPreferred(personUid, PersonPredicates.NAME_SURNAME);
                if (pref) graph.retractClaim(pref.uid, "UI clear", actorId);
            } else {
                graph.addClaim(createClaim(personUid, PersonPredicates.NAME_SURNAME, patch.surname.trim()), actorId);
            }
        }

        // Birth Date
        if (patch.birthDate !== undefined) {
            if (!patch.birthDate.trim()) {
                const pref = graph.getPreferred(personUid, PersonPredicates.EVENT_BIRTH_DATE);
                if (pref) graph.retractClaim(pref.uid, "UI clear", actorId);
            } else {
                const parsed = parseGedDate(patch.birthDate);
                if (parsed) {
                    graph.addClaim(createClaim(personUid, PersonPredicates.EVENT_BIRTH_DATE, parsed), actorId);
                }
            }
        }

        // Birth Place
        if (patch.birthPlace !== undefined) {
            if (!patch.birthPlace.trim()) {
                const pref = graph.getPreferred(personUid, PersonPredicates.EVENT_BIRTH_PLACE);
                if (pref) graph.retractClaim(pref.uid, "UI clear", actorId);
            } else {
                graph.addClaim(createClaim(personUid, PersonPredicates.EVENT_BIRTH_PLACE, { placeRaw: patch.birthPlace.trim() } as GeoRef), actorId);
            }
        }

        // Death Date
        if (patch.deathDate !== undefined) {
            if (!patch.deathDate.trim()) {
                const pref = graph.getPreferred(personUid, PersonPredicates.EVENT_DEATH_DATE);
                if (pref) graph.retractClaim(pref.uid, "UI clear", actorId);
            } else {
                const parsed = parseGedDate(patch.deathDate);
                if (parsed) graph.addClaim(createClaim(personUid, PersonPredicates.EVENT_DEATH_DATE, parsed), actorId);
            }
        }

        // Death Place
        if (patch.deathPlace !== undefined) {
            if (!patch.deathPlace.trim()) {
                const pref = graph.getPreferred(personUid, PersonPredicates.EVENT_DEATH_PLACE);
                if (pref) graph.retractClaim(pref.uid, "UI clear", actorId);
            } else {
                graph.addClaim(createClaim(personUid, PersonPredicates.EVENT_DEATH_PLACE, { placeRaw: patch.deathPlace.trim() } as GeoRef), actorId);
            }
        }

        // Sex
        if (patch.sex !== undefined) {
            graph.addClaim(createClaim(personUid, PersonPredicates.SEX, patch.sex), actorId);
        }

        // Life Status
        if (patch.lifeStatus !== undefined) {
            graph.addClaim(createClaim(personUid, PersonPredicates.LIFE_STATUS, patch.lifeStatus), actorId);
        }

        // Residence
        if (patch.residence !== undefined) {
            if (!patch.residence.trim()) {
                const pref = graph.getPreferred(personUid, PersonPredicates.ATTR_RESIDENCE_PLACE);
                if (pref) graph.retractClaim(pref.uid, "UI clear", actorId);
            } else {
                graph.addClaim(createClaim(personUid, PersonPredicates.ATTR_RESIDENCE_PLACE, { placeRaw: patch.residence.trim() } as GeoRef), actorId);
            }
        }
    },

    createPersonInGraph(graph: GSchemaGraph, input: PersonInput, actorId = "system_ui"): { node: PersonNode } {
        const nodeUid = uuidv4();
        const node: Omit<PersonNode, "createdAt"> = {
            type: "Person",
            uid: nodeUid,
            sex: "U",
            isLiving: true,
            deleted: false
        };
        graph.addPersonNode(node, actorId);

        // Pass the input as a patch to re-use logic
        this.updatePersonInGraph(graph, nodeUid, input as PersonPatch, actorId);

        return { node: graph.node(nodeUid) as PersonNode };
    },

    linkRelationInGraph(graph: GSchemaGraph, anchorUid: string, targetUid: string, type: "parent" | "child" | "spouse", targetFamilyId?: string, actorId = "system_ui"): void {
        const anchor = graph.node(anchorUid) as PersonNode;
        const target = graph.node(targetUid) as PersonNode;
        if (!anchor || !target) return;

        const getRole = (p: PersonNode) => {
            if (p.sex === "M") return "HUSB";
            if (p.sex === "F") return "WIFE";
            return "PART";
        };

        if (type === "parent") {
            // anchor is child, target is parent. From parent to child
            let uUid = targetFamilyId;
            if (!uUid) {
                const existingMember = graph.edgesFrom(targetUid).find(e => e.type === "Member");
                if (existingMember) uUid = existingMember.toUid;
            }
            if (!uUid) {
                uUid = uuidv4();
                graph.addUnionNode({ type: "Union", uid: uUid, unionType: "MARR", deleted: false }, actorId);
                graph.addMemberEdge({
                    uid: uuidv4(), type: "Member", fromUid: targetUid, toUid: uUid,
                    role: getRole(target), deleted: false
                } as Omit<MemberEdge, "createdAt">, actorId);
            }
            graph.addEdge({
                uid: uuidv4(),
                type: "ParentChild",
                fromUid: targetUid,
                toUid: anchorUid,
                parentRole: target.sex === "M" ? "father" : (target.sex === "F" ? "mother" : "unknown"),
                unionUid: uUid,
                nature: "BIO",
                certainty: "high",
                deleted: false
            } as Omit<ParentChildEdge, "createdAt">, actorId);
        } else if (type === "child") {
            // anchor is parent, target is child. From parent to child
            let uUid = targetFamilyId;
            if (!uUid) {
                const existingMember = graph.edgesFrom(anchorUid).find(e => e.type === "Member");
                if (existingMember) uUid = existingMember.toUid;
            }
            if (!uUid) {
                uUid = uuidv4();
                graph.addUnionNode({ type: "Union", uid: uUid, unionType: "MARR", deleted: false }, actorId);
                graph.addMemberEdge({
                    uid: uuidv4(), type: "Member", fromUid: anchorUid, toUid: uUid,
                    role: getRole(anchor), deleted: false
                } as Omit<MemberEdge, "createdAt">, actorId);
            }
            graph.addEdge({
                uid: uuidv4(),
                type: "ParentChild",
                fromUid: anchorUid,
                toUid: targetUid,
                parentRole: anchor.sex === "M" ? "father" : (anchor.sex === "F" ? "mother" : "unknown"),
                unionUid: uUid,
                nature: "BIO",
                certainty: "high",
                deleted: false
            } as Omit<ParentChildEdge, "createdAt">, actorId);
        } else if (type === "spouse") {
            // If there's a targetFamilyId, use it (it should correspond to a Union node)
            // Otherwise create a new union node.
            let uUid = targetFamilyId;
            if (!uUid || !graph.node(uUid)) {
                uUid = uuidv4();
                graph.addUnionNode({
                    type: "Union",
                    uid: uUid,
                    unionType: "MARR",
                    deleted: false
                }, actorId);
                // Preemptively link anchor if creating a new union
                graph.addMemberEdge({
                    uid: uuidv4(),
                    type: "Member",
                    fromUid: anchorUid,
                    toUid: uUid,
                    role: getRole(anchor),
                    deleted: false
                } as Omit<MemberEdge, "createdAt">, actorId);
            }

            // Link target to union
            graph.addMemberEdge({
                uid: uuidv4(),
                type: "Member",
                fromUid: targetUid,
                toUid: uUid!,
                role: getRole(target),
                deleted: false
            } as Omit<MemberEdge, "createdAt">, actorId);
        }
    },

    unlinkRelationInGraph(graph: GSchemaGraph, personUid: string, relatedUid: string, type: "parent" | "child" | "spouse", actorId = "system_ui"): void {
        if (type === "parent") {
            // related is parent, person is child
            const edge = graph.edgesFrom(relatedUid).find(e => e.type === "ParentChild" && e.toUid === personUid);
            if (edge) graph.softDeleteEdge(edge.uid, "UI unlink", actorId);
        } else if (type === "child") {
            // person is parent, related is child
            const edge = graph.edgesFrom(personUid).find(e => e.type === "ParentChild" && e.toUid === relatedUid);
            if (edge) graph.softDeleteEdge(edge.uid, "UI unlink", actorId);
        } else if (type === "spouse") {
            // To unlink a spouse, we find any Union that BOTH are members of, and remove the relatedUid's Member edge.
            const personUnions = graph.edgesFrom(personUid).filter(e => e.type === "Member").map(e => e.toUid);
            const relatedEdges = graph.edgesFrom(relatedUid).filter(e => e.type === "Member" && personUnions.includes(e.toUid));
            for (const edge of relatedEdges) {
                graph.softDeleteEdge(edge.uid, "UI unlink", actorId);
            }
        }
    },

    updateFamilyInGraph(graph: GSchemaGraph, familyUid: string, patch: FamilyPatch, actorId = "system_ui"): void {
        const union = graph.node(familyUid);
        if (!union || union.type !== "Union") return;

        if (patch.marriageDate !== undefined) {
            if (!patch.marriageDate.trim()) {
                const pref = graph.getPreferred(familyUid, UnionPredicates.EVENT_MARRIAGE_DATE);
                if (pref) graph.retractClaim(pref.uid, "UI clear", actorId);
            } else {
                const parsed = parseGedDate(patch.marriageDate);
                if (parsed) graph.addClaim(createClaim(familyUid, UnionPredicates.EVENT_MARRIAGE_DATE, parsed), actorId);
            }
        }

        if (patch.marriagePlace !== undefined) {
            if (!patch.marriagePlace.trim()) {
                const pref = graph.getPreferred(familyUid, UnionPredicates.EVENT_MARRIAGE_PLACE);
                if (pref) graph.retractClaim(pref.uid, "UI clear", actorId);
            } else {
                graph.addClaim(createClaim(familyUid, UnionPredicates.EVENT_MARRIAGE_PLACE, { placeRaw: patch.marriagePlace.trim() } as GeoRef), actorId);
            }
        }
    }
};
