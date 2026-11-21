import { createFileRoute } from "@tanstack/react-router";
import { Calendar, CalendarLoading } from "../../../features/calendar/Calendar";
import { rangeFor, readCalendarSearch, viewOf, type CalendarSearch } from "../../../features/calendar/facts";
import { dayKey } from "../../../features/schedule/facts";
import { listSchedule } from "../../../lib/staff.functions";

export const Route = createFileRoute("/$org/calendar/")({
  validateSearch: (search: Record<string, unknown>): CalendarSearch => readCalendarSearch(search),
  // The program filter, the kinds, and the grouping work on the loaded range, so only the view and the date reload.
  loaderDeps: ({ search }) => ({ view: viewOf(search), date: search.date }),
  loader: async ({ params, deps, parentMatchPromise }) => {
    // `loadedAt` is the one clock for the server render and the first browser render.
    const loadedAt = Date.now();
    const organization = (await parentMatchPromise).loaderData?.organization;
    const timeZone = organization?.ok ? organization.data.timezone : "UTC";
    const today = dayKey(new Date(loadedAt).toISOString(), timeZone);
    const { from, days } = rangeFor(deps.view, deps.date ?? today);
    return { today, loadedAt, schedule: await listSchedule({ data: { slug: params.org, from, days } }) };
  },
  pendingComponent: CalendarLoading,
  component: CalendarPage,
});

function CalendarPage() {
  const { schedule, today, loadedAt } = Route.useLoaderData();
  const search = Route.useSearch();
  return <Calendar schedule={schedule} today={today} loadedAt={loadedAt} search={search} />;
}
