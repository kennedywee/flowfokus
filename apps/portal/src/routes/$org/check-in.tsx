import { createFileRoute } from "@tanstack/react-router";
import { CheckIns, CheckInsLoading } from "../../features/check-ins/CheckIns";
import { readCheckInsSearch, type CheckInsSearch } from "../../features/check-ins/facts";
import { getOverview, listCheckIns } from "../../lib/staff.functions";

export const Route = createFileRoute("/$org/check-in")({
  validateSearch: (search: Record<string, unknown>): CheckInsSearch => readCheckInsSearch(search),
  // The day count comes from the overview; the rows from the latest check-ins.
  loader: async ({ params }) => {
    const [visits, overview] = await Promise.all([
      listCheckIns({ data: { slug: params.org } }),
      getOverview({ data: { slug: params.org } }),
    ]);
    return { visits, overview };
  },
  pendingComponent: CheckInsLoading,
  component: CheckInsPage,
});

function CheckInsPage() {
  const { visits, overview } = Route.useLoaderData();
  const search = Route.useSearch();
  return <CheckIns visits={visits} overview={overview} search={search} />;
}
