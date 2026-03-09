import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import { buildPersonWorkspaceViewModel } from "@/app-shell/workbenches/personWorkspaceWorkbench";
import { PersonWorkspacePanelV3 } from "@/ui/PersonWorkspacePanelV3";
import type { GeneaDocument } from "@/types/domain";

function buildDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Juan",
        surname: "Perez",
        sex: "M",
        lifeStatus: "alive",
        birthDate: "1 JAN 1980",
        events: [{ id: "evt-1", type: "BIRT", date: "1 JAN 1980", place: "Monterrey" }],
        famc: ["@F1@"],
        fams: ["@F2@"],
        mediaRefs: [],
        sourceRefs: [],
      },
      "@I2@": {
        id: "@I2@",
        name: "Maria",
        surname: "Lopez",
        sex: "F",
        lifeStatus: "alive",
        events: [{ id: "evt-2", type: "BIRT", date: "2 FEB 1982", place: "Guadalajara" }],
        famc: [],
        fams: ["@F2@"],
        mediaRefs: [],
        sourceRefs: [],
      },
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I9@", wifeId: "@I8@", childrenIds: ["@I1@"], events: [] },
      "@F2@": { id: "@F2@", husbandId: "@I1@", wifeId: "@I2@", childrenIds: [], events: [] },
    },
    sources: {},
    notes: {},
    media: {},
    metadata: { sourceFormat: "GSK", gedVersion: "7.0.x" },
  };
}

function buildCommands() {
  return {
    onClose: vi.fn(),
    onSelectPerson: vi.fn(),
    onSetAsFocus: vi.fn(),
    onSavePerson: vi.fn(),
    onSaveFamily: vi.fn(),
    onCreatePerson: vi.fn(),
    onQuickAddRelation: vi.fn(),
    onEditPerson: vi.fn(),
    onOpenAiAssistant: vi.fn(),
  };
}

describe("PersonWorkspacePanelV3 layout split", () => {
  it("keeps window mode compact without analytic sidecar", () => {
    const model = buildPersonWorkspaceViewModel(buildDoc(), createDefaultAiSettings(), "@I1@");
    expect(model).not.toBeNull();

    const html = renderToStaticMarkup(
      <PersonWorkspacePanelV3 viewModel={model!} commands={buildCommands()} />,
    );

    expect(html).toContain("data-layout-mode=\"window\"");
    expect(html).toContain("person-workspace-floating-window");
    expect(html).toContain("person-workspace-window-header");
    expect(html).toContain("role=\"tablist\"");
    expect(html).not.toContain("person-workspace-sidecar");
    expect(html).not.toContain("Modo workbench");
    expect(html).not.toContain("person-workspace-workbench-nav");
    expect(html).not.toContain("gs-modal-overlay");
  });

  it("renders workbench chrome only in fullscreen mode", () => {
    const model = buildPersonWorkspaceViewModel(buildDoc(), createDefaultAiSettings(), "@I1@");
    expect(model).not.toBeNull();

    const html = renderToStaticMarkup(
      <PersonWorkspacePanelV3
        viewModel={{ ...model!, layoutMode: "fullscreen" }}
        commands={buildCommands()}
      />,
    );

    expect(html).toContain("data-layout-mode=\"fullscreen\"");
    expect(html).toContain("gs-modal-overlay");
    expect(html).toContain("person-workspace-sidecar");
    expect(html).toContain("person-workspace-workbench-nav");
    expect(html).toContain("person-workspace-workbench-header");
    expect(html).toContain("person-workspace-workbench-quick-actions");
    expect(html).not.toContain("role=\"tablist\"");
    expect(html).toContain("Workspace profundo");
    expect(html).toContain("Carriles futuros");
    expect(html).toContain("Trabajo profundo");
    expect(html).toContain("Registro base");
  });
});
