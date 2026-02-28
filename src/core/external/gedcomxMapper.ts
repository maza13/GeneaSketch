import { Person, Family, Event, GeneaDocument } from '@/types/domain';

/**
 * GedcomXMapper: Maps FamilySearch GEDCOM X JSON to internal GeneaDocument format.
 */
export class GedcomXMapper {
    static toInternal(gx: any): Partial<GeneaDocument> {
        const persons: Record<string, Person> = {};
        const families: Record<string, Family> = {};

        if (gx.persons) {
            gx.persons.forEach((p: any) => {
                const internalPerson: Person = {
                    id: p.id,
                    name: this.extractName(p),
                    sex: this.extractSex(p),
                    lifeStatus: p.living ? 'alive' : 'deceased',
                    events: this.extractEvents(p),
                    famc: [],
                    fams: [],
                    mediaRefs: [],
                    sourceRefs: []
                };
                persons[p.id] = internalPerson;
            });
        }

        // Logic for relationships (families) would go here
        // GEDCOM X uses 'relationships' array for both Couple and ParentChild

        return { persons, families };
    }

    private static extractName(p: any): string {
        if (!p.names || p.names.length === 0) return 'Unknown';
        const preferred = p.names.find((n: any) => n.preferred) || p.names[0];
        if (preferred.nameForms && preferred.nameForms.length > 0) {
            return preferred.nameForms[0].fullText || 'Unknown';
        }
        return 'Unknown';
    }

    private static extractSex(p: any): "M" | "F" | "U" {
        if (!p.gender || !p.gender.type) return "U";
        const type = p.gender.type.split('/').pop().toUpperCase();
        if (type === 'MALE') return "M";
        if (type === 'FEMALE') return "F";
        return "U";
    }

    private static extractEvents(p: any): Event[] {
        const events: Event[] = [];
        if (p.facts) {
            p.facts.forEach((f: any) => {
                const type = f.type.split('/').pop().toUpperCase();
                let eventType: Event['type'] = 'OTHER';
                if (type === 'BIRTH') eventType = 'BIRT';
                else if (type === 'DEATH') eventType = 'DEAT';
                else if (type === 'MARRIAGE') eventType = 'MARR';
                else if (type === 'DIVORCE') eventType = 'DIV';

                events.push({
                    type: eventType,
                    date: f.date?.original,
                    place: f.place?.original
                });
            });
        }
        return events;
    }
}
