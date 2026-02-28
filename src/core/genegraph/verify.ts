import { GeneGraphManager } from "./graph";
import { resolveSelector } from "./selector";
import type { GgAiOutput } from "./aiContract";

export function runTestsAtoE() {
    console.log("=== Running GeneGraph Tests (Phase 1) ===");

    const gg = new GeneGraphManager();

    // Setup Anchor
    const anchorId = "p1";
    gg.addPerson({
        id: anchorId,
        name: "Juan Jesus",
        surname: "Nunez",
        sex: "M",
        lifeStatus: "alive",
        events: [],
        notes: [],
        familyIds: ["f1"]
    });

    gg.addFamily({
        id: "f1",
        partners: [anchorId],
        children: [],
        events: [],
        notes: []
    });

    // CASE A: Hijos de Sonia (A: 2001, B: 2003, C: 2005)
    console.log("\n[Case A] Multiple children with birth dates...");
    const outputA: GgAiOutput = {
        facts: [
            { type: "BIRT", date: "2001", place: "Tenango" },
            { type: "BIRT", date: "2003", place: "Tenango" },
            { type: "BIRT", date: "2005", place: "Tenango" }
        ],
        applications: [
            { factIndex: 0, selector: { anchor: anchorId, select: "children", pick: "nth", n: 1 } },
            { factIndex: 1, selector: { anchor: anchorId, select: "children", pick: "nth", n: 2 } },
            { factIndex: 2, selector: { anchor: anchorId, select: "children", pick: "nth", n: 3 } }
        ],
        newEntities: [
            { tempId: "c1", name: "A", relationToAnchor: { anchor: anchorId, select: "children", pick: "one" } },
            { tempId: "c2", name: "B", relationToAnchor: { anchor: anchorId, select: "children", pick: "one" } },
            { tempId: "c3", name: "C", relationToAnchor: { anchor: anchorId, select: "children", pick: "one" } }
        ],
        userMessage: "Detectando 3 hijos."
    };
    void outputA;

    // In Phase 1, we simulate the auto-creation of entities before fact resolution
    const graphA = gg.getGraph();
    // We manually add them for the test to resolve selectors
    const kids = ["ck1", "ck2", "ck3"];
    graphA.persons["ck1"] = { id: "ck1", name: "A", sex: "M", lifeStatus: "alive", events: [], notes: [], familyIds: [] };
    graphA.persons["ck2"] = { id: "ck2", name: "B", sex: "M", lifeStatus: "alive", events: [], notes: [], familyIds: [] };
    graphA.persons["ck3"] = { id: "ck3", name: "C", sex: "M", lifeStatus: "alive", events: [], notes: [], familyIds: [] };
    graphA.families["f1"].children = kids; // link them
    graphA.persons["ck1"].birthDate = "2001";
    graphA.persons["ck2"].birthDate = "2003";
    graphA.persons["ck3"].birthDate = "2005";

    const resA = resolveSelector(graphA, { anchor: anchorId, select: "children", pick: "eldest" });
    console.log("Eldest (should be A):", graphA.persons[resA.targets[0]]?.name);
    console.log("Quality:", resA.quality);

    // CASE B: Sus padres (ella en 1973, el en 1971)
    console.log("\n[Case B] Parents (Father/Mother) by sex...");
    graphA.families["f2"] = { id: "f2", partners: ["fat", "mot"], children: [anchorId], events: [], notes: [] };
    graphA.persons[anchorId].parentsFamilyId = "f2";
    graphA.persons["fat"] = { id: "fat", name: "Father", sex: "M", lifeStatus: "alive", events: [], notes: [], familyIds: ["f2"] };
    graphA.persons["mot"] = { id: "mot", name: "Mother", sex: "F", lifeStatus: "alive", events: [], notes: [], familyIds: ["f2"] };

    const resFat = resolveSelector(graphA, { anchor: anchorId, select: "father", pick: "one" });
    const resMot = resolveSelector(graphA, { anchor: anchorId, select: "mother", pick: "one" });
    console.log("Father resolved:", graphA.persons[resFat.targets[0]]?.name);
    console.log("Mother resolved:", graphA.persons[resMot.targets[0]]?.name);

    // CASE D: notes hearsay in parentsFamily
    console.log("\n[Case D] Hearsay note in parentsFamily...");
    const resFam = resolveSelector(graphA, { anchor: anchorId, select: "parentsFamily", pick: "one" });
    console.log("Parents Family ID:", resFam.targets[0]);

    console.log("\nTests finished.");
}
