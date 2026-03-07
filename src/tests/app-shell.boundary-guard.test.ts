import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

describe("app shell boundary guard", () => {
  it("keeps GraphDocument out of shell entrypoint props", () => {
    const guardedPaths = [
      "src/ui/PersonDetailPanel.tsx",
      "src/ui/PersonWorkspacePanel.tsx",
      "src/ui/PersonWorkspacePanelV3.tsx",
      "src/ui/ImportReviewPanel.tsx",
      "src/ui/ai/AiAssistantModal.tsx",
      "src/ui/person/BirthRangeRefinementCard.tsx",
      "src/ui/person/sections/PersonIdentitySection.tsx",
      "src/ui/person/sections/PersonFamiliesSection.tsx",
      "src/ui/person/sections/PersonEventsSection.tsx",
      "src/ui/person/sections/PersonSourcesSection.tsx",
      "src/ui/person/sections/PersonNotesSection.tsx",
      "src/ui/person/sections/PersonMediaSection.tsx",
      "src/ui/person/sections/PersonExtensionsSection.tsx",
      "src/ui/person/sections/PersonTimelineSection.tsx",
      "src/ui/person/sections/PersonAnalysisSection.tsx",
    ];

    for (const relPath of guardedPaths) {
      const source = read(relPath);
      expect(source, relPath).not.toContain('import type { GraphDocument }');
      expect(source, relPath).not.toMatch(/\bdocument\s*:\s*GraphDocument\b/);
      expect(source, relPath).not.toMatch(/\bbaseDoc\s*:\s*GraphDocument\b/);
      expect(source, relPath).not.toMatch(/\bincomingDoc\s*:\s*GraphDocument\b/);
    }
  });

  it("keeps App shell detached from runtime hooks and direct store access", () => {
    const source = read("src/App.tsx");
    expect(source).not.toContain('from "@/state/store"');
    expect(source).not.toContain('from "@/hooks/useGskFile"');
    expect(source).not.toContain('from "@/hooks/useAiAssistant"');
    expect(source).not.toContain("useAppStore");
  });
});
