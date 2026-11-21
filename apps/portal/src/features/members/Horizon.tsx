import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { formatTime } from "../../lib/format";
import { placeLabels, position, type Horizon as HorizonData, type HorizonEvent } from "./timeline";

const DAY = 24 * 3_600_000;

/** A 7px-wide estimate of one character, for placing labels before they paint. */
const CHAR = 6.4;
const MAX_LABEL = 168;

/**
 * The Horizon (Paper "Member details"): a line of the last week and the next
 * 30 days. Today is a ringed dot, coming bookings are rings, earlier ones are
 * small dots, and a membership or pass that ends is an amber ring. Labels sit
 * above and below the line; one that would overlap is left out, and the list
 * for assistive technology names every mark. The marks come from the member
 * record Rails returned (bookings, periods, and rights).
 */
export function Horizon({ horizon, timezone }: { horizon: HorizonData; /** The organization's time zone. */ timezone: string }) {
  const { start, end, events } = horizon;
  // The marks come from the clock, so the server and the browser would place them differently. They draw after hydration.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const track = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  useEffect(() => {
    const element = track.current;
    if (!element || !mounted) return;
    const measure = () => setWidth(Math.round(element.getBoundingClientRect().width) || 760);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [mounted]);

  const day = useMemo(
    () => new Intl.DateTimeFormat("en-MY", { timeZone: timezone, weekday: "short", day: "numeric", month: "short" }),
    [timezone],
  );
  const range = useMemo(() => new Intl.DateTimeFormat("en-MY", { timeZone: timezone, day: "numeric", month: "short" }), [timezone]);
  const sub = (event: HorizonEvent) => {
    const date = day.format(event.at);
    return event.kind === "booking" ? `${date} · ${formatTime(new Date(event.at).toISOString(), timezone)}` : date;
  };

  const boxes = events.map((event) => ({
    id: event.id,
    x: position(event.at, start, end) * width,
    width: Math.min(MAX_LABEL, Math.max(event.title.length, sub(event).length) * CHAR) + 2,
  }));
  const places = placeLabels(boxes, width, "today");
  const days = Math.round((end - start) / DAY);

  return (
    <section className="horizon" aria-labelledby="horizon-title">
      <div className="horizon__head">
        <h2 id="horizon-title">{horizon.shortened ? "Recent bookings and the next 30 days" : "Last week and the next 30 days"}</h2>
        <span className="horizon__range" suppressHydrationWarning>
          {range.format(start)} – {range.format(end)}
        </span>
      </div>
      {mounted ? (
        <ol className="visually-hidden">
          {events.map((event) => (
            <li key={event.id}>
              {event.title}, {sub(event)}
              {event.past && event.kind !== "today" ? ", earlier" : ""}
            </li>
          ))}
        </ol>
      ) : null}
      <div className="horizon__plot" ref={track} aria-hidden="true">
        {mounted ? (
          <>
            <span className="horizon__line" />
            {Array.from({ length: days + 1 }, (_, index) => (
              <i
                key={index}
                className="horizon__tick"
                data-week={index % 7 === 0 || undefined}
                style={{ left: `${(index / days) * 100}%` }}
              />
            ))}
            {events.map((event) => {
              const left = `${position(event.at, start, end) * 100}%`;
              const place = places.get(event.id);
              return (
                <span key={event.id}>
                  <i
                    className="horizon__mark"
                    data-kind={event.kind}
                    data-past={event.past || undefined}
                    data-tone={event.tone}
                    style={{ left }}
                  />
                  {place ? (
                    <span
                      className="horizon__label"
                      data-lane={place.lane}
                      data-align={place.align}
                      data-past={event.past || undefined}
                      data-tone={event.tone}
                      data-kind={event.kind}
                      style={place.align === "start" ? { left: `calc(${left} - 5px)` } : { right: `calc(100% - ${left} - 5px)` }}
                    >
                      <span className="horizon__title">{event.title}</span>
                      <span className="horizon__when">{sub(event)}</span>
                    </span>
                  ) : null}
                </span>
              );
            })}
          </>
        ) : null}
      </div>
    </section>
  );
}
