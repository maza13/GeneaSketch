import type { Event, GeneaDocument, Person } from "@/types/domain";
import type { DiagnosticFixAction, DiagnosticFixExecutionResult } from "./types";

function cloneDoc(doc: GeneaDocument): GeneaDocument {
  return {
    persons: structuredClone(doc.persons),
    families: structuredClone(doc.families),
    media: structuredClone(doc.media),
    metadata: { ...doc.metadata }
  };
}

function ensureInArray(arr: string[], value: string): boolean {
  if (arr.includes(value)) return false;
  arr.push(value);
  return true;
}

function removeFromArray(arr: string[], value: string): boolean {
  const before = arr.length;
  const next = arr.filter((entry) => entry !== value);
  if (next.length === before) return false;
  arr.splice(0, arr.length, ...next);
  return true;
}

function dedupeInPlace(arr: string[]): boolean {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of arr) {
    if (seen.has(value)) continue;
    seen.add(value);
    next.push(value);
  }
  if (next.length === arr.length) return false;
  arr.splice(0, arr.length, ...next);
  return true;
}

function parseYear(date?: string): number | undefined {
  if (!date) return undefined;
  const match = date.match(/\b(\d{4})\b/);
  if (!match) return undefined;
  return Number.parseInt(match[1], 10);
}

function trimEvents(person: Person, type: "BIRT" | "DEAT", keep: "earliest" | "latest" | "first"): boolean {
  const events = person.events.filter((ev) => ev.type === type);
  if (events.length <= 1) return false;

  let keepEvent: Event | undefined;
  if (keep === "first") {
    keepEvent = events[0];
  } else {
    const decorated = events.map((event, idx) => ({ event, idx, year: parseYear(event.date) }));
    const withYear = decorated.filter((entry) => entry.year !== undefined) as Array<{ event: Event; idx: number; year: number }>;
    if (withYear.length > 0) {
      withYear.sort((a, b) => (keep === "earliest" ? a.year - b.year : b.year - a.year) || a.idx - b.idx);
      keepEvent = withYear[0].event;
    } else {
      keepEvent = events[0];
    }
  }

  if (!keepEvent) return false;
  let kept = false;
  const nextEvents: Event[] = [];
  for (const event of person.events) {
    if (event.type !== type) {
      nextEvents.push(event);
      continue;
    }
    if (!kept && event === keepEvent) {
      nextEvents.push(event);
      kept = true;
    }
  }
  person.events = nextEvents;
  return true;
}

export function applyDiagnosticFixes(
  doc: GeneaDocument,
  actions: DiagnosticFixAction[]
): { nextDoc: GeneaDocument; result: DiagnosticFixExecutionResult } {
  const nextDoc = cloneDoc(doc);
  const errors: string[] = [];
  const touchedPersons = new Set<string>();
  const touchedFamilies = new Set<string>();
  let applied = 0;
  let skipped = 0;

  for (const action of actions) {
    try {
      let changed = false;
      

      switch (action.kind) {
        case "dedupe_person_family_refs": {
          const person = nextDoc.persons[action.personId];
          if (!person) {
            
            break;
          }
          changed = dedupeInPlace(person[action.role]);
          if (changed) touchedPersons.add(action.personId);
          break;
        }
        case "dedupe_family_children": {
          const family = nextDoc.families[action.familyId];
          if (!family) {
            
            break;
          }
          changed = dedupeInPlace(family.childrenIds);
          if (changed) touchedFamilies.add(action.familyId);
          break;
        }
        case "add_person_to_family_children": {
          const person = nextDoc.persons[action.personId];
          const family = nextDoc.families[action.familyId];
          if (!person || !family) {
            
            break;
          }
          const childAdded = ensureInArray(family.childrenIds, action.personId);
          const famcAdded = ensureInArray(person.famc, action.familyId);
          changed = childAdded || famcAdded;
          if (changed) {
            touchedPersons.add(action.personId);
            touchedFamilies.add(action.familyId);
          }
          break;
        }
        case "add_family_to_person_role": {
          const person = nextDoc.persons[action.personId];
          const family = nextDoc.families[action.familyId];
          if (!person || !family) {
            
            break;
          }
          const roleAdded = ensureInArray(person[action.role], action.familyId);
          let mirrorChanged = false;
          if (action.role === "famc") {
            mirrorChanged = ensureInArray(family.childrenIds, action.personId);
          }
          changed = roleAdded || mirrorChanged;
          if (changed) {
            touchedPersons.add(action.personId);
            touchedFamilies.add(action.familyId);
          }
          break;
        }
        case "remove_family_from_person_role": {
          const person = nextDoc.persons[action.personId];
          const family = nextDoc.families[action.familyId];
          if (!person) {
            
            break;
          }
          const removed = removeFromArray(person[action.role], action.familyId);
          let mirrorChanged = false;
          if (family) {
            if (action.role === "famc") {
              mirrorChanged = removeFromArray(family.childrenIds, action.personId);
            } else {
              if (family.husbandId === action.personId) {
                family.husbandId = undefined;
                mirrorChanged = true;
              }
              if (family.wifeId === action.personId) {
                family.wifeId = undefined;
                mirrorChanged = true;
              }
            }
          }
          changed = removed || mirrorChanged;
          if (changed) {
            touchedPersons.add(action.personId);
            touchedFamilies.add(action.familyId);
          }
          break;
        }
        case "remove_child_from_family": {
          const family = nextDoc.families[action.familyId];
          const child = nextDoc.persons[action.childId];
          if (!family) {
            
            break;
          }
          const childRemoved = removeFromArray(family.childrenIds, action.childId);
          let famcRemoved = false;
          if (child) famcRemoved = removeFromArray(child.famc, action.familyId);
          changed = childRemoved || famcRemoved;
          if (changed) {
            touchedFamilies.add(action.familyId);
            touchedPersons.add(action.childId);
          }
          break;
        }
        case "assign_family_spouse_role": {
          const family = nextDoc.families[action.familyId];
          const person = nextDoc.persons[action.personId];
          if (!family || !person) {
            
            break;
          }
          if (action.role === "husband") {
            if (family.husbandId !== action.personId) {
              if (family.husbandId && nextDoc.persons[family.husbandId]) {
                removeFromArray(nextDoc.persons[family.husbandId].fams, action.familyId);
                touchedPersons.add(family.husbandId);
              }
              family.husbandId = action.personId;
              changed = true;
            }
          } else {
            if (family.wifeId !== action.personId) {
              if (family.wifeId && nextDoc.persons[family.wifeId]) {
                removeFromArray(nextDoc.persons[family.wifeId].fams, action.familyId);
                touchedPersons.add(family.wifeId);
              }
              family.wifeId = action.personId;
              changed = true;
            }
          }
          if (ensureInArray(person.fams, action.familyId)) changed = true;
          if (changed) {
            touchedFamilies.add(action.familyId);
            touchedPersons.add(action.personId);
          }
          break;
        }
        case "clear_family_spouse_role": {
          const family = nextDoc.families[action.familyId];
          if (!family) {
            
            break;
          }
          const personId = action.role === "husband" ? family.husbandId : family.wifeId;
          if (!personId) {
            
            break;
          }
          if (action.role === "husband") family.husbandId = undefined;
          else family.wifeId = undefined;
          if (nextDoc.persons[personId]) {
            removeFromArray(nextDoc.persons[personId].fams, action.familyId);
            touchedPersons.add(personId);
          }
          touchedFamilies.add(action.familyId);
          changed = true;
          break;
        }
        case "create_placeholder_person": {
          if (nextDoc.persons[action.personId]) {
            
            break;
          }
          nextDoc.persons[action.personId] = {
            id: action.personId,
            name: `(Placeholder ${action.personId})`,
            sex: action.sex,
            lifeStatus: "alive",
            isPlaceholder: true,
            events: [],
            famc: [],
            fams: [],
            mediaRefs: [],
            sourceRefs: []
          };
          touchedPersons.add(action.personId);
          changed = true;
          break;
        }
        case "create_placeholder_family": {
          if (nextDoc.families[action.familyId]) {
            
            break;
          }
          nextDoc.families[action.familyId] = {
            id: action.familyId,
            childrenIds: [],
            events: []
          };
          touchedFamilies.add(action.familyId);
          changed = true;
          break;
        }
        case "mark_person_deceased": {
          const person = nextDoc.persons[action.personId];
          if (!person) {
            
            break;
          }
          let local = false;
          if (person.lifeStatus !== "deceased") {
            person.lifeStatus = "deceased";
            local = true;
          }
          const hasDeath = person.events.some((event) => event.type === "DEAT");
          if (!hasDeath) {
            person.events.push({ type: "DEAT" });
            local = true;
          }
          changed = local;
          if (changed) touchedPersons.add(action.personId);
          break;
        }
        case "trim_person_birth_events": {
          const person = nextDoc.persons[action.personId];
          if (!person) {
            
            break;
          }
          changed = trimEvents(person, "BIRT", action.keep);
          if (changed) touchedPersons.add(action.personId);
          break;
        }
        case "trim_person_death_events": {
          const person = nextDoc.persons[action.personId];
          if (!person) {
            
            break;
          }
          changed = trimEvents(person, "DEAT", action.keep);
          if (changed) touchedPersons.add(action.personId);
          break;
        }
        default: {
          
          break;
        }
      }

      if (changed) applied += 1;
      else skipped += 1;
    } catch (error) {
      skipped += 1;
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const result: DiagnosticFixExecutionResult = {
    applied,
    skipped,
    errors,
    touchedPersons: Array.from(touchedPersons),
    touchedFamilies: Array.from(touchedFamilies)
  };

  return { nextDoc, result };
}
