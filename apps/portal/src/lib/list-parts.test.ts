import { describe, expect, test } from "bun:test";
import {
  ariaSort,
  bandPositions,
  creditTone,
  earlierLabel,
  filterFeed,
  filterOperator,
  matchesFilter,
  mixShares,
  nextSort,
  pieSlice,
  rangeIds,
  selectedLabel,
  selectionState,
  spotKinds,
  splitEvents,
  toggleId,
  toggleOperator,
  withValue,
} from "./list-parts";
import { pageRange, rangeLabel } from "./paging";

describe("sort state", () => {
  test("a new column starts ascending", () => {
    expect(nextSort(null, "name")).toEqual({ column: "name", direction: "asc" });
    expect(nextSort({ column: "name", direction: "desc" }, "spent")).toEqual({ column: "spent", direction: "asc" });
  });

  test("the same column flips", () => {
    expect(nextSort({ column: "name", direction: "asc" }, "name")).toEqual({ column: "name", direction: "desc" });
    expect(nextSort({ column: "name", direction: "desc" }, "name")).toEqual({ column: "name", direction: "asc" });
  });

  test("aria-sort names only the sorted column", () => {
    const sort = { column: "name", direction: "desc" } as const;
    expect(ariaSort(sort, "name")).toBe("descending");
    expect(ariaSort(sort, "spent")).toBeUndefined();
    expect(ariaSort(null, "name")).toBeUndefined();
    expect(ariaSort({ column: "name", direction: "asc" }, "name")).toBe("ascending");
  });
});

describe("selection band", () => {
  test("adjacent selected rows merge into one band", () => {
    expect(bandPositions([false, true, true, true, false])).toEqual([null, "first", "middle", "last", null]);
  });

  test("a lone row and two runs", () => {
    expect(bandPositions([true, false, true, true])).toEqual(["alone", null, "first", "last"]);
  });

  test("a run at either end of the list", () => {
    expect(bandPositions([true, true, false])).toEqual(["first", "last", null]);
    expect(bandPositions([false, true, true])).toEqual([null, "first", "last"]);
    expect(bandPositions([])).toEqual([]);
  });
});

describe("selection", () => {
  test("the header checkbox is mixed when some rows are chosen", () => {
    expect(selectionState(0, 5)).toEqual({ checked: false, indeterminate: false });
    expect(selectionState(2, 5)).toEqual({ checked: false, indeterminate: true });
    expect(selectionState(5, 5)).toEqual({ checked: true, indeterminate: false });
    expect(selectionState(0, 0)).toEqual({ checked: false, indeterminate: false });
  });

  test("the floating bar count", () => {
    expect(selectedLabel(2)).toBe("2 selected");
  });

  test("toggleId leaves the old set alone", () => {
    const first = new Set(["a"]);
    const second = toggleId(first, "b");
    expect([...first]).toEqual(["a"]);
    expect([...second]).toEqual(["a", "b"]);
    expect([...toggleId(second, "a")]).toEqual(["b"]);
    expect([...toggleId(second, "a", true)]).toEqual(["a", "b"]);
  });

  test("shift-click takes the rows between, in either direction", () => {
    const order = ["a", "b", "c", "d"];
    expect(rangeIds(order, "b", "d")).toEqual(["b", "c", "d"]);
    expect(rangeIds(order, "d", "b")).toEqual(["b", "c", "d"]);
    expect(rangeIds(order, "zz", "c")).toEqual(["c"]);
  });
});

describe("filter operator", () => {
  test("one value reads is or is not", () => {
    expect(filterOperator({ values: ["active"] })).toBe("is");
    expect(filterOperator({ values: ["active"], negated: true })).toBe("is not");
  });

  test("several values read is any of or is none of", () => {
    expect(filterOperator({ values: ["a", "b"] })).toBe("is any of");
    expect(filterOperator({ values: ["a", "b"], negated: true })).toBe("is none of");
  });

  test("a click flips the sign and keeps the values", () => {
    const filter = { field: "status", values: ["active", "frozen"] };
    const flipped = toggleOperator(filter);
    expect(filterOperator(flipped)).toBe("is none of");
    expect(flipped.values).toEqual(["active", "frozen"]);
    expect(filterOperator(toggleOperator(flipped))).toBe("is any of");
  });

  test("a negated filter passes the rows it does not name", () => {
    expect(matchesFilter({ field: "status", values: ["active"] }, "active")).toBe(true);
    expect(matchesFilter({ field: "status", values: ["active"], negated: true }, "active")).toBe(false);
    expect(matchesFilter({ field: "status", values: ["active"], negated: true }, "ended")).toBe(true);
  });

  test("withValue adds, removes, and drops an empty filter", () => {
    const one = withValue(undefined, "tag", "staff", true);
    expect(one).toEqual({ field: "tag", values: ["staff"], negated: undefined });
    const two = withValue({ field: "tag", values: ["staff"], negated: true }, "tag", "pt", true);
    expect(two).toEqual({ field: "tag", values: ["staff", "pt"], negated: true });
    expect(withValue(one!, "tag", "staff", false)).toBeNull();
  });
});

describe("pager range", () => {
  test("the first page, a middle page, and a short last page", () => {
    expect(pageRange(1, 50, 186)).toEqual({ from: 1, to: 50, total: 186, pages: 4 });
    expect(pageRange(2, 50, 186)).toEqual({ from: 51, to: 100, total: 186, pages: 4 });
    expect(pageRange(4, 50, 186)).toEqual({ from: 151, to: 186, total: 186, pages: 4 });
  });

  test("an empty list has one page and no range", () => {
    expect(pageRange(1, 50, 0)).toEqual({ from: 0, to: 0, total: 0, pages: 1 });
  });

  test("a page past the end clamps to the last page", () => {
    expect(pageRange(9, 50, 60)).toEqual({ from: 51, to: 60, total: 60, pages: 2 });
  });

  test("the footer count", () => {
    expect(rangeLabel(1, 50, 186, "members")).toBe("1–50 of 186 members");
    expect(rangeLabel(1, 50, 0, "members")).toBe("0 members");
    expect(rangeLabel(1, 50, 1, "members")).toBe("1 member");
  });
});

describe("activity", () => {
  const items = [
    { id: 1, kind: "event" as const },
    { id: 2, kind: "comment" as const },
    { id: 3, kind: "event" as const },
  ];

  test("the control filters the feed", () => {
    expect(filterFeed(items, "all")).toHaveLength(3);
    expect(filterFeed(items, "comments").map((item) => item.id)).toEqual([2]);
    expect(filterFeed(items, "activity").map((item) => item.id)).toEqual([1, 3]);
  });

  test("older events fold behind a count", () => {
    expect(splitEvents(items, 2)).toEqual({ shown: items.slice(0, 2), hidden: 1 });
    expect(splitEvents(items, 9).hidden).toBe(0);
    expect(earlierLabel(1)).toBe("Show 1 earlier event");
    expect(earlierLabel(4)).toBe("Show 4 earlier events");
  });
});

describe("marks", () => {
  test("a credit ring turns amber at two or fewer left", () => {
    expect(creditTone(7)).toBe("ok");
    expect(creditTone(3)).toBe("ok");
    expect(creditTone(2)).toBe("low");
    expect(creditTone(1)).toBe("low");
    expect(creditTone(0)).toBe("low");
  });

  test("a pie slice ends where Paper's does", () => {
    // 7 of 10 left: Paper draws "M8 8V4A4 4 0 1 1 4.2 9.24Z".
    expect(pieSlice(0.7)).toBe("M8 8V4A4 4 0 1 1 4.2 9.24Z");
    expect(pieSlice(0)).toBe("");
    expect(pieSlice(0.25)).toBe("M8 8V4A4 4 0 0 1 12 8Z");
  });

  test("spots are booked first, then open", () => {
    expect(spotKinds(4, 2)).toEqual(["booked", "booked", "open", "open"]);
  });

  test("a full session is amber, a past one grey", () => {
    expect(spotKinds(3, 3)).toEqual(["full", "full", "full"]);
    expect(spotKinds(3, 2, "past")).toEqual(["past", "past", "open"]);
    expect(spotKinds(3, 9)).toEqual(["full", "full", "full"]);
    expect(spotKinds(0, 0)).toEqual([]);
  });

  test("mix shares are whole percentages", () => {
    expect(mixShares([84, 38, 21, 7])).toEqual([56, 25, 14, 5]);
    expect(mixShares([0, 0])).toEqual([0, 0]);
  });
});
