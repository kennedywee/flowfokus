import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { EyeOff, Globe, Pencil, Plus } from "lucide-react";
import { PriceDialog, ProductDialog } from "../../components/OfferDialogs";
import { PriceActions } from "../../components/PriceActions";
import { Empty, FailureNotice, PageHead, Pill, Plate, SkeletonRows, Status } from "../../components/ui";
import { PRODUCT_KIND_LABEL, formatBenefitUsage, formatDuration, formatMoney, formatProgramScope } from "../../lib/format";
import { useCan, useLocationName } from "../../lib/organization";
import { listPrograms, listProducts } from "../../lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Editing = { kind: "new" } | { kind: "edit"; product: Schemas["StaffProduct"] } | { kind: "price"; product: Schemas["StaffProduct"] } | null;

export const Route = createFileRoute("/$org/products")({
  loader: async ({ params }) => {
    const [products, programs] = await Promise.all([
      listProducts({ data: { slug: params.org } }),
      listPrograms({ data: { slug: params.org } }),
    ]);
    // Without programs:read, program benefits still save; they just name no programs here.
    return { products, programs: programs.ok ? programs.data : [] };
  },
  pendingComponent: () => <SkeletonRows rows={6} />,
  component: Products,
});

function Products() {
  const { products, programs } = Route.useLoaderData();
  const locationName = useLocationName();
  const programName = (id: string) => programs.find((program) => program.id === id)?.name ?? "A removed program";
  const can = useCan();
  const canEdit = can("products:update");
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <div className="page offers-page">
      <PageHead
        title="Plans & offers"
      >
        {can("products:create") ? (
          <Button type="button" onClick={() => setEditing({ kind: "new" })}>
            <Plus aria-hidden="true" />
            Add offer
          </Button>
        ) : null}
      </PageHead>
      {!products.ok ? (
        <FailureNotice error={products.error} title="Offers did not load" />
      ) : products.data.length === 0 ? (
        <Empty title="No offers yet">
          <p>
            {can("products:create")
              ? "Select Add offer to create the first membership offer."
              : "Offers appear here once a manager adds them."}
          </p>
        </Empty>
      ) : (
        products.data.map((product) => (
          <Plate
            key={product.id}
            labelledBy={`offer-${product.id}`}
            title={product.name}
            flush
            action={
              <span className="offer__actions">
                <Pill tone="info">{PRODUCT_KIND_LABEL[product.kind]}</Pill>
                {product.published ? (
                  <Pill tone="good" icon={Globe}>
                    Published
                  </Pill>
                ) : (
                  <Pill tone="neutral" icon={EyeOff}>
                    Staff only
                  </Pill>
                )}
                {canEdit ? (
                  <>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditing({ kind: "edit", product })}>
                      <Pencil aria-hidden="true" />
                      Edit<span className="visually-hidden"> {product.name}</span>
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditing({ kind: "price", product })}>
                      <Plus aria-hidden="true" />
                      Add price<span className="visually-hidden"> to {product.name}</span>
                    </Button>
                  </>
                ) : null}
              </span>
            }
          >
            {product.description || product.benefits.length ? (
              <div className="offer__meta">
                {product.description ? <p className="offer__description">{product.description}</p> : null}
                {product.benefits.length ? (
                  <ul className="chips offer__benefits" aria-label="What this offer includes">
                    {product.benefits.map((benefit) => (
                      <li key={benefit.id} className="tag">
                        {benefit.name} · {formatBenefitUsage(benefit)}
                        {benefit.kind === "program_access" ? ` · ${formatProgramScope(benefit, programName)}` : ""} ·{" "}
                        {locationName(benefit.location_id)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {product.prices.length === 0 ? (
              <p className="offer__empty">No prices yet. {canEdit ? "Select Add price to sell this offer." : "A manager must add a price before staff can sell it."}</p>
            ) : (
              <Table wrapClassName="offer__table">
                <colgroup>
                  <col />
                  <col className="offer__col-term col-wide" />
                  <col className="offer__col-status col-wide" />
                  <col className="offer__col-amount" />
                  {canEdit ? <col className="offer__col-actions" /> : null}
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Price</TableHead>
                    <TableHead scope="col" className="col-wide">
                      Term
                    </TableHead>
                    <TableHead scope="col" className="col-wide">
                      Status
                    </TableHead>
                    <TableHead scope="col" className="num">
                      Amount
                    </TableHead>
                    {canEdit ? (
                      <TableHead scope="col">
                        <span className="visually-hidden">Actions</span>
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.prices.map((price) => (
                    <TableRow key={price.id}>
                      <TableCell>
                        <span className="cell-title">{price.label}</span>
                        <span className="cell-sub phone-only">
                          {formatDuration(price.duration_days)} · {price.archived_at ? "Archived" : price.available ? "On sale" : "Not on sale"}
                        </span>
                      </TableCell>
                      <TableCell className="offer__term col-wide">{formatDuration(price.duration_days)}</TableCell>
                      <TableCell className="col-wide">
                        <Status state={price.available ? "active" : "off"}>
                          {price.archived_at ? "Archived" : price.available ? "On sale" : "Not on sale"}
                        </Status>
                      </TableCell>
                      <TableCell className="num">{formatMoney(price.amount_minor, price.currency)}</TableCell>
                      {canEdit ? (
                        <TableCell className="offer__price-actions">
                          {price.archived_at ? null : <PriceActions price={price} />}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Plate>
        ))
      )}
      {editing?.kind === "new" ? <ProductDialog programs={programs} onClose={() => setEditing(null)} /> : null}
      {editing?.kind === "edit" ? <ProductDialog product={editing.product} programs={programs} onClose={() => setEditing(null)} /> : null}
      {editing?.kind === "price" ? <PriceDialog product={editing.product} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
