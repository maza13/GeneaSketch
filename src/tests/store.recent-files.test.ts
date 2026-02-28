import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionService } from "@/io/sessionService";
import { useAppStore } from "@/state/store";
import type { GeneaDocument } from "@/types/domain";

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
    const id = useAppStore.getState().addRecentFile({ name: "a.ged", kind: "open" }, doc("A"));
    const reopened = useAppStore.getState().openRecentFile(id);
    expect(reopened).not.toBeNull();
    expect(reopened?.entry.name).toBe("a.ged");
    expect(reopened?.payload.persons["@I1@"].name).toBe("A");
  });

  it("deduplicates by name+kind and moves entry to top", () => {
    useAppStore.getState().addRecentFile({ name: "a.ged", kind: "open" }, doc("A1"));
    useAppStore.getState().addRecentFile({ name: "b.ged", kind: "open" }, doc("B"));
    useAppStore.getState().addRecentFile({ name: "a.ged", kind: "open" }, doc("A2"));

    const entries = useAppStore.getState().recentFiles;
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe("a.ged");
    const payload = useAppStore.getState().openRecentFile(entries[0].id)?.payload;
    expect(payload?.persons["@I1@"].name).toBe("A2");
  });
});
