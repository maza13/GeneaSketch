export type PersonDetailSectionId =
  | "identity"
  | "family_links"
  | "events"
  | "sources"
  | "notes"
  | "media"
  | "audit"
  | "extensions"
  | "timeline"
  | "analysis"
  | "history";

export type PersonDetailSectionConfig = {
  id: PersonDetailSectionId;
  label: string;
  icon?: string;
  order: number;
  enabled: boolean;
  placeholderMode?: boolean;
};

const SECTION_BASE: PersonDetailSectionConfig[] = [
  { id: "identity", label: "Identidad", icon: "person", order: 1, enabled: true },
  { id: "family_links", label: "Vinculos", icon: "groups", order: 2, enabled: true },
  { id: "events", label: "Eventos", icon: "event", order: 3, enabled: true },
  { id: "sources", label: "Fuentes", icon: "menu_book", order: 4, enabled: true },
  { id: "notes", label: "Notas", icon: "description", order: 5, enabled: true },
  { id: "media", label: "Multimedia", icon: "image", order: 6, enabled: true },
  { id: "audit", label: "Historial", icon: "history", order: 7, enabled: true },
  { id: "extensions", label: "Extensiones", icon: "extension", order: 8, enabled: true },
  { id: "timeline", label: "Linea de tiempo", icon: "timeline", order: 9, enabled: true },
  { id: "analysis", label: "Analytics", icon: "analytics", order: 10, enabled: true },
  { id: "history", label: "Historia", icon: "auto_stories", order: 11, enabled: true, placeholderMode: true }
];

export const PERSON_DETAIL_SECTIONS: PersonDetailSectionConfig[] = SECTION_BASE.sort((a, b) => a.order - b.order);

