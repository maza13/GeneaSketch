import { describe, expect, it, vi } from "vitest";
import { createGlobalShortcutHandler, type ShortcutActions, type ShortcutEvent } from "@/utils/globalShortcuts";

function buildActions(spySave?: ReturnType<typeof vi.fn>): ShortcutActions {
  return {
    onEscape: vi.fn(),
    focusSearch: vi.fn(),
    save: spySave ?? vi.fn(),
    open: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
    fitToScreen: vi.fn()
  };
}

function keyEvent(
  key: string,
  options?: Partial<Pick<ShortcutEvent, "ctrlKey" | "metaKey" | "altKey" | "target">>
) {
  const preventDefault = vi.fn();
  const event: ShortcutEvent = {
    key,
    ctrlKey: options?.ctrlKey ?? false,
    metaKey: options?.metaKey ?? false,
    altKey: options?.altKey ?? false,
    target: options?.target ?? null,
    preventDefault
  };
  return { event, preventDefault };
}

describe("createGlobalShortcutHandler", () => {
  it("calls latest save action from refs (avoids stale closures)", () => {
    const firstSave = vi.fn();
    const secondSave = vi.fn();
    const actionsRef = { current: buildActions(firstSave) };
    const handler = createGlobalShortcutHandler(actionsRef, () => false);

    handler(keyEvent("s", { ctrlKey: true }).event);
    expect(firstSave).toHaveBeenCalledTimes(1);
    expect(secondSave).toHaveBeenCalledTimes(0);

    actionsRef.current = buildActions(secondSave);
    handler(keyEvent("s", { ctrlKey: true }).event);
    expect(firstSave).toHaveBeenCalledTimes(1);
    expect(secondSave).toHaveBeenCalledTimes(1);
  });

  it("skips non-modifier shortcuts while typing", () => {
    const actions = buildActions();
    const actionsRef = { current: actions };
    const handler = createGlobalShortcutHandler(actionsRef, () => true);

    const fit = keyEvent("f");
    handler(fit.event);
    expect(actions.fitToScreen).not.toHaveBeenCalled();
    expect(fit.preventDefault).not.toHaveBeenCalled();

    const save = keyEvent("s", { ctrlKey: true });
    handler(save.event);
    expect(actions.save).toHaveBeenCalledTimes(1);
    expect(save.preventDefault).toHaveBeenCalledTimes(1);
  });
});
