import type { Schemas } from "@flowfokus/api";
import { PAYMENT_METHOD_LABEL, formatBenefitUsage, formatDuration, formatMoney } from "../../lib/format";

/*
 * Rules for the New sale page, kept apart from the screen so they can be
 * tested. Rails records one line, quantity one, at an immutable price. A
 * ticket is sold for one booked time, so it starts from the session, not here.
 */

/** Product kinds New sale offers. Tickets need a session time. */
export type SaleKind = Exclude<Schemas["ProductKind"], "ticket">;

/** One price that staff can sell, with its product. */
export interface SaleOption {
  product: Schemas["StaffProduct"];
  price: Schemas["Price"];
  kind: SaleKind;
}

/** Every price that can start a sale here: available, and not a ticket. */
export function saleOptions(products: Schemas["StaffProduct"][]): SaleOption[] {
  return products.flatMap((product) =>
    product.kind === "ticket"
      ? []
      : product.prices.filter((price) => price.available).map((price) => ({ product, price, kind: product.kind as SaleKind })),
  );
}

/** The option's title. The price label shows only when the product has more than one price. */
export function optionTitle(option: SaleOption, options: SaleOption[]): string {
  const siblings = options.filter((item) => item.product.id === option.product.id).length;
  return siblings > 1 ? `${option.product.name} · ${option.price.label}` : option.product.name;
}

/** Short facts for the option: limited use, then the term. "Staff only" for unpublished products. */
export function optionFacts(option: SaleOption): string {
  const limited = option.product.benefits.find((benefit) => benefit.usage_limit !== null);
  return [
    limited ? formatBenefitUsage(limited) : null,
    formatDuration(option.price.duration_days),
    option.product.published ? null : "Staff only",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Options whose product name or price label contains the query, case-insensitive. */
export function filterOptions(options: SaleOption[], query: string, kind: SaleKind | "all"): SaleOption[] {
  const needle = query.trim().toLowerCase();
  return options.filter(
    (option) =>
      (kind === "all" || option.kind === kind) &&
      (!needle || `${option.product.name} ${option.price.label}`.toLowerCase().includes(needle)),
  );
}

/** A payment staff add before the sale exists. It is sent after Rails creates the sale. */
export interface DraftPayment {
  method: Schemas["ManualPaymentMethod"];
  amount_minor: number;
  reference: string;
}

export interface NewSaleErrors {
  member?: string;
  product?: string;
  location?: string;
}

/** What blocks Create sale, as messages for each field. */
export function checkNewSale(draft: { memberId: string; priceId: string; locationId: string }): NewSaleErrors {
  return {
    member: draft.memberId ? undefined : "Choose a member to create the sale.",
    product: draft.priceId ? undefined : "Add a product to create the sale.",
    location: draft.locationId ? undefined : "Choose where the sale happens.",
  };
}

/** The balance after the draft payment. Never below zero. */
export function draftBalance(total: number, payment: DraftPayment | null): number {
  return Math.max(0, total - (payment?.amount_minor ?? 0));
}

/** What a discard loses, in one sentence. */
export function discardText(option: SaleOption | undefined, payment: DraftPayment | null, currency: string): string {
  const parts = [
    option ? `the ${option.product.name}` : null,
    payment ? `the ${formatMoney(payment.amount_minor, currency)} ${PAYMENT_METHOD_LABEL[payment.method].toLowerCase()} payment` : null,
  ].filter(Boolean);
  return parts.length ? `${capitalise(parts.join(" and "))} you added will be lost.` : "The member you chose will be cleared.";
}

/** The created toast's body: what was sold, and what is still due. */
export function createdText(input: {
  productName: string;
  memberName: string;
  balance_minor: number;
  currency: string;
}): string {
  const due = input.balance_minor > 0 ? `${formatMoney(input.balance_minor, input.currency)} is due.` : "Paid in full.";
  return `${input.productName} for ${input.memberName}. ${due}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
