import type { AiSettings } from "@/types/ai";
import type { GraphDocument } from "@/types/domain";
import type {
  PersonWorkspaceV3SectionDescriptor,
  PersonWorkspaceViewModel,
} from "@/app-shell/facade/types";

function countRelations(document: GraphDocument, personId: string) {
  return Object.values(document.families).reduce((total, family) => {
    if (family.husbandId === personId || family.wifeId === personId) {
      const spouseId = family.husbandId === personId ? family.wifeId : family.husbandId;
      return total + (spouseId ? 1 : 0) + family.childrenIds.filter((childId) => childId !== personId).length;
    }
    if (family.childrenIds.includes(personId)) {
      return total + (family.husbandId ? 1 : 0) + (family.wifeId ? 1 : 0);
    }
    return total;
  }, 0);
}

function buildV3Sections(document: GraphDocument, personId: string): PersonWorkspaceV3SectionDescriptor[] {
  const person = document.persons[personId];
  const relationCount = countRelations(document, personId);
  const sourceCount = person.sourceRefs?.length || 0;
  const noteCount = (Array.isArray(person.rawTags?.NOTE) ? person.rawTags.NOTE.length : 0) + (person.noteRefs?.length || 0);

  return [
    {
      id: "identity",
      label: "Identidad",
      icon: "person",
      status: "operativo",
      defaultExpanded: true,
      entryMode: "summary",
      workbenchPriority: 1,
      contextRole: "core",
      summary: "Identidad principal, nombres, sexo y estado vital.",
    },
    {
      id: "family_links",
      label: "Vinculos",
      icon: "groups",
      status: "operativo",
      defaultExpanded: true,
      badgeCount: relationCount,
      entryMode: "summary",
      workbenchPriority: 3,
      contextRole: "support",
      summary: relationCount > 0 ? `${relationCount} vinculos familiares inmediatos.` : "Sin vinculos inmediatos registrados.",
    },
    {
      id: "events",
      label: "Eventos",
      icon: "event",
      status: "operativo",
      defaultExpanded: true,
      badgeCount: person.events?.length || 0,
      entryMode: "summary",
      workbenchPriority: 4,
      contextRole: "support",
      summary: person.events?.length ? `${person.events.length} eventos personales proyectados.` : "Sin eventos personales registrados.",
    },
    {
      id: "sources",
      label: "Fuentes",
      icon: "menu_book",
      status: "operativo",
      defaultExpanded: false,
      badgeCount: sourceCount,
      entryMode: "summary",
      workbenchPriority: 7,
      contextRole: "analysis",
      summary: sourceCount > 0 ? `${sourceCount} citas SOUR vinculadas a la persona.` : "Sin citas SOUR directas vinculadas.",
    },
    {
      id: "notes",
      label: "Notas",
      icon: "description",
      status: "operativo",
      defaultExpanded: false,
      badgeCount: noteCount,
      entryMode: "summary",
      workbenchPriority: 6,
      contextRole: "analysis",
      summary: noteCount > 0 ? `${noteCount} notas inline o referenciadas.` : "Sin notas vinculadas en esta persona.",
    },
    {
      id: "media",
      label: "Multimedia",
      icon: "image",
      status: "operativo",
      defaultExpanded: false,
      badgeCount: person.mediaRefs?.length || 0,
      entryMode: "full",
      workbenchPriority: 5,
      contextRole: "support",
      summary: person.mediaRefs?.length ? `${person.mediaRefs.length} referencias multimedia.` : "Sin objetos multimedia directos.",
    },
    {
      id: "timeline",
      label: "Timeline",
      icon: "timeline",
      status: "operativo",
      defaultExpanded: false,
      entryMode: "full",
      workbenchPriority: 8,
      contextRole: "analysis",
      summary: "Lectura temporal personal dentro del expediente.",
    },
    {
      id: "analysis",
      label: "Analisis",
      icon: "analytics",
      status: "operativo",
      defaultExpanded: false,
      entryMode: "full",
      workbenchPriority: 10,
      contextRole: "analysis",
      summary: "Lecturas analiticas por persona sin salir del workspace.",
    },
    {
      id: "audit",
      label: "Auditoria",
      icon: "history",
      status: "operativo",
      defaultExpanded: false,
      entryMode: "full",
      workbenchPriority: 9,
      contextRole: "analysis",
      summary: "Metadatos CHAN y trazabilidad basica del registro.",
    },
    {
      id: "extensions",
      label: "Extensiones",
      icon: "extension",
      status: "operativo",
      defaultExpanded: false,
      entryMode: "full",
      workbenchPriority: 2,
      contextRole: "support",
      summary: "Campos avanzados y tags no mapeados preservados.",
    },
    {
      id: "claims",
      label: "Claims",
      icon: "fact_check",
      status: "placeholder",
      defaultExpanded: false,
      entryMode: "placeholder",
      workbenchPriority: 11,
      futureAnalysis: true,
      contextRole: "future",
      summary: "Reserva para conflictos, claim preferido y evidencia estructurada.",
    },
    {
      id: "journal",
      label: "Journal",
      icon: "receipt_long",
      status: "placeholder",
      defaultExpanded: false,
      entryMode: "placeholder",
      workbenchPriority: 12,
      futureAnalysis: true,
      contextRole: "future",
      summary: "Reserva para trazabilidad operativa y replay del motor Genraph.",
    },
  ];
}

export function buildPersonWorkspaceViewModel(
  document: GraphDocument | null,
  aiSettings: AiSettings,
  personId: string | null,
): PersonWorkspaceViewModel | null {
  if (!document || !personId) return null;
  const person = document.persons[personId];
  if (!person) return null;
  const documentView = document;

  return {
    personId,
    person,
    aiSettings,
    layoutMode: "window",
    documentView,
    sections: {
      identity: { person, documentView },
      familyLinks: { personId, documentView },
      events: { person, documentView, aiSettings },
      sources: { person, documentView },
      notes: { person, documentView },
      media: { person, documentView },
      audit: { person },
      extensions: { person, documentView },
      timeline: { personId, documentView },
      analysis: { person, documentView },
      history: { person },
    },
    v3Sections: buildV3Sections(documentView, personId),
  };
}
