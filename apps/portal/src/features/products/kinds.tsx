import type { Schemas } from "@flowfokus/api";
import type { IconName } from "@/components/ui/icon";

/** Paper's product icons: a card for a membership, a ticket for a pass. */
export const PRODUCT_ICON: Record<Schemas["ProductKind"], IconName> = {
  membership: "membership",
  pass: "pass",
  ticket: "pass",
};
