import { Icon, type IconName } from "@/components/ui/icon";
import type { Schemas } from "@flowfokus/api";
import { fulfillmentFact, paymentFact, type FulfillmentState, type PaymentState } from "./facts";

/*
 * Sale facts as a small coloured mark and grey text. Colour marks the state;
 * the text says it. Payment and fulfillment are always two separate marks.
 */

const markProps = { "aria-hidden": true, focusable: false } as const;

const PAYMENT_ICON: Record<PaymentState, IconName> = {
  paid: "paid",
  partial: "partlyPaid",
  unpaid: "payments",
  void: "close",
};

const FULFILLMENT_ICON: Record<FulfillmentState, IconName> = {
  fulfilled: "fulfilled",
  waiting: "unfulfilled",
  revoked: "close",
  none: "unfulfilled",
};

export const METHOD_ICON: Record<Schemas["PaymentMethod"], IconName> = {
  cash: "cash",
  bank_transfer: "bank",
  online: "gymSite",
};

/** "Paid", "Part paid", "Unpaid", or "Void", with its mark. */
export function PaymentMark({ sale, className = "" }: { sale: Schemas["Sale"]; className?: string }) {
  const fact = paymentFact(sale);
  const iconName = PAYMENT_ICON[fact.state];
  return (
    <span className={`mx-fact ${className}`} data-state={fact.state}>
      <Icon name={iconName} {...markProps} />
      {fact.label}
    </span>
  );
}

/** "Fulfilled", "Unfulfilled", or "Access revoked", with its mark. */
export function FulfillmentMark({ sale, className = "" }: { sale: Schemas["Sale"]; className?: string }) {
  const fact = fulfillmentFact(sale);
  const iconName = FULFILLMENT_ICON[fact.state];
  return (
    <span className={`mx-fact ${className}`} data-state={fact.state}>
      <Icon name={iconName} {...markProps} />
      {fact.label}
    </span>
  );
}
