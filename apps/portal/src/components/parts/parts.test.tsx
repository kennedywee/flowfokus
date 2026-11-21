import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ListTable, ListTableBody, ListTableCell, ListTableRow, SelectionBar, ListTableEmpty } from "./ListTable";
import { FilterBarChip, type FilterField } from "./FilterBar";
import { CreditRing, SpotRow } from "./marks";
import { RecordBackdrop } from "./Backdrop";

const COLUMNS = [
  { id: "name", label: "Member", sortable: true },
  { id: "spent", label: "Spent", width: "100px", align: "end" as const },
];

function table(selected: boolean[], sort: { column: string; direction: "asc" | "desc" } | null = null) {
  return renderToStaticMarkup(
    <ListTable
      label="Members"
      columns={COLUMNS}
      sort={sort}
      onSort={() => {}}
      selection={{ chosen: selected.filter(Boolean).length, total: selected.length, onToggleAll: () => {} }}
    >
      <ListTableBody>
        {selected.map((on, index) => (
          <ListTableRow key={index} selected={on} selectLabel={`Choose row ${index}`}>
            <ListTableCell>Row {index}</ListTableCell>
            <ListTableCell align="end">RM 1</ListTableCell>
          </ListTableRow>
        ))}
      </ListTableBody>
    </ListTable>,
  );
}

describe("ListTable", () => {
  test("is a named table with column headers", () => {
    const html = table([false]);
    expect(html).toContain('role="table"');
    expect(html).toContain('aria-label="Members"');
    expect(html).toContain('role="columnheader"');
  });

  test("a sortable header is a button, and its cell has aria-sort", () => {
    const sorted = table([false], { column: "name", direction: "desc" });
    expect(sorted).toContain('aria-sort="descending"');
    expect(sorted).toMatch(/<button[^>]*class="list-table__sort"/);
    expect(table([false])).toContain('aria-sort="none"');
  });

  test("the spent column is not sortable, so it has no button and no aria-sort", () => {
    const html = table([false]);
    expect(html.match(/aria-sort/g)).toHaveLength(1);
  });

  test("every row has a named checkbox, and chosen rows say so", () => {
    const html = table([true, false]);
    expect(html).toContain('aria-label="Choose row 0"');
    expect(html).toContain('aria-label="Choose row 1"');
    expect(html).toContain('aria-label="Choose all rows"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  });

  test("adjacent chosen rows share one band", () => {
    const html = table([true, true, true, false, true]);
    expect([...html.matchAll(/data-band="(\w+)"/g)].map((match) => match[1])).toEqual(["first", "middle", "last", "alone"]);
  });

  test("the empty state is a status", () => {
    expect(renderToStaticMarkup(<ListTableEmpty title="No members yet" />)).toContain('role="status"');
  });
});

describe("SelectionBar", () => {
  test("keeps a live region that is empty until rows are chosen", () => {
    expect(renderToStaticMarkup(<SelectionBar count={0} onClear={() => {}} />)).toContain('<p role="status" class="visually-hidden"></p>');
    const open = renderToStaticMarkup(<SelectionBar count={2} onClear={() => {}} />);
    expect(open).toContain('<p role="status" class="visually-hidden">2 selected</p>');
    expect(open).toContain('role="toolbar"');
    expect(open).toContain('aria-label="Clear selection"');
  });
});

describe("FilterBarChip", () => {
  const field: FilterField = { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "frozen", label: "Frozen" }] };

  test("the operator is a button that says what it does", () => {
    const html = renderToStaticMarkup(<FilterBarChip field={field} filter={{ field: "status", values: ["active"] }} onChange={() => {}} />);
    expect(html).toContain('aria-label="Status is. Change to is not"');
    expect(html).toContain('aria-label="Remove the status filter"');
    expect(html).toContain('aria-label="Status is Active"');
  });

  test("several values read is any of, and a negated one is none of", () => {
    const html = renderToStaticMarkup(<FilterBarChip field={field} filter={{ field: "status", values: ["active", "frozen"], negated: true }} onChange={() => {}} />);
    expect(html).toContain("is none of");
    expect(html).toContain("Change to is any of");
  });
});

describe("marks and patterns", () => {
  test("a credit ring always has its text", () => {
    expect(renderToStaticMarkup(<CreditRing left={2} total={10} />)).toContain("2 of 10 left");
  });

  test("a spot row names its count", () => {
    expect(renderToStaticMarkup(<SpotRow capacity={12} booked={11} />)).toContain('aria-label="11 of 12 spots booked"');
  });

  test("a background pattern is hidden from assistive technology", () => {
    for (const record of ["member", "sale", "program", "session", "product"] as const) {
      expect(renderToStaticMarkup(<RecordBackdrop record={record} />)).toContain('aria-hidden="true"');
    }
  });
});
