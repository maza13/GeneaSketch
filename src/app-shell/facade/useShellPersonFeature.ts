import type { AppShellFacade } from "./types";
import type { PendingRelationType } from "@/types/domain";

type Params = {
  personEditorViewModel: AppShellFacade["features"]["personEditor"]["viewModel"];
  closePersonEditor: () => void;
  updatePersonById: AppShellFacade["features"]["personEditor"]["commands"]["onSaveEdit"];
  addRelationFromAnchor: AppShellFacade["features"]["personEditor"]["commands"]["onSaveRelation"];
  createStandalonePerson: AppShellFacade["features"]["personEditor"]["commands"]["onCreateStandalone"];
  personWorkspaceViewModel: AppShellFacade["features"]["personWorkspace"]["viewModel"];
  personWorkspaceViewModelV3: AppShellFacade["features"]["personWorkspaceV3"]["viewModel"];
  closeWorkspace: () => void;
  closeWorkspaceV3: () => void;
  openPersonEditor: (personId: string) => void;
  openLocalAiAssistant: (personId: string) => void;
  setSelectedPerson: (personId: string | null) => void;
  openWorkspace: (personId: string) => void;
  openWorkspaceV3: (personId: string) => void;
  focusPersonInCanvas: (personId: string) => void;
  updateFamilyById: AppShellFacade["features"]["personWorkspace"]["commands"]["onSaveFamily"];
  createPersonRecord: AppShellFacade["features"]["personWorkspace"]["commands"]["onCreatePerson"];
  openAddRelationEditor: (personId: string, type: PendingRelationType) => void;
  personPickerViewModel: AppShellFacade["features"]["personPicker"]["viewModel"];
  picker: { anchorId: string; type: PendingRelationType | "kinship" } | null;
  setOverlay: (overlay: import("@/types/domain").ActiveOverlay) => void;
  linkExistingRelation: (anchorId: string, existingPersonId: string, type: PendingRelationType) => void;
  setStatus: (status: string) => void;
  setPicker: (picker: null) => void;
  branchExportViewModel: AppShellFacade["features"]["branchExport"]["viewModel"];
  branchAnchorId: string | null;
  exportBranchGsk: (anchorId: string, direction: import("@/core/edit/generators").ExtractDirection) => Promise<void>;
  setBranchAnchorId: (id: string | null) => void;
};

export function useShellPersonFeature(params: Params): Pick<AppShellFacade["features"], "personEditor" | "personWorkspace" | "personWorkspaceV3" | "personPicker" | "branchExport"> {
  const closeAllWorkspaces = () => {
    params.closeWorkspace();
    params.closeWorkspaceV3();
  };

  return {
    personEditor: {
      viewModel: params.personEditorViewModel,
      commands: {
        onClose: params.closePersonEditor,
        onSaveEdit: params.updatePersonById,
        onSaveRelation: params.addRelationFromAnchor,
        onCreateStandalone: params.createStandalonePerson,
      },
    },
    personWorkspace: {
      open: Boolean(params.personWorkspaceViewModel),
      viewModel: params.personWorkspaceViewModel,
      commands: {
        onClose: closeAllWorkspaces,
        onSelectPerson: params.setSelectedPerson,
        onSetAsFocus: params.focusPersonInCanvas,
        onSavePerson: params.updatePersonById,
        onSaveFamily: params.updateFamilyById,
        onCreatePerson: params.createPersonRecord,
        onQuickAddRelation: (anchorId, relationType) => {
          closeAllWorkspaces();
          params.openAddRelationEditor(anchorId, relationType);
        },
      },
    },
    personWorkspaceV3: {
      open: Boolean(params.personWorkspaceViewModelV3),
      viewModel: params.personWorkspaceViewModelV3,
      commands: {
        onClose: closeAllWorkspaces,
        onSelectPerson: (personId) => {
          params.setSelectedPerson(personId);
          params.closeWorkspace();
          params.openWorkspaceV3(personId);
        },
        onSetAsFocus: params.focusPersonInCanvas,
        onSavePerson: params.updatePersonById,
        onSaveFamily: params.updateFamilyById,
        onCreatePerson: params.createPersonRecord,
        onQuickAddRelation: (anchorId, relationType) => {
          closeAllWorkspaces();
          params.openAddRelationEditor(anchorId, relationType);
        },
        onEditPerson: params.openPersonEditor,
        onOpenAiAssistant: params.openLocalAiAssistant,
      },
    },
    personPicker: {
      viewModel: params.personPickerViewModel,
      onLink: (existingPersonId) => {
        if (!params.picker) return;
        if (params.picker.type === "kinship") {
          params.setOverlay({
            id: "kinship-standard",
            type: "kinship",
            priority: 90,
            config: { person1Id: params.picker.anchorId, person2Id: existingPersonId },
          });
          params.setStatus("Calculando parentesco...");
          return;
        }
        params.linkExistingRelation(params.picker.anchorId, existingPersonId, params.picker.type);
        params.setStatus("Persona vinculada");
      },
      onClose: () => params.setPicker(null),
    },
    branchExport: {
      viewModel: params.branchExportViewModel,
      onExport: (direction) => {
        if (!params.branchAnchorId) return;
        void params.exportBranchGsk(params.branchAnchorId, direction);
        params.setBranchAnchorId(null);
      },
      onClose: () => params.setBranchAnchorId(null),
    },
  };
}
