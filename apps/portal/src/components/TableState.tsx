import type { ReactNode } from "react";

const SKELETON_ROWS = 7;

// Paper "Table · Empty" and "No results". Passing `head` marks an empty list:
// the header band stays and skeleton lines fill the panel behind the message.
export function TableState({
  head,
  className,
  title,
  text,
  action,
}: {
  head?: ReactNode;
  className?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  const empty = head != null;
  return (
    <section className={["table-state", className].filter(Boolean).join(" ")}>
      {head}
      <div className="table-state__panel" data-skeleton={empty || undefined} role="status">
        {empty ? (
          <div className="table-state__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ROWS }, (_, row) => (
              <div key={row} className="table-state__line">
                <i className="table-state__dot" />
                <span className="table-state__name">
                  <i />
                  <i />
                </span>
                <i className="table-state__middle" />
                <i className="table-state__end" />
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
