import { Link } from "@tanstack/react-router";
import { SpotColumn, SpotKey } from "@/components/parts/marks";
import { useOrganization } from "../../lib/organization";
import { sessionName } from "../schedule/facts";
import { isOver, spotsText, type Chart } from "./sessions";

/** Most spots one column draws. Matches `SpotColumn`. */
const COLUMN_ROWS = 16;
/** Pixels of one spot in a column. Matches `SpotColumn`. */
const SPOT = 8;

/**
 * The chart of the last week and the next 30 days (Paper "Program details"):
 * one spot stack per session on a line of days, a Today pin, a mark on the
 * first cancelled session, and the date of the last session. It repeats what
 * the Sessions list says, so assistive technology skips it and the list stays
 * the way to open a session. A click on a column opens that session.
 */
export function SessionsChart({ chart, now }: { chart: Chart; now: number }) {
  const organization = useOrganization();
  const tz = organization.timezone;
  const count = chart.days.length;
  const tallest = Math.min(COLUMN_ROWS, Math.max(...chart.days.flatMap((day) => day.sessions.map((session) => session.capacity)), 1));
  const lastDay = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" })
    .format(chart.last ? new Date(chart.last.starts_at) : new Date())
    .replace(",", "");
  return (
    <section className="program-chart" aria-labelledby="program-chart-title">
      <div className="program-chart__head">
        <h2 id="program-chart-title">Last week and the next 30 days</h2>
        <SpotKey />
      </div>
      <div className="program-chart__scroll">
        <div
          className="program-chart__plot"
          aria-hidden="true"
          style={{ ["--days" as string]: count, ["--rows" as string]: tallest * SPOT }}
        >
          <div className="program-chart__today" style={{ left: `${((chart.todayIndex + 0.5) / count) * 100}%` }}>
            <span className="program-chart__today-label">Today</span>
          </div>
          <div className="program-chart__columns">
            {chart.days.map((day, index) => (
              <div key={day.day} className="program-chart__day" data-today={index === chart.todayIndex || undefined}>
                {day.sessions.map((session) => (
                  <Link
                    key={session.id}
                    to="/$org/calendar/$occurrenceId"
                    params={{ org: organization.slug, occurrenceId: session.id }}
                    className="program-chart__column"
                    tabIndex={-1}
                    title={`${sessionName(session.starts_at, tz)} · ${spotsText(session)}`}
                  >
                    <SpotColumn
                      capacity={session.capacity}
                      booked={session.spots_taken}
                      state={isOver(session, now) ? "past" : "upcoming"}
                      cancelled={Boolean(session.cancelled_at)}
                    />
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <div className="program-chart__axis">
            {chart.days.map((day) => (
              <i key={day.day} className="program-chart__tick" />
            ))}
          </div>
          <div className="program-chart__labels">
            {chart.ticks.map((tick) => (
              <span
                key={tick.index}
                className="program-chart__label"
                data-edge={tick.index >= count - 2 ? "end" : tick.index <= 1 ? "start" : undefined}
                style={{ gridColumn: tick.index + 1 }}
              >
                {tick.label}
              </span>
            ))}
            {chart.firstCancelled
              ? chart.days.flatMap((day, index) =>
                  day.sessions.some((session) => session.id === chart.firstCancelled)
                    ? [
                        <span key="cancelled" className="program-chart__cancelled" style={{ gridColumn: index + 1, gridRow: 2 }}>
                          Cancelled
                        </span>,
                      ]
                    : [],
                )
              : null}
          </div>
        </div>
      </div>
      {chart.last ? (
        <p className="program-chart__last">
          <span>Last session</span>
          <span suppressHydrationWarning>{lastDay}</span>
        </p>
      ) : null}
    </section>
  );
}
