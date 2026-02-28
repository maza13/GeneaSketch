import { GeneGraph, GgId } from "./types";
import { GgAiOutput } from "./aiContract";
import { resolveSelector } from "./selector";

export interface GgActionDraft {
    type: "update_person" | "create_person" | "update_family" | "create_family";
    targetId: GgId;
    description: string;
    changes: any;
    quality: "certain" | "partial" | "fallback";
}

export interface GgApplicationDraft {
    actions: GgActionDraft[];
    userMessage: string;
    warnings: string[];
}

/**
 * Prepares a draft of changes to be applied to the graph based on AI output.
 */
export function prepareGgApplication(
    graph: GeneGraph,
    output: GgAiOutput,
    anchorId: GgId
): GgApplicationDraft {
    const actions: GgActionDraft[] = [];
    const warnings: string[] = [];

    // 1. Handle New Entities (Phase 1 simplicity: create first)
    const tempIdMap = new Map<string, string>();
    for (const ent of output.newEntities) {
        const newId = `p_new_${Math.random().toString(36).slice(2, 7)}`;
        tempIdMap.set(ent.tempId, newId);

        actions.push({
            type: "create_person",
            targetId: newId,
            description: `Crear nueva persona: ${ent.name}`,
            changes: {
                name: ent.name,
                surname: ent.surname,
                sex: ent.sex || "U"
            },
            quality: "certain"
        });
    }

    // 2. Resolve Selectors and Map Facts
    for (const app of output.applications) {
        const fact = output.facts[app.factIndex];
        if (!fact) {
            warnings.push(`Fact index ${app.factIndex} not found.`);
            continue;
        }

        const resolution = resolveSelector(graph, {
            ...app.selector,
            anchor: anchorId
        });

        if (resolution.targets.length === 0) {
            warnings.push(`Could not resolve selector for fact: ${fact.type} ${fact.date || ""}`);
            continue;
        }

        for (const targetId of resolution.targets) {
            const isFamily = app.selector.select === "parentsFamily";

            actions.push({
                type: isFamily ? "update_family" : "update_person",
                targetId,
                description: `Actualizar ${isFamily ? "familia" : "persona"} con: ${fact.type} ${fact.date || ""}`,
                changes: fact,
                quality: resolution.quality
            });
        }

        if (resolution.warnings.length > 0) {
            warnings.push(...resolution.warnings);
        }
    }

    return {
        actions,
        userMessage: output.userMessage,
        warnings
    };
}

/**
 * Applies a drafted set of actions to the graph.
 */
export function applyGgDraft(graph: GeneGraph, draft: GgApplicationDraft): GeneGraph {
    const nextGraph = structuredClone(graph);

    for (const action of draft.actions) {
        if (action.type === "create_person") {
            nextGraph.persons[action.targetId] = {
                id: action.targetId,
                name: action.changes.name,
                surname: action.changes.surname,
                sex: action.changes.sex,
                lifeStatus: "alive",
                events: [],
                notes: [],
                familyIds: []
            };
        } else if (action.type === "update_person") {
            const person = nextGraph.persons[action.targetId];
            if (person) {
                if (action.changes.type === "BIRT") {
                    person.birthDate = action.changes.date || person.birthDate;
                    person.birthPlace = action.changes.place || person.birthPlace;
                } else if (action.changes.type === "DEAT") {
                    person.deathDate = action.changes.date || person.deathDate;
                    person.deathPlace = action.changes.place || person.deathPlace;
                    person.lifeStatus = "deceased";
                }
                // Handle notes
                if (action.changes.type === "NOTE") {
                    person.notes.push({
                        text: action.changes.text,
                        confidence: action.changes.confidence || "unknown"
                    });
                }
            }
        } else if (action.type === "update_family") {
            const family = nextGraph.families[action.targetId];
            if (family) {
                if (action.changes.type === "MARR") {
                    family.events.push({
                        type: "MARR",
                        date: action.changes.date,
                        place: action.changes.place
                    });
                }
                if (action.changes.type === "NOTE") {
                    family.notes.push({
                        text: action.changes.text,
                        confidence: action.changes.confidence || "unknown"
                    });
                }
            }
        }
    }

    return nextGraph;
}
