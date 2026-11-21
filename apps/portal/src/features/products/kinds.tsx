import type { Schemas } from "@flowfokus/api";
import { Icon, type IconName } from "@/components/ui/icon";

/** Paper's product icons: a card for a membership, a ticket for a pass. */
export const PRODUCT_ICON: Record<Schemas["ProductKind"], IconName> = {
  membership: "membership",
  pass: "pass",
  ticket: "pass",
};

/** The grey tile before a product's name. `size` is 28 on list rows and 40 on the page head. */
export function ProductTile({ kind, size = 28 }: { kind: Schemas["ProductKind"] | "new"; size?: 28 | 40 }) {
  const iconName = kind === "new" ? "products" : PRODUCT_ICON[kind];
  return (
    <span className="program-tile" data-size={size} aria-hidden="true">
      <Icon name={iconName} aria-hidden="true" focusable="false" />
    </span>
  );
}
