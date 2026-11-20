import type { ReactNode } from "react";

/** One ghost cell: a round avatar with a bar, a bar, a right-aligned bar, or nothing. */
export type GhostCell = "avatar" | "text" | "num" | "blank";

const GHOST_ROWS = 6;

/**
 * A list with no rows: Paper "Table · Empty" and "No results". A grey panel
 * holds the message and one action. For an empty list, white ghost rows in the
 * table's own columns fade out behind the message, under the list's header
 * band. For no results, the panel holds only the message.
 */
export function TableState({
  head,
  className,
  grid,
  cells,
  title,
  text,
  action,
}: {
  /** The list's header band. Pass it for an empty list so the columns stay. */
  head?: ReactNode;
  /** The list's table class, so the header band keeps its layout. */
  className?: string;
  /** The list's column class, so ghost cells sit in the header's lanes. */
  grid?: string;
  /** One entry per column. Without cells, the panel shows no ghost rows. */
  cells?: GhostCell[];
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  const ghosts = cells?.length ? cells : null;
  return (
    <section className={["table-state", className].filter(Boolean).join(" ")}>
      {head}
      <div className="table-state__panel" data-ghosts={ghosts ? true : undefined} role="status">
        {ghosts ? (
          <div className="table-state__ghosts" aria-hidden="true">
            {Array.from({ length: GHOST_ROWS }, (_, row) => (
              <div key={row} className={["table-state__ghost", grid].filter(Boolean).join(" ")}>
                {ghosts.map((cell, index) => (
                  <span key={index} className="table-state__cell" data-cell={cell}>
                    {cell === "avatar" ? <i className="table-state__dot" /> : null}
                    {cell === "blank" ? null : <i className="table-state__bar" />}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : null}
        <div className="table-state__message">
          <p className="table-state__title">{title}</p>
          {text ? <p className="table-state__text">{text}</p> : null}
          {action ? <div className="table-state__action">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}
