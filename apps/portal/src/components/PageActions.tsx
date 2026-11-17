import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/*
 * Page actions live in the top bar, after Search, as in the Paper redesign:
 *
 *   <PageActions>
 *     <Button size="compact">New sale</Button>
 *   </PageActions>
 *
 * Put it where the actions belong in the page. From 768px it moves them into
 * the top bar slot. On phones the top bar has no room, so the actions stay in
 * the page, where they render. Use compact (28px) buttons. Status pills and
 * other facts stay with the title; they are not actions.
 */

/** The top bar's action slot. The organization layout provides it. */
export const PageActionsSlot = createContext<HTMLElement | null>(null);

const PHONE = "(max-width: 767.98px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on phone widths. The server renders the wide layout. */
function usePhone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

export function PageActions({ children }: { children: ReactNode }) {
  const slot = useContext(PageActionsSlot);
  const phone = usePhone();
  if (phone) return <div className="page-actions">{children}</div>;
  // The slot exists after the layout mounts, so actions join the top bar then.
  return slot ? createPortal(children, slot) : null;
}
