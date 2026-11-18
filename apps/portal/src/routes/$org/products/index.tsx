import { createFileRoute } from "@tanstack/react-router";
import { readProductsSearch, type ProductsSearch } from "../../../features/products/facts";
import { ProductsList, ProductsLoading } from "../../../features/products/ProductsList";
import { listProducts } from "../../../lib/staff.functions";

export const Route = createFileRoute("/$org/products/")({
  validateSearch: (search: Record<string, unknown>): ProductsSearch => readProductsSearch(search),
  loader: ({ params }) => listProducts({ data: { slug: params.org } }),
  pendingComponent: ProductsLoading,
  component: ProductsPage,
});

function ProductsPage() {
  const products = Route.useLoaderData();
  const search = Route.useSearch();
  return <ProductsList products={products} search={search} />;
}
