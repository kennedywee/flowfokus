import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FilterChip, FilterChips, ListToolbar, nextListSearch } from "./ListToolbar";

describe("nextListSearch", () => {
  test("applies the change and drops empty values", () => {
    expect(nextListSearch({ payment: "unpaid", q: "ana" }, { q: undefined }, ["payment", "fulfillment", "q"])).toEqual({
      payment: "unpaid",
    });
  });

  test("drops old link params that are not list keys", () => {
    const current = { view: "due", payment: "unpaid,partial" };
    expect(nextListSearch(current, { payment: undefined }, ["payment", "fulfillment", "q"])).toEqual({});
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
    expect(html).toBe('<div class="list-toolbar"><div class="list-toolbar__chips"></div></div>');
  });
});
