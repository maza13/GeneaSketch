import { describe, expect, it } from "vitest";
import { expandGraph } from "@/core/graph/expand";
import type { GeneaDocument, ViewConfig } from "@/types/domain";

function createPresetFixture(): GeneaDocument {
    return {
        persons: {
            "@I1@": { id: "@I1@", name: "Focus", sex: "M", lifeStatus: "alive", events: [], famc: ["@F1@"], fams: ["@F2@"], mediaRefs: [], sourceRefs: [] },
            "@I2@": { id: "@I2@", name: "Father", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
            "@I3@": { id: "@I3@", name: "Mother", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@", "@F3@"], mediaRefs: [], sourceRefs: [] },
            "@I4@": { id: "@I4@", name: "Full Sibling", sex: "U", lifeStatus: "alive", events: [], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] },
            "@I5@": { id: "@I5@", name: "Half Sibling", sex: "U", lifeStatus: "alive", events: [], famc: ["@F3@"], fams: [], mediaRefs: [], sourceRefs: [] },
            "@I6@": { id: "@I6@", name: "Spouse", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: ["@F2@"], mediaRefs: [], sourceRefs: [] },
            "@I7@": { id: "@I7@", name: "Child", sex: "U", lifeStatus: "alive", events: [], famc: ["@F2@"], fams: [], mediaRefs: [], sourceRefs: [] },
            "@I8@": { id: "@I8@", name: "Grandchild", sex: "U", lifeStatus: "alive", events: [], famc: ["@F4@"], fams: [], mediaRefs: [], sourceRefs: [] },
            "@I9@": { id: "@I9@", name: "ChildSpouse", sex: "U", lifeStatus: "alive", events: [], famc: [], fams: ["@F4@"], mediaRefs: [], sourceRefs: [] },
            "@I10@": { id: "@I10@", name: "Grandfather", sex: "M", lifeStatus: "deceased", events: [], famc: [], fams: ["@F5@"], mediaRefs: [], sourceRefs: [] },
        },
        families: {
            "@F1@": { id: "@F1@", husbandId: "@I2@", wifeId: "@I3@", childrenIds: ["@I1@", "@I4@"], events: [] },
            "@F2@": { id: "@F2@", husbandId: "@I1@", wifeId: "@I6@", childrenIds: ["@I7@"], events: [] },
            "@F3@": { id: "@F3@", husbandId: undefined, wifeId: "@I3@", childrenIds: ["@I5@"], events: [] },
            "@F4@": { id: "@F4@", husbandId: "@I7@", wifeId: "@I9@", childrenIds: ["@I8@"], events: [] },
            "@F5@": { id: "@F5@", husbandId: "@I10@", wifeId: undefined, childrenIds: ["@I2@"], events: [] },
        },
        media: {},
        metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
    };
}

function createConfig(preset: ViewConfig["preset"]): ViewConfig {
    return {
        mode: "tree",
        preset,
        focusPersonId: "@I1@",
        focusFamilyId: null,
        homePersonId: "@I1@",
        rightPanelView: "details",
        timeline: { scope: "visible", view: "list", scaleZoom: 1, scaleOffset: 0 },
        depth: { ancestors: 0, descendants: 0, unclesGreatUncles: 0, siblingsNephews: 0, unclesCousins: 0 },
        showSpouses: true
    };
}

describe("Preset Expansion Logic", () => {
    const doc = createPresetFixture();

    it("family_origin only shows parents and FULL siblings", () => {
        const config = createConfig("family_origin");
        const graph = expandGraph(doc, config);
        const ids = new Set(graph.nodes.filter(n => n.type === "person").map(n => n.id));

        expect(ids.has("@I1@")).toBe(true); // Focus
        expect(ids.has("@I2@")).toBe(true); // Father
        expect(ids.has("@I3@")).toBe(true); // Mother
        expect(ids.has("@I4@")).toBe(true); // Full Sibling
        expect(ids.has("@I5@")).toBe(false); // Half Sibling (filtered)
        expect(ids.has("@I10@")).toBe(false); // Grandfather (out of scope)
    });

    it("family_origin with multiple roots shows parents and siblings of both", () => {
        const config: ViewConfig = {
            ...createConfig("family_origin"),
            focusPersonId: null,
            focusFamilyId: "@F2@", // Focus on union of @I1@ and @I6@
        };
        const graph = expandGraph(doc, config);
        const ids = new Set(graph.nodes.filter(n => n.type === "person").map(n => n.id));

        // Should include @I1@ and @I6@ (roots)
        expect(ids.has("@I1@")).toBe(true);
        expect(ids.has("@I6@")).toBe(true);
        // Should include @I1@'s parents (@I2@, @I3@)
        expect(ids.has("@I2@")).toBe(true);
        expect(ids.has("@I3@")).toBe(true);
        // Should include @I1@'s sibling (@I4@)
        expect(ids.has("@I4@")).toBe(true);
    });

    it("nuclear_family shows parents, spouse, and children", () => {
        const config = createConfig("nuclear_family");
        const graph = expandGraph(doc, config);
        const ids = new Set(graph.nodes.filter(n => n.type === "person").map(n => n.id));

        expect(ids.has("@I1@")).toBe(true); // Focus
        expect(ids.has("@I2@")).toBe(true); // Father
        expect(ids.has("@I3@")).toBe(true); // Mother
        expect(ids.has("@I6@")).toBe(true); // Spouse
        expect(ids.has("@I7@")).toBe(true); // Child
        expect(ids.has("@I4@")).toBe(false); // Sibling (not in nuclear)
        expect(ids.has("@I8@")).toBe(false); // Grandchild (out of scope)
    });

    it("extended_family shows 2 gen up and 2 gen down + spouses", () => {
        const config = createConfig("extended_family");
        const graph = expandGraph(doc, config);
        const ids = new Set(graph.nodes.filter(n => n.type === "person").map(n => n.id));

        expect(ids.has("@I1@")).toBe(true); // Focus
        expect(ids.has("@I2@")).toBe(true); // Father
        expect(ids.has("@I10@")).toBe(true); // Grandfather (2 gen up)
        expect(ids.has("@I7@")).toBe(true); // Child (1 gen down)
        expect(ids.has("@I8@")).toBe(true); // Grandchild (2 gen down)
        expect(ids.has("@I6@")).toBe(true); // Spouse
        expect(ids.has("@I9@")).toBe(true); // ChildSpouse
    });

    it("direct_ancestors shows only ancestors", () => {
        const config = createConfig("direct_ancestors");
        const graph = expandGraph(doc, config);
        const ids = new Set(graph.nodes.filter(n => n.type === "person").map(n => n.id));

        expect(ids.has("@I1@")).toBe(true);
        expect(ids.has("@I2@")).toBe(true);
        expect(ids.has("@I10@")).toBe(true);
        expect(ids.has("@I6@")).toBe(false); // Spouse excluded
        expect(ids.has("@I7@")).toBe(false); // Child excluded
    });

    it("direct_descendants shows only descendants", () => {
        const config = createConfig("direct_descendants");
        const graph = expandGraph(doc, config);
        const ids = new Set(graph.nodes.filter(n => n.type === "person").map(n => n.id));

        expect(ids.has("@I1@")).toBe(true);
        expect(ids.has("@I7@")).toBe(true);
        expect(ids.has("@I8@")).toBe(true);
        expect(ids.has("@I2@")).toBe(false); // Father excluded
    });
});
