import { describe, expect, it } from "vitest";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import { buildAiAssistantViewModel } from "@/app-shell/workbenches/aiAssistantWorkbench";
import { buildImportReviewViewModel } from "@/app-shell/workbenches/importReviewWorkbench";
import { buildPersonEditorViewModel } from "@/app-shell/workbenches/personEditorWorkbench";
import { buildPersonWorkspaceViewModel } from "@/app-shell/workbenches/personWorkspaceWorkbench";
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
        birthPlace: "Monterrey, Nuevo Leon, Mexico",
        events: [{ id: "evt-1", type: "BIRT", date: "1 JAN 1980", place: "Monterrey, Nuevo Leon, Mexico" }],
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
        events: [{ id: "evt-2", type: "BIRT", date: "2 FEB 1982", place: "Guadalajara, Jalisco, Mexico" }],
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
    sources: {
      "@S1@": { id: "@S1@", title: "Acta civil" },
    },
    notes: {
      "@N1@": { id: "@N1@", text: "Nota privada" },
    },
    media: {
      "@M1@": { id: "@M1@", title: "Foto", fileName: "foto.jpg" },
    },
    metadata: { sourceFormat: "GSK", gedVersion: "7.0.x" },
  };
}

describe("app shell workbenches", () => {
  it("buildPersonEditorViewModel preserves document and only creates birth refinement for edit", () => {
    const doc = buildDoc();
    const aiSettings = createDefaultAiSettings();

    const editModel = buildPersonEditorViewModel(doc, aiSettings, {
      type: "edit",
      personId: "@I1@",
      person: doc.persons["@I1@"],
    });
    expect(editModel.documentView).toBe(doc);
    expect(editModel.birthRefinement).toEqual({
      documentView: doc,
      personId: "@I1@",
      aiSettings,
    });
    expect(editModel.getNameSuggestions("Jua")).toContain("Juan");
    expect(editModel.getPlaceSuggestions("Mon")).toContain("Monterrey, Nuevo Leon, Mexico");
    expect(editModel.getSurnameSuggestions("@I1@", "child").length).toBeGreaterThan(0);

    const relationModel = buildPersonEditorViewModel(doc, aiSettings, {
      type: "add_relation",
      anchorId: "@I1@",
      anchorPerson: doc.persons["@I1@"],
      relationType: "child",
    });
    expect(relationModel.birthRefinement).toBeNull();

    const standaloneModel = buildPersonEditorViewModel(doc, aiSettings, { type: "create_standalone" });
    expect(standaloneModel.birthRefinement).toBeNull();
  });

  it("buildPersonWorkspaceViewModel returns null for invalid inputs and builds all sections when valid", () => {
    const doc = buildDoc();
    const aiSettings = createDefaultAiSettings();

    expect(buildPersonWorkspaceViewModel(null, aiSettings, "@I1@")).toBeNull();
    expect(buildPersonWorkspaceViewModel(doc, aiSettings, null)).toBeNull();
    expect(buildPersonWorkspaceViewModel(doc, aiSettings, "@missing")).toBeNull();

    const model = buildPersonWorkspaceViewModel(doc, aiSettings, "@I1@");
    expect(model).not.toBeNull();
    expect(model?.personId).toBe("@I1@");
    expect(model?.person).toBe(doc.persons["@I1@"]);
    expect(model?.aiSettings).toBe(aiSettings);
    expect(model?.layoutMode).toBe("window");
    expect(model?.documentView).toBe(doc);
    expect(model?.sections.identity.person.id).toBe("@I1@");
    expect(model?.sections.familyLinks.personId).toBe("@I1@");
    expect(model?.sections.events.person.id).toBe("@I1@");
    expect(model?.sections.sources.documentView).toBe(doc);
    expect(model?.sections.notes.documentView).toBe(doc);
    expect(model?.sections.media.documentView).toBe(doc);
    expect(model?.sections.extensions.documentView).toBe(doc);
    expect(model?.sections.timeline.personId).toBe("@I1@");
    expect(model?.sections.analysis.documentView).toBe(doc);
    expect(model?.sections.audit.person.id).toBe("@I1@");
    expect(model?.sections.history.person.id).toBe("@I1@");
    expect(model?.v3Sections.map((section) => section.id)).toEqual([
      "identity",
      "family_links",
      "events",
      "sources",
      "notes",
      "media",
      "timeline",
      "analysis",
      "audit",
      "extensions",
      "claims",
      "journal",
    ]);
    expect(model?.v3Sections.find((section) => section.id === "events")?.badgeCount).toBe(1);
    expect(model?.v3Sections.find((section) => section.id === "claims")?.status).toBe("placeholder");
    expect(model?.v3Sections.find((section) => section.id === "analysis")?.contextRole).toBe("analysis");
    expect(model?.v3Sections.find((section) => section.id === "analysis")?.workbenchPriority).toBeGreaterThan(0);
    expect(model?.v3Sections.find((section) => section.id === "journal")?.futureAnalysis).toBe(true);
  });

  it("buildImportReviewViewModel preserves inputs", () => {
    const doc = buildDoc();
    const model = buildImportReviewViewModel(doc, doc, null);

    expect(model.baseDocument).toBe(doc);
    expect(model.incomingDocument).toBe(doc);
    expect(model.initialDraft).toBeNull();
  });

  it("buildAiAssistantViewModel preserves inputs", () => {
    const doc = buildDoc();
    const settings = createDefaultAiSettings();
    const context = { kind: "local", anchorPersonId: "@I1@" } as const;
    const model = buildAiAssistantViewModel(true, context, doc, settings);

    expect(model.open).toBe(true);
    expect(model.context).toEqual(context);
    expect(model.documentView).toBe(doc);
    expect(model.settings).toBe(settings);
  });
});
