import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { EllipsisVertical, EyeOff, Globe, Pencil, Plus } from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PriceDialog, ProductDialog } from "../../components/OfferDialogs";
import { useToast } from "../../components/Toast";
import { Empty, FailureNotice, PageHead, Pill, Plate, SkeletonRows, Status } from "../../components/ui";
import { failureMessage, formatDuration, formatMoney, formatUsage } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useCan, useLocationName, useOrganization } from "../../lib/organization";
import { archivePrice, listProducts, updatePrice } from "../../lib/staff.functions";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const sendPriceChange = (input: Parameters<typeof updatePrice>[0]["data"]) => updatePrice({ data: input });
const sendArchive = (input: Parameters<typeof archivePrice>[0]["data"]) => archivePrice({ data: input });

type Editing = { kind: "new" } | { kind: "edit"; product: Schemas["StaffProduct"] } | { kind: "price"; product: Schemas["StaffProduct"] } | null;

export const Route = createFileRoute("/$org/products")({
  loader: ({ params }) => listProducts({ data: { slug: params.org } }),
  pendingComponent: () => <SkeletonRows rows={6} />,
  component: Products,
});

function Products() {
  const products = Route.useLoaderData();
  const locationName = useLocationName();
  const can = useCan();
  const canEdit = can("products:update");
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <div className="page offers-page">
      <PageHead
        title="Plans & offers"
        description="Membership products and their prices. To change a price, add a new one."
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
                        {benefit.name} · {formatUsage(benefit.usage_limit)} · {locationName(benefit.location_id)}
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
      {editing?.kind === "new" ? <ProductDialog onClose={() => setEditing(null)} /> : null}
      {editing?.kind === "edit" ? <ProductDialog product={editing.product} onClose={() => setEditing(null)} /> : null}
      {editing?.kind === "price" ? <PriceDialog product={editing.product} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

/** Take a price off sale, put it back, or archive it for good. */
function PriceActions({ price }: { price: Schemas["Price"] }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const change = useAction(sendPriceChange);
  const archive = useAction(sendArchive);
  const [confirming, setConfirming] = useState(false);

  async function toggle() {
    const result = await change.run({ slug: organization.slug, id: price.id, available: !price.available });
    if (result.ok) {
      toast.show({ tone: "success", title: price.available ? "Price taken off sale" : "Price on sale again", body: price.label });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "The price did not change", body: failureMessage(result.error) });
    }
  }

  async function archiveNow() {
    const result = await archive.run({ slug: organization.slug, id: price.id });
    setConfirming(false);
    if (result.ok) {
      toast.show({ tone: "success", title: "Price archived", body: `${price.label} can no longer be sold. Past sales keep it.` });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "The price was not archived", body: failureMessage(result.error) });
    }
  }

  return (
    <span className="offer__price-buttons">
      <Button type="button" variant="ghost" size="sm" className="offer__price-button" disabled={change.pending} onClick={() => void toggle()}>
        {price.available ? "Take off sale" : "Put on sale"}
        <span className="visually-hidden"> {price.label}</span>
      </Button>
      <Button type="button" variant="ghost" size="sm" className="offer__price-button" onClick={() => setConfirming(true)}>
        Archive<span className="visually-hidden"> {price.label}</span>
      </Button>
      {/* Narrow screens: the same two actions, in a menu. */}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" className="offer__price-menu" />}>
          <EllipsisVertical aria-hidden="true" />
          <span className="visually-hidden">Change {price.label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={change.pending} onClick={() => void toggle()}>
            {price.available ? "Take off sale" : "Put on sale"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirming(true)}>Archive</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirming}
        tone="critical"
        title={`Archive ${price.label}?`}
        confirmLabel="Archive price"
        pendingLabel="Archiving…"
        pending={archive.pending}
        onConfirm={() => void archiveNow()}
        onCancel={() => setConfirming(false)}
      >
        <p>It can never go back on sale. Past sales keep this price and term.</p>
      </ConfirmDialog>
    </span>
  );
}
