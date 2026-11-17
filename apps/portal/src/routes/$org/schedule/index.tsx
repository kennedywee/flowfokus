import { createFileRoute } from "@tanstack/react-router";
import { DAYS, readScheduleSearch, type ScheduleSearch } from "../../../features/schedule/facts";
import { Schedule, ScheduleLoading } from "../../../features/schedule/Schedule";
import { listSchedule } from "../../../lib/staff.functions";

export const Route = createFileRoute("/$org/schedule/")({
  validateSearch: (search: Record<string, unknown>): ScheduleSearch => readScheduleSearch(search),
  // The program filter works on the loaded weeks, so only the range reloads.
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: ({ params, deps }) => listSchedule({ data: { slug: params.org, days: DAYS, ...(deps.from ? { from: deps.from } : {}) } }),
  pendingComponent: ScheduleLoading,
  component: SchedulePage,
});

function SchedulePage() {
  const schedule = Route.useLoaderData();
  const search = Route.useSearch();
  return <Schedule schedule={schedule} search={search} />;
}
