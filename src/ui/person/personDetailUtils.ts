import type { Event, Family, Person } from "@/types/domain";
import type { FamilyUnionStatus } from "@/core/edit/commands";

export function getPersonLabel(person: Person): string {
  return `${person.name}${person.surname ? ` ${person.surname}` : ""}`.trim();
}

export function splitSurnames(surname: string | undefined): { paternal: string; maternal: string } {
  const parts = (surname || "").split(" ").filter(Boolean);
  return { paternal: parts[0] || "", maternal: parts.slice(1).join(" ") || "" };
}

export function deriveFamilyStatus(family: Family): FamilyUnionStatus {
  const hasDivorce = family.events.some((event) => event.type === "DIV");
  if (hasDivorce) return "divorced";
  const hasMarriage = family.events.some((event) => event.type === "MARR");
  return hasMarriage ? "married" : "partner";
}

export type EventFieldKey =
  | "date"
  | "place"
  | "addr"
  | "subType"
  | "notesInline"
  | "noteRefs"
  | "sourceRefs"
  | "mediaRefs"
  | "quality";

export type EventFieldMeta = {
  key: EventFieldKey;
  labelHuman: string;
  gedcomTag: string;
  description: string;
  appliesTo: Array<Event["type"] | "all">;
};

export type DateAssistMode = "free" | "exact" | "approx" | "before" | "after" | "range";

export type DateApproxPrefix = "ABT" | "EST" | "CAL";

export type DateAssistState = {
  mode: DateAssistMode;
  freeText: string;
  approxPrefix: DateApproxPrefix;
  exactDay: string;
  exactMonth: string;
  exactYear: string;
  rangeStartDay: string;
  rangeStartMonth: string;
  rangeStartYear: string;
  rangeEndDay: string;
  rangeEndMonth: string;
  rangeEndYear: string;
};

export type EventTypeMeta = {
  type: Event["type"];
  labelHuman: string;
  icon?: string;
  shortDescription: string;
  defaultBaseFields: EventFieldKey[];
  recommendedAdvancedFields: EventFieldKey[];
};

export const EVENT_TYPE_META: Record<Event["type"], EventTypeMeta> = {
  BIRT: {
    type: "BIRT",
    labelHuman: "Nacimiento",
    icon: "cake",
    shortDescription: "Registra nacimiento de la persona.",
    defaultBaseFields: ["date", "place"],
    recommendedAdvancedFields: ["addr", "sourceRefs", "noteRefs", "mediaRefs", "notesInline", "quality"]
  },
  DEAT: {
    type: "DEAT",
    labelHuman: "Defunción",
    icon: "skull",
    shortDescription: "Registra fecha/lugar de fallecimiento.",
    defaultBaseFields: ["date", "place"],
    recommendedAdvancedFields: ["addr", "sourceRefs", "noteRefs", "mediaRefs", "notesInline", "quality"]
  },
  MARR: {
    type: "MARR",
    labelHuman: "Matrimonio",
    icon: "favorite",
    shortDescription: "Evento de unión matrimonial.",
    defaultBaseFields: ["date", "place"],
    recommendedAdvancedFields: ["addr", "sourceRefs", "noteRefs", "mediaRefs", "notesInline", "quality"]
  },
  DIV: {
    type: "DIV",
    labelHuman: "Divorcio",
    icon: "heart_broken",
    shortDescription: "Evento de disolución matrimonial.",
    defaultBaseFields: ["date", "place"],
    recommendedAdvancedFields: ["addr", "sourceRefs", "noteRefs", "mediaRefs", "notesInline", "quality"]
  },
  CHR: {
    type: "CHR",
    labelHuman: "Cristianamiento",
    icon: "water_drop",
    shortDescription: "Registro de cristianamiento.",
    defaultBaseFields: ["date", "place"],
    recommendedAdvancedFields: ["addr", "sourceRefs", "noteRefs", "mediaRefs", "notesInline", "quality"]
  },
  BAPM: {
    type: "BAPM",
    labelHuman: "Bautismo",
    icon: "waves",
    shortDescription: "Registro de bautismo.",
    defaultBaseFields: ["date", "place"],
    recommendedAdvancedFields: ["addr", "sourceRefs", "noteRefs", "mediaRefs", "notesInline", "quality"]
  },
  BURI: {
    type: "BURI",
    labelHuman: "Sepultura",
    icon: "coffin",
    shortDescription: "Registro de enterramiento o sepultura.",
    defaultBaseFields: ["date", "place"],
    recommendedAdvancedFields: ["addr", "sourceRefs", "noteRefs", "mediaRefs", "notesInline", "quality"]
  },
  CENS: {
    type: "CENS",
    labelHuman: "Censo",
    icon: "groups",
    shortDescription: "Participación en censo o padrón.",
    defaultBaseFields: ["date", "place"],
    recommendedAdvancedFields: ["addr", "sourceRefs", "noteRefs", "mediaRefs", "notesInline", "quality"]
  },
  RESI: {
    type: "RESI",
    labelHuman: "Residencia",
    icon: "home",
    shortDescription: "Lugar de residencia en un periodo.",
    defaultBaseFields: ["place", "addr"],
    recommendedAdvancedFields: ["date", "sourceRefs", "noteRefs", "mediaRefs", "notesInline", "quality"]
  },
  NOTE: {
    type: "NOTE",
    labelHuman: "Nota de evento",
    icon: "description",
    shortDescription: "Evento libre de anotación contextual.",
    defaultBaseFields: ["notesInline"],
    recommendedAdvancedFields: ["date", "place", "noteRefs", "sourceRefs", "mediaRefs", "quality"]
  },
  OTHER: {
    type: "OTHER",
    labelHuman: "Evento genérico",
    icon: "event",
    shortDescription: "Evento personalizado con subtipo TYPE.",
    defaultBaseFields: ["date", "place"],
    recommendedAdvancedFields: ["subType", "addr", "sourceRefs", "noteRefs", "mediaRefs", "notesInline", "quality"]
  }
};

export const EVENT_FIELD_META: Record<EventFieldKey, EventFieldMeta> = {
  date: {
    key: "date",
    labelHuman: "Fecha",
    gedcomTag: "DATE",
    description: "Fecha del evento. Acepta texto GEDCOM libre (BET/ABT/etc).",
    appliesTo: ["all"]
  },
  place: {
    key: "place",
    labelHuman: "Lugar",
    gedcomTag: "PLAC",
    description: "Lugar asociado al evento.",
    appliesTo: ["all"]
  },
  addr: {
    key: "addr",
    labelHuman: "Dirección",
    gedcomTag: "ADDR",
    description: "Dirección postal o detalle de ubicación.",
    appliesTo: ["all"]
  },
  subType: {
    key: "subType",
    labelHuman: "Subtipo del evento",
    gedcomTag: "TYPE",
    description: "Clasificación adicional para eventos genéricos.",
    appliesTo: ["OTHER"]
  },
  notesInline: {
    key: "notesInline",
    labelHuman: "Notas inline",
    gedcomTag: "NOTE",
    description: "Notas escritas directamente en el evento.",
    appliesTo: ["all"]
  },
  noteRefs: {
    key: "noteRefs",
    labelHuman: "Referencias de nota",
    gedcomTag: "NOTE",
    description: "Referencias a registros de notas globales (@N...).",
    appliesTo: ["all"]
  },
  sourceRefs: {
    key: "sourceRefs",
    labelHuman: "Referencias de fuente",
    gedcomTag: "SOUR",
    description: "Citas de fuente ligadas al evento (@S...).",
    appliesTo: ["all"]
  },
  mediaRefs: {
    key: "mediaRefs",
    labelHuman: "Referencias multimedia",
    gedcomTag: "OBJE",
    description: "Objetos multimedia vinculados al evento (@M...).",
    appliesTo: ["all"]
  },
  quality: {
    key: "quality",
    labelHuman: "Calidad de evidencia",
    gedcomTag: "QUAY",
    description: "Nivel de confianza de la cita/evento (0-3).",
    appliesTo: ["all"]
  }
};

function hasEventFieldValue(event: Event, field: EventFieldKey): boolean {
  if (field === "date") return Boolean(event.date?.trim());
  if (field === "place") return Boolean(event.place?.trim());
  if (field === "addr") return Boolean(event.addr?.trim());
  if (field === "subType") return Boolean(event.subType?.trim());
  if (field === "quality") return Boolean(event.quality);
  if (field === "notesInline") return (event.notesInline || []).length > 0;
  if (field === "noteRefs") return (event.noteRefs || []).length > 0;
  if (field === "sourceRefs") return (event.sourceRefs || []).length > 0;
  if (field === "mediaRefs") return (event.mediaRefs || []).length > 0;
  return false;
}

export function getEventTypeMeta(type: Event["type"]): EventTypeMeta {
  return EVENT_TYPE_META[type] || EVENT_TYPE_META.OTHER;
}

export function getDefaultVisibleEventFields(type: Event["type"]): EventFieldKey[] {
  return [...getEventTypeMeta(type).defaultBaseFields];
}

export function isBaseEventField(type: Event["type"], field: EventFieldKey): boolean {
  return getEventTypeMeta(type).defaultBaseFields.includes(field);
}

export function getInitialVisibleEventFields(event: Event): EventFieldKey[] {
  const base = getDefaultVisibleEventFields(event.type);
  const combined = new Set<EventFieldKey>(base);
  (Object.keys(EVENT_FIELD_META) as EventFieldKey[]).forEach((fieldKey) => {
    if (hasEventFieldValue(event, fieldKey)) combined.add(fieldKey);
  });
  if (event.type === "OTHER") combined.add("subType");
  return Array.from(combined);
}

export function getAddableEventFields(event: Event, visible: EventFieldKey[]): EventFieldKey[] {
  const visibleSet = new Set(visible);
  return getEventTypeMeta(event.type).recommendedAdvancedFields.filter((field) => !visibleSet.has(field));
}

export function clearEventFieldValue(event: Event, field: EventFieldKey): Event {
  const next = { ...event };
  if (field === "date") delete next.date;
  if (field === "place") delete next.place;
  if (field === "addr") delete next.addr;
  if (field === "subType") delete next.subType;
  if (field === "quality") delete next.quality;
  if (field === "notesInline") next.notesInline = [];
  if (field === "noteRefs") next.noteRefs = [];
  if (field === "sourceRefs") next.sourceRefs = [];
  if (field === "mediaRefs") next.mediaRefs = [];
  return next;
}

export function isEventEffectivelyEmpty(event: Event): boolean {
  const keys: EventFieldKey[] = ["date", "place", "addr", "subType", "quality", "notesInline", "noteRefs", "sourceRefs", "mediaRefs"];
  return !keys.some((field) => hasEventFieldValue(event, field));
}

const GED_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

function normalizeMonth(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && asNumber >= 1 && asNumber <= 12) {
    return GED_MONTHS[asNumber - 1];
  }
  const upper = trimmed.toUpperCase();
  return GED_MONTHS.includes(upper as (typeof GED_MONTHS)[number]) ? upper : "";
}

function normalizeDay(value: string): string {
  const num = Number(value.trim());
  if (Number.isNaN(num) || num < 1 || num > 31) return "";
  return String(Math.floor(num));
}

function normalizeYear(value: string): string {
  const v = value.trim();
  return /^\d{3,4}$/.test(v) ? v : "";
}

function toDateToken(day: string, month: string, year: string): string {
  const d = normalizeDay(day);
  const m = normalizeMonth(month);
  const y = normalizeYear(year);
  if (d && m && y) return `${d} ${m} ${y}`;
  if (m && y) return `${m} ${y}`;
  if (y) return y;
  return "";
}

function parseSingleDateToken(value: string): { day: string; month: string; year: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return {
      day: normalizeDay(d),
      month: normalizeMonth(m),
      year: normalizeYear(y)
    };
  }
  if (parts.length === 2) {
    const [m, y] = parts;
    return {
      day: "",
      month: normalizeMonth(m),
      year: normalizeYear(y)
    };
  }
  if (parts.length === 1) {
    return { day: "", month: "", year: normalizeYear(parts[0]) };
  }
  return { day: "", month: "", year: "" };
}

export function createDefaultDateAssistState(initial = ""): DateAssistState {
  return {
    mode: "free",
    freeText: initial,
    approxPrefix: "ABT",
    exactDay: "",
    exactMonth: "",
    exactYear: "",
    rangeStartDay: "",
    rangeStartMonth: "",
    rangeStartYear: "",
    rangeEndDay: "",
    rangeEndMonth: "",
    rangeEndYear: ""
  };
}

export function parseGedcomDateToAssistState(raw: string | undefined): DateAssistState {
  const source = (raw || "").trim();
  const base = createDefaultDateAssistState(source);
  if (!source) return base;

  const range = source.match(/^BET\s+(.+?)\s+AND\s+(.+)$/i);
  if (range) {
    const start = parseSingleDateToken(range[1]);
    const end = parseSingleDateToken(range[2]);
    return {
      ...base,
      mode: "range",
      rangeStartDay: start.day,
      rangeStartMonth: start.month,
      rangeStartYear: start.year,
      rangeEndDay: end.day,
      rangeEndMonth: end.month,
      rangeEndYear: end.year
    };
  }

  const approx = source.match(/^(ABT|EST|CAL)\s+(.+)$/i);
  if (approx) {
    const token = parseSingleDateToken(approx[2]);
    return {
      ...base,
      mode: "approx",
      approxPrefix: approx[1].toUpperCase() as DateApproxPrefix,
      exactDay: token.day,
      exactMonth: token.month,
      exactYear: token.year
    };
  }

  const before = source.match(/^BEF\s+(.+)$/i);
  if (before) {
    const token = parseSingleDateToken(before[1]);
    return {
      ...base,
      mode: "before",
      exactDay: token.day,
      exactMonth: token.month,
      exactYear: token.year
    };
  }

  const after = source.match(/^AFT\s+(.+)$/i);
  if (after) {
    const token = parseSingleDateToken(after[1]);
    return {
      ...base,
      mode: "after",
      exactDay: token.day,
      exactMonth: token.month,
      exactYear: token.year
    };
  }

  const exact = parseSingleDateToken(source);
  return {
    ...base,
    mode: "exact",
    exactDay: exact.day,
    exactMonth: exact.month,
    exactYear: exact.year
  };
}

export function buildGedcomDateFromAssistState(state: DateAssistState): string {
  if (state.mode === "free") return state.freeText.trim();

  const exactToken = toDateToken(state.exactDay, state.exactMonth, state.exactYear);
  if (state.mode === "exact") return exactToken;
  if (state.mode === "approx") return exactToken ? `${state.approxPrefix} ${exactToken}` : "";
  if (state.mode === "before") return exactToken ? `BEF ${exactToken}` : "";
  if (state.mode === "after") return exactToken ? `AFT ${exactToken}` : "";
  if (state.mode === "range") {
    const start = toDateToken(state.rangeStartDay, state.rangeStartMonth, state.rangeStartYear);
    const end = toDateToken(state.rangeEndDay, state.rangeEndMonth, state.rangeEndYear);
    if (!start || !end) return "";
    return `BET ${start} AND ${end}`;
  }
  return state.freeText.trim();
}

export function formatDatePreviewHuman(value: string): string {
  const parsed = parseGedcomDateToAssistState(value);
  if (parsed.mode === "free") return value || "Sin fecha";
  if (parsed.mode === "exact") return buildGedcomDateFromAssistState(parsed) || "Sin fecha";
  if (parsed.mode === "approx") return `Estimada: ${buildGedcomDateFromAssistState(parsed)}`;
  if (parsed.mode === "before") return `Antes de: ${buildGedcomDateFromAssistState(parsed).replace(/^BEF\s+/i, "")}`;
  if (parsed.mode === "after") return `Después de: ${buildGedcomDateFromAssistState(parsed).replace(/^AFT\s+/i, "")}`;
  if (parsed.mode === "range") return `Rango: ${buildGedcomDateFromAssistState(parsed)}`;
  return value || "Sin fecha";
}
