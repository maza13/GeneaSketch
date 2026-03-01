import { deleteDB, openDB } from "idb";
import type { SessionSnapshot } from "@/types/domain";

const DB_NAME = "geneasketch-db";
const STORE_NAME = "session";
const KEY = "autosession";

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    }
  });
}

export class SessionService {
  static async saveAutosession(state: SessionSnapshot): Promise<void> {
    try {
      const db = await getDb();
      await db.put(STORE_NAME, state, KEY);
      console.log("[SessionService] saveAutosession OK", {
        docName: state.document?.persons[Object.keys(state.document?.persons || {})[0]]?.name
      });
    } catch (err) {
      console.error("[SessionService] saveAutosession FAILED", err);
    }
  }

  static async restoreAutosession(): Promise<SessionSnapshot | null> {
    try {
      const db = await getDb();
      const value: unknown = await db.get(STORE_NAME, KEY);
      if (!value || typeof value !== "object") return null;
      if (!("schemaVersion" in value)) return null;
      if (typeof (value as { schemaVersion?: unknown }).schemaVersion !== "number") return null;
      return value as SessionSnapshot;
    } catch {
      return null;
    }
  }

  static async clearAutosession(): Promise<void> {
    await deleteDB(DB_NAME);
  }
}
