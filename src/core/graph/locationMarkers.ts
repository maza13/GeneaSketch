import type { Person } from "@/types/domain";

export type GeographicLayerMode = "intelligent" | "birth" | "residence" | "death";

/**
 * Extracts a relevant location string for a person based on the selected mode.
 */
export function getPersonMarkerPlace(person: Person, mode: GeographicLayerMode): string | undefined {
    if (mode === "birth") {
        return person.events.find(e => e.type === "BIRT")?.place;
    }

    if (mode === "residence") {
        return person.events.find(e => e.type === "RESI")?.place;
    }

    if (mode === "death") {
        return person.events.find(e => e.type === "DEAT")?.place;
    }

    // Default: Intelligent sampling (Auto)
    // Priority: BIRT -> RESI -> DEAT -> Any event with a place
    const birt = person.events.find(e => e.type === "BIRT")?.place;
    if (birt) return birt;

    const resi = person.events.find(e => e.type === "RESI")?.place;
    if (resi) return resi;

    const deat = person.events.find(e => e.type === "DEAT")?.place;
    if (deat) return deat;

    const anyEvent = person.events.find(e => e.place?.trim());
    return anyEvent?.place;
}
