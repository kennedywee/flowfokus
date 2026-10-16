import { createFileRoute } from "@tanstack/react-router";
import { Empty, FailureNotice, PageHead, Plate, SkeletonRows, Status } from "../../components/ui";
import { formatDuration, formatMoney, formatUsage } from "../../lib/format";
import { useLocationName } from "../../lib/organization";
import { listProducts } from "../../lib/staff.functions";

export const Route = createFileRoute("/$org/products")({
  loader: ({ params }) => listProducts({ data: { slug: params.org } }),
  pendingComponent: () => <SkeletonRows rows={6} />,
  component: Products,
});

function Products() {
  const products = Route.useLoaderData();
  const locationName = useLocationName();

  return (
    <div className="page">
      <PageHead
        title="Offers"
        description="Membership products and their prices. A price never changes; a new amount or term is a new price."
      />
      {!products.ok ? (
        <FailureNotice error={products.error} title="Offers did not load" />
      ) : products.data.length === 0 ? (
        <Empty title="No offers yet">
          <p>Offers appear here once the catalog has products.</p>
        </Empty>
      ) : (
        products.data.map((product) => (
          <Plate
            key={product.id}
            title={product.name}
            description={product.published ? "Shown on the gym site" : "Staff only. Not shown on the gym site."}
          >
            {product.description ? <p>{product.description}</p> : null}
            <p className="cell-sub">
              {product.benefits
                .map((benefit) => `${benefit.name}: ${formatUsage(benefit.usage_limit)}, ${locationName(benefit.location_id)}`)
                .join(" · ")}
            </p>
            <div className="table-wrap">
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th scope="col">Price</th>
                    <th scope="col">Term</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.prices.map((price) => (
                    <tr key={price.id}>
                      <td className="cell-title">{price.label}</td>
                      <td data-label="Term">{formatDuration(price.duration_days)}</td>
                      <td>
                        <Status state={price.available ? "active" : "off"}>
                          {price.archived_at ? "Archived" : price.available ? "On sale" : "Not on sale"}
                        </Status>
                      </td>
                      <td className="num" data-label="Amount">
                        {formatMoney(price.amount_minor, price.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Plate>
        ))
      )}
    </div>
  );
}
