import type { Event, Family, GeneaDocument, PendingRelationType, Person } from "@/types/domain";

type PersonInput = {
  name: string;
  surname?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residence?: string;
  sex?: "M" | "F" | "U";
  lifeStatus?: "alive" | "deceased";
  photoDataUrl?: string | null;
};

export type FamilyUnionStatus = "partner" | "married" | "divorced";

export type FamilyPatch = {
  husbandId?: string | null;
  wifeId?: string | null;
  childrenIds?: string[];
  unionStatus?: FamilyUnionStatus;
  marriageDate?: string;
  marriagePlace?: string;
  divorceDate?: string;
  name?: string;
};

function nextId(existing: string[], prefix: "I" | "F" | "M"): string {
  let max = 0;
  for (const id of existing) {
    const m = id.match(/^@([IFM])(\d+)@$/);
    if (!m || m[1] !== prefix) continue;
    max = Math.max(max, Number(m[2]));
  }
  return `@${prefix}${max + 1}@`;
}

function upsertEvent(person: Person, type: "BIRT" | "DEAT", options: { create?: boolean; date?: string; place?: string }) {
  const current = person.events.find((e) => e.type === type);
  // If no create flag and no data, remove event
  if (!options.create && !options.date && !options.place) {
    person.events = person.events.filter(e => e.type !== type);
    return;
  }
  if (current) {
    current.date = options.date || undefined;
    current.place = options.place || undefined;
    if (!current.date) delete current.date;
    if (!current.place) delete current.place;
    return;
  }
  if (options.create || options.date || options.place) {
    const event: Event = { type };
    if (options.date) event.date = options.date;
    if (options.place) event.place = options.place;
    person.events.push(event);
  }
}

function createFamily(id: string): Family {
  return {
    id,
    childrenIds: [],
    events: []
  };
}

function upsertFamilyEvent(family: Family, type: "MARR" | "DIV", options: { create?: boolean; date?: string; place?: string }) {
  const current = family.events.find((e) => e.type === type);
  if (!options.create && !options.date && !options.place) {
    family.events = family.events.filter((event) => event.type !== type);
    return;
  }
  if (current) {
    current.date = options.date || undefined;
    current.place = options.place || undefined;
    if (!current.date) delete current.date;
    if (!current.place) delete current.place;
    return;
  }
  if (options.create || options.date || options.place) {
    const event: Event = { type };
    if (options.date) event.date = options.date;
    if (options.place) event.place = options.place;
    family.events.push(event);
  }
}

function cloneDoc(doc: GeneaDocument): GeneaDocument {
  return {
    persons: structuredClone(doc.persons),
    families: structuredClone(doc.families),
    unions: doc.unions ? structuredClone(doc.unions) : undefined,
    parentChildLinks: doc.parentChildLinks ? structuredClone(doc.parentChildLinks) : undefined,
    siblingLinks: doc.siblingLinks ? structuredClone(doc.siblingLinks) : undefined,
    media: structuredClone(doc.media),
    metadata: structuredClone(doc.metadata)
  };
}

function ensureFamilyMembership(person: Person, familyId: string, role: "fams" | "famc") {
  if (!person[role].includes(familyId)) person[role].push(familyId);
}

function removeFamilyMembership(person: Person, familyId: string, role: "fams" | "famc") {
  person[role] = person[role].filter((id) => id !== familyId);
}

export function createNewTree(): GeneaDocument {
  const rootId = "@I1@";
  return {
    persons: {
      [rootId]: {
        id: rootId,
        name: "(Sin nombre)",
        sex: "U",
        lifeStatus: "alive",
        isPlaceholder: true,
        events: [],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {},
    unions: {},
    parentChildLinks: {},
    siblingLinks: {},
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

export function createPerson(doc: GeneaDocument, input: PersonInput): { next: GeneaDocument; personId: string } {
  const next = cloneDoc(doc);
  const personId = nextId(Object.keys(next.persons), "I");
  const lifeStatus = input.lifeStatus ?? "alive";
  const person: Person = {
    id: personId,
    name: input.name.trim(),
    surname: input.surname?.trim() || undefined,
    sex: input.sex ?? "U",
    lifeStatus,
    birthDate: input.birthDate,
    birthPlace: input.birthPlace,
    deathDate: input.deathDate,
    deathPlace: input.deathPlace,
    residence: input.residence,
    events: [],
    famc: [],
    fams: [],
    mediaRefs: [],
    sourceRefs: []
  };
  upsertEvent(person, "BIRT", { create: !!(input.birthDate || input.birthPlace), date: input.birthDate, place: input.birthPlace });
  upsertEvent(person, "DEAT", { create: lifeStatus === "deceased" || !!(input.deathDate || input.deathPlace), date: input.deathDate, place: input.deathPlace });

  if (input.photoDataUrl) {
    const mediaId = nextId(Object.keys(next.media), "M");
    next.media[mediaId] = {
      id: mediaId,
      fileName: input.photoDataUrl
    };
    person.mediaRefs.push(mediaId);
  }

  next.persons[personId] = person;
  return { next, personId };
}

export function updatePerson(
  doc: GeneaDocument,
  personId: string,
  patch: {
    name?: string;
    surname?: string;
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string;
    deathPlace?: string;
    residence?: string;
    lifeStatus?: "alive" | "deceased";
    isPlaceholder?: boolean;
    sex?: "M" | "F" | "U";
    photoDataUrl?: string | null;
    notesAppend?: string[];
    notesReplace?: string[];
  }
): GeneaDocument {
  const next = cloneDoc(doc);
  const person = next.persons[personId];
  if (!person) return next;
  if (patch.name !== undefined) person.name = patch.name.trim();
  if (patch.surname !== undefined) person.surname = patch.surname.trim() || undefined;
  if (patch.sex !== undefined) person.sex = patch.sex;
  if (patch.lifeStatus !== undefined) person.lifeStatus = patch.lifeStatus;
  if (patch.isPlaceholder !== undefined) person.isPlaceholder = patch.isPlaceholder;

  if (patch.birthDate !== undefined || patch.birthPlace !== undefined) {
    const existingDate = person.events.find(e => e.type === "BIRT")?.date;
    const existingPlace = person.events.find(e => e.type === "BIRT")?.place;
    const date = patch.birthDate !== undefined ? (patch.birthDate === "" ? undefined : patch.birthDate) : existingDate;
    const place = patch.birthPlace !== undefined ? (patch.birthPlace === "" ? undefined : patch.birthPlace) : existingPlace;

    upsertEvent(person, "BIRT", { create: !!(date || place), date, place });
    person.birthDate = date;
    person.birthPlace = place;
  }

  const hasDeathPatch = patch.lifeStatus !== undefined || patch.deathDate !== undefined || patch.deathPlace !== undefined;
  if (hasDeathPatch) {
    const isDead = (patch.lifeStatus ?? person.lifeStatus) === "deceased";
    const existingDate = person.events.find(e => e.type === "DEAT")?.date;
    const existingPlace = person.events.find(e => e.type === "DEAT")?.place;
    const date = patch.deathDate !== undefined ? (patch.deathDate === "" ? undefined : patch.deathDate) : existingDate;
    const place = patch.deathPlace !== undefined ? (patch.deathPlace === "" ? undefined : patch.deathPlace) : existingPlace;

    upsertEvent(person, "DEAT", { create: isDead || !!(date || place), date, place });
    person.deathDate = date;
    person.deathPlace = place;
    person.lifeStatus = isDead || !!(date || place) ? "deceased" : "alive";
  }

  if (patch.residence !== undefined) {
    person.residence = patch.residence.trim() || undefined;
  }

  if (patch.photoDataUrl !== undefined) {
    if (patch.photoDataUrl === null) {
      person.mediaRefs = []; // wipe
    } else {
      let mRef = person.mediaRefs[0];
      if (mRef && next.media[mRef]) {
        next.media[mRef].fileName = patch.photoDataUrl;
      } else {
        const mediaId = nextId(Object.keys(next.media), "M");
        next.media[mediaId] = { id: mediaId, fileName: patch.photoDataUrl };
        person.mediaRefs = [mediaId, ...person.mediaRefs];
      }
    }
  }

  if (Array.isArray(patch.notesReplace)) {
    const cleaned = patch.notesReplace
      .map((note) => (typeof note === "string" ? note.trim() : ""))
      .filter((note) => note.length > 0);
    if (cleaned.length > 0) {
      person.rawTags = { ...(person.rawTags || {}), NOTE: cleaned };
    } else if (person.rawTags?.NOTE) {
      const nextRaw = { ...(person.rawTags || {}) };
      delete nextRaw.NOTE;
      person.rawTags = Object.keys(nextRaw).length > 0 ? nextRaw : undefined;
    }
  }

  if (Array.isArray(patch.notesAppend) && patch.notesAppend.length > 0) {
    const additions = patch.notesAppend
      .map((note) => (typeof note === "string" ? note.trim() : ""))
      .filter((note) => note.length > 0);
    if (additions.length > 0) {
      const currentNotes = Array.isArray(person.rawTags?.NOTE) ? [...person.rawTags!.NOTE] : [];
      person.rawTags = { ...(person.rawTags || {}), NOTE: [...currentNotes, ...additions] };
    }
  }

  return next;
}

export function updateFamily(doc: GeneaDocument, familyId: string, patch: FamilyPatch): GeneaDocument {
  const next = cloneDoc(doc);
  const family = next.families[familyId];
  if (!family) return next;

  if (patch.husbandId !== undefined) {
    const nextHusbandId = patch.husbandId || undefined;
    const prevHusbandId = family.husbandId;
    if (prevHusbandId && prevHusbandId !== nextHusbandId && next.persons[prevHusbandId]) {
      removeFamilyMembership(next.persons[prevHusbandId], familyId, "fams");
    }
    if (nextHusbandId && next.persons[nextHusbandId]) {
      family.husbandId = nextHusbandId;
      ensureFamilyMembership(next.persons[nextHusbandId], familyId, "fams");
    } else {
      family.husbandId = undefined;
    }
  }

  if (patch.wifeId !== undefined) {
    const nextWifeId = patch.wifeId || undefined;
    const prevWifeId = family.wifeId;
    if (prevWifeId && prevWifeId !== nextWifeId && next.persons[prevWifeId]) {
      removeFamilyMembership(next.persons[prevWifeId], familyId, "fams");
    }
    if (nextWifeId && next.persons[nextWifeId]) {
      family.wifeId = nextWifeId;
      ensureFamilyMembership(next.persons[nextWifeId], familyId, "fams");
    } else {
      family.wifeId = undefined;
    }
  }

  if (patch.childrenIds !== undefined) {
    const prevChildren = new Set(family.childrenIds);
    const nextChildren = Array.from(new Set(patch.childrenIds.filter((id) => Boolean(next.persons[id]))));
    family.childrenIds = nextChildren;

    for (const prevChildId of prevChildren) {
      if (!nextChildren.includes(prevChildId) && next.persons[prevChildId]) {
        removeFamilyMembership(next.persons[prevChildId], familyId, "famc");
      }
    }
    for (const childId of nextChildren) {
      ensureFamilyMembership(next.persons[childId], familyId, "famc");
    }
  }

  if (patch.name !== undefined) {
    family.name = patch.name?.trim() || undefined;
  }

  const marriageEvent = family.events.find((event) => event.type === "MARR");
  const divorceEvent = family.events.find((event) => event.type === "DIV");
  const marriageDate = patch.marriageDate !== undefined ? patch.marriageDate : marriageEvent?.date;
  const marriagePlace = patch.marriagePlace !== undefined ? patch.marriagePlace : marriageEvent?.place;
  const divorceDate = patch.divorceDate !== undefined ? patch.divorceDate : divorceEvent?.date;

  if (patch.unionStatus !== undefined || patch.marriageDate !== undefined || patch.marriagePlace !== undefined || patch.divorceDate !== undefined) {
    const status = patch.unionStatus ?? (divorceEvent ? "divorced" : marriageEvent ? "married" : "partner");

    if (status === "partner") {
      upsertFamilyEvent(family, "MARR", { create: false });
      upsertFamilyEvent(family, "DIV", { create: false });
    } else if (status === "married") {
      upsertFamilyEvent(family, "MARR", { create: true, date: marriageDate, place: marriagePlace });
      upsertFamilyEvent(family, "DIV", { create: false });
    } else {
      upsertFamilyEvent(family, "MARR", { create: true, date: marriageDate, place: marriagePlace });
      upsertFamilyEvent(family, "DIV", { create: true, date: divorceDate });
    }
  }

  return next;
}

function findFamilyByChild(doc: GeneaDocument, childId: string): Family | undefined {
  return Object.values(doc.families).find((f) => f.childrenIds.includes(childId));
}

function findFamiliesBySpouse(doc: GeneaDocument, spouseId: string): Family[] {
  return Object.values(doc.families).filter((f) => f.husbandId === spouseId || f.wifeId === spouseId);
}

function ensureFamily(doc: GeneaDocument): Family {
  const id = nextId(Object.keys(doc.families), "F");
  const family = createFamily(id);
  doc.families[id] = family;
  return family;
}

function linkAsParent(doc: GeneaDocument, anchorId: string, newPersonId: string, parentRole: "father" | "mother") {
  let family = findFamilyByChild(doc, anchorId);
  if (!family) {
    family = ensureFamily(doc);
    family.childrenIds.push(anchorId);
    doc.persons[anchorId].famc.push(family.id);
  }
  if (parentRole === "father") family.husbandId = newPersonId;
  if (parentRole === "mother") family.wifeId = newPersonId;
  doc.persons[newPersonId].fams.push(family.id);
}

function linkAsSpouse(doc: GeneaDocument, anchorId: string, newPersonId: string) {
  const existing = findFamiliesBySpouse(doc, anchorId);
  let family = existing.find(f => !f.husbandId || !f.wifeId) ?? null;
  if (!family) family = ensureFamily(doc);
  const anchor = doc.persons[anchorId];
  if (anchor.sex === "M" && !family.husbandId) {
    family.husbandId = anchorId;
    family.wifeId = newPersonId;
  } else if (anchor.sex === "F" && !family.wifeId) {
    family.wifeId = anchorId;
    family.husbandId = newPersonId;
  } else if (!family.husbandId) {
    family.husbandId = anchorId;
    family.wifeId = newPersonId;
  } else {
    family.wifeId ??= anchorId;
    if (family.wifeId === anchorId) family.husbandId = newPersonId;
    else family.wifeId = newPersonId;
  }
  if (!doc.persons[anchorId].fams.includes(family.id)) doc.persons[anchorId].fams.push(family.id);
  if (!doc.persons[newPersonId].fams.includes(family.id)) doc.persons[newPersonId].fams.push(family.id);
}

function linkAsChild(doc: GeneaDocument, anchorId: string, newPersonId: string, targetFamilyId?: string): boolean {
  const existing = findFamiliesBySpouse(doc, anchorId);
  let family = targetFamilyId ? doc.families[targetFamilyId] : null;
  if (!family && existing.length === 1) {
    family = existing[0];
  }
  if (!family && existing.length > 1) {
    return false;
  }
  if (!family) {
    family = ensureFamily(doc);
    const anchor = doc.persons[anchorId];
    if (anchor.sex === "F") {
      family.wifeId = anchorId;
    } else {
      family.husbandId = anchorId;
    }
    if (!doc.persons[anchorId].fams.includes(family.id)) doc.persons[anchorId].fams.push(family.id);
  }
  if (!family.childrenIds.includes(newPersonId)) family.childrenIds.push(newPersonId);
  if (!doc.persons[newPersonId].famc.includes(family.id)) doc.persons[newPersonId].famc.push(family.id);
  return true;
}

function linkAsSibling(doc: GeneaDocument, anchorId: string, newPersonId: string) {
  let family = findFamilyByChild(doc, anchorId);
  if (!family) {
    family = ensureFamily(doc);
    family.childrenIds.push(anchorId);
    if (!doc.persons[anchorId].famc.includes(family.id)) doc.persons[anchorId].famc.push(family.id);
  }
  if (!family.childrenIds.includes(newPersonId)) family.childrenIds.push(newPersonId);
  if (!doc.persons[newPersonId].famc.includes(family.id)) doc.persons[newPersonId].famc.push(family.id);
}

export function addRelation(
  doc: GeneaDocument,
  anchorId: string,
  type: PendingRelationType,
  personInput: PersonInput,
  targetFamilyId?: string
): { next: GeneaDocument; personId: string } {
  const created = createPerson(doc, personInput);
  const next = created.next;
  const personId = created.personId;
  if (!next.persons[anchorId]) return { next, personId };

  if (type === "father") linkAsParent(next, anchorId, personId, "father");
  if (type === "mother") linkAsParent(next, anchorId, personId, "mother");
  if (type === "spouse") linkAsSpouse(next, anchorId, personId);
  if (type === "child") linkAsChild(next, anchorId, personId, targetFamilyId);
  if (type === "sibling") linkAsSibling(next, anchorId, personId);

  return { next, personId };
}

export function linkExistingRelation(
  doc: GeneaDocument,
  anchorId: string,
  existingPersonId: string,
  type: PendingRelationType,
  targetFamilyId?: string
): GeneaDocument {
  const next = cloneDoc(doc);
  if (!next.persons[anchorId] || !next.persons[existingPersonId]) return next;

  if (type === "father") linkAsParent(next, anchorId, existingPersonId, "father");
  if (type === "mother") linkAsParent(next, anchorId, existingPersonId, "mother");
  if (type === "spouse") linkAsSpouse(next, anchorId, existingPersonId);
  if (type === "child") linkAsChild(next, anchorId, existingPersonId, targetFamilyId);
  if (type === "sibling") linkAsSibling(next, anchorId, existingPersonId);

  return next;
}

export function unlinkParent(doc: GeneaDocument, childId: string, parentId: string): GeneaDocument {
  const next = cloneDoc(doc);
  const child = next.persons[childId];
  if (!child) return next;

  for (const famId of child.famc) {
    const family = next.families[famId];
    if (!family) continue;
    if (family.husbandId === parentId) {
      family.husbandId = undefined;
    } else if (family.wifeId === parentId) {
      family.wifeId = undefined;
    } else {
      continue;
    }

    // Remove fams from parent if they have no other role in this family
    const parent = next.persons[parentId];
    if (parent && !family.childrenIds.includes(parentId) && family.husbandId !== parentId && family.wifeId !== parentId) {
      parent.fams = parent.fams.filter(id => id !== famId);
    }

    // Cleanup empty family
    if (!family.husbandId && !family.wifeId && family.childrenIds.length <= 1) {
      // It's empty or just has this one child and no parents.
      // Easiest is to leave it, but clean approach is to remove famc from child
      // However, we'll keep the family if it has children, just no parents.
    }
    break;
  }
  return next;
}

export function unlinkChild(doc: GeneaDocument, parentId: string, childId: string): GeneaDocument {
  const next = cloneDoc(doc);
  const child = next.persons[childId];
  if (!child) return next;

  for (const famId of child.famc) {
    const family = next.families[famId];
    if (!family) continue;
    if (family.husbandId === parentId || family.wifeId === parentId) {
      // Remove child from this family
      family.childrenIds = family.childrenIds.filter(id => id !== childId);
      child.famc = child.famc.filter(id => id !== famId);
      break;
    }
  }
  return next;
}

export function unlinkSpouse(doc: GeneaDocument, personId: string, spouseId: string): GeneaDocument {
  const next = cloneDoc(doc);
  const person = next.persons[personId];
  const spouse = next.persons[spouseId];
  if (!person || !spouse) return next;

  for (const famId of person.fams) {
    const family = next.families[famId];
    if (!family) continue;
    const isHubbyAndWife = (family.husbandId === personId && family.wifeId === spouseId) || (family.husbandId === spouseId && family.wifeId === personId);
    if (isHubbyAndWife) {
      if (family.husbandId === spouseId) family.husbandId = undefined;
      if (family.wifeId === spouseId) family.wifeId = undefined;
      spouse.fams = spouse.fams.filter(id => id !== famId);
      break;
    }
  }
  return next;
}
