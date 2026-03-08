import { StateCreator } from "zustand";
import { AppState, SessionSlice } from "../types";
import { createSessionFocusActions } from "./session/sessionFocusActions";
import { createSessionMetaActions } from "./session/sessionMetaActions";
import { createSessionPersistenceActions } from "./session/sessionRestore";

export const createSessionSlice: StateCreator<AppState, [], [], SessionSlice> = (set, get) => ({
  focusHistory: [],
  focusIndex: -1,
  bootStatus: "checking",
  restoreAvailable: false,
  restoreNoticeVisible: false,
  parseErrors: [],
  parseWarnings: [],
  recentFiles: [],
  recentPayloads: {},
  isRestoring: true,
  ...createSessionFocusActions(set),
  ...createSessionMetaActions(set, get),
  ...createSessionPersistenceActions(set, get),
});
