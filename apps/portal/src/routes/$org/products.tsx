import { createFileRoute } from "@tanstack/react-router";
import { EyeOff, Globe } from "lucide-react";
import { Empty, FailureNotice, PageHead, Pill, Plate, SkeletonRows, Status } from "../../components/ui";
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
    <div className="page offers-page">
      <PageHead
        title="Offers"
        description="Membership products and their prices. A price never changes; a new amount or term is a new price."
      />
      {!products.ok ? (
        <FailureNotice error={products.error} title="Offers did not load" />
      ) : products.data.length === 0 ? (
        <Empty title="No offers yet">
          <p>Offers appear here once the catalog has products. Add a product to the catalog, then reload this page.</p>
        </Empty>
      ) : (
        products.data.map((product) => (
          <Plate
            key={product.id}
            labelledBy={`offer-${product.id}`}
            title={product.name}
            flush
            description={product.published ? "Shown on the gym site" : "Staff only. Not shown on the gym site."}
            action={
              product.published ? (
                <Pill tone="good" icon={Globe}>
                  Published
                </Pill>
              ) : (
                <Pill tone="neutral" icon={EyeOff}>
                  Staff only
                </Pill>
              )
            }
          >
            {product.description || product.benefits.length ? (
              <div className="offer__meta">
                {product.description ? <p className="offer__description">{product.description}</p> : null}
                {product.benefits.length ? (
                  <ul className="chips offer__benefits" aria-label="What this offer includes">
                    {product.benefits.map((benefit) => (
                      <li key={benefit.id} className="tag">
                        {benefit.name} · {formatUsage(benefit.usage_limit)} · {locationName(benefit.location_id)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {product.prices.length === 0 ? (
              <p className="offer__empty">No prices yet. Add a price in the catalog to sell this offer.</p>
            ) : (
              <div className="offer__table table-wrap">
                <table className="table">
                  <colgroup>
                    <col />
                    <col className="offer__col-term" />
                    <col className="offer__col-status" />
                    <col className="offer__col-amount" />
                  </colgroup>
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
                        <td className="offer__term">{formatDuration(price.duration_days)}</td>
                        <td>
                          <Status state={price.available ? "active" : "off"}>
                            {price.archived_at ? "Archived" : price.available ? "On sale" : "Not on sale"}
                          </Status>
                        </td>
                        <td className="num">{formatMoney(price.amount_minor, price.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Plate>
        ))
      )}
    </div>
  );
}
