import { getNameSuggestions, getPlaceSuggestions, getSurnameSuggestions } from "@/core/edit/suggestions";
import type { AiSettings } from "@/types/ai";
import type { GraphDocument } from "@/types/domain";
import type { PersonEditorState } from "@/types/editor";
import type { PersonEditorViewModel } from "@/app-shell/facade/types";

export function buildPersonEditorViewModel(
  document: GraphDocument | null,
  aiSettings: AiSettings,
  editorState: PersonEditorState,
): PersonEditorViewModel {
  return {
    editorState,
    aiSettings,
    documentView: document,
    birthRefinement: document && editorState?.type === "edit"
      ? {
          documentView: document,
          personId: editorState.personId,
          aiSettings,
        }
      : null,
    getNameSuggestions: (query) => getNameSuggestions(document, query),
    getPlaceSuggestions: (query) => getPlaceSuggestions(document, query),
    getSurnameSuggestions: (anchorId, relationType) => getSurnameSuggestions(document, anchorId, relationType),
  };
}
