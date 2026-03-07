import type { AiInputContext, AiSettings } from "@/types/ai";
import type { GraphDocument } from "@/types/domain";
import type { AiAssistantViewModel } from "@/app-shell/facade/types";

export function buildAiAssistantViewModel(
  open: boolean,
  context: AiInputContext | null,
  documentView: GraphDocument | null,
  settings: AiSettings,
): AiAssistantViewModel {
  return {
    open,
    context,
    documentView,
    settings,
  };
}
