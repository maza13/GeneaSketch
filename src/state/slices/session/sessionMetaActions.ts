import type { RecentPayloadV2 } from "@/core/read-model/types";
import type { RecentFileEntry } from "@/types/domain";
import type { SessionSlice } from "@/state/types";
import type { SessionGet, SessionSet } from "./shared";
import { newRecentId } from "./shared";

export function createSessionMetaActions(
  set: SessionSet,
  get: SessionGet,
): Pick<
  SessionSlice,
  "setParseErrors" | "setParseWarnings" | "addRecentFile" | "removeRecentFile" | "clearRecentFiles" | "openRecentFile"
> {
  return {
    setParseErrors: (errors) => set({ parseErrors: errors }),
    setParseWarnings: (warnings) => set({ parseWarnings: warnings }),
    addRecentFile: (entry: Omit<RecentFileEntry, "id" | "lastUsedAt">, payload: RecentPayloadV2) => {
      const id = newRecentId();
      const nextEntry = { ...entry, id, lastUsedAt: new Date().toISOString() };
      set((state) => {
        const deduped = state.recentFiles.filter((item) => !(item.name === entry.name && item.kind === entry.kind));
        return {
          recentFiles: [nextEntry, ...deduped].slice(0, 30),
          recentPayloads: { ...state.recentPayloads, [id]: payload },
        };
      });
      return id;
    },
    removeRecentFile: (id) =>
      set((state) => {
        const nextPayloads = { ...state.recentPayloads };
        delete nextPayloads[id];
        return {
          recentFiles: state.recentFiles.filter((item) => item.id !== id),
          recentPayloads: nextPayloads,
        };
      }),
    clearRecentFiles: () => set({ recentFiles: [], recentPayloads: {} }),
    openRecentFile: (id) => {
      const state = get();
      const entry = state.recentFiles.find((item) => item.id === id);
      const payload = state.recentPayloads[id];
      if (!entry || !payload) return null;
      const updated = { ...entry, lastUsedAt: new Date().toISOString() };
      set({ recentFiles: [updated, ...state.recentFiles.filter((item) => item.id !== id)] });
      return { entry: updated, payload };
    },
  };
}
