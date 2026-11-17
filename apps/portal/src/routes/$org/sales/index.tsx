import { createFileRoute } from "@tanstack/react-router";
import { readSalesSearch, type SalesSearch } from "../../../features/sales/facts";
import { SalesList, SalesListLoading } from "../../../features/sales/SalesList";
import { listSales } from "../../../lib/staff.functions";

export const Route = createFileRoute("/$org/sales/")({
  validateSearch: (search: Record<string, unknown>): SalesSearch => readSalesSearch(search),
  loader: ({ params }) => listSales({ data: { slug: params.org } }),
  pendingComponent: SalesListLoading,
  component: SalesPage,
});

function SalesPage() {
  const sales = Route.useLoaderData();
  const search = Route.useSearch();
  return <SalesList sales={sales} search={search} />;
}
