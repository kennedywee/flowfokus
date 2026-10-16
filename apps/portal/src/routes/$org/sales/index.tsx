import { Link, createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { SalesTable } from "../../../components/SalesTable";
import { Empty, FailureNotice, PageHead, Plate, SkeletonRows } from "../../../components/ui";
import { useOrganization } from "../../../lib/organization";
import { listSales } from "../../../lib/staff.functions";

type View = "all" | "due" | "deliver";
const VIEWS: { id: View; label: string }[] = [
  { id: "all", label: "All" },
  { id: "due", label: "Balance due" },
  { id: "deliver", label: "Waiting for delivery" },
];

export const Route = createFileRoute("/$org/sales/")({
  validateSearch: (search: Record<string, unknown>): { view?: View } =>
    search.view === "due" || search.view === "deliver" ? { view: search.view } : {},
  loader: ({ params }) => listSales({ data: { slug: params.org } }),
  pendingComponent: () => <SkeletonRows rows={6} />,
  component: Sales,
});

function Sales() {
  const sales = Route.useLoaderData();
  const { view = "all" } = Route.useSearch();
  const organization = useOrganization();

  const shown = sales.ok
    ? sales.data.filter((sale) =>
        view === "due" ? sale.balance_minor > 0 : view === "deliver" ? sale.balance_minor === 0 && !sale.fulfilled : true,
      )
    : [];

  return (
    <div className="page">
      <PageHead title="Sales" description="Every membership sale, with what is paid and what is delivered.">
        <Link to="/$org/sales/new" params={{ org: organization.slug }} className="button">
          <ShoppingBag aria-hidden="true" />
          New sale
        </Link>
      </PageHead>
      <Plate title={VIEWS.find((item) => item.id === view)?.label ?? "All"} labelledBy="sales-heading">
        <nav className="segmented" aria-label="Filter sales">
          {VIEWS.map((item) => (
            <Link
              key={item.id}
              to="/$org/sales"
              params={{ org: organization.slug }}
              search={item.id === "all" ? {} : { view: item.id }}
              aria-current={item.id === view ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {sales.ok ? (
          shown.length ? (
            <SalesTable sales={shown} />
          ) : (
            <Empty title={view === "all" ? "No sales yet" : "Nothing here"}>
              <p>
                {view === "due"
                  ? "Every sale is fully paid."
                  : view === "deliver"
                    ? "Every paid sale is delivered."
                    : "Record the first sale from a member's page or with New sale."}
              </p>
            </Empty>
          )
        ) : (
          <FailureNotice error={sales.error} title="Sales did not load" />
        )}
      </Plate>
    </div>
  );
}
