import type { AiSettings } from "@/types/ai";
import type { GraphDocument } from "@/types/domain";
import type { PersonWorkspaceViewModel } from "@/app-shell/facade/types";

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
  };
}
