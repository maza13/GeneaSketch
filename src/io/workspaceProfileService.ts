import { deleteDB, openDB } from "idb";
import type { WorkspaceProfileV1 } from "@/types/workspaceProfile";
import { WORKSPACE_PROFILE_SCHEMA_VERSION } from "@/types/workspaceProfile";

const DB_NAME = "geneasketch-workspace-db";
const STORE_NAME = "workspace_profiles";

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "graphId" });
      }
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isValidProfile(value: unknown): value is WorkspaceProfileV1 {
  if (!isRecord(value)) return false;
  if (value.profileSchemaVersion !== WORKSPACE_PROFILE_SCHEMA_VERSION) return false;
  if (typeof value.graphId !== "string" || value.graphId.length === 0) return false;
  if (!isRecord(value.viewConfig)) return false;
  if (!isRecord(value.visualConfig)) return false;
  if (typeof value.updatedAt !== "string" || value.updatedAt.length === 0) return false;
  if (typeof value.source !== "string") return false;
  return true;
}

export class WorkspaceProfileService {
  static async load(graphId: string): Promise<WorkspaceProfileV1 | null> {
    if (!graphId) return null;
    try {
      const db = await getDb();
      const value: unknown = await db.get(STORE_NAME, graphId);
      if (!isValidProfile(value)) {
        if (value != null) {
          console.warn(`[WorkspaceProfileService] Invalid profile payload for graphId=${graphId}; ignoring.`);
        }
        return null;
      }
      return value;
    } catch (error) {
      console.warn("[WorkspaceProfileService] load failed", error);
      return null;
    }
  }

  static async save(profile: WorkspaceProfileV1): Promise<void> {
    if (!isValidProfile(profile)) {
      console.warn("[WorkspaceProfileService] save skipped: invalid profile payload.");
      return;
    }
    try {
      const db = await getDb();
      await db.put(STORE_NAME, profile);
    } catch (error) {
      console.warn("[WorkspaceProfileService] save failed", error);
    }
  }

  static async clear(graphId: string): Promise<void> {
    if (!graphId) return;
    try {
      const db = await getDb();
      await db.delete(STORE_NAME, graphId);
    } catch (error) {
      console.warn("[WorkspaceProfileService] clear failed", error);
    }
  }

  static async clearAll(): Promise<void> {
    try {
      await deleteDB(DB_NAME);
    } catch (error) {
      console.warn("[WorkspaceProfileService] clearAll failed", error);
    }
  }
}

