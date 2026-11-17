import { describe, expect, test } from "bun:test";
import { formatMoney, type Schemas } from "@flowfokus/api";
import {
  checkNewSale,
  createdText,
  discardText,
  draftBalance,
  filterOptions,
  optionFacts,
  optionTitle,
  saleOptions,
} from "./saleDraft";

function price(overrides: Partial<Schemas["Price"]> = {}): Schemas["Price"] {
  return {
    id: "price-1",
    label: "Monthly",
    amount_minor: 22000,
    currency: "MYR",
    duration_days: 30,
    available: true,
    archived_at: null,
    ...overrides,
  };
}

function product(overrides: Partial<Schemas["StaffProduct"]> = {}): Schemas["StaffProduct"] {
  return {
    kind: "membership",
    program_id: null,
    id: "product-1",
    name: "Monthly unlimited",
    description: null,
    published: true,
    benefits: [],
    prices: [price()],
    ...overrides,
  };
}

const pass = product({
  id: "product-2",
  kind: "pass",
  name: "10-class pass",
  benefits: [
    { id: "b-1", kind: "program_access", name: "Classes", usage_limit: 10, location_id: null, program_ids: [], program_kind: null },
  ],
  prices: [price({ id: "price-2", label: "Pack", amount_minor: 28000, duration_days: 60 })],
});

describe("saleOptions", () => {
  test("lists available prices and leaves out tickets and unavailable prices", () => {
    const options = saleOptions([
      product({ prices: [price(), price({ id: "old", available: false })] }),
      pass,
      product({ id: "ticket", kind: "ticket", prices: [price({ id: "t", duration_days: null })] }),
    ]);
    expect(options.map((option) => option.price.id)).toEqual(["price-1", "price-2"]);
    expect(options.map((option) => option.kind)).toEqual(["membership", "pass"]);
  });
});

describe("option text", () => {
  test("adds the price label only when a product has several prices", () => {
    const two = saleOptions([product({ prices: [price(), price({ id: "year", label: "Yearly", duration_days: 365 })] })]);
    expect(optionTitle(two[1]!, two)).toBe("Monthly unlimited · Yearly");
    const one = saleOptions([product()]);
    expect(optionTitle(one[0]!, one)).toBe("Monthly unlimited");
  });

  test("shows limited use, the term, and staff only", () => {
    const [option] = saleOptions([{ ...pass, published: false }]);
    expect(optionFacts(option!)).toBe("10 bookings · 60 days · Staff only");
    expect(optionFacts(saleOptions([product()])[0]!)).toBe("30 days");
  });
});

describe("filterOptions", () => {
  const options = saleOptions([product(), pass]);
  test("matches the name or label and the kind", () => {
    expect(filterOptions(options, "class", "all").map((option) => option.price.id)).toEqual(["price-2"]);
    expect(filterOptions(options, "MONTHLY", "all").map((option) => option.price.id)).toEqual(["price-1"]);
    expect(filterOptions(options, "", "pass").map((option) => option.price.id)).toEqual(["price-2"]);
    expect(filterOptions(options, "", "all")).toHaveLength(2);
  });
});

describe("checkNewSale", () => {
  test("names each missing choice", () => {
    expect(checkNewSale({ memberId: "", priceId: "", locationId: "" })).toEqual({
      member: "Choose a member to create the sale.",
      product: "Add a product to create the sale.",
      location: "Choose where the sale happens.",
    });
    expect(checkNewSale({ memberId: "m", priceId: "p", locationId: "l" })).toEqual({
      member: undefined,
      product: undefined,
      location: undefined,
    });
  });
});

describe("draftBalance", () => {
  test("subtracts the draft payment", () => {
    expect(draftBalance(53000, null)).toBe(53000);
    expect(draftBalance(53000, { method: "cash", amount_minor: 30000, reference: "" })).toBe(23000);
    expect(draftBalance(53000, { method: "cash", amount_minor: 53000, reference: "" })).toBe(0);
  });
});

describe("discardText", () => {
  const [option] = saleOptions([product()]);
  test("names the line and the payment", () => {
    expect(discardText(option, { method: "cash", amount_minor: 22000, reference: "" }, "MYR")).toBe(
      `The Monthly unlimited and the ${formatMoney(22000, "MYR")} cash payment you added will be lost.`,
    );
    expect(discardText(option, null, "MYR")).toBe("The Monthly unlimited you added will be lost.");
    expect(discardText(undefined, null, "MYR")).toBe("The member you chose will be cleared.");
  });
});

describe("createdText", () => {
  test("says what is due, or paid in full", () => {
    expect(createdText({ productName: "Monthly unlimited", memberName: "Mei", balance_minor: 0, currency: "MYR" })).toBe(
      "Monthly unlimited for Mei. Paid in full.",
    );
    expect(createdText({ productName: "Monthly unlimited", memberName: "Mei", balance_minor: 2000, currency: "MYR" })).toBe(
      `Monthly unlimited for Mei. ${formatMoney(2000, "MYR")} is due.`,
    );
  });
});
