import {
  Banknote,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  Globe,
  Landmark,
  Package,
  PackageCheck,
  PackageX,
  type LucideIcon,
} from "lucide-react";
import type { Schemas } from "@flowfokus/api";
import { fulfillmentFact, paymentFact, type FulfillmentState, type PaymentState } from "./facts";

/*
 * Sale facts as a small coloured mark and grey text. Colour marks the state;
 * the text says it. Payment and fulfillment are always two separate marks.
 */

const markProps = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

const PAYMENT_ICON: Record<PaymentState, LucideIcon | null> = {
  paid: CircleCheck,
  partial: null,
  unpaid: CircleDashed,
  void: CircleSlash,
};

const FULFILLMENT_ICON: Record<FulfillmentState, LucideIcon> = {
  fulfilled: PackageCheck,
  waiting: Package,
  revoked: PackageX,
  none: Package,
};

export const METHOD_ICON: Record<Schemas["PaymentMethod"], LucideIcon> = {
  cash: Banknote,
  bank_transfer: Landmark,
  online: Globe,
};

/** Half-filled ring for a part payment. */
function PartPaidMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 6a6 6 0 0 1 0 12Z" fill="currentColor" />
    </svg>
  );
}

/** "Paid", "Part paid", "Unpaid", or "Void", with its mark. */
export function PaymentMark({ sale, className = "" }: { sale: Schemas["Sale"]; className?: string }) {
  const fact = paymentFact(sale);
  const Icon = PAYMENT_ICON[fact.state];
  return (
    <span className={`mx-fact ${className}`} data-state={fact.state}>
      {Icon ? <Icon {...markProps} /> : <PartPaidMark />}
      {fact.label}
    </span>
  );
}

/** "Fulfilled", "Unfulfilled", or "Access revoked", with its mark. */
export function FulfillmentMark({ sale, className = "" }: { sale: Schemas["Sale"]; className?: string }) {
  const fact = fulfillmentFact(sale);
  const Icon = FULFILLMENT_ICON[fact.state];
  return (
    <span className={`mx-fact ${className}`} data-state={fact.state}>
      <Icon {...markProps} />
      {fact.label}
    </span>
  );
}
