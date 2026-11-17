import { createFileRoute } from "@tanstack/react-router";
import { Home, HomeLoading } from "../../features/home/Home";
import { getOverview, listSchedule } from "../../lib/staff.functions";

export const Route = createFileRoute("/$org/")({
  // Today's sessions come from the schedule; the counts from the overview.
  loader: async ({ params }) => {
    const [overview, schedule] = await Promise.all([
      getOverview({ data: { slug: params.org } }),
      listSchedule({ data: { slug: params.org, days: 1 } }),
    ]);
    return { overview, schedule };
  },
  pendingComponent: HomeLoading,
  component: HomePage,
});

function HomePage() {
  const { overview, schedule } = Route.useLoaderData();
  return <Home overview={overview} schedule={schedule} />;
}
