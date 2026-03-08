import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionService } from "@/io/sessionService";
import { useAppStore } from "@/state/store";
import type { GeneaDocument } from "@/types/domain";
import { documentToGenraph } from "@/core/genraph/GedcomBridge";

function doc(name: string): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name,
        sex: "U",
        lifeStatus: "alive",
        events: [],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {},
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

function recentPayload(name: string) {
  const source = doc(name);
  const graph = documentToGenraph(source, "7.0.x").graph;
  return {
    graph: {
      data: graph.toData(),
      journal: [...graph.getJournal()],
    },
    sourceVersion: "7.0.x" as const,
    fileName: `${name}.ged`,
    kind: "open" as const,
    importedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(SessionService, "saveAutosession").mockResolvedValue();
  vi.spyOn(SessionService, "clearAutosession").mockResolvedValue();
  vi.spyOn(SessionService, "restoreAutosession").mockResolvedValue(null);
  useAppStore.setState((s) => ({
    ...s,
    recentFiles: [],
    recentPayloads: {}
  }));
});

describe("recent files store", () => {
  it("adds and reopens a recent entry", () => {
    const id = useAppStore.getState().addRecentFile({ name: "a.ged", kind: "open" }, recentPayload("A"));
    const reopened = useAppStore.getState().openRecentFile(id);
    expect(reopened).not.toBeNull();
    expect(reopened?.entry.name).toBe("a.ged");
    expect(reopened?.payload.fileName).toBe("A.ged");
  });

  it("deduplicates by name+kind and moves entry to top", () => {
    useAppStore.getState().addRecentFile({ name: "a.ged", kind: "open" }, recentPayload("A1"));
    useAppStore.getState().addRecentFile({ name: "b.ged", kind: "open" }, recentPayload("B"));
    useAppStore.getState().addRecentFile({ name: "a.ged", kind: "open" }, recentPayload("A2"));

    const entries = useAppStore.getState().recentFiles;
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe("a.ged");
    const payload = useAppStore.getState().openRecentFile(entries[0].id)?.payload;
    expect(payload?.fileName).toBe("A2.ged");
  });
});
