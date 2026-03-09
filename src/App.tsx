import { useAppShellFacade } from "@/app-shell/facade/useAppShellFacade";
import { ShellAppFrame } from "@/app-shell/components/ShellAppFrame";
import { ShellCanvasStage } from "@/app-shell/components/ShellCanvasStage";
import { ShellGlobalOverlays } from "@/app-shell/components/ShellGlobalOverlays";
import { ShellWorkspaceOverlays, ShellWorkspaceWindowHost } from "@/app-shell/components/ShellWorkspaceOverlays";

export function App() {
  const facade = useAppShellFacade();

  return (
    <div className="app-root-wrapper" style={facade.chrome.appRootStyle}>
      <ShellAppFrame
        chrome={facade.chrome}
        timeline={facade.features.timeline}
        canvasStage={<ShellCanvasStage workspace={facade.workspace} canvas={facade.features.canvas} />}
        workspaceOverlayHost={
          <ShellWorkspaceWindowHost
            personWorkspaceV3={facade.features.personWorkspaceV3}
          />
        }
      />

      <ShellWorkspaceOverlays
        workspace={facade.workspace}
        personEditor={facade.features.personEditor}
        personWorkspaceV3={facade.features.personWorkspaceV3}
      />

      <ShellGlobalOverlays
        navigation={facade.navigation}
        colorThemeMenu={facade.chrome.colorThemeMenu}
        dialogs={facade.chrome.dialogs}
        diagnostics={facade.features.diagnostics}
        personStats={facade.features.personStats}
        globalStats={facade.features.globalStats}
        ai={facade.features.ai}
        personPicker={facade.features.personPicker}
        branchExport={facade.features.branchExport}
      />
    </div>
  );
}
