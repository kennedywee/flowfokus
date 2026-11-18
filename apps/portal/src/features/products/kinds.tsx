import type { Schemas } from "@flowfokus/api";
import { IdCard, Tag, Ticket, type LucideIcon } from "lucide-react";

/** Paper's product icons: a card for a membership, a ticket for a pass. */
export const PRODUCT_ICON: Record<Schemas["ProductKind"], LucideIcon> = {
  membership: IdCard,
  pass: Ticket,
  ticket: Ticket,
};

/** The grey tile before a product's name. `size` is 28 on list rows and 40 on the page head. */
export function ProductTile({ kind, size = 28 }: { kind: Schemas["ProductKind"] | "new"; size?: 28 | 40 }) {
  const Icon = kind === "new" ? Tag : PRODUCT_ICON[kind];
  return (
    <span className="program-tile" data-size={size} aria-hidden="true">
      <Icon strokeWidth={1.75} aria-hidden="true" focusable="false" />
    </span>
  );
}
