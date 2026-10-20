/**
 * Development-only frontend fixtures and interactions. No HTTP, credentials,
 * browser storage, or Rails writes. A full reload restores the sample records.
 * This models preview states, not the production business rules.
 */
import type { Schemas } from "@flowfokus/api";
import type { PublicAccess } from "../server/access";
import { sampleMembers } from "../features/preview/data";
import { createIdempotencyKey } from "./idempotency";
import type { MemberRecord } from "./staff.live.functions";
import type { Result } from "./result";
import type {
  CreateCheckInInput,
  CreateMemberInput,
  CreateSaleInput,
  FulfillInput,
  IdInput,
  MemberSearchInput,
  OptionalMemberInput,
  RecordPaymentInput,
  SlugInput,
} from "./validate";

type Store = {
  organization: Schemas["StaffOrganization"];
  members: Schemas["Member"][];
  products: Schemas["StaffProduct"][];
  sales: Schemas["Sale"][];
  visits: Schemas["CheckIn"][];
  replay: Map<string, Schemas["Sale"] | Schemas["CheckIn"]>;
};
const stores = new Map<string, Store>();
export const sampleId = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const NOW = "2026-10-21T01:00:00.000Z";
const START = "2026-10-01T00:00:00.000Z";
const endAfter = (start: string, days: number) => new Date(Date.parse(start) + days * 86400000).toISOString();
const ok = <T>(data: T): Result<T> => ({ ok: true, data: structuredClone(data) });
const missing = (): Result<never> => ({
  ok: false,
  error: { status: 404, code: "not_found", message: "This sample record was not found." },
});
const invalid = (message: string, details?: Record<string, string[]>): Result<never> => ({
  ok: false,
  error: { status: 422, code: "validation_failed", message, details },
});

function makeLine(product: Schemas["StaffProduct"], price: Schemas["Price"], id: string): Schemas["SaleLineItem"] {
  return {
    id,
    price_id: price.id,
    product_id: product.id,
    product_name: product.name,
    price_label: price.label,
    quantity: 1,
    unit_amount_minor: price.amount_minor,
    total_minor: price.amount_minor,
    currency: price.currency,
    terms: {
      duration_days: price.duration_days,
      benefits: product.benefits.map(({ kind, name, usage_limit, location_id }) => ({
        kind,
        name,
        usage_limit,
        location_id,
      })),
    },
  };
}
function deliver(sale: Schemas["Sale"], value: Store): void {
  const prior = value.sales
    .filter((item) => item.member.id === sale.member.id && item.fulfillment)
    .map((item) => item.fulfillment!.membership_period)
    .sort((a, b) => a.ends_at.localeCompare(b.ends_at))
    .at(-1);
  const startsAt = prior && prior.ends_at > NOW ? prior.ends_at : NOW;
  const membershipId = prior?.membership_id ?? createIdempotencyKey();
  const fulfillmentId = createIdempotencyKey();
  sale.fulfilled = true;
  sale.fulfillment = {
    id: fulfillmentId,
    sale_line_item_id: sale.line_item.id,
    membership_id: membershipId,
    fulfilled_at: NOW,
    membership_period: {
      id: createIdempotencyKey(),
      membership_id: membershipId,
      sale_id: sale.id,
      fulfillment_id: fulfillmentId,
      starts_at: startsAt,
      ends_at: endAfter(startsAt, sale.line_item.terms.duration_days),
    },
  };
}
function seed(slug: string): Store | undefined {
  if (slug !== "chainsaw" && slug !== "ironworks") return;
  const locations = [
    {
      id: sampleId(101),
      name: slug === "chainsaw" ? "Bangsar" : "Penang",
      address: "18, Jalan Telawi 3, Kuala Lumpur",
    },
    { id: sampleId(102), name: "Mont Kiara", address: "8, Jalan Kiara, Kuala Lumpur" },
  ];
  const organization: Schemas["StaffOrganization"] = {
    id: sampleId(100),
    slug,
    name: slug === "chainsaw" ? "Chainsaw Gym" : "Ironworks Fitness",
    timezone: "Asia/Kuala_Lumpur",
    currency: "MYR",
    locations,
    actor: {
      name: "Nadia Hassan",
      email: "nadia@example.com",
      demo: true,
      permissions: [
        "members:read",
        "members:create",
        "products:read",
        "purchases:read",
        "purchases:create",
        "purchases:fulfill",
        "payments:create",
        "check_ins:read",
        "check_ins:create",
      ],
    },
  };
  const members = sampleMembers.map((member, index) => ({
    id: sampleId(index + 1),
    name: member.name,
    email: member.email,
    created_at: "2026-09-01T02:00:00.000Z",
  }));
  const products: Schemas["StaffProduct"][] = [
    {
      id: sampleId(201),
      name: "Monthly membership",
      description: "Your everyday gym routine. Unlimited visits to every location for 30 days.",
      published: true,
      benefits: [
        { id: sampleId(211), kind: "gym_access", name: "Unlimited gym access", usage_limit: null, location_id: null },
      ],
      prices: [
        {
          id: sampleId(221),
          label: "30 days",
          amount_minor: 18000,
          currency: "MYR",
          duration_days: 30,
          available: true,
          archived_at: null,
        },
      ],
    },
    {
      id: sampleId(202),
      name: "10-visit pass",
      description: "A flexible way to train. Ten visits, valid for 60 days.",
      published: true,
      benefits: [{ id: sampleId(212), kind: "gym_access", name: "10 gym visits", usage_limit: 10, location_id: null }],
      prices: [
        {
          id: sampleId(222),
          label: "60 days",
          amount_minor: 15000,
          currency: "MYR",
          duration_days: 60,
          available: true,
          archived_at: null,
        },
      ],
    },
    {
      id: sampleId(203),
      name: "Day pass",
      description: "One session to try the space or drop in when you’re nearby.",
      published: true,
      benefits: [{ id: sampleId(213), kind: "gym_access", name: "One gym visit", usage_limit: 1, location_id: null }],
      prices: [
        {
          id: sampleId(223),
          label: "1 day",
          amount_minor: 2500,
          currency: "MYR",
          duration_days: 1,
          available: true,
          archived_at: null,
        },
      ],
    },
    {
      id: sampleId(204),
      name: "Quarterly membership",
      description: "A longer training block. Available at the desk soon.",
      published: false,
      benefits: [
        { id: sampleId(214), kind: "gym_access", name: "Unlimited gym access", usage_limit: null, location_id: null },
      ],
      prices: [
        {
          id: sampleId(224),
          label: "90 days",
          amount_minor: 48000,
          currency: "MYR",
          duration_days: 90,
          available: false,
          archived_at: "2026-10-01T00:00:00.000Z",
        },
      ],
    },
  ];
  const sales: Schemas["Sale"][] = members.map((member, index) => {
    const product = products[index === 3 ? 1 : 0]!;
    const price = product.prices[0]!;
    const paid = index === 2 ? 0 : index === 5 ? 9000 : price.amount_minor;
    const sale: Schemas["Sale"] = {
      id: sampleId(301 + index),
      member: { id: member.id, name: member.name, email: member.email },
      location_id: locations[index % 2]!.id,
      currency: "MYR",
      total_minor: price.amount_minor,
      paid_minor: paid,
      balance_minor: price.amount_minor - paid,
      payment_status: paid === 0 ? "unpaid" : paid < price.amount_minor ? "partially_paid" : "paid",
      fulfilled: false,
      purchased_at: "2026-10-19T02:30:00.000Z",
      line_item: makeLine(product, price, sampleId(401 + index)),
      payments: paid
        ? [
            {
              id: sampleId(501 + index),
              amount_minor: paid,
              currency: "MYR",
              method: index % 2 ? "cash" : "bank_transfer",
              reference: index % 2 ? null : "OCT-SAMPLE",
              received_at: "2026-10-19T02:35:00.000Z",
            },
          ]
        : [],
      fulfillment: null,
    };
    if (paid === price.amount_minor) {
      sale.fulfilled = true;
      const membershipId = sampleId(1001 + index),
        fulfillmentId = sampleId(601 + index);
      sale.fulfillment = {
        id: fulfillmentId,
        sale_line_item_id: sale.line_item.id,
        membership_id: membershipId,
        fulfilled_at: START,
        membership_period: {
          id: sampleId(701 + index),
          membership_id: membershipId,
          sale_id: sale.id,
          fulfillment_id: fulfillmentId,
          starts_at: START,
          ends_at: endAfter(START, price.duration_days),
        },
      };
    }
    return sale;
  });
  const visits: Schemas["CheckIn"][] = [0, 5, 3, 4].map((index, row) => ({
    id: sampleId(801 + row),
    member: { id: members[index]!.id, name: members[index]!.name, email: members[index]!.email },
    location_id: locations[row % 2]!.id,
    result: index === 5 ? "denied" : "granted",
    denial_reason: index === 5 ? "no_entitlement" : null,
    entitlement_id: index === 5 ? null : sales[index]!.line_item.id,
    checked_in_at: `2026-10-21T0${Math.max(0, 3 - row)}:15:00.000Z`,
  }));
  return { organization, members, products, sales, visits, replay: new Map() };
}
function store(slug: string): Store | undefined {
  if (!stores.has(slug)) {
    const value = seed(slug);
    if (value) stores.set(slug, value);
  }
  return stores.get(slug);
}
function memberDetail(value: Store, member: Schemas["Member"]): Schemas["MemberDetail"] {
  const fulfilled = value.sales.filter((sale) => sale.member.id === member.id && sale.fulfillment);
  const periods = fulfilled
    .map((sale) => sale.fulfillment!.membership_period)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const currentPeriod = periods.find((period) => period.starts_at <= NOW && period.ends_at > NOW) ?? null;
  return {
    ...member,
    membership: periods.length ? { id: periods[0]!.membership_id, created_at: periods[0]!.starts_at, periods } : null,
    current_period: currentPeriod,
    entitlements: fulfilled.flatMap((sale) => {
      const period = sale.fulfillment!.membership_period;
      if (period.ends_at <= NOW) return [];
      return sale.line_item.terms.benefits.map((benefit) => {
        const used = value.visits.filter(
          (visit) => visit.entitlement_id === sale.line_item.id && visit.result === "granted",
        ).length;
        return {
          ...benefit,
          id: sale.line_item.id,
          starts_at: period.starts_at,
          ends_at: period.ends_at,
          used_count: used,
          remaining: benefit.usage_limit === null ? null : Math.max(0, benefit.usage_limit - used),
          active: period.starts_at <= NOW,
        };
      });
    }),
  };
}

export async function getAccess(): Promise<PublicAccess> {
  return { kind: "demo" };
}
export async function getStaffOrganization({
  data,
}: {
  data: SlugInput;
}): Promise<Result<Schemas["StaffOrganization"]>> {
  const value = store(data.slug);
  return value ? ok(value.organization) : missing();
}
export async function getOverview({ data }: { data: SlugInput }): Promise<Result<Schemas["StaffOverview"]>> {
  const value = store(data.slug);
  if (!value) return missing();
  return ok({
    member_count: value.members.length,
    active_membership_count: value.members.filter((member) => memberDetail(value, member).current_period).length,
    unpaid_sale_count: value.sales.filter((sale) => sale.balance_minor > 0).length,
    awaiting_fulfillment_count: value.sales.filter((sale) => sale.balance_minor === 0 && !sale.fulfilled).length,
    check_ins_today: {
      granted: value.visits.filter((visit) => visit.result === "granted").length,
      denied: value.visits.filter((visit) => visit.result === "denied").length,
    },
  });
}
export async function listMembers({ data }: { data: MemberSearchInput }): Promise<Result<Schemas["Member"][]>> {
  const value = store(data.slug);
  return value
    ? ok(
        value.members.filter(
          (member) => !data.q || `${member.name} ${member.email}`.toLowerCase().includes(data.q.toLowerCase()),
        ),
      )
    : missing();
}
export async function createMember({ data }: { data: CreateMemberInput }): Promise<Result<Schemas["Member"]>> {
  const value = store(data.slug);
  if (!value) return missing();
  if (value.members.some((member) => member.email.toLowerCase() === data.email.toLowerCase()))
    return invalid("Email is already in use.", { email: ["has already been used"] });
  const member = { id: createIdempotencyKey(), name: data.name, email: data.email, created_at: NOW };
  value.members.unshift(member);
  return ok(member);
}
export async function getMemberRecord({ data }: { data: IdInput }): Promise<Result<MemberRecord>> {
  const value = store(data.slug),
    member = value?.members.find((member) => member.id === data.id);
  return value && member
    ? ok({
        member: memberDetail(value, member),
        sales: value.sales.filter((sale) => sale.member.id === member.id),
        checkIns: value.visits.filter((visit) => visit.member.id === member.id),
      })
    : missing();
}
export async function listProducts({ data }: { data: SlugInput }): Promise<Result<Schemas["StaffProduct"][]>> {
  const value = store(data.slug);
  return value ? ok(value.products) : missing();
}
export async function listSales({ data }: { data: OptionalMemberInput }): Promise<Result<Schemas["Sale"][]>> {
  const value = store(data.slug);
  return value ? ok(value.sales.filter((sale) => !data.memberId || sale.member.id === data.memberId)) : missing();
}
export async function getSale({ data }: { data: IdInput }): Promise<Result<Schemas["Sale"]>> {
  const sale = store(data.slug)?.sales.find((sale) => sale.id === data.id);
  return sale ? ok(sale) : missing();
}
export async function createSale({ data }: { data: CreateSaleInput }): Promise<Result<Schemas["Sale"]>> {
  const value = store(data.slug);
  if (!value) return missing();
  const prior = value.replay.get(`sale-${data.idempotencyKey}`);
  if (prior && "line_item" in prior) return ok(prior);
  const member = value.members.find((member) => member.id === data.member_id),
    product = value.products.find((product) => product.prices.some((price) => price.id === data.price_id));
  const price = product?.prices.find((price) => price.id === data.price_id && price.available);
  if (
    !member ||
    !product ||
    !price ||
    !value.organization.locations.some((location) => location.id === data.location_id)
  )
    return missing();
  const sale: Schemas["Sale"] = {
    id: createIdempotencyKey(),
    member: { id: member.id, name: member.name, email: member.email },
    location_id: data.location_id,
    currency: price.currency,
    total_minor: price.amount_minor,
    paid_minor: 0,
    balance_minor: price.amount_minor,
    payment_status: "unpaid",
    fulfilled: false,
    purchased_at: NOW,
    line_item: makeLine(product, price, createIdempotencyKey()),
    payments: [],
    fulfillment: null,
  };
  value.sales.unshift(sale);
  value.replay.set(`sale-${data.idempotencyKey}`, sale);
  return ok(sale);
}
export async function recordPayment({ data }: { data: RecordPaymentInput }): Promise<Result<Schemas["Sale"]>> {
  const value = store(data.slug),
    sale = value?.sales.find((sale) => sale.id === data.saleId);
  if (!value || !sale) return missing();
  const prior = value.replay.get(`payment-${data.idempotencyKey}`);
  if (prior && "line_item" in prior) return ok(prior);
  if (data.amount_minor <= 0 || data.amount_minor > sale.balance_minor)
    return invalid("Enter an amount up to the remaining balance.");
  sale.payments.push({
    id: createIdempotencyKey(),
    amount_minor: data.amount_minor,
    currency: sale.currency,
    method: data.method,
    reference: data.reference ?? null,
    received_at: NOW,
  });
  sale.paid_minor += data.amount_minor;
  sale.balance_minor -= data.amount_minor;
  sale.payment_status = sale.balance_minor ? "partially_paid" : "paid";
  value.replay.set(`payment-${data.idempotencyKey}`, sale);
  return ok(sale);
}
export async function fulfillSale({ data }: { data: FulfillInput }): Promise<Result<Schemas["Sale"]>> {
  const sale = store(data.slug)?.sales.find((sale) => sale.id === data.saleId);
  if (!sale) return missing();
  if (sale.balance_minor) return invalid("Record the remaining payment first.");
  if (!sale.fulfilled) deliver(sale, store(data.slug)!);
  return ok(sale);
}
export async function listCheckIns({ data }: { data: OptionalMemberInput }): Promise<Result<Schemas["CheckIn"][]>> {
  const value = store(data.slug);
  return value ? ok(value.visits.filter((visit) => !data.memberId || visit.member.id === data.memberId)) : missing();
}
export async function createCheckIn({ data }: { data: CreateCheckInInput }): Promise<Result<Schemas["CheckIn"]>> {
  const value = store(data.slug),
    member = value?.members.find((member) => member.id === data.member_id);
  if (!value || !member || !value.organization.locations.some((location) => location.id === data.location_id))
    return missing();
  const prior = value.replay.get(`visit-${data.idempotencyKey}`);
  if (prior && "result" in prior) return ok(prior);
  const right = memberDetail(value, member).entitlements.find((right) => right.active);
  const granted = Boolean(right && (right.remaining === null || right.remaining > 0));
  const visit: Schemas["CheckIn"] = {
    id: createIdempotencyKey(),
    member: { id: member.id, name: member.name, email: member.email },
    location_id: data.location_id,
    result: granted ? "granted" : "denied",
    denial_reason: granted ? null : right ? "usage_limit_reached" : "no_entitlement",
    entitlement_id: granted ? right!.id : null,
    checked_in_at: NOW,
  };
  value.visits.unshift(visit);
  value.replay.set(`visit-${data.idempotencyKey}`, visit);
  return ok(visit);
}
