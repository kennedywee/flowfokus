import { type IconName } from "@/components/ui/icon";
import type { Schemas } from "@flowfokus/api";
import { formatMoney } from "../../lib/format";
import { paymentFact } from "./facts";

/*
 * Small pieces the sales screens share. A sale's two facts, payment and
 * fulfillment, are drawn with `StatusMark` from `components/parts/marks`; the
 * words come from `paymentFact` and `fulfillmentFact`.
 */

export const METHOD_ICON: Record<Schemas["PaymentMethod"], IconName> = {
  cash: "cash",
  bank_transfer: "bank",
  online: "gymSite",
};

/**
 * A sale's total, with the balance still due or the amount refunded under it.
 * A void sale shows its total struck through.
 */
export function SaleAmount({ sale }: { sale: Schemas["Sale"] }) {
  const payment = paymentFact(sale);
  return (
    <span className="sale-amount">
      <span className="sale-amount__total" data-void={sale.voided_at ? true : undefined}>
        {formatMoney(sale.total_minor, sale.currency)}
      </span>
      {!sale.voided_at && sale.balance_minor > 0 ? (
        <span className="sale-amount__note" data-state={payment.state}>
          {formatMoney(sale.balance_minor, sale.currency)} due
        </span>
      ) : sale.refunded_minor > 0 ? (
        <span className="sale-amount__note">{formatMoney(sale.refunded_minor, sale.currency)} refunded</span>
      ) : null}
    </span>
  );
}
