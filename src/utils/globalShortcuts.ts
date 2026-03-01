export type ShortcutActions = {
  onEscape: () => void;
  focusSearch: () => void;
  save: () => void | Promise<void>;
  open: () => void;
  goBack: () => void;
  goForward: () => void;
  fitToScreen: () => void;
  openAiSettings: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleTimelinePanel: () => void;
};

export type ShortcutEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
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

    if ((event.ctrlKey || event.metaKey) && key === "f") {
      event.preventDefault();
      actionsRef.current.focusSearch();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "k") {
      event.preventDefault();
      actionsRef.current.focusSearch();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === "i") {
      event.preventDefault();
      actionsRef.current.openAiSettings();
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
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      actionsRef.current.toggleLeftPanel();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      actionsRef.current.toggleRightPanel();
      return;
    }
    if (key === "f") {
      event.preventDefault();
      actionsRef.current.fitToScreen();
      return;
    }
    if (key === "[") {
      event.preventDefault();
      actionsRef.current.toggleLeftPanel();
      return;
    }
    if (key === "]") {
      event.preventDefault();
      actionsRef.current.toggleRightPanel();
      return;
    }
    if (event.shiftKey && key === "t") {
      event.preventDefault();
      actionsRef.current.toggleTimelinePanel();
    }
  };
}
