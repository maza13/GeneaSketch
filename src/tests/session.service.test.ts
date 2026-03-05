import { beforeEach, describe, expect, it, vi } from "vitest";

const autosessionKey = "autosession";
const dbData = new Map<string, unknown>();
let hasSessionStore = false;

vi.mock("idb", () => {
  const deleteDB = vi.fn(async () => {});
  const openDB = vi.fn(async (_name: string, _version: number, options?: { upgrade?: (db: any) => void }) => {
    const dbMock = {
      objectStoreNames: {
        contains: (name: string) => (name === "session" ? hasSessionStore : false)
      },
      createObjectStore: vi.fn((name: string) => {
        if (name === "session") hasSessionStore = true;
      }),
      get: vi.fn(async (_store: string, key: string) => dbData.get(key)),
      put: vi.fn(async (_store: string, value: unknown, key: string) => {
        dbData.set(key, value);
      }),
      delete: vi.fn(async (_store: string, key: string) => {
        dbData.delete(key);
      })
    };
    options?.upgrade?.(dbMock);
    return dbMock;
  });
  return { openDB, deleteDB };
});

import { deleteDB } from "idb";
import { SESSION_LEGACY_MIN_SCHEMA_VERSION, SESSION_SNAPSHOT_SCHEMA_VERSION, SessionService } from "@/io/sessionService";

describe("SessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbData.clear();
    hasSessionStore = false;
  });

  it("discards legacy snapshots below hard-cut schema and clears key", async () => {
    dbData.set(autosessionKey, { schemaVersion: SESSION_LEGACY_MIN_SCHEMA_VERSION - 1, focusHistory: [], focusIndex: 0 });

    const restored = await SessionService.restoreAutosession();

    expect(restored).toBeNull();
    expect(dbData.has(autosessionKey)).toBe(false);
  });

  it("normalizes supported snapshots to schema v8 and writes them back", async () => {
    dbData.set(autosessionKey, {
      schemaVersion: SESSION_LEGACY_MIN_SCHEMA_VERSION,
      graph: null,
      viewConfig: null,
      focusHistory: ["p1"],
      focusIndex: 0
    });

    const restored = await SessionService.restoreAutosession();
    const persisted = dbData.get(autosessionKey) as { schemaVersion?: number } | undefined;

    expect(restored?.schemaVersion).toBe(SESSION_SNAPSHOT_SCHEMA_VERSION);
    expect(persisted?.schemaVersion).toBe(SESSION_SNAPSHOT_SCHEMA_VERSION);
  });

  it("migrates legacy dtree flags during restore and writes back schema v8", async () => {
    dbData.set(autosessionKey, {
      schemaVersion: 7,
      graph: null,
      viewConfig: {
        mode: "tree",
        preset: "hourglass",
        focusPersonId: null,
        focusFamilyId: null,
        homePersonId: "",
        rightPanelView: "details",
        timeline: { scope: "visible", view: "list", scaleZoom: 1, scaleOffset: 0 },
        depth: { ancestors: 1, descendants: 1, unclesGreatUncles: 0, siblingsNephews: 0, unclesCousins: 0 },
        showSpouses: true,
        dtree: {
          isVertical: true,
          layoutEngine: "v2",
          renderVersion: "v2",
          collapsedNodeIds: [],
          overlays: []
        }
      },
      focusHistory: [],
      focusIndex: -1
    });

    const restored = await SessionService.restoreAutosession();
    const persisted = dbData.get(autosessionKey) as { schemaVersion?: number; viewConfig?: any } | undefined;

    expect(restored?.schemaVersion).toBe(SESSION_SNAPSHOT_SCHEMA_VERSION);
    expect(restored?.viewConfig?.dtree?.layoutEngine).toBe("vnext");
    expect((restored?.viewConfig?.dtree as any)?.renderVersion).toBeUndefined();
    expect(persisted?.schemaVersion).toBe(SESSION_SNAPSHOT_SCHEMA_VERSION);
    expect(persisted?.viewConfig?.dtree?.layoutEngine).toBe("vnext");
  });

  it("returns null for corrupted payload and removes invalid snapshot", async () => {
    dbData.set(autosessionKey, { schemaVersion: "invalid" });

    const restored = await SessionService.restoreAutosession();

    expect(restored).toBeNull();
    expect(dbData.has(autosessionKey)).toBe(false);
  });

  it("clearAutosession deletes only autosession key and does not delete full DB", async () => {
    dbData.set(autosessionKey, { schemaVersion: SESSION_SNAPSHOT_SCHEMA_VERSION });
    dbData.set("unrelated_key", { any: true });

    await SessionService.clearAutosession();

    expect(dbData.has(autosessionKey)).toBe(false);
    expect(dbData.has("unrelated_key")).toBe(true);
    expect(vi.mocked(deleteDB)).not.toHaveBeenCalled();
  });
});
