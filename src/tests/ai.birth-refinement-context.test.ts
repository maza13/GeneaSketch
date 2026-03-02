import { describe, expect, it, beforeEach, vi } from "vitest";
import { refineBirthRangeWithAi } from "@/core/inference/aiBirthRefinement";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import type { AiInvokeProviderRequest } from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

const aiInvokeProviderMock = vi.fn<(request: AiInvokeProviderRequest) => Promise<{ text: string; model: string; provider: "chatgpt" | "gemini" }>>();

vi.mock("@/services/aiRuntime", () => ({
  aiInvokeProvider: (request: AiInvokeProviderRequest) => aiInvokeProviderMock(request)
}));

function buildDocWithNotes(): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Foco",
        sex: "M",
        lifeStatus: "alive",
        events: [],
        famc: ["@F1@"],
        fams: ["@F2@"],
        mediaRefs: [],
        sourceRefs: [],
        rawTags: { NOTE: ["Nota foco: posible nacimiento entre guerras."] }
      },
      "@I2@": {
        id: "@I2@",
        name: "Padre",
        sex: "M",
        lifeStatus: "deceased",
        events: [{ type: "BIRT", date: "1901" }],
        famc: [],
        fams: ["@F1@"],
        mediaRefs: [],
        sourceRefs: [],
        rawTags: { NOTE: ["Nota padre: tuvo un hijo despues de mudarse en 1940."] }
      },
      "@I3@": {
        id: "@I3@",
        name: "Madre",
        sex: "F",
        lifeStatus: "deceased",
        events: [{ type: "BIRT", date: "1905" }],
        famc: [],
        fams: ["@F1@"],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I4@": {
        id: "@I4@",
        name: "Hijo",
        sex: "M",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1962" }],
        famc: ["@F2@"],
        fams: [],
        mediaRefs: [],
        sourceRefs: [],
        rawTags: { NOTE: ["Nota hijo: relatos familiares situan al padre cerca de 1930."] }
      },
      "@I5@": {
        id: "@I5@",
        name: "Pareja",
        sex: "F",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1934" }],
        famc: [],
        fams: ["@F2@"],
        mediaRefs: [],
        sourceRefs: [],
        rawTags: { NOTE: ["Nota pareja: matrimonio celebrado tras migracion regional."] }
      }
    },
    families: {
      "@F1@": {
        id: "@F1@",
        husbandId: "@I2@",
        wifeId: "@I3@",
        childrenIds: ["@I1@"],
        events: [{ type: "MARR", date: "1924" }],
        rawTags: { NOTE: ["Nota familia origen: boda civil registrada en 1924."] }
      },
      "@F2@": {
        id: "@F2@",
        husbandId: "@I1@",
        wifeId: "@I5@",
        childrenIds: ["@I4@"],
        events: [{ type: "MARR", date: "1959" }, { type: "DIV", date: "1975" }],
        rawTags: { NOTE: ["Nota familia propia: divorcio discutido en acta parroquial."] }
      }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("ai birth refinement context facts", () => {
  beforeEach(() => {
    aiInvokeProviderMock.mockReset();
  });

  it("balanced mode includes only focus notes by default and no local bounds payload", async () => {
    aiInvokeProviderMock.mockResolvedValue({
      text: JSON.stringify({ minYear: 1925, maxYear: 1935, confidence: 0.6, verdict: "OK", notes: [] }),
      model: "gpt-5-nano",
      provider: "chatgpt"
    });

    await refineBirthRangeWithAi({
      document: buildDocWithNotes(),
      personId: "@I1@",
      settings: createDefaultAiSettings()
    });

    const request = aiInvokeProviderMock.mock.calls[0][0];
    expect(request.userPrompt).toContain("Nota foco");
    expect(request.userPrompt).not.toContain("Nota padre");
    expect(request.userPrompt).not.toContain("Nota hijo");
    expect(request.userPrompt).not.toContain("Nota pareja");
    expect(request.userPrompt).not.toContain("Nota familia origen");
    expect(request.userPrompt).not.toContain("Nota familia propia");
    expect(request.userPrompt).toContain("1924");
    expect(request.userPrompt).toContain("1959");
    expect(request.userPrompt).toContain("1975");
    expect(request.userPrompt).not.toContain("\"localBoundsContext\"");
    expect(request.userPrompt).toContain("\"contextStats\"");
  });

  it("complex mode can include notes from focus, parents and children", async () => {
    aiInvokeProviderMock.mockResolvedValue({
      text: JSON.stringify({ minYear: 1925, maxYear: 1935, confidence: 0.6, verdict: "OK", notes: [] }),
      model: "gpt-5-nano",
      provider: "chatgpt"
    });

    const settings = createDefaultAiSettings();
    settings.birthRefinementLevel = "complex";
    settings.birthRefinementIncludeNotesByLevel = { simple: false, balanced: true, complex: true };
    settings.birthRefinementNotesScopeByLevel = { simple: "none", balanced: "focus_only", complex: "focus_parents_children" };

    await refineBirthRangeWithAi({
      document: buildDocWithNotes(),
      personId: "@I1@",
      settings
    });

    const request = aiInvokeProviderMock.mock.calls[0][0];
    expect(request.userPrompt).toContain("Nota foco");
    expect(request.userPrompt).toContain("Nota padre");
    expect(request.userPrompt).toContain("Nota hijo");
  });
});
