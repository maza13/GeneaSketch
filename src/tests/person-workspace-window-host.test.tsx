import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "@/ui/shell/AppShell";

describe("person workspace window host", () => {
  it("mounts the workspace overlay host inside the canvas region", () => {
    const html = renderToStaticMarkup(
      <AppShell
        topbar={<div>title</div>}
        toolbar={<div>toolbar</div>}
        footer={<div>status</div>}
        leftPanel={<div>left</div>}
        rightPanel={<div>right</div>}
        canvas={<div data-host="canvas">canvas</div>}
        workspaceOverlayHost={<div data-host="workspace-window">workspace-window</div>}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeft={() => {}}
        onToggleRight={() => {}}
        detailsMode="expanded"
      />,
    );

    expect(html).toContain("shell-workspace-overlay-host");
    expect(html).toContain("data-host=\"workspace-window\"");
  });
});
