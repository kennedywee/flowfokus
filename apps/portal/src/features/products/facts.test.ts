import { describe, expect, test } from "bun:test";
import type { Schemas } from "@flowfokus/api";
import { formatMoney } from "../../lib/format";
import {
  checkDraft,
  draftChanged,
  filterFromSearch,
  filterProducts,
  headFacts,
  mainPrice,
  otherPrices,
  priceChange,
  priceLabel,
  productCounts,
  productFields,
  readProductsSearch,
  saleState,
  startBenefits,
  startDraft,
  termsText,
} from "./facts";

type Price = Schemas["Price"];

function price(id: string, amount: number, extra: Partial<Price> = {}): Price {
  return { id, label: "30 days", amount_minor: amount, currency: "MYR", duration_days: 30, available: true, archived_at: null, ...extra };
}

function product(overrides: Partial<Schemas["StaffProduct"]> = {}): Schemas["StaffProduct"] {
  return {
    id: "p1",
    kind: "membership",
    program_id: null,
    name: "Monthly unlimited",
    description: null,
    published: true,
    benefits: [{ id: "b1", kind: "gym_access", name: "Gym access", usage_limit: null, location_id: null, program_ids: [], program_kind: null }],
    prices: [price("a", 22000)],
    ...overrides,
  };
}

const archived = { available: false, archived_at: "2026-10-01T00:00:00Z" };

describe("the one price", () => {
  test("is the first price on sale", () => {
    const item = product({ prices: [price("old", 20000, archived), price("a", 22000), price("b", 60000)] });
    expect(mainPrice(item)?.id).toBe("a");
    expect(otherPrices(item).map((p) => p.id)).toEqual(["b"]);
  });

  test("falls back to a price off sale, then an archived one", () => {
    expect(mainPrice(product({ prices: [price("old", 20000, archived), price("off", 22000, { available: false })] }))?.id).toBe("off");
    expect(mainPrice(product({ prices: [price("old", 20000, archived)] }))?.id).toBe("old");
    expect(mainPrice(product({ prices: [] }))).toBeNull();
  });

  test("other prices leave out archived prices", () => {
    expect(otherPrices(product({ prices: [price("a", 22000), price("old", 20000, archived)] }))).toEqual([]);
  });
});

describe("sale state", () => {
  test("follows published and prices on sale", () => {
    expect(saleState(product())).toBe("on_sale");
    expect(saleState(product({ published: false }))).toBe("staff_only");
    expect(saleState(product({ prices: [price("a", 22000, { available: false })] }))).toBe("not_sold");
    expect(saleState(product({ prices: [] }))).toBe("not_sold");
  });
});

describe("terms", () => {
  test("say the length, and a pass's uses first", () => {
    expect(termsText(product())).toBe("30 days");
    const pass = product({
      kind: "pass",
      benefits: [{ id: "b", kind: "program_access", name: "Classes", usage_limit: 10, location_id: null, program_ids: [], program_kind: null }],
      prices: [price("a", 28000, { duration_days: 60 })],
    });
    expect(termsText(pass)).toBe("10 bookings · 60 days");
    expect(headFacts(pass)).toBe(`Pass · 10 bookings · 60 days · ${formatMoney(28000, "MYR")}`);
    expect(headFacts(product({ prices: [] }))).toBe("Membership · No price");
  });
});

describe("the list", () => {
  const list = [
    product({ id: "1", name: "Zumba", published: false }),
    product({ id: "2", name: "annual", prices: [] }),
    product({ id: "3", name: "Day pass", kind: "pass" }),
    product({ id: "4", name: "Drop-in", kind: "ticket" }),
  ];

  test("leaves out tickets and puts products not sold last", () => {
    expect(filterProducts(list, { type: [], status: [] }, "").map((p) => p.id)).toEqual(["3", "1", "2"]);
  });

  test("filters by type, status, and name", () => {
    expect(filterProducts(list, { type: ["pass"], status: [] }, "").map((p) => p.id)).toEqual(["3"]);
    expect(filterProducts(list, { type: [], status: ["staff_only", "not_sold"] }, "").map((p) => p.id)).toEqual(["1", "2"]);
    expect(filterProducts(list, { type: [], status: [] }, "ANN").map((p) => p.id)).toEqual(["2"]);
  });

  test("counts each value", () => {
    expect(productCounts(list)).toEqual({ membership: 2, pass: 1, on_sale: 1, staff_only: 1, not_sold: 1 });
  });

  test("reads the URL and ignores unknown values", () => {
    expect(readProductsSearch({ type: " pass ", status: 3, q: "" })).toEqual({ type: "pass" });
    expect(filterFromSearch({ type: "pass,ticket", status: "not_sold" })).toEqual({ type: ["pass"], status: ["not_sold"] });
  });
});

describe("the form", () => {
  test("starts from the product's main price", () => {
    const draft = startDraft(product(), "MYR");
    expect(draft).toMatchObject({ name: "Monthly unlimited", amount: "220.00", days: "30", published: true });
    expect(draftChanged(draft, startDraft(product(), "MYR"))).toBe(false);
    expect(draftChanged({ ...draft, amount: "240.00" }, draft)).toBe(true);
  });

  test("checks name, price, length, and benefits", () => {
    const draft = { ...startDraft(undefined, "MYR"), name: " ", amount: "12.345", days: "0" };
    draft.benefits[0]!.name = "";
    draft.benefits[0]!.usage = "-1";
    const errors = checkDraft(draft, "MYR");
    expect(errors.name).toBeDefined();
    expect(errors.amount).toBe("Enter a price, like 120.50.");
    expect(errors.days).toBe("Enter 1 to 3660 days.");
    expect(errors.benefit?.[draft.benefits[0]!.key]).toMatchObject({ name: "Enter a name.", usage: expect.any(String) });
    expect(checkDraft({ ...draft, benefits: [] }, "MYR").benefits).toBe("Add at least one benefit.");
  });

  test("asks for programs when a benefit books selected programs", () => {
    const draft = { ...startDraft(undefined, "MYR"), name: "Pass", amount: "10", benefits: startBenefits("pass") };
    draft.benefits[0]!.scope = "selected";
    expect(checkDraft(draft, "MYR").benefit?.[draft.benefits[0]!.key]?.programs).toBe("Pick at least one program.");
  });

  test("sends benefits in Rails' shape", () => {
    const draft = { ...startDraft(undefined, "MYR"), name: " Pass ", benefits: startBenefits("pass") };
    expect(productFields(draft)).toEqual({
      name: "Pass",
      description: null,
      published: false,
      benefits: [{ kind: "program_access", name: "Group classes", usage_limit: 10, location_id: null, program_ids: [], program_kind: "group_class" }],
    });
  });
});

describe("price change", () => {
  const current = price("a", 22000);
  const draft = { ...startDraft(product(), "MYR") };

  test("is nothing when amount and length stay", () => {
    expect(priceChange(draft, current, "MYR")).toBeNull();
  });

  test("is a new price when the amount or the length changes", () => {
    expect(priceChange({ ...draft, amount: "240" }, current, "MYR")).toEqual({ label: "30 days", amount_minor: 24000, duration_days: 30 });
    expect(priceChange({ ...draft, days: "90" }, current, "MYR")).toEqual({ label: "90 days", amount_minor: 22000, duration_days: 90 });
  });

  test("is a new price when the current one is archived", () => {
    expect(priceChange(draft, { ...current, ...archived }, "MYR")).not.toBeNull();
    expect(priceChange(draft, null, "MYR")).not.toBeNull();
  });

  test("keeps a label staff chose unless it named the old length", () => {
    expect(priceLabel(30, { label: "Founding rate", duration_days: 30 })).toBe("Founding rate");
    expect(priceLabel(90, { label: "Founding rate", duration_days: 30 })).toBe("90 days");
    expect(priceLabel(90, { label: "30 days", duration_days: 30 })).toBe("90 days");
    expect(priceLabel(7)).toBe("7 days (1 week)");
  });
});
