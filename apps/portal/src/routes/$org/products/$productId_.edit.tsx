import { createFileRoute } from "@tanstack/react-router";
import { ProductDidNotLoad, ProductLoading } from "../../../features/products/ProductDetails";
import { ProductForm } from "../../../features/products/ProductForm";
import { failureMessage } from "../../../lib/format";
import { loadProduct, productCrumb } from "../../../features/products/load";

/** Paper "Edit product": the New product page with Save changes, without Type. */
export const Route = createFileRoute("/$org/products/$productId_/edit")({
  loader: ({ params }) => loadProduct(params.org, params.productId),
  staticData: { crumb: productCrumb },
  pendingComponent: ProductLoading,
  component: EditProductPage,
});

function EditProductPage() {
  const { product, programs } = Route.useLoaderData();
  if (!product.ok) {
    return <ProductDidNotLoad notFound={product.error.code === "not_found"} message={failureMessage(product.error)} />;
  }
  // A new key per product, so the form starts from the saved values.
  return <ProductForm key={product.data.id} product={product.data} programs={programs} />;
}
