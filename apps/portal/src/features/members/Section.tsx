import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * A section of a record page (Paper "Holds", "Recent sales", "Profile"): a
 * small grey title, "View all" on the right when the list has more rows than
 * it shows, then the content. `more` toggles the rest of the list in place.
 */
export function Section({
  id,
  title,
  more,
  children,
}: {
  id: string;
  title: string;
  more?: { open: boolean; onToggle: () => void } | null;
  children: ReactNode;
}) {
  return (
    <section className="member-section" aria-labelledby={`${id}-title`}>
      <div className="member-section__head">
        <h2 id={`${id}-title`}>{title}</h2>
        {more ? (
          <button type="button" className="member-section__more" aria-expanded={more.open} onClick={more.onToggle}>
            {more.open ? "Show fewer" : "View all"}
            <Icon name={more.open ? "chevronDown" : "chevronRight"} size={12} aria-hidden focusable={false} />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** One quiet line where a list has no rows. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="member-empty">{children}</p>;
}
