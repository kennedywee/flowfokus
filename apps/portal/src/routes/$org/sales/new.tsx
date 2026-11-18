import { createFileRoute } from "@tanstack/react-router";
import { NewSale, NewSaleLoading } from "../../../features/sales/NewSale";
import { listMembers, listProducts } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";

export const Route = createFileRoute("/$org/sales/new")({
  // Sell (S) on a member page opens this page for that member; on a product page, with that price.
  validateSearch: (search: Record<string, unknown>): { member?: string; price?: string } => ({
    ...(isUuid(search.member) ? { member: search.member } : {}),
    ...(isUuid(search.price) ? { price: search.price } : {}),
  }),
  loader: async ({ params }) => {
    const [members, products] = await Promise.all([
      listMembers({ data: { slug: params.org } }),
      listProducts({ data: { slug: params.org } }),
    ]);
    return { members, products };
  },
  // The top bar breadcrumb ends with this page's name.
  staticData: { crumb: () => "New sale" },
  pendingComponent: NewSaleLoading,
  component: NewSalePage,
});

function NewSalePage() {
  const data = Route.useLoaderData();
  const { member, price } = Route.useSearch();
  return <NewSale data={data} memberId={member} priceId={price} />;
}
