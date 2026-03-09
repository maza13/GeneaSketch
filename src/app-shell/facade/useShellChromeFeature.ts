import type { CSSProperties } from "react";
import { DEFAULT_COLOR_THEME } from "@/hooks/useAppShellController";
import type { AppShellFacade } from "./types";
import type { ViewConfig } from "@/types/domain";
import type { ColorThemeConfig } from "@/types/editor";
import type { LeftPanelViewModel, SelectedPersonPanelViewModel } from "./types";
import type { GraphDocument } from "@/core/read-model/types";

type Params = {
  colorTheme: ColorThemeConfig;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  viewConfig: ViewConfig | null;
  menus: AppShellFacade["chrome"]["topbar"]["menus"];
  menuActions: AppShellFacade["chrome"]["toolbar"]["actions"];
  menuLayout: AppShellFacade["chrome"]["topbar"]["menuLayout"];
  setMenuLayout: AppShellFacade["chrome"]["topbar"]["onChangeLayout"];
  status: string;
  document: GraphDocument | null;
  leftPanelViewModel: LeftPanelViewModel;
  toggleLeftSection: AppShellFacade["chrome"]["leftPanel"]["commands"]["onToggleSection"];
  setLeftSectionState: AppShellFacade["chrome"]["leftPanel"]["commands"]["onSetSections"];
  setKindraOrientation: AppShellFacade["chrome"]["leftPanel"]["commands"]["onKindraOrientation"];
  setPreset: AppShellFacade["chrome"]["leftPanel"]["commands"]["onPreset"];
  setDepth: AppShellFacade["chrome"]["leftPanel"]["commands"]["onDepth"];
  setInclude: AppShellFacade["chrome"]["leftPanel"]["commands"]["onInclude"];
  setGridEnabled: AppShellFacade["chrome"]["leftPanel"]["commands"]["onGridEnabled"];
  clearNodePositions: AppShellFacade["chrome"]["leftPanel"]["commands"]["onClearPositions"];
  selectedPersonPanelViewModel: SelectedPersonPanelViewModel;
  inspectPerson: (personId: string) => void;
  toggleRightStackSection: () => void;
  openPersonEditor: AppShellFacade["chrome"]["rightPanel"]["commands"]["onEditPerson"];
  openPersonDetail: AppShellFacade["chrome"]["rightPanel"]["commands"]["onViewPersonDetail"];
  openAddRelationEditor: AppShellFacade["chrome"]["rightPanel"]["commands"]["onAddRelation"];
  setPicker: (picker: { anchorId: string; type: import("@/types/domain").PendingRelationType } | null) => void;
  unlinkRelation: AppShellFacade["chrome"]["rightPanel"]["commands"]["onUnlinkRelation"];
  setStatus: (status: string) => void;
  showColorThemeMenu: boolean;
  setColorTheme: (theme: ColorThemeConfig) => void;
  setShowColorThemeMenu: (show: boolean) => void;
  showAboutModalV3: boolean;
  setShowAboutModalV3: (show: boolean) => void;
  showWikiPanel: boolean;
  setShowWikiPanel: (show: boolean) => void;
  showFamilySearchPanel: boolean;
  setShowFamilySearchPanel: (show: boolean) => void;
  toggleShellPanel: (side: "left" | "right") => void;
};

export function useShellChromeFeature(params: Params): AppShellFacade["chrome"] {
  return {
    appRootStyle: {
      "--canvas-bg-custom": params.colorTheme.background,
      "--node-fill-custom": params.colorTheme.personNode,
      "--node-text-custom": params.colorTheme.text,
      "--edge-color-custom": params.colorTheme.edges,
    } as CSSProperties,
    leftCollapsed: params.leftCollapsed,
    rightCollapsed: params.rightCollapsed,
    detailsMode: params.viewConfig?.rightStack?.detailsMode ?? "expanded",
    topbar: {
      menus: params.menus,
      menuLayout: params.menuLayout,
      onChangeLayout: params.setMenuLayout,
    },
    toolbar: {
      actions: params.menuActions,
    },
    footer: {
      statusMessage: params.status,
      personCount: params.document ? Object.keys(params.document.persons).length : null,
      familyCount: params.document ? Object.keys(params.document.families).length : null,
      sourceCount: params.document ? Object.keys(params.document.sources ?? {}).length : null,
      engineMode: params.viewConfig ? "Kindra" : null,
      isSaved: false,
      appVersion: "0.4.5",
    },
    leftPanel: {
      viewModel: params.leftPanelViewModel,
      commands: {
        onToggleSection: params.toggleLeftSection,
        onSetSections: params.setLeftSectionState,
        onKindraOrientation: params.setKindraOrientation,
        onPreset: params.setPreset,
        onDepth: params.setDepth,
        onInclude: params.setInclude,
        onGridEnabled: params.setGridEnabled,
        onClearPositions: params.clearNodePositions,
      },
    },
    rightPanel: {
      viewModel: params.selectedPersonPanelViewModel,
      commands: {
        onToggleDetailsExpanded: params.toggleRightStackSection,
        onInspectPerson: params.inspectPerson,
        onEditPerson: params.openPersonEditor,
        onViewPersonDetail: params.openPersonDetail,
        onAddRelation: params.openAddRelationEditor,
        onLinkExistingRelation: (anchorId, type) => params.setPicker({ anchorId, type }),
        onUnlinkRelation: (personId, relatedId, type) => {
          params.unlinkRelation(personId, relatedId, type);
          params.setStatus(`Relacion desvinculada: ${type}`);
        },
      },
    },
    colorThemeMenu: {
      open: params.showColorThemeMenu,
      value: params.colorTheme,
      onChange: params.setColorTheme,
      onReset: () => params.setColorTheme(DEFAULT_COLOR_THEME),
      onClose: () => params.setShowColorThemeMenu(false),
    },
    dialogs: {
      about: { open: params.showAboutModalV3, onClose: () => params.setShowAboutModalV3(false) },
      wiki: { open: params.showWikiPanel, onClose: () => params.setShowWikiPanel(false) },
      familySearch: {
        open: params.showFamilySearchPanel,
        onClose: () => params.setShowFamilySearchPanel(false),
        onImport: () => params.setShowFamilySearchPanel(false),
      },
    },
    shellCommands: {
      onToggleLeft: () => params.toggleShellPanel("left"),
      onToggleRight: () => params.toggleShellPanel("right"),
    },
  };
}
