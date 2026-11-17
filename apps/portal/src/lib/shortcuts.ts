import { useEffect, useRef, useSyncExternalStore } from "react";

/*
 * Keyboard shortcuts. A shortcut works only where its hint shows. Single keys
 * (C, S) do nothing while staff type in a field or while a dialog or menu is
 * open. Shortcuts with ⌘ or Ctrl work everywhere.
 */

/** True when the key press belongs to a text field or another editable element. */
export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest("input, textarea, select, [contenteditable='true']") !== null;
}

/** True when a dialog, menu, or list box is open and owns the keyboard. */
function overlayOpen(): boolean {
  return document.querySelector("[role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox']") !== null;
}

export function useShortcut(
  key: string,
  handler: () => void,
  { mod = false, enabled = true }: { mod?: boolean; enabled?: boolean } = {},
) {
  // The latest handler, so a new closure does not re-register the listener.
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.key.toLowerCase() !== key.toLowerCase()) return;
      const modPressed = event.metaKey || event.ctrlKey;
      if (mod) {
        if (!modPressed || event.altKey || event.shiftKey) return;
      } else {
        if (modPressed || event.altKey || event.shiftKey) return;
        if (isEditable(event.target) || overlayOpen()) return;
      }
      event.preventDefault();
      latest.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, mod, enabled]);
}

const noSubscribe = () => () => {};

/**
 * The modifier key name for hints: ⌘ on Apple devices, Ctrl elsewhere. The
 * server renders ⌘; the browser corrects it after hydration.
 */
export function useModKeyLabel(): string {
  return useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl "),
    () => "⌘",
  );
}
