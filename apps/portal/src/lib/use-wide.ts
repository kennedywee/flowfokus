import { useSyncExternalStore } from "react";

const WIDE = "(min-width: 1100px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * True from 1100px, where a record page's panel sits beside its form. The
 * server renders the wide layout. A page that must keep its document order in
 * step with the screen moves the panel in the page; CSS `order` would split
 * Tab order from the screen.
 */
export function useWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}
