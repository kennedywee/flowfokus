import { describe, expect, test } from "bun:test";
import type { Schemas } from "@flowfokus/api";
import type { Result } from "../../lib/result";
import { replacePrice, type PriceApi } from "./priceChange";

type Product = Schemas["StaffProduct"];
type Price = Schemas["Price"];

function price(id: string, amount: number, days = 30, extra: Partial<Price> = {}): Price {
  return { id, label: `${days} days`, amount_minor: amount, currency: "MYR", duration_days: days, available: true, archived_at: null, ...extra };
}

/** A fake Rails: keeps one product, records each call, and fails the calls a test asks it to. */
function fakeRails(start: Price[], fail: { load?: number; create?: number; archive?: number; loseCreateAnswer?: boolean } = {}) {
  const product: Product = { id: "p1", kind: "membership", program_id: null, name: "Monthly", description: null, published: true, benefits: [], prices: [...start] };
  const calls: string[] = [];
  const left = { load: fail.load ?? 0, create: fail.create ?? 0, archive: fail.archive ?? 0 };
  let next = 1;
  const down = { ok: false as const, error: { status: 0, code: "api_unreachable" as const, message: "down" } };
  const snapshot = (): Result<Product> => ({ ok: true, data: { ...product, prices: product.prices.map((item) => ({ ...item })) } });
  const api: PriceApi = {
    async load() {
      calls.push("load");
      if (left.load-- > 0) return down;
      return snapshot();
    },
    async create(spec) {
      calls.push("create");
      if (left.create-- > 0) return down;
      product.prices.push(price(`new${next++}`, spec.amount_minor, spec.duration_days, { label: spec.label }));
      // Rails saved it, but the answer never arrived.
      if (fail.loseCreateAnswer) {
        fail.loseCreateAnswer = false;
        return down;
      }
      return snapshot();
    },
    async archive(id) {
      calls.push(`archive ${id}`);
      if (left.archive-- > 0) return down;
      const found = product.prices.find((item) => item.id === id)!;
      found.available = false;
      found.archived_at ??= "2026-11-18T00:00:00Z";
      return snapshot();
    },
  };
  return { api, calls, product };
}

const spec = { label: "30 days", amount_minor: 24000, duration_days: 30 };
const onSale = (product: Product) => product.prices.filter((item) => item.available && !item.archived_at);

describe("replacePrice", () => {
  test("creates the new price first, then archives the old one", async () => {
    const rails = fakeRails([price("old", 22000)]);
    const result = await replacePrice(rails.api, { known: new Set(["old"]), oldPriceId: "old", spec });
    expect(result.ok).toBe(true);
    expect(rails.calls).toEqual(["load", "create", "archive old"]);
    expect(onSale(rails.product).map((item) => item.amount_minor)).toEqual([24000]);
    expect(rails.product.prices.find((item) => item.id === "old")?.archived_at).not.toBeNull();
  });

  test("a failed create changes nothing and archives nothing", async () => {
    const rails = fakeRails([price("old", 22000)], { create: 1 });
    const result = await replacePrice(rails.api, { known: new Set(["old"]), oldPriceId: "old", spec });
    expect(result).toMatchObject({ ok: false, stage: "create" });
    expect(rails.calls).toEqual(["load", "create"]);
    expect(onSale(rails.product).map((item) => item.id)).toEqual(["old"]);
  });

  test("a failed archive leaves both prices on sale, and a retry only archives", async () => {
    const rails = fakeRails([price("old", 22000)], { archive: 1 });
    const input = { known: new Set(["old"]), oldPriceId: "old", spec };
    const first = await replacePrice(rails.api, input);
    expect(first).toMatchObject({ ok: false, stage: "archive" });
    expect(onSale(rails.product).length).toBe(2);

    const retry = await replacePrice(rails.api, input);
    expect(retry.ok).toBe(true);
    expect(rails.calls).toEqual(["load", "create", "archive old", "load", "archive old"]);
    expect(rails.product.prices.filter((item) => item.amount_minor === 24000).length).toBe(1);
    expect(onSale(rails.product).map((item) => item.amount_minor)).toEqual([24000]);
  });

  test("a lost answer to create does not add a second price on retry", async () => {
    const rails = fakeRails([price("old", 22000)], { loseCreateAnswer: true });
    const input = { known: new Set(["old"]), oldPriceId: "old", spec };
    const first = await replacePrice(rails.api, input);
    expect(first).toMatchObject({ ok: false, stage: "create" });

    const retry = await replacePrice(rails.api, input);
    expect(retry.ok).toBe(true);
    expect(rails.calls.filter((call) => call === "create").length).toBe(1);
    expect(rails.product.prices.filter((item) => item.amount_minor === 24000).length).toBe(1);
  });

  test("an older price with the same amount is not mistaken for the new one", async () => {
    const rails = fakeRails([price("old", 22000), price("extra", 24000)]);
    const result = await replacePrice(rails.api, { known: new Set(["old", "extra"]), oldPriceId: "old", spec });
    expect(rails.calls).toEqual(["load", "create", "archive old"]);
    expect(result.ok && result.newPrice.id).toBe("new1");
  });

  test("with no old price, it only creates", async () => {
    const rails = fakeRails([]);
    const result = await replacePrice(rails.api, { known: new Set(), oldPriceId: null, spec });
    expect(result.ok).toBe(true);
    expect(rails.calls).toEqual(["load", "create"]);
  });

  test("a failed load sends nothing", async () => {
    const rails = fakeRails([price("old", 22000)], { load: 1 });
    const result = await replacePrice(rails.api, { known: new Set(["old"]), oldPriceId: "old", spec });
    expect(result).toMatchObject({ ok: false, stage: "create" });
    expect(rails.calls).toEqual(["load"]);
  });
});
