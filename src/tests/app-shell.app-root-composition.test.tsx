import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const fakeFacade = {
  chrome: { appRootStyle: { "--canvas-bg-custom": "transparent" } },
  workspace: {},
  navigation: {},
  features: {
    timeline: {},
    canvas: {},
    personEditor: {},
    personWorkspace: {},
    personWorkspaceV3: {},
    diagnostics: {},
    personStats: {},
    globalStats: {},
    ai: {},
    personPicker: {},
    branchExport: {},
  },
};

vi.mock("@/app-shell/facade/useAppShellFacade", () => ({
  useAppShellFacade: () => fakeFacade,
}));

vi.mock("@/app-shell/components/ShellCanvasStage", () => ({
  ShellCanvasStage: () => <div data-host="canvas-stage">canvas-stage</div>,
}));

vi.mock("@/app-shell/components/ShellAppFrame", () => ({
  ShellAppFrame: ({ canvasStage, workspaceOverlayHost }: { canvasStage: ReactNode; workspaceOverlayHost?: ReactNode }) => (
    <div data-host="app-frame">
      app-frame
      {canvasStage}
      {workspaceOverlayHost}
    </div>
  ),
}));

vi.mock("@/app-shell/components/ShellWorkspaceOverlays", () => ({
  ShellWorkspaceWindowHost: () => <div data-host="workspace-window-host">workspace-window-host</div>,
  ShellWorkspaceOverlays: () => <div data-host="workspace-overlays">workspace-overlays</div>,
}));

vi.mock("@/app-shell/components/ShellGlobalOverlays", () => ({
  ShellGlobalOverlays: () => <div data-host="global-overlays">global-overlays</div>,
}));

describe("App root composition", () => {
  it("mounts composition hosts around the facade root wrapper", async () => {
    const { App } = await import("@/App");
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("app-root-wrapper");
    expect(html).toContain("app-frame");
    expect(html).toContain("canvas-stage");
    expect(html).toContain("workspace-window-host");
    expect(html).toContain("workspace-overlays");
    expect(html).toContain("global-overlays");
  });
});
