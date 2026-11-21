import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Schemas } from "@flowfokus/api";
import { initials } from "../../components/ui";
import { useOrganization } from "../../lib/organization";
import { clockTime } from "../check-ins/facts";
import { arrivalCounts, arrivals, axisFor, axisPosition, onRibbon, placeAvatars, ribbonText } from "./arrival";

type Roster = Schemas["Roster"];

/** An avatar is 24px; the gap keeps two apart. */
const AVATAR = 28;
const LANES = 3;
/** Most spot circles beside the counts. A bigger session shows the text alone. */
const MAX_DOTS = 24;

/**
 * The arrival ribbon (Paper "Session details"): a time axis around the
 * session, a Now pin, the members who are here at the time Rails marked them,
 * and the counts of who is still to arrive and how many spots are open. Rails
 * knows when a member was checked in, not when they walked in, so an avatar sits
 * at the check-in time. A member who does not fit in three rows is left out of
 * the ribbon; the Bookings list shows everyone. Nothing is drawn for a cancelled
 * session.
 */
export function ArrivalRibbon({ roster, now }: { roster: Roster; now: number }) {
  const tz = useOrganization().timezone;
  const here = useMemo(() => onRibbon(arrivals(roster.bookings), roster), [roster]);
  const counts = arrivalCounts(roster);
  const axis = useMemo(() => axisFor(roster, here, tz), [roster, here, tz]);
  const over = Date.parse(roster.ends_at) <= now;
  const text = ribbonText(counts, over);
  // The plot's width places the avatars. It is read after the page mounts.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const plot = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const element = plot.current;
    if (!element || !mounted) return;
    const measure = () => setWidth(Math.round(element.getBoundingClientRect().width) || 720);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [mounted]);

  const placed = placeAvatars(
    here.map((arrival) => ({ id: arrival.id, x: axisPosition(arrival.at, axis) * width })),
    AVATAR,
    LANES,
  );
  // No avatars: the axis sits right under the Now pill, so an empty ribbon stays short.
  const lanes = Math.max(0, ...placed.map((item) => item.lane + 1));
  const byId = new Map(here.map((arrival) => [arrival.id, arrival]));
  const startsAt = Date.parse(roster.starts_at);
  const nowOnAxis = now >= axis.start && now <= axis.end;
  const dots = roster.capacity <= MAX_DOTS;
  const pct = (at: number) => `${axisPosition(at, axis) * 100}%`;

  return (
    <section className="ribbon" aria-label="Arrivals">
      <p className="ribbon__text">
        <strong>{text.waiting}</strong>
        {text.rest}
        {dots ? (
          <span className="ribbon__dots" aria-hidden="true">
            {Array.from({ length: counts.waiting }, (_, index) => (
              <i key={`w${index}`} className="ribbon__dot" data-kind="waiting" />
            ))}
            {Array.from({ length: Math.min(counts.open, MAX_DOTS) }, (_, index) => (
              <i key={`o${index}`} className="ribbon__dot" data-kind="open" />
            ))}
          </span>
        ) : null}
      </p>
      <div className="ribbon__plot" ref={plot} aria-hidden="true" style={{ ["--lanes" as string]: lanes }}>
        <span className="ribbon__line" />
        <span className="ribbon__session" style={{ left: pct(startsAt), right: `${100 - axisPosition(Date.parse(roster.ends_at), axis) * 100}%` }} />
        {axis.ticks.map((tick, index) => {
          const hidden = nowOnAxis && Math.abs(axisPosition(tick.at, axis) - axisPosition(now, axis)) < 0.07;
          return (
            <span
              key={tick.at}
              className="ribbon__tick"
              data-edge={index === 0 ? "start" : index === axis.ticks.length - 1 ? "end" : undefined}
              data-hidden={hidden || undefined}
              style={{ left: pct(tick.at) }}
            >
              {tick.label}
            </span>
          );
        })}
        {placed.map((item) => {
          const arrival = byId.get(item.id);
          if (!arrival) return null;
          return (
            <span key={item.id} className="ribbon__avatar" style={{ left: pct(arrival.at), ["--lane" as string]: item.lane }} title={`${arrival.name} · ${clockTime(new Date(arrival.at).toISOString(), tz)}`}>
              <span className="ribbon__initials">{initials(arrival.name)}</span>
            </span>
          );
        })}
        {nowOnAxis ? (
          <span className="ribbon__now" style={{ left: pct(now) }}>
            <span className="ribbon__now-pill">Now</span>
            <span className="ribbon__now-time" suppressHydrationWarning>
              {clockTime(new Date(now).toISOString(), tz)}
            </span>
          </span>
        ) : null}
      </div>
    </section>
  );
}
