import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "@/ui/shell/AppShell";
import { useShellChromeState } from "@/hooks/app-shell-controller/useShellChromeState";

describe("shell foundation", () => {
  const localStorageMock = {
    getItem: vi.fn<(key: string) => string | null>(),
    setItem: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageMock);
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults menu layout to role when no saved preference exists", () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    let currentLayout: string | null = null;

    function Harness() {
      currentLayout = useShellChromeState().menuLayout;
      return null;
    }

    renderToStaticMarkup(<Harness />);
    expect(currentLayout).toBe("role");
  });

  it("renders titlebar, toolbar, main shell region and status bar as separate bands", () => {
    const html = renderToStaticMarkup(
      <AppShell
        topbar={<div data-host="titlebar">titlebar</div>}
        toolbar={<div data-host="toolbar">toolbar</div>}
        footer={<div className="status-bar" data-host="status-bar">status</div>}
        leftPanel={<div data-host="left">left</div>}
        rightPanel={<div data-host="right">right</div>}
        canvas={<div data-host="canvas">canvas</div>}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeft={() => {}}
        onToggleRight={() => {}}
        detailsMode="expanded"
      />,
    );

    expect(html).toContain("data-host=\"titlebar\"");
    expect(html).toContain("shell-toolbar");
    expect(html).toContain("data-host=\"toolbar\"");
    expect(html).toContain("data-host=\"status-bar\"");
    expect(html).toContain("class=\"layout");
  });
});
