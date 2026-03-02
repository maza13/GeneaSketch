import { AppState } from "../types";

export const withFocusHistory = (state: AppState, personId: string | null) => {
    if (!personId) return { focusHistory: state.focusHistory, focusIndex: state.focusIndex };
    const nextHistory = state.focusHistory.slice(0, state.focusIndex + 1);
    if (nextHistory[nextHistory.length - 1] === personId) return { focusHistory: state.focusHistory, focusIndex: state.focusIndex };
    nextHistory.push(personId);
    return { focusHistory: nextHistory, focusIndex: nextHistory.length - 1 };
};
