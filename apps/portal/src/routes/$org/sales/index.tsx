import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { SalesTable } from "../../../components/SalesTable";
import { Empty, FailureNotice, PageHead, Plate, SkeletonRows } from "../../../components/ui";
import { useOrganization } from "../../../lib/organization";
import { listSales } from "../../../lib/staff.functions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [query, setQuery] = useState("");

  const inView = sales.ok
    ? sales.data.filter((sale) =>
        view === "due" ? sale.balance_minor > 0 : view === "deliver" ? sale.balance_minor === 0 && !sale.fulfilled : true,
      )
    : [];
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? inView.filter((sale) =>
        [sale.member.name, sale.line_item.product_name, sale.line_item.price_label].some((text) =>
          text.toLowerCase().includes(needle),
        ),
      )
    : inView;

  return (
    <div className="page sales-page">
      <PageHead title="Sales" description="Every membership sale, with what is paid and what is delivered.">
        <Link to="/$org/sales/new" params={{ org: organization.slug }} className={buttonVariants()}>
          <Plus aria-hidden="true" strokeWidth={1.75} />
          New sale
        </Link>
      </PageHead>
      <Plate title="Sales list" labelledBy="sales-heading" flush>
        {sales.ok ? (
          <>
            <div className="toolbar sales-page__toolbar">
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
              <span className="sales-page__count" aria-live="polite">
                {shown.length} {shown.length === 1 ? "sale" : "sales"}
              </span>
              <span className="toolbar__spacer" />
              <div className="search-field">
                <Search aria-hidden="true" strokeWidth={1.75} />
                <Input
                  type="search"
                  className="input--small"
                  aria-label="Search sales by member or offer"
                  placeholder="Search member or offer"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            {shown.length ? (
              <SalesTable sales={shown} />
            ) : needle ? (
              <Empty title="No sales match" icon={Search}>
                <p>Nothing in this list matches “{query.trim()}”. Check the spelling or clear the search.</p>
                <Button variant="secondary" size="sm" type="button" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </Empty>
            ) : (
              <Empty title={view === "all" ? "No sales yet" : "Nothing here"} icon={ShoppingBag}>
                <p>
                  {view === "due"
                    ? "Every sale is fully paid."
                    : view === "deliver"
                      ? "Every paid sale is delivered."
                      : "Record the first sale from a member's page or with New sale."}
                </p>
              </Empty>
            )}
          </>
        ) : (
          <div className="sales-page__pad">
            <FailureNotice error={sales.error} title="Sales did not load" />
          </div>
        )}
      </Plate>
    </div>
  );
}
