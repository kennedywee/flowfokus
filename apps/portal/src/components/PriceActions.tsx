import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { EllipsisVertical } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";
import { failureMessage } from "../lib/format";
import { useAction } from "../lib/hooks";
import { useOrganization } from "../lib/organization";
import { archivePrice, updatePrice } from "../lib/staff.functions";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const sendPriceChange = (input: Parameters<typeof updatePrice>[0]["data"]) => updatePrice({ data: input });
const sendArchive = (input: Parameters<typeof archivePrice>[0]["data"]) => archivePrice({ data: input });

/** Take a price off sale, put it back, or archive it for good. */
export function PriceActions({ price }: { price: Schemas["Price"] }) {
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
