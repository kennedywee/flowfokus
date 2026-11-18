import { createFileRoute } from "@tanstack/react-router";
import { ProductDetails, ProductDidNotLoad, ProductLoading } from "../../../features/products/ProductDetails";
import { failureMessage } from "../../../lib/format";
import { loadProduct, productCrumb } from "../../../features/products/load";

export const Route = createFileRoute("/$org/products/$productId")({
  loader: ({ params }) => loadProduct(params.org, params.productId),
  staticData: { crumb: productCrumb },
  pendingComponent: ProductLoading,
  component: ProductPage,
});

function ProductPage() {
  const { product, programs } = Route.useLoaderData();
  if (!product.ok) {
    return <ProductDidNotLoad notFound={product.error.code === "not_found"} message={failureMessage(product.error)} />;
  }
  return <ProductDetails product={product.data} programs={programs} />;
}
