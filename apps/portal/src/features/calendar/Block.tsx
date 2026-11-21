import { Link } from "@tanstack/react-router";
import { SpotRow } from "@/components/parts/marks";
import type { SessionState } from "../schedule/facts";

export type BlockKind = "group_class" | "appointment" | "event";
export type Density = "full" | "compact" | "tight";

/**
 * One session on the Calendar. A class is a white card with its spots, an
 * appointment a flat grey block, an event a dark one. Full is amber, an ended
 * session washes out, and a cancelled one is a dashed red outline with its name
 * struck through. The words come from the caller, which reads the Rails
 * session. With an `href` the block is a link to the session page; without
 * one (the gallery) it is a plain box.
 */
export function CalendarBlock({
  kind,
  state,
  density = "full",
  variant = "day",
  time,
  name,
  status,
  spots,
  label,
  href,
  navId,
  active = true,
  onActive,
}: {
  kind: BlockKind;
  state: SessionState;
  density?: Density;
  variant?: "day" | "week";
  time: string;
  name: string;
  status: string;
  /** The spot stack of a class on the Day grid. */
  spots?: { capacity: number; booked: number };
  /** The accessible name. Without it the visible words are the name. */
  label?: string;
  href?: { org: string; occurrenceId: string };
  /** The id the keyboard model finds the block by. */
  navId?: string;
  active?: boolean;
  onActive?: (id: string) => void;
}) {
  const className = "cal-block";
  const data = { "data-kind": kind, "data-state": state, "data-density": density, "data-variant": variant } as const;
  const inner = (
    <>
      <span className="cal-block__time" suppressHydrationWarning>
        {time}
      </span>
      <span className="cal-block__name">{name}</span>
      <span className="cal-block__meta" suppressHydrationWarning>
        {spots ? <SpotRow capacity={spots.capacity} booked={spots.booked} state={state === "ended" ? "past" : "upcoming"} cancelled={state === "cancelled"} /> : null}
        <span className="cal-block__status">{status}</span>
      </span>
    </>
  );
  if (!href) {
    return (
      <span className={className} {...data}>
        {inner}
      </span>
    );
  }
  return (
    <Link
      to="/$org/calendar/$occurrenceId"
      params={{ org: href.org, occurrenceId: href.occurrenceId }}
      className={className}
      {...data}
      data-nav-id={navId}
      tabIndex={active ? 0 : -1}
      aria-label={label}
      onFocus={() => navId && onActive?.(navId)}
    >
      {inner}
    </Link>
  );
}
