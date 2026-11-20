import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FilterChip, FilterChips, ListToolbar, nextListSearch, toggledValues } from "./ListToolbar";

type SalesLike = { payment?: string; fulfillment?: string; q?: string; view?: string };
const SALES_KEYS = ["payment", "fulfillment", "q"] as const;

describe("nextListSearch", () => {
  test("applies the change and drops empty values", () => {
    const current: SalesLike = { payment: "unpaid", q: "ana" };
    expect(nextListSearch(current, { q: undefined }, SALES_KEYS)).toEqual({
      payment: "unpaid",
    });
  });

  test("drops old link params that are not list keys", () => {
    const current: SalesLike = { view: "due", payment: "unpaid,partial" };
    expect(nextListSearch(current, { payment: undefined }, SALES_KEYS)).toEqual({});
  });
});

describe("toggledValues", () => {
  const group = {
    key: "payment",
    title: "Payment",
    options: [
      { value: "unpaid", label: "Unpaid", count: 1 },
      { value: "paid", label: "Paid", count: 2 },
    ],
    chosen: ["paid"],
  };

  test("adds a value in menu order", () => {
    expect(toggledValues(group, "unpaid", true)).toEqual(["unpaid", "paid"]);
  });

  test("keeps chosen values that the menu does not show", () => {
    const schedule = { ...group, chosen: ["hidden-program", "paid"] };
    expect(toggledValues(schedule, "paid", false)).toEqual(["hidden-program"]);
  });
});

describe("FilterChip", () => {
  test("names the field, the operator, the values, and a clear button", () => {
    const html = renderToStaticMarkup(<FilterChip name="Payment" values={["Unpaid", "Part paid"]} onClear={() => {}} />);
    expect(html).toContain(">Payment</span>");
    expect(html).toContain(">is any of</span>");
    expect(html).toContain(">Unpaid, Part paid</span>");
    expect(html).toContain('<button type="button" class="filter-chip__clear" aria-label="Clear the payment filter">');
  });

  test("shows nothing when no value is chosen", () => {
    const groups = [{ key: "kind", title: "Kind", options: [{ value: "event", label: "Event", count: 2 }], chosen: [] }];
    const html = renderToStaticMarkup(<ListToolbar chips={<FilterChips groups={groups} onClear={() => {}} />} />);
    expect(html).toBe('<div class="list-toolbar"><div class="list-toolbar__filters"><div class="list-toolbar__chips"></div></div></div>');
  });
});
