import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { earlierLabel, filterFeed, splitEvents, type ActivityFilter } from "@/lib/list-parts";
import { Dot, type DotTone } from "./marks";

const icon = { "aria-hidden": true, focusable: false } as const;

/*
 * Activity (Paper "Section · Activity"): a comment box, an All / Comments /
 * Activity control, event rows with a coloured dot, comment rows with an
 * avatar, and "Show N earlier events". Rails has no comments yet, so a screen
 * that cannot save one leaves the comment box out (`composer` is optional)
 * and shows only events.
 */

export type FeedItem =
  | { kind: "event"; id: string; tone?: DotTone; time: string; children: ReactNode }
  | { kind: "comment"; id: string; author: string; initials: string; time: string; children: ReactNode };

export function ActivityFeed({
  items,
  composer,
  visible = 5,
  empty = "Nothing has happened yet.",
  loading = false,
}: {
  items: readonly FeedItem[];
  /** The comment box. Leave it out when comments cannot be saved. */
  composer?: ReactNode;
  /** How many items show before "Show N earlier events". */
  visible?: number;
  empty?: string;
  loading?: boolean;
}) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [open, setOpen] = useState(false);
  const hasComments = items.some((item) => item.kind === "comment");
  const shown = filterFeed(items, filter);
  const { shown: head, hidden } = splitEvents(shown, open ? shown.length : visible);
  const headingId = useId();
  return (
    <section className="activity" aria-labelledby={headingId}>
      <div className="activity__head">
        <Icon name="activity" size={16} {...icon} />
        <h2 id={headingId} className="activity__title">
          Activity
        </h2>
        <span className="activity__space" />
        {hasComments || composer ? (
          <SegmentedControl aria-label="Show" value={filter} onValueChange={(value) => setFilter((value as ActivityFilter | null) ?? "all")}>
            <SegmentedControlItem value="all">All</SegmentedControlItem>
            <SegmentedControlItem value="comments">Comments</SegmentedControlItem>
            <SegmentedControlItem value="activity">Activity</SegmentedControlItem>
          </SegmentedControl>
        ) : null}
      </div>
      {composer}
      {loading ? (
        <div className="activity__list" role="status" aria-label="Loading activity" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className="activity__row" aria-hidden="true">
              <span className="activity__lead">
                <i className="skeleton activity__skeleton-dot" />
              </span>
              <i className="skeleton activity__skeleton-line" data-short={row === 1 || undefined} />
            </div>
          ))}
        </div>
      ) : head.length === 0 ? (
        <p className="activity__empty">{empty}</p>
      ) : (
        <ol className="activity__list">
          {head.map((item) =>
            item.kind === "event" ? (
              <li key={item.id} className="activity__row">
                <span className="activity__lead">
                  <Dot tone={item.tone ?? "neutral"} />
                </span>
                <span className="activity__text">{item.children}</span>
                <time className="activity__time">{item.time}</time>
              </li>
            ) : (
              <li key={item.id} className="activity__row activity__row--comment">
                <span className="activity__lead">
                  <span className="activity__avatar" aria-hidden="true">
                    {item.initials}
                  </span>
                </span>
                <span className="activity__text">
                  <strong className="activity__author">{item.author}</strong>
                  {"  "}
                  {item.children}
                </span>
                <time className="activity__time">{item.time}</time>
              </li>
            ),
          )}
        </ol>
      )}
      {hidden > 0 ? (
        <button type="button" className="activity__earlier" onClick={() => setOpen(true)}>
          {earlierLabel(hidden)}
        </button>
      ) : null}
    </section>
  );
}

/** Highlights the subject of an event row, as in "Kennedy fulfilled Monthly unlimited". */
export function Subject({ children }: { children: ReactNode }) {
  return <span className="activity__subject">{children}</span>;
}

/**
 * The comment box: a 32px avatar and a bordered box with a text area and a
 * Comment button. ⌘↵ submits. The caller owns saving. While a save is pending
 * the button is off and a second submit does nothing, but the text area stays
 * open for typing. A save that works clears the text it saved (text typed
 * since stays). A save that fails keeps the text and shows an error.
 */
export function CommentComposer({
  initials,
  onSubmit,
  pending = false,
}: {
  initials: string;
  onSubmit: (text: string) => void | Promise<unknown>;
  pending?: boolean;
}) {
  const id = useId();
  const errorId = useId();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const busyNow = pending || saving;
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const value = text.trim();
    if (!value || pending || busy.current) return;
    busy.current = true;
    setSaving(true);
    setFailed(false);
    try {
      await onSubmit(value);
      setText((current) => (current.trim() === value ? "" : current));
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  return (
    <form className="composer" onSubmit={submit}>
      <span className="composer__avatar" aria-hidden="true">
        {initials}
      </span>
      <div className="composer__box">
        <label htmlFor={id} className="visually-hidden">
          Leave a comment
        </label>
        <textarea
          id={id}
          className="composer__input"
          rows={1}
          placeholder="Leave a comment…"
          value={text}
          aria-describedby={failed ? errorId : undefined}
          aria-invalid={failed || undefined}
          onChange={(event) => {
            setText(event.target.value);
            setFailed(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit();
          }}
        />
        <div className="composer__foot">
          {failed ? (
            <p id={errorId} role="alert" className="composer__error">
              The comment was not saved. Try again.
            </p>
          ) : null}
          <span className="composer__space" />
          <button
            type="submit"
            className="composer__submit"
            disabled={!text.trim() || busyNow}
            aria-busy={busyNow || undefined}
            aria-keyshortcuts="Meta+Enter Control+Enter"
          >
            Comment
            <kbd className="composer__hint" aria-hidden="true">
              ⌘↵
            </kbd>
          </button>
        </div>
      </div>
    </form>
  );
}
