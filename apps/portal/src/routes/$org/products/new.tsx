import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "../../../features/products/ProductForm";
import { listPrograms } from "../../../lib/staff.functions";

export const Route = createFileRoute("/$org/products/new")({
  // Programs name what a benefit books. Without programs:read the list is empty.
  loader: async ({ params }) => {
    const programs = await listPrograms({ data: { slug: params.org } });
    return programs.ok ? programs.data : [];
  },
  // The top bar breadcrumb ends with this page's name.
  staticData: { crumb: () => "New product" },
  component: NewProductPage,
});

function NewProductPage() {
  return <ProductForm programs={Route.useLoaderData()} />;
}
