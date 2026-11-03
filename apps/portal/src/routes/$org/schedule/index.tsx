import { Link, createFileRoute } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { CalendarDays, ChevronLeft, ChevronRight, LayoutList } from "lucide-react";
import { Empty, FailureNotice, PageHead, Plate, SkeletonRows, Status } from "../../../components/ui";
import { PROGRAM_KIND_LABEL, formatTime } from "../../../lib/format";
import { useLocationName, useOrganization } from "../../../lib/organization";
import { listSchedule } from "../../../lib/staff.functions";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DAYS = 14;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute("/$org/schedule/")({
  validateSearch: (search: Record<string, unknown>): { from?: string } =>
    typeof search.from === "string" && DATE.test(search.from) ? { from: search.from } : {},
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: ({ params, deps }) => listSchedule({ data: { slug: params.org, days: DAYS, ...(deps.from ? { from: deps.from } : {}) } }),
  pendingComponent: () => <SkeletonRows rows={8} />,
  component: Schedule,
});

/** A calendar day as YYYY-MM-DD in the gym's time zone. */
function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(new Date(iso));
}

function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayTitle(day: string): string {
  return new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

export function spotsLabel(entry: Schemas["Occurrence"]): { state: "off" | "due" | "active"; label: string } {
  if (entry.cancelled_at) return { state: "off", label: "Cancelled" };
  if (entry.spots_left === 0) return { state: "due", label: "Full" };
  return { state: "active", label: `${entry.spots_left} of ${entry.capacity} left` };
}

function Schedule() {
  const schedule = Route.useLoaderData();
  const organization = useOrganization();
  const locationName = useLocationName();
  const today = dayKey(new Date().toISOString(), organization.timezone);
  const from = Route.useSearch().from ?? today;

  const days = new Map<string, Schemas["ScheduleEntry"][]>();
  if (schedule.ok) {
    for (const entry of schedule.data) {
      const key = dayKey(entry.starts_at, organization.timezone);
      days.set(key, [...(days.get(key) ?? []), entry]);
    }
  }

  return (
    <div className="page schedule-page">
      <PageHead
        title="Schedule"
      >
        <Link to="/$org/programs" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary" })}>
          <LayoutList aria-hidden="true" />
          Programs
        </Link>
      </PageHead>
      <nav className="schedule-page__range" aria-label="Weeks">
        <span>{dayTitle(from)} – {dayTitle(shiftDay(from, DAYS - 1))}</span>
        <Link
          to="/$org/schedule"
          params={{ org: organization.slug }}
          search={{ from: shiftDay(from, -DAYS) }}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft aria-hidden="true" />
          Earlier
        </Link>
        {from === today ? null : (
          <Link to="/$org/schedule" params={{ org: organization.slug }} search={{}} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Today
          </Link>
        )}
        <Link
          to="/$org/schedule"
          params={{ org: organization.slug }}
          search={{ from: shiftDay(from, DAYS) }}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Later
          <ChevronRight aria-hidden="true" />
        </Link>
      </nav>
      {!schedule.ok ? (
        <FailureNotice error={schedule.error} title="The schedule did not load" />
      ) : days.size === 0 ? (
        <Empty title="Nothing on the schedule" icon={CalendarDays}>
          <p>
            No times in these two weeks.{" "}
            <Link to="/$org/programs" params={{ org: organization.slug }}>
              Open a program
            </Link>{" "}
            to add times.
          </p>
        </Empty>
      ) : (
        [...days.entries()].map(([day, entries]) => (
          <Plate key={day} title={day === today ? `Today, ${dayTitle(day)}` : dayTitle(day)} labelledBy={`day-${day}`} flush>
            <Table>
              <colgroup>
                <col className="schedule-page__col-time" />
                <col />
                <col className="schedule-page__col-spots" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Time</TableHead>
                  <TableHead scope="col">Program</TableHead>
                  <TableHead scope="col">Spots</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const spots = spotsLabel(entry);
                  return (
                    <TableRow key={entry.id} data-cancelled={entry.cancelled_at ? "" : undefined}>
                      <TableCell className="schedule-page__time">
                        {formatTime(entry.starts_at, organization.timezone)}
                        <span className="cell-sub">to {formatTime(entry.ends_at, organization.timezone)}</span>
                      </TableCell>
                      <TableCell>
                        <Link
                          to="/$org/schedule/$occurrenceId"
                          params={{ org: organization.slug, occurrenceId: entry.id }}
                          className="cell-title"
                        >
                          {entry.program.name}
                        </Link>
                        <span className="cell-sub">
                          {PROGRAM_KIND_LABEL[entry.program.kind]} · {locationName(entry.program.location_id)}
                          {entry.program.host_name ? ` · ${entry.program.host_name}` : ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Status state={spots.state}>{spots.label}</Status>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Plate>
        ))
      )}
    </div>
  );
}
