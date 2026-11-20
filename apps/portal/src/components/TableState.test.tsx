import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TableState } from "./TableState";

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("TableState", () => {
  test("an empty list keeps the header and hides the skeleton from assistive technology", () => {
    const html = renderToStaticMarkup(
      <TableState
        className="sales-table"
        head={<div className="sales-table__head">Member</div>}
        title="No sales yet"
        text="Desk sales and online purchases show up here."
        action={<button type="button">New sale</button>}
      />,
    );
    expect(html).toContain('class="table-state sales-table"');
    expect(html).toContain('<div class="sales-table__head">Member</div>');
    expect(html).toContain('data-skeleton="true"');
    expect(html).toContain('<div class="table-state__skeleton" aria-hidden="true">');
    expect(count(html, 'class="table-state__line"')).toBe(7);
    expect(html).toMatch(/role="status"[^>]*>.*No sales yet.*Desk sales and online purchases show up here\..*New sale/);
  });

  test("no results shows only the message and its action", () => {
    const html = renderToStaticMarkup(
      <TableState title="No members match “kumar”" action={<a href="/chainsaw/members">Clear search</a>} />,
    );
    expect(html).not.toContain("table-state__skeleton");
    expect(html).not.toContain("data-skeleton");
    expect(html).not.toContain("table-state__text");
    expect(html).toContain('role="status"');
    expect(html).toContain("No members match “kumar”");
    expect(html).toContain('<a href="/chainsaw/members">Clear search</a>');
  });

  test("a missing action leaves no empty wrapper", () => {
    const html = renderToStaticMarkup(<TableState head={<div />} title="No check-ins yet today" />);
    expect(html).not.toContain("table-state__action");
  });
});
