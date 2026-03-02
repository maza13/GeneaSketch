import { describe, it, expect } from "vitest";
import { getPersonMarkerPlace } from "../core/graph/locationMarkers";
import type { Person } from "../types/domain";

describe("getPersonMarkerPlace", () => {
    const mockPerson: Person = {
        id: "P1",
        name: "Test",
        sex: "M",
        lifeStatus: "alive",
        events: [
            { type: "BIRT", place: "Paris, France" },
            { type: "RESI", place: "London, UK" },
            { type: "DEAT", place: "Berlin, Germany" },
            { type: "MARR", place: "Madrid, Spain" }
        ],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
    };

    it("extracts birth place in birth mode", () => {
        expect(getPersonMarkerPlace(mockPerson, "birth")).toBe("Paris, France");
    });

    it("extracts residence place in residence mode", () => {
        expect(getPersonMarkerPlace(mockPerson, "residence")).toBe("London, UK");
    });

    it("extracts death place in death mode", () => {
        expect(getPersonMarkerPlace(mockPerson, "death")).toBe("Berlin, Germany");
    });

    it("uses intelligent sampling priority (Birth first if available)", () => {
        expect(getPersonMarkerPlace(mockPerson, "intelligent")).toBe("Paris, France");
    });

    it("uses intelligent sampling priority (Residence if Birth missing)", () => {
        const noBirth = { ...mockPerson, events: mockPerson.events.filter(e => e.type !== "BIRT") };
        expect(getPersonMarkerPlace(noBirth, "intelligent")).toBe("London, UK");
    });

    it("uses intelligent sampling priority (Death if Birth/Resi missing)", () => {
        const onlyDeath = { ...mockPerson, events: mockPerson.events.filter(e => e.type === "DEAT") };
        expect(getPersonMarkerPlace(onlyDeath, "intelligent")).toBe("Berlin, Germany");
    });

    it("uses intelligent sampling priority (Any event if BIRT/RESI/DEAT missing)", () => {
        const onlyMarr = { ...mockPerson, events: mockPerson.events.filter(e => e.type === "MARR") };
        expect(getPersonMarkerPlace(onlyMarr, "intelligent")).toBe("Madrid, Spain");
    });

    it("returns undefined if no places found", () => {
        const noPlaces = { ...mockPerson, events: [] };
        expect(getPersonMarkerPlace(noPlaces, "intelligent")).toBeUndefined();
    });
});
