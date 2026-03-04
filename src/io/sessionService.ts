import { openDB } from "idb";
import type { SessionSnapshot } from "@/types/domain";

const DB_NAME = "geneasketch-db";
const STORE_NAME = "session";
const KEY = "autosession";
export const SESSION_LEGACY_MIN_SCHEMA_VERSION = 7;
export const SESSION_SNAPSHOT_SCHEMA_VERSION = 7;

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toRecord(value: unknown): Record<string, any> {
  return isRecord(value) ? value as Record<string, any> : {};
}

function normalizeSnapshot(value: unknown): SessionSnapshot | null {
  if (!isRecord(value)) return null;
  const schemaVersion = value.schemaVersion;
  if (typeof schemaVersion !== "number") return null;
  if (schemaVersion < SESSION_LEGACY_MIN_SCHEMA_VERSION) return null;

  return {
    schemaVersion: SESSION_SNAPSHOT_SCHEMA_VERSION,
    graph: ("graph" in value ? (value.graph as SessionSnapshot["graph"]) : null) ?? null,
    viewConfig: ("viewConfig" in value ? (value.viewConfig as SessionSnapshot["viewConfig"]) : null) ?? null,
    visualConfig: value.visualConfig as SessionSnapshot["visualConfig"],
    focusHistory: toStringArray(value.focusHistory),
    focusIndex: typeof value.focusIndex === "number" ? value.focusIndex : -1,
    recentFiles: Array.isArray(value.recentFiles) ? (value.recentFiles as SessionSnapshot["recentFiles"]) : [],
    recentPayloads: toRecord(value.recentPayloads),
    mergeDraft: (value.mergeDraft as SessionSnapshot["mergeDraft"]) ?? null,
    aiSettings: value.aiSettings as SessionSnapshot["aiSettings"]
  };
}

function parseAndNormalizeSnapshot(value: unknown): { snapshot: SessionSnapshot | null; shouldWriteBack: boolean; shouldClear: boolean } {
  const normalized = normalizeSnapshot(value);
  if (!normalized) {
    return { snapshot: null, shouldWriteBack: false, shouldClear: value != null };
  }
  return { snapshot: normalized, shouldWriteBack: false, shouldClear: false };
}

export class SessionService {
  static async saveAutosession(state: SessionSnapshot): Promise<void> {
    try {
      const db = await getDb();
      await db.put(STORE_NAME, state, KEY);
      console.log("[SessionService] saveAutosession OK", {
        graphId: state.graph?.data?.graphId ?? null,
        schemaVersion: state.schemaVersion
      });
    } catch (err) {
      console.error("[SessionService] saveAutosession FAILED", err);
    }
  }

  static async restoreAutosession(): Promise<SessionSnapshot | null> {
    try {
      const db = await getDb();
      const value: unknown = await db.get(STORE_NAME, KEY);
      const parsed = parseAndNormalizeSnapshot(value);
      if (!parsed.snapshot) {
        if (parsed.shouldClear) {
          console.warn("[SessionService] Invalid or unsupported autosession snapshot discarded.");
          await SessionService.clearAutosession();
        }
        return null;
      }
      if (parsed.shouldWriteBack) {
        await SessionService.saveAutosession(parsed.snapshot);
      }
      return parsed.snapshot;
    } catch {
      return null;
    }
  }

  static async clearAutosession(): Promise<void> {
    try {
      const db = await getDb();
      await db.delete(STORE_NAME, KEY);
    } catch (err) {
      console.error("[SessionService] clearAutosession FAILED", err);
    }
  }
}

