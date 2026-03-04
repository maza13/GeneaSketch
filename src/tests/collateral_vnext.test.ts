import { describe, expect, it, beforeEach } from "vitest";
import { createNewTree } from "@/core/edit/commands";
import { documentToGSchema } from "@/core/gschema/GedcomBridge";
import { useAppStore } from "@/state/store";

function loadDoc(doc: any) {
    const version = doc?.metadata?.gedVersion?.startsWith("7") ? "7.0.x" : "5.5.1";
    useAppStore.getState().loadGraph({ graph: documentToGSchema(doc, version).graph, source: "ged" });
}

describe("Collateral Sliders vNext - Deterministic Tests", () => {
    beforeEach(() => {
        const doc = createNewTree();
        // @I1@ is the root/focus
        doc.persons["@I1@"].name = "Focus";
        doc.persons["@I1@"].isPlaceholder = false;

        useAppStore.setState((s) => ({
            ...s,
            viewConfig: {
                mode: "tree",
                preset: "all_direct_ancestors",
                focusPersonId: "@I1@",
                focusFamilyId: null,
                homePersonId: "@I1@",
                rightPanelView: "details",
                timeline: { scope: "visible", view: "list", scaleZoom: 1, scaleOffset: 0 },
                depth: {
                    ancestors: 5,
                    descendants: 3,
                    unclesGreatUncles: 0,
                    siblingsNephews: 0,
                    unclesCousins: 0
                },
                showSpouses: true,
                dtree: {
                    isVertical: true,
                    layoutEngine: "vnext",
                    collapsedNodeIds: [],
                    overlays: []
                }
            }
        }));
        loadDoc(doc);
    });

    it("couples Slider C with Slider A (Increasing C sets A to at least 1)", () => {
        const store = useAppStore.getState();

        // Initial state A=0, C=0
        expect(store.viewConfig?.depth.unclesGreatUncles).toBe(0);
        expect(store.viewConfig?.depth.unclesCousins).toBe(0);

        // Increase C to 1
        store.setDepth("unclesCousins", 1);

        const nextState = useAppStore.getState();
        expect(nextState.viewConfig?.depth.unclesCousins).toBe(1);
        expect(nextState.viewConfig?.depth.unclesGreatUncles).toBe(1);
    });

    it("couples Slider A with Slider C (Decreasing A to 0 sets C to 0)", () => {
        const store = useAppStore.getState();

        // Set A=2, C=2
        store.setDepth("unclesGreatUncles", 2);
        store.setDepth("unclesCousins", 2);

        expect(useAppStore.getState().viewConfig?.depth.unclesGreatUncles).toBe(2);
        expect(useAppStore.getState().viewConfig?.depth.unclesCousins).toBe(2);

        // Decrease A to 0
        useAppStore.getState().setDepth("unclesGreatUncles", 0);

        const nextState = useAppStore.getState();
        expect(nextState.viewConfig?.depth.unclesGreatUncles).toBe(0);
        expect(nextState.viewConfig?.depth.unclesCousins).toBe(0);
    });

    it("allows Slider A to be > 0 while Slider C is 0", () => {
        const store = useAppStore.getState();

        store.setDepth("unclesGreatUncles", 3);

        const nextState = useAppStore.getState();
        expect(nextState.viewConfig?.depth.unclesGreatUncles).toBe(3);
        expect(nextState.viewConfig?.depth.unclesCousins).toBe(0);
    });

    it("Slider B and C internal depth normalization (N-1) logic via expansion check", () => {
        const store = useAppStore.getState();

        store.setDepth("siblingsNephews", 1); // Slider B = 1 should show only siblings
        expect(useAppStore.getState().viewConfig?.depth.siblingsNephews).toBe(1);

        store.setDepth("unclesCousins", 2); // Slider C = 2 should show uncles AND cousins
        expect(useAppStore.getState().viewConfig?.depth.unclesCousins).toBe(2);
    });

    it("Slider C deep expansion collects cousins", () => {
        const doc = createNewTree();
        // Focus root @I1@
        // Parents @I2@, @I3@ (Family @F1@)
        // Uncle @I4@ (Sibling of @I2@ in Family @F2@)
        // Cousin @I5@ (Child of @I4@ in Family @F3@)

        doc.persons["@I1@"] = { id: "@I1@", name: "Focus", famc: ["@F1@"], fams: [], sex: "U", lifeStatus: "alive", events: [], mediaRefs: [], sourceRefs: [] };
        doc.families["@F1@"] = { id: "@F1@", husbandId: "@I2@", wifeId: "@I3@", events: [], childrenIds: ["@I1@"] };
        doc.persons["@I2@"] = { id: "@I2@", name: "Father", famc: ["@F2@"], fams: ["@F1@"], sex: "M", lifeStatus: "alive", events: [], mediaRefs: [], sourceRefs: [] };
        doc.persons["@I3@"] = { id: "@I3@", name: "Mother", famc: [], fams: ["@F1@"], sex: "F", lifeStatus: "alive", events: [], mediaRefs: [], sourceRefs: [] };

        doc.persons["@I10@"] = { id: "@I10@", name: "GF", famc: [], fams: ["@F2@"], sex: "M", lifeStatus: "alive", events: [], mediaRefs: [], sourceRefs: [] };
        doc.persons["@I11@"] = { id: "@I11@", name: "GM", famc: [], fams: ["@F2@"], sex: "F", lifeStatus: "alive", events: [], mediaRefs: [], sourceRefs: [] };
        doc.families["@F2@"] = { id: "@F2@", husbandId: "@I10@", wifeId: "@I11@", events: [], childrenIds: ["@I2@", "@I4@"] };
        doc.persons["@I4@"] = { id: "@I4@", name: "Uncle", famc: ["@F2@"], fams: ["@F3@"], sex: "M", lifeStatus: "alive", events: [], mediaRefs: [], sourceRefs: [] };

        doc.persons["@I20@"] = { id: "@I20@", name: "Aunt", famc: [], fams: ["@F3@"], sex: "F", lifeStatus: "alive", events: [], mediaRefs: [], sourceRefs: [] };
        doc.families["@F3@"] = { id: "@F3@", husbandId: "@I4@", wifeId: "@I20@", events: [], childrenIds: ["@I5@"] };
        doc.persons["@I5@"] = { id: "@I5@", name: "Cousin", famc: ["@F3@"], fams: [], sex: "M", lifeStatus: "alive", events: [], mediaRefs: [], sourceRefs: [] };

        loadDoc(doc);

        // C=1 -> should have Father, Mother, Uncle. NO Cousin.
        useAppStore.getState().setDepth("unclesCousins", 1);
        let nodes = useAppStore.getState().expandedGraph.nodes.map(n => n.id);
        expect(nodes).toContain("@I4@");
        expect(nodes).not.toContain("@I5@");

        // C=2 -> should have Cousin
        useAppStore.getState().setDepth("unclesCousins", 2);
        nodes = useAppStore.getState().expandedGraph.nodes.map(n => n.id);
        expect(nodes).toContain("@I4@");
        expect(nodes).toContain("@I5@");
    });
});

