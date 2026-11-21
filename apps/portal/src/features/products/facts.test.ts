import { describe, expect, test } from "bun:test";
import type { Schemas } from "@flowfokus/api";
import {
  activeFilters,
  checkDraft,
  checkPrice,
  draftChanged,
  filterFromSearch,
  filterProducts,
  mainPrice,
  priceLabel,
  priceSpec,
  productCounts,
  productFields,
  readProductsSearch,
  saleState,
  searchFromFilters,
  sortProducts,
  sortedPrices,
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

describe("the main price", () => {
  test("is the first price on sale", () => {
    const item = product({ prices: [price("old", 20000, archived), price("a", 22000), price("b", 60000)] });
    expect(mainPrice(item)?.id).toBe("a");
  });

  test("falls back to a price off sale, then an archived one", () => {
    expect(mainPrice(product({ prices: [price("old", 20000, archived), price("off", 22000, { available: false })] }))?.id).toBe("off");
    expect(mainPrice(product({ prices: [price("old", 20000, archived)] }))?.id).toBe("old");
    expect(mainPrice(product({ prices: [] }))).toBeNull();
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
  });
});

describe("the list", () => {
  const list = [
    product({ id: "1", name: "Zumba", published: false }),
    product({ id: "2", name: "annual", prices: [] }),
    product({ id: "3", name: "Day pass", kind: "pass" }),
    product({ id: "4", name: "Drop-in", kind: "ticket" }),
  ];

  const none = { type: [], typeNot: false, status: [], statusNot: false };

  test("leaves out tickets, and the default sort puts products not sold last", () => {
    const all = filterProducts(list, none, "");
    expect(all.map((p) => p.id).sort()).toEqual(["1", "2", "3"]);
    expect(sortProducts(all, { column: "status", direction: "asc" }).map((p) => p.id)).toEqual(["3", "1", "2"]);
    expect(sortProducts(all, { column: "name", direction: "desc" }).map((p) => p.id)).toEqual(["1", "3", "2"]);
  });

  test("filters by type, status, and name", () => {
    expect(filterProducts(list, { ...none, type: ["pass"] }, "").map((p) => p.id)).toEqual(["3"]);
    expect(filterProducts(list, { ...none, status: ["staff_only", "not_sold"] }, "").map((p) => p.id).sort()).toEqual(["1", "2"]);
    expect(filterProducts(list, none, "ANN").map((p) => p.id)).toEqual(["2"]);
  });

  test("a flipped chip leaves out the values", () => {
    expect(filterProducts(list, { ...none, type: ["pass"], typeNot: true }, "").map((p) => p.id).sort()).toEqual(["1", "2"]);
    expect(filterProducts(list, { ...none, status: ["not_sold"], statusNot: true }, "").map((p) => p.id).sort()).toEqual(["1", "3"]);
  });

  test("counts each value", () => {
    expect(productCounts(list)).toEqual({ membership: 2, pass: 1, on_sale: 1, staff_only: 1, not_sold: 1 });
  });

  test("reads the URL and ignores unknown values", () => {
    expect(readProductsSearch({ type: " pass ", status: 3, q: "" })).toEqual({ type: "pass" });
    expect(filterFromSearch({ type: "pass,ticket", status: "not_sold" })).toEqual({ type: ["pass"], typeNot: false, status: ["not_sold"], statusNot: false });
  });

  test("keeps a flipped chip in the URL", () => {
    const search = readProductsSearch({ type: "pass", type_not: true, status_not: true });
    expect(search).toEqual({ type: "pass", type_not: true });
    const chips = activeFilters(filterFromSearch(search));
    expect(chips).toEqual([{ field: "type", values: ["pass"], negated: true }]);
    expect(searchFromFilters(chips)).toEqual({ type: "pass", type_not: true });
  });
});

describe("the form", () => {
  test("starts from the product's fields", () => {
    const draft = startDraft(product(), "MYR");
    expect(draft).toMatchObject({ name: "Monthly unlimited", published: true });
    expect(draftChanged(draft, startDraft(product(), "MYR"))).toBe(false);
    expect(draftChanged({ ...draft, name: "Other" }, draft)).toBe(true);
  });

  test("an edit does not check the price", () => {
    const draft = startDraft(product(), "MYR");
    expect(checkDraft(draft, "MYR").amount).toBeDefined();
    expect(checkDraft(draft, "MYR", { price: false })).toEqual({});
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

describe("prices", () => {
  test("a new price is the amount and the length staff typed", () => {
    expect(priceSpec("240", "30", "MYR")).toEqual({ label: "30 days", amount_minor: 24000, duration_days: 30 });
    expect(priceSpec("12.345", "30", "MYR")).toBeNull();
    expect(priceLabel(7)).toBe("7 days (1 week)");
  });

  test("checks the amount and the length", () => {
    expect(checkPrice("12.345", "0", "MYR")).toEqual({ amount: "Enter a price, like 120.50.", days: "Enter 1 to 3660 days." });
    expect(checkPrice("120", "30", "MYR")).toEqual({});
  });

  test("the table lists prices on sale, then not on sale, then archived", () => {
    const prices = [
      price("a", 100, { archived_at: "2026-10-01T00:00:00Z", available: false }),
      price("b", 200, { available: false }),
      price("c", 300),
      price("d", 400),
    ];
    expect(sortedPrices({ prices }).map((p) => p.id)).toEqual(["c", "d", "b", "a"]);
  });
});
