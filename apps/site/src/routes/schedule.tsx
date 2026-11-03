import { Link, createFileRoute } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { formatMoney, listNames, PROGRAM_KIND_LABEL } from "../lib/format";
import { useDates, useGym } from "../lib/site";
import { getSchedulePage } from "../lib/site.functions";

export const Route = createFileRoute("/schedule")({
  loader: () => getSchedulePage(),
  component: Schedule,
});

function Schedule() {
  const page = Route.useLoaderData();
  const { organization } = useGym();
  const dates = useDates();

  if (page.kind === "error") {
    return (
      <section className="message">
        <div className="wrap">
          <h1>Schedule</h1>
          <div className="notice" data-tone="error" role="alert">
            <span className="lamp" data-state="denied" aria-hidden="true" />
            <p className="notice__title">The schedule did not load</p>
            <p className="notice__body">{page.message}</p>
          </div>
        </div>
      </section>
    );
  }

  const { programs, occurrences } = page.schedule;
  const programById = new Map(programs.map((program) => [program.id, program]));
  const days = new Map<string, Schemas["PublicOccurrence"][]>();
  for (const occurrence of occurrences) {
    const key = dates.dayKey(occurrence.starts_at);
    days.set(key, [...(days.get(key) ?? []), occurrence]);
  }

  return (
    <section className="schedule" aria-labelledby="schedule-heading">
      <div className="wrap">
        <h1 id="schedule-heading">Schedule</h1>
        <p className="opening__lede">
          Classes, events, and appointments at {organization.name} for the next two weeks. Times are in the gym's local time.
        </p>
        {days.size === 0 ? (
          <div className="empty">
            <p className="empty__title">Nothing on the schedule yet</p>
            <p>Check back soon, or ask at the front desk.</p>
          </div>
        ) : (
          [...days.entries()].map(([key, list]) => (
            <section key={key} className="schedule__day" aria-labelledby={`day-${key}`}>
              <h2 id={`day-${key}`}>{dates.day(list[0]!.starts_at)}</h2>
              <ul className="slots">
                {list.map((occurrence) => {
                  const program = programById.get(occurrence.program_id);
                  return program ? <Slot key={occurrence.id} occurrence={occurrence} program={program} /> : null;
                })}
              </ul>
            </section>
          ))
        )}

        {programs.length ? (
          <section className="schedule__programs" aria-labelledby="ways-heading">
            <h2 id="ways-heading">Ways to book</h2>
            <ul className="ways">
              {programs.map((program) => (
                <li key={program.id} className="plate way">
                  <h3>{program.name}</h3>
                  {program.description ? <p>{program.description}</p> : null}
                  <p className="field__hint">
                    {program.ticket_prices.length
                      ? `Ticket: ${program.ticket_prices.map((price) => `${price.label} ${formatMoney(price.amount_minor, price.currency)}`).join(", ")}. `
                      : "No single tickets. "}
                    {program.accepted_by.length ? `Included in ${listNames(program.accepted_by)}.` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <p>
              <Link to="/" hash="offers">
                See passes and memberships
              </Link>
            </p>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function Slot({ occurrence, program }: { occurrence: Schemas["PublicOccurrence"]; program: Schemas["PublicScheduleProgram"] }) {
  const dates = useDates();
  const status = occurrence.cancelled
    ? { state: "off", text: "Cancelled" }
    : occurrence.spots_left === 0
      ? { state: "due", text: "Full" }
      : { state: "active", text: occurrence.spots_left === 1 ? "1 spot left" : `${occurrence.spots_left} spots left` };
  return (
    <li className="slot plate" data-cancelled={occurrence.cancelled ? "" : undefined}>
      <span className="slot__time">
        <time dateTime={occurrence.starts_at} suppressHydrationWarning>
          {dates.time(occurrence.starts_at)}
        </time>
        <span className="field__hint">{program.duration_minutes} min</span>
      </span>
      <span className="slot__what">
        <strong>{program.name}</strong>
        <span className="field__hint">
          {PROGRAM_KIND_LABEL[program.kind]} · {program.location_name}
          {program.host_name ? ` · ${program.host_name}` : ""}
        </span>
      </span>
      <span className="status slot__spots">
        <span className="lamp" data-state={status.state} aria-hidden="true" />
        {status.text}
      </span>
      {occurrence.bookable ? (
        <Link to="/book/$occurrenceId" params={{ occurrenceId: occurrence.id }} className="button slot__book">
          Book<span className="visually-hidden"> {program.name} at {dates.dateTime(occurrence.starts_at)}</span>
        </Link>
      ) : (
        <span className="slot__book" aria-hidden="true" />
      )}
    </li>
  );
}
