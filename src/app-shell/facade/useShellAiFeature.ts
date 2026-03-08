import type { AppShellFacade } from "./types";
import type { AiSettings } from "@/types/ai";

type Params = {
  openSettings: boolean;
  aiSettings: AiSettings;
  setAiSettings: (next: Partial<AiSettings>) => void;
  setStatus: (status: string) => void;
  closeSettings: () => void;
  assistantViewModel: AppShellFacade["features"]["ai"]["assistantModal"]["viewModel"];
  closeAssistant: () => void;
  applyAiBatch: AppShellFacade["features"]["ai"]["assistantModal"]["onApplyBatch"];
  openSettingsModal: () => void;
};

export function useShellAiFeature(params: Params): AppShellFacade["features"]["ai"] {
  return {
    settingsModal: {
      open: params.openSettings,
      settings: params.aiSettings,
      onSave: (next) => {
        params.setAiSettings(next);
        params.setStatus("Ajustes AncestrAI guardados.");
      },
      onClose: params.closeSettings,
      onStatus: params.setStatus,
    },
    assistantModal: {
      viewModel: params.assistantViewModel,
      onClose: params.closeAssistant,
      onStatus: params.setStatus,
      onApplyBatch: params.applyAiBatch,
      onOpenSettings: params.openSettingsModal,
    },
  };
}
