import { describe, expect, test } from "bun:test";
import { createCheckInInput, createSaleInput, isSlug, recordPaymentInput, slugInput } from "./validate";
import { parseAmountToMinor } from "./format";

const id = "0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d";

describe("slugs", () => {
  test.each([
    ["chainsaw", true],
    ["iron-works", true],
    ["Chainsaw", false],
    ["-chainsaw", false],
    ["chain.saw", false],
    ["../staff", false],
    ["", false],
  ])("%s → %p", (value, expected) => expect(isSlug(value)).toBe(expected));

  test("rejects a slug that tries to reach another path", () => {
    expect(() => slugInput({ slug: "chainsaw/../../public" })).toThrow();
  });
});

describe("write inputs", () => {
  test("sale input keeps only contract fields", () => {
    const input = createSaleInput({
      slug: "chainsaw",
      idempotencyKey: id,
      member_id: id,
      price_id: id,
      location_id: id,
      Authorization: "Bearer stolen",
      "Flowfokus-Organization": "ironworks",
    } as never);
    expect(Object.keys(input).sort()).toEqual(["idempotencyKey", "location_id", "member_id", "price_id", "slug"]);
  });

  test("ids must be UUIDs", () => {
    expect(() => createCheckInInput({ slug: "chainsaw", idempotencyKey: id, member_id: "1", location_id: id })).toThrow();
  });

  test("payment method and amount are checked", () => {
    const base = { slug: "chainsaw", idempotencyKey: id, saleId: id, amount_minor: 5000, method: "cash" as const };
    expect(recordPaymentInput(base).reference).toBeNull();
    expect(() => recordPaymentInput({ ...base, method: "card" as never })).toThrow();
    expect(() => recordPaymentInput({ ...base, amount_minor: 1.5 })).toThrow();
  });
});

describe("parseAmountToMinor", () => {
  test.each([
    ["120", 12000],
    ["120.5", 12050],
    ["120.05", 12005],
    ["1,200.00", 120000],
    ["0.01", 1],
    ["12.345", null],
    ["-5", null],
    ["abc", null],
    ["", null],
  ])("%s → %p", (text, expected) => expect(parseAmountToMinor(text, "MYR")).toBe(expected));
});
