import { deleteDB, openDB } from "idb";
import type { WorkspaceProfileV2 } from "@/types/workspaceProfile";
import { WORKSPACE_PROFILE_SCHEMA_VERSION } from "@/types/workspaceProfile";
import { normalizeKindraConfig } from "@/core/kindra/kindraConfig";

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

function hasBaseProfileShape(value: Record<string, unknown>): boolean {
  if (typeof value.graphId !== "string" || value.graphId.length === 0) return false;
  if (!isRecord(value.viewConfig)) return false;
  if (!isRecord(value.visualConfig)) return false;
  if (value.readModelMode !== undefined && value.readModelMode !== "direct" && value.readModelMode !== "legacy") return false;
  if (typeof value.updatedAt !== "string" || value.updatedAt.length === 0) return false;
  if (typeof value.source !== "string") return false;
  return true;
}

function isValidProfileV2(value: unknown): value is WorkspaceProfileV2 {
  if (!isRecord(value)) return false;
  if (value.profileSchemaVersion !== WORKSPACE_PROFILE_SCHEMA_VERSION) return false;
  return hasBaseProfileShape(value);
}

function sanitizeViewConfig(viewConfig: Record<string, unknown>): Record<string, unknown> {
  return {
    ...viewConfig,
    kindra: normalizeKindraConfig(viewConfig.kindra as any)
  };
}

function normalizeProfilePayload(value: unknown): { profile: WorkspaceProfileV2 | null; shouldWriteBack: boolean } {
  if (isValidProfileV2(value)) {
    const sanitizedViewConfig = sanitizeViewConfig(value.viewConfig as Record<string, unknown>);
    return {
      profile: {
        ...value,
        viewConfig: sanitizedViewConfig as WorkspaceProfileV2["viewConfig"]
      },
      shouldWriteBack: false
    };
  }

  return { profile: null, shouldWriteBack: false };
}

export class WorkspaceProfileService {
  static async load(graphId: string): Promise<WorkspaceProfileV2 | null> {
    if (!graphId) return null;
    try {
      const db = await getDb();
      const value: unknown = await db.get(STORE_NAME, graphId);
      const normalized = normalizeProfilePayload(value);
      if (!normalized.profile) {
        if (value != null) {
          console.warn(`[WorkspaceProfileService] Invalid profile payload for graphId=${graphId}; ignoring.`);
        }
        return null;
      }
      if (normalized.shouldWriteBack) {
        await db.put(STORE_NAME, normalized.profile);
      }
      return normalized.profile;
    } catch (error) {
      console.warn("[WorkspaceProfileService] load failed", error);
      return null;
    }
  }

  static async save(profile: WorkspaceProfileV2): Promise<void> {
    if (!isValidProfileV2(profile)) {
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

