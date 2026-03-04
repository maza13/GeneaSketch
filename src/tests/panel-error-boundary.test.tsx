import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PanelErrorBoundary } from "@/ui/common/PanelErrorBoundary";

describe("PanelErrorBoundary", () => {
  it("derives error state from thrown error", () => {
    const state = PanelErrorBoundary.getDerivedStateFromError(new Error("boom"));
    expect(state.hasError).toBe(true);
    expect(state.message).toBe("boom");
  });

  it("renders fallback UI when state has error", () => {
    const boundary = new PanelErrorBoundary({
      panelName: "Panel de prueba",
      children: <div>ok</div>,
    });
    boundary.state = { hasError: true, message: "boom" };
    const html = renderToStaticMarkup(boundary.render() as JSX.Element);
    expect(html).toContain("Algo salió mal en este panel");
    expect(html).toContain("Panel de prueba");
    expect(html).toContain("Reintentar panel");
  });

  it("resetBoundary clears state and invokes onReset callback", () => {
    const onReset = vi.fn();
    const boundary = new PanelErrorBoundary({
      panelName: "Panel de prueba",
      children: <div>ok</div>,
      onReset,
    });
    const setState = vi.fn();
    (boundary as any).setState = setState;

    boundary.resetBoundary();

    expect(onReset).toHaveBeenCalledOnce();
    expect(setState).toHaveBeenCalledWith({ hasError: false, message: "" });
  });
});

