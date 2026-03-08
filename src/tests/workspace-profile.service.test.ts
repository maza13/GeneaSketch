import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultViewConfig, createDefaultVisualConfig } from "@/state/workspaceDefaults";
import type { WorkspaceProfileV2 } from "@/types/workspaceProfile";
import { WORKSPACE_PROFILE_SCHEMA_VERSION } from "@/types/workspaceProfile";

const storeData = new Map<string, unknown>();

vi.mock("idb", () => ({
  openDB: vi.fn(async (_name: string, _version: number, options?: { upgrade?: (db: any) => void }) => {
    const dbMock = {
      objectStoreNames: { contains: (_store: string) => true },
      createObjectStore: vi.fn(),
      get: vi.fn(async (_store: string, key: string) => storeData.get(key)),
      put: vi.fn(async (_store: string, value: unknown, key?: string) => {
        const resolvedKey =
          key
          ?? (typeof value === "object" && value && "graphId" in (value as Record<string, unknown>)
            ? String((value as Record<string, unknown>).graphId)
            : "");
        storeData.set(resolvedKey, value);
      }),
      delete: vi.fn(async (_store: string, key: string) => {
        storeData.delete(key);
      })
    };
    options?.upgrade?.(dbMock);
    return dbMock;
  }),
  deleteDB: vi.fn(async () => {
    storeData.clear();
  })
}));

import { WorkspaceProfileService } from "@/io/workspaceProfileService";

function buildProfile(graphId: string): WorkspaceProfileV2 {
  return {
    profileSchemaVersion: WORKSPACE_PROFILE_SCHEMA_VERSION,
    graphId,
    viewConfig: createDefaultViewConfig("p1"),
    visualConfig: createDefaultVisualConfig(),
    colorTheme: {
      background: "#111111",
      personNode: "#222222",
      text: "#ffffff",
      edges: "#777777",
      nodeFontSize: 16,
      edgeThickness: 2,
      nodeWidth: 200,
      nodeHeight: 90
    },
    updatedAt: "2026-03-04T00:00:00.000Z",
    source: "local-autosave"
  };
}

describe("WorkspaceProfileService", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    storeData.clear();
    await WorkspaceProfileService.clearAll();
  });

  it("saves and loads profile by graphId", async () => {
    const profile = buildProfile("graph-a");
    await WorkspaceProfileService.save(profile);

    const loaded = await WorkspaceProfileService.load("graph-a");
    expect(loaded?.graphId).toBe("graph-a");
    expect(loaded?.viewConfig.focusPersonId).toBe("p1");
    expect(loaded?.colorTheme?.background).toBe("#111111");
  });

  it("returns null when profile is missing", async () => {
    const loaded = await WorkspaceProfileService.load("missing-graph");
    expect(loaded).toBeNull();
  });

  it("ignores corrupted profile payloads", async () => {
    storeData.set("graph-corrupt", {
      graphId: "graph-corrupt",
      profileSchemaVersion: 999,
      updatedAt: 123
    });

    const loaded = await WorkspaceProfileService.load("graph-corrupt");
    expect(loaded).toBeNull();
  });

  it("rejects legacy v1 payloads under the hard cut", async () => {
    const legacyProfile = buildProfile("graph-legacy");
    storeData.set("graph-legacy", {
      ...legacyProfile,
      profileSchemaVersion: 1,
      viewConfig: {
        ...legacyProfile.viewConfig,
        kindra: {
          ...(legacyProfile.viewConfig.kindra || {}),
          layoutEngine: "v2",
          renderVersion: "v2"
        }
      }
    });

    const loaded = await WorkspaceProfileService.load("graph-legacy");

    expect(loaded).toBeNull();
    expect((storeData.get("graph-legacy") as WorkspaceProfileV2 | undefined)?.profileSchemaVersion).toBe(1);
  });

  it("keeps profiles isolated per graphId", async () => {
    await WorkspaceProfileService.save(buildProfile("graph-1"));
    const profile2 = buildProfile("graph-2");
    profile2.viewConfig = { ...profile2.viewConfig, focusPersonId: "p2", homePersonId: "p2" };
    await WorkspaceProfileService.save(profile2);

    const first = await WorkspaceProfileService.load("graph-1");
    const second = await WorkspaceProfileService.load("graph-2");
    expect(first?.viewConfig.focusPersonId).toBe("p1");
    expect(second?.viewConfig.focusPersonId).toBe("p2");
  });
});

