import { createFileRoute } from "@tanstack/react-router";
import { FailureNotice } from "../../../components/ui";
import { SaleDetails, SaleDetailsLoading } from "../../../features/sales/SaleDetails";
import { getSale } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";

type Loaded = Awaited<ReturnType<typeof getSale>>;

export const Route = createFileRoute("/$org/sales/$saleId")({
  loader: ({ params }): Promise<Loaded> => {
    if (!isUuid(params.saleId)) {
      return Promise.resolve({ ok: false as const, error: { status: 404, code: "not_found" as const, message: "Sale not found" } });
    }
    return getSale({ data: { slug: params.org, id: params.saleId } });
  },
  // The top bar breadcrumb ends with what was sold.
  staticData: {
    crumb: (data) => {
      const loaded = data as Loaded | undefined;
      return loaded?.ok ? loaded.data.line_item.product_name : undefined;
    },
  },
  pendingComponent: SaleDetailsLoading,
  component: SalePage,
});

function SalePage() {
  const sale = Route.useLoaderData();
  if (!sale.ok) {
    return (
      <div className="page">
        <FailureNotice error={sale.error} title="This sale did not load" />
      </div>
    );
  }
  return <SaleDetails sale={sale.data} />;
}
