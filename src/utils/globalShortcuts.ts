export type ShortcutActions = {
  onEscape: () => void;
  focusSearch: () => void;
  save: () => void | Promise<void>;
  open: () => void;
  goBack: () => void;
  goForward: () => void;
  fitToScreen: () => void;
};

export type ShortcutEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
  preventDefault: () => void;
};

export function createGlobalShortcutHandler(
  actionsRef: { current: ShortcutActions },
  isTypingTarget: (target: EventTarget | null) => boolean
) {
  return (event: ShortcutEvent) => {
    const key = event.key.toLowerCase();
    const typing = isTypingTarget(event.target);

    if (key === "escape") {
      actionsRef.current.onEscape();
    }

    if ((event.ctrlKey || event.metaKey) && key === "k") {
      event.preventDefault();
      actionsRef.current.focusSearch();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "s") {
      event.preventDefault();
      void actionsRef.current.save();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "o") {
      event.preventDefault();
      actionsRef.current.open();
      return;
    }

    if (typing) return;

    if (event.altKey && event.key === "ArrowLeft") {
      event.preventDefault();
      actionsRef.current.goBack();
      return;
    }
    if (event.altKey && event.key === "ArrowRight") {
      event.preventDefault();
      actionsRef.current.goForward();
      return;
    }
    if (key === "f") {
      event.preventDefault();
      actionsRef.current.fitToScreen();
    }
  };
}
