import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ListGroup, ListTable, ListTableBody, ListTableCell, ListTableRow, SelectionBar, ListTableEmpty } from "./ListTable";
import { FilterBar, FilterBarChip, type FilterField } from "./FilterBar";
import { AllowanceBar, CreditRing, SpotRow } from "./marks";
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

  test("a sortable header is a button, and only the sorted header has aria-sort", () => {
    const sorted = table([false], { column: "name", direction: "desc" });
    expect(sorted).toContain('aria-sort="descending"');
    expect(sorted).toMatch(/<button[^>]*class="list-table__sort"/);
    expect(table([false])).not.toContain("aria-sort");
  });

  test("the spent column is not sortable, so it has no button and no aria-sort", () => {
    const html = table([false], { column: "name", direction: "asc" });
    expect(html.match(/aria-sort/g)).toHaveLength(1);
  });

  test("every row has a named checkbox, and chosen rows say so", () => {
    const html = table([true, false]);
    expect(html).toContain('aria-label="Choose row 0"');
    expect(html).toContain('aria-label="Choose row 1"');
    expect(html).toContain('aria-label="Choose all rows"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  });

  test("an unselectable row keeps the checkbox column and shows no box", () => {
    const html = renderToStaticMarkup(
      <ListTable label="Bookings" columns={COLUMNS} selection={{ chosen: 0, total: 1, onToggleAll: () => {} }}>
        <ListTableBody>
          <ListTableRow unselectable selectLabel="Choose Ada">
            <ListTableCell>Ada</ListTableCell>
            <ListTableCell align="end">RM 1</ListTableCell>
          </ListTableRow>
          <ListTableRow selectLabel="Choose Ben">
            <ListTableCell>Ben</ListTableCell>
            <ListTableCell align="end">RM 1</ListTableCell>
          </ListTableRow>
        </ListTableBody>
      </ListTable>,
    );
    expect(html).not.toContain("Choose Ada");
    expect(html).toContain("Choose Ben");
    expect(html.match(/class="list-table__check"/g)?.length).toBe(3);
  });

  test("adjacent chosen rows share one band", () => {
    const html = table([true, true, true, false, true]);
    expect([...html.matchAll(/data-band="(\w+)"/g)].map((match) => match[1])).toEqual(["first", "middle", "last", "alone"]);
  });

  test("a group is one rowgroup, and its heading cell spans every column", () => {
    const html = renderToStaticMarkup(
      <ListTable
        label="Members"
        columns={COLUMNS}
        selection={{ chosen: 0, total: 1, onToggleAll: () => {} }}
      >
        <ListGroup label="Here" count={1}>
          <ListTableBody>
            <ListTableRow>
              <ListTableCell>Row</ListTableCell>
            </ListTableRow>
          </ListTableBody>
        </ListGroup>
      </ListTable>,
    );
    expect(html.match(/role="rowgroup"/g)).toHaveLength(1);
    expect(html).toContain('role="cell" aria-colspan="3"');
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
    expect(open).toContain('role="group"');
    expect(open).not.toContain('role="toolbar"');
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

describe("FilterBar", () => {
  const status: FilterField = { key: "status", label: "Status", options: [{ value: "active", label: "Active" }] };

  test("with no fields there is no Filter button, and search and Display stay", () => {
    const html = renderToStaticMarkup(<FilterBar fields={[]} filters={[]} onChange={() => {}} search={<input aria-label="Search" />} display={<button type="button">Display</button>} />);
    expect(html).not.toContain(">Filter<");
    expect(html).toContain('aria-label="Search"');
    expect(html).toContain("Display");
  });

  test("with a field there is a Filter button", () => {
    const html = renderToStaticMarkup(<FilterBar fields={[status]} filters={[]} onChange={() => {}} />);
    expect(html).toContain("Filter");
  });
});

describe("marks and patterns", () => {
  test("a credit ring always has its text", () => {
    expect(renderToStaticMarkup(<CreditRing left={2} total={10} />)).toContain("2 of 10 left");
  });

  test("a cancelled spot row is a flat line named Cancelled", () => {
    const html = renderToStaticMarkup(<SpotRow capacity={12} booked={0} cancelled />);
    expect(html).toContain('aria-label="Cancelled"');
    expect(html).toContain("spot--line");
  });

  test("a spot row names its count", () => {
    expect(renderToStaticMarkup(<SpotRow capacity={12} booked={11} />)).toContain('aria-label="11 of 12 spots booked"');
  });

  test("a spot row is 10px tall with a mark every 6px, as in Paper", () => {
    const html = renderToStaticMarkup(<SpotRow capacity={12} booked={11} />);
    expect(html).toContain('width="72" height="10"');
    expect(html).toContain('d="M12 10L14 0H17.72L15.72 10Z"');
  });

  test("an allowance bar is 96 by 12, and wider past twelve segments", () => {
    expect(renderToStaticMarkup(<AllowanceBar limit={null} label="Unlimited visits" />)).toContain('width="96" height="12"');
    expect(renderToStaticMarkup(<AllowanceBar limit={8} label="8 visits" />)).toContain('width="96" height="12"');
    expect(renderToStaticMarkup(<AllowanceBar limit={8} label="8 visits" />)).toContain('d="M8 12L11 0H14L11 12Z"');
    expect(renderToStaticMarkup(<AllowanceBar limit={20} label="20 visits" />)).toContain('width="160" height="12"');
  });

  test("a background pattern is hidden from assistive technology", () => {
    for (const record of ["member", "sale", "program", "session", "product"] as const) {
      expect(renderToStaticMarkup(<RecordBackdrop record={record} />)).toContain('aria-hidden="true"');
    }
  });
});
