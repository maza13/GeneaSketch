import { normalizePersonSurnames } from "@/core/naming/surname";
import type { GeneaDocument } from "@/types/domain";

export function normalizeDocument(document: GeneaDocument | null): GeneaDocument | null {
  if (!document) return null;
  const next = { ...document };

  next.persons = { ...next.persons };
  next.families = { ...next.families };
  next.media = next.media ? { ...next.media } : {};
  next.sources = next.sources ? { ...next.sources } : {};
  next.notes = next.notes ? { ...next.notes } : {};

  for (const personId in next.persons) {
    const person = { ...next.persons[personId] };
    if (!person.sex) person.sex = "U";
    if (!person.lifeStatus) person.lifeStatus = "alive";
    if (!Array.isArray(person.events)) person.events = [];
    if (!Array.isArray(person.famc)) person.famc = [];
    if (!Array.isArray(person.fams)) person.fams = [];
    if (!Array.isArray(person.mediaRefs)) person.mediaRefs = [];
    if (!Array.isArray(person.sourceRefs)) person.sourceRefs = [];
    if (!Array.isArray(person.noteRefs)) person.noteRefs = [];

    if (!Array.isArray(person.names) || person.names.length === 0) {
      person.names = [{
        value: person.surname ? `${person.name} /${person.surname}/` : person.name,
        given: person.name,
        surname: person.surname,
        type: "primary",
        primary: true,
      }];
    }
    const canonical = normalizePersonSurnames(person);
    person.surname = canonical.surname;
    person.surnamePaternal = canonical.surnamePaternal;
    person.surnameMaternal = canonical.surnameMaternal;
    person.surnameOrder = canonical.surnameOrder;

    person.events = person.events.map((event, index) => ({
      ...event,
      id: event.id || `evt-${index + 1}`,
      sourceRefs: Array.isArray(event.sourceRefs) ? event.sourceRefs : [],
      mediaRefs: Array.isArray(event.mediaRefs) ? event.mediaRefs : [],
      notesInline: Array.isArray(event.notesInline) ? event.notesInline : [],
      noteRefs: Array.isArray(event.noteRefs) ? event.noteRefs : [],
    }));

    next.persons[personId] = person;
  }

  for (const familyId in next.families) {
    const family = { ...next.families[familyId] };
    if (!Array.isArray(family.childrenIds)) family.childrenIds = [];
    if (!Array.isArray(family.events)) family.events = [];
    if (!Array.isArray(family.noteRefs)) family.noteRefs = [];

    family.events = family.events.map((event, index) => ({
      ...event,
      id: event.id || `evt-${index + 1}`,
      sourceRefs: Array.isArray(event.sourceRefs) ? event.sourceRefs : [],
      mediaRefs: Array.isArray(event.mediaRefs) ? event.mediaRefs : [],
      notesInline: Array.isArray(event.notesInline) ? event.notesInline : [],
      noteRefs: Array.isArray(event.noteRefs) ? event.noteRefs : [],
    }));

    next.families[familyId] = family;
  }

  if (!next.metadata) next.metadata = { sourceFormat: "GED", gedVersion: "7.0.x" };
  if (!next.metadata.sourceFormat) next.metadata.sourceFormat = "GED";
  if (!next.metadata.gedVersion) next.metadata.gedVersion = "7.0.x";

  return next;
}
