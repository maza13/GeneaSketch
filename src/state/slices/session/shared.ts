import type { StateCreator } from "zustand";
import type { AppState, SessionSlice } from "@/state/types";

export type SessionSet = Parameters<StateCreator<AppState, [], [], SessionSlice>>[0];
export type SessionGet = Parameters<StateCreator<AppState, [], [], SessionSlice>>[1];

export const newRecentId = () =>
  `recent_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
