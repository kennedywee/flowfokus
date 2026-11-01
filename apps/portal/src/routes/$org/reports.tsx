import { createFileRoute } from "@tanstack/react-router";
import { SkeletonRows } from "../../components/ui";
import { REPORT_PERIODS, Reports, type ReportPeriod } from "../../features/preview/Reports";
import { getReport } from "../../lib/staff.functions";

interface ReportsSearch {
  period?: ReportPeriod;
}

export const Route = createFileRoute("/$org/reports")({
  validateSearch: (search: Record<string, unknown>): ReportsSearch =>
    typeof search.period === "string" && search.period in REPORT_PERIODS ? { period: search.period as ReportPeriod } : {},
  loaderDeps: ({ search }) => ({ period: search.period ?? "Last 4 weeks" }),
  loader: ({ params, deps }) => getReport({ data: { slug: params.org, weeks: REPORT_PERIODS[deps.period as ReportPeriod] } }),
  pendingComponent: () => <SkeletonRows rows={6} />,
  component: ReportsRoute,
});

function ReportsRoute() {
  const report = Route.useLoaderData();
  const { period = "Last 4 weeks" } = Route.useSearch();
  return <Reports report={report} period={period} />;
}
