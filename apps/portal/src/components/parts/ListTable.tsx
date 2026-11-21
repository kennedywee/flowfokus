import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/icon";
import {
  ariaSort,
  bandPositions,
  nextSort,
  selectedLabel,
  selectionState,
  type BandPosition,
  type SortState,
} from "@/lib/list-parts";
import { cn } from "@/lib/utils";

const icon = { "aria-hidden": true, focusable: false } as const;

/*
 * The list table (Paper "Members" and "Session details"). A column label row
 * of 30px with one hairline, then rows that sit flush with the content edge:
 * no band, no row dividers, no inset. Two-line rows (56px) on a list page,
 * one-line rows (44px) inside a detail page. It uses the table roles on a
 * grid, so a row can be taller than a text line and still read as a table.
 */

export interface ListColumn {
  id: string;
  label: string;
  /** A CSS grid track, such as "110px". A column without a width shares the free space. */
  width?: string;
  align?: "start" | "end";
  sortable?: boolean;
  /** Hides the label visually. The column keeps its name for assistive technology. */
  hideLabel?: boolean;
}

interface TableContext {
  template: string;
  selectable: boolean;
  /** The number of columns, with the selection column when there is one. */
  columns: number;
}

const Context = createContext<TableContext>({ template: "1fr", selectable: false, columns: 1 });

/** True inside a ListGroup, whose own rowgroup holds the rows. */
const GroupContext = createContext(false);

export interface ListTableSelection {
  /** How many of the rows are chosen, and how many there are. */
  chosen: number;
  total: number;
  /** The header checkbox: choose all rows, or none. */
  onToggleAll: (on: boolean) => void;
}

export function ListTable({
  label,
  columns,
  sort = null,
  onSort,
  selection,
  density = "two-line",
  className,
  children,
}: {
  /** Names the table for assistive technology, for example "Members". */
  label: string;
  columns: readonly ListColumn[];
  sort?: SortState | null;
  onSort?: (next: SortState) => void;
  /** Adds a checkbox column. The header checkbox shows none, some, or all. */
  selection?: ListTableSelection;
  density?: "two-line" | "one-line";
  className?: string;
  children?: ReactNode;
}) {
  const selectable = Boolean(selection);
  const tracks = columns.map((column) => column.width ?? "minmax(0, 1fr)");
  const template = (selectable ? ["16px", ...tracks] : tracks).join(" ");
  const state = selection ? selectionState(selection.chosen, selection.total) : null;
  return (
    <Context.Provider value={{ template, selectable, columns: columns.length + (selectable ? 1 : 0) }}>
      <div role="table" aria-label={label} className={cn("list-table", className)} data-density={density} data-selectable={selectable || undefined}>
        <div role="row" className="list-table__head" style={{ gridTemplateColumns: template }}>
          {selection && state ? (
            <div role="columnheader" className="list-table__check">
              <Checkbox
                aria-label="Choose all rows"
                checked={state.checked}
                indeterminate={state.indeterminate}
                onCheckedChange={(on) => selection.onToggleAll(Boolean(on))}
              />
            </div>
          ) : null}
          {columns.map((column) => (
            <HeadCell key={column.id} column={column} sort={sort} onSort={onSort} />
          ))}
        </div>
        {children}
      </div>
    </Context.Provider>
  );
}

function HeadCell({ column, sort, onSort }: { column: ListColumn; sort: SortState | null; onSort?: (next: SortState) => void }) {
  const sortable = column.sortable && onSort;
  const label = <span className={column.hideLabel ? "visually-hidden" : undefined}>{column.label}</span>;
  return (
    <div
      role="columnheader"
      className="list-table__heading"
      data-align={column.align}
      data-sorted={sort?.column === column.id || undefined}
      aria-sort={ariaSort(sort, column.id)}
    >
      {sortable ? (
        <button type="button" className="list-table__sort" onClick={() => onSort(nextSort(sort, column.id))}>
          {label}
          <Icon name="arrowDown" size={12} {...icon} data-direction={sort?.column === column.id ? sort.direction : undefined} />
        </button>
      ) : (
        label
      )}
    </div>
  );
}

/**
 * The rows. Adjacent selected rows merge into one band: this reads each
 * child row's `selected` prop and tells it where it sits in its run.
 */
export function ListTableBody({ children, className }: { children: ReactNode; className?: string }) {
  const grouped = useContext(GroupContext);
  const rows = Children.toArray(children).filter((child): child is ReactElement<ListTableRowProps> => isValidElement(child));
  const bands = bandPositions(rows.map((row) => Boolean(row.props.selected)));
  return (
    <div role={grouped ? undefined : "rowgroup"} className={cn("list-table__body", className)}>
      {rows.map((row, index) => cloneElement(row, { band: bands[index] }))}
    </div>
  );
}

export interface ListTableRowProps {
  /** The row is chosen. Chosen rows get the band. */
  selected?: boolean;
  /** Set by ListTableBody. */
  band?: BandPosition | null;
  /** With a selection column: called when the row's checkbox changes. `range` is true for a shift-click. */
  onSelectedChange?: (on: boolean, details: { range: boolean }) => void;
  /** Names the row's checkbox, for example "Choose Ben Tan". */
  selectLabel?: string;
  /** Shows the hover look without a pointer. For the gallery. */
  demo?: "hover" | "focus";
  className?: string;
  children: ReactNode;
}

export function ListTableRow({ selected = false, band = null, onSelectedChange, selectLabel, demo, className, children }: ListTableRowProps) {
  const { template, selectable } = useContext(Context);
  const shift = useRef(false);
  return (
    <div
      role="row"
      aria-selected={selectable ? selected : undefined}
      className={cn("list-table__row", className)}
      style={{ gridTemplateColumns: template }}
      data-selected={selected || undefined}
      data-band={selected ? (band ?? "alone") : undefined}
      data-demo={demo}
    >
      {selectable ? (
        <div role="cell" className="list-table__check">
          <Checkbox
            aria-label={selectLabel ?? "Choose row"}
            checked={selected}
            onClick={(event) => {
              shift.current = event.shiftKey;
            }}
            onCheckedChange={(on) => onSelectedChange?.(Boolean(on), { range: shift.current })}
          />
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function ListTableCell({
  align,
  className,
  children,
}: {
  align?: "start" | "end";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div role="cell" className={cn("list-table__cell", className)} data-align={align}>
      {children}
    </div>
  );
}

/**
 * A collapsible group of rows with a status mark and a count, such as
 * "Here 2" or "To arrive 9". The heading is a button; the rows stay in the
 * page order when it is open. The group is one rowgroup: the heading row and
 * the rows below it. The heading cell spans every column.
 */
export function ListGroup({
  mark,
  label,
  count,
  defaultOpen = true,
  children,
}: {
  mark?: ReactNode;
  label: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const { columns } = useContext(Context);
  return (
    <Collapsible defaultOpen={defaultOpen} className="list-group" role="rowgroup">
      <div role="row" className="list-group__head">
        <div role="cell" aria-colspan={columns} className="list-group__cell">
          <CollapsibleTrigger className="list-group__trigger">
            <Icon name="chevronDown" size={12} className="list-group__chevron" {...icon} />
            {mark ? <span className="list-group__mark" aria-hidden="true">{mark}</span> : null}
            <span className="list-group__label">{label}</span>
            <span className="list-group__count">{count}</span>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsiblePanel className="list-group__panel">
        <GroupContext.Provider value={true}>{children}</GroupContext.Provider>
      </CollapsiblePanel>
    </Collapsible>
  );
}

/** Skeleton rows with the table's own columns, while a list loads. */
export function ListTableLoading({ rows = 5, label = "Loading" }: { rows?: number; label?: string }) {
  const { template, selectable, columns: all } = useContext(Context);
  const columns = all - (selectable ? 1 : 0);
  return (
    <div className="list-table__body" role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="list-table__row list-table__row--loading" style={{ gridTemplateColumns: template }} aria-hidden="true">
          {selectable ? <span className="list-table__check" /> : null}
          {Array.from({ length: columns }, (_, cell) => (
            <span key={cell} className="list-table__cell">
              <i className="skeleton" data-wide={cell === 0 || undefined} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A list with no rows, under its column labels. */
export function ListTableEmpty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div role="status" className="list-table__empty">
      <p className="list-table__empty-title">{title}</p>
      {text ? <p className="list-table__empty-text">{text}</p> : null}
      {action ? <div className="list-table__empty-action">{action}</div> : null}
    </div>
  );
}

/**
 * Lists inside a detail page load more on scroll. When the sentinel scrolls
 * into view, `onLoadMore` runs once for the rows now loaded. When `loaded`
 * changes (rows were added) the observer starts again, so a sentinel that is
 * still in view asks for the next page. A failed load does not ask again; the
 * button does the same for keyboard and assistive technology users, and for
 * browsers with no observer.
 */
export function LoadMore({
  loaded,
  onLoadMore,
  loading,
  done = false,
  label = "Show more",
}: {
  /** How many rows are loaded now. A change re-arms the scroll trigger. */
  loaded: number;
  /** Return the request's promise: when it settles, even with an error, Show more works again. */
  onLoadMore: () => void | Promise<unknown>;
  /** True while a request is out. The button is disabled meanwhile. */
  loading: boolean;
  done?: boolean;
  label?: string;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const latest = useRef(onLoadMore);
  latest.current = onLoadMore;
  // `asked`: the scroll trigger already asked for this page. `pending`: a
  // request is out, from the trigger or the button, so neither asks again.
  // It clears when the request settles, so a failed load frees the button.
  const asked = useRef(false);
  const pending = useRef(false);
  // The table to focus when the button, holding focus, goes away at the end.
  const focusTable = useRef<HTMLElement | null>(null);
  useEffect(() => {
    asked.current = false;
    pending.current = false;
  }, [loaded]);
  const ask = (load: () => void | Promise<unknown>) => {
    pending.current = true;
    try {
      // The caller shows its own error; here a settled request only frees the button.
      Promise.resolve(load())
        .finally(() => {
          pending.current = false;
        })
        .catch(() => undefined);
    } catch (error) {
      pending.current = false;
      throw error;
    }
  };
  useEffect(() => {
    if (!done || !focusTable.current) return;
    const table = focusTable.current;
    focusTable.current = null;
    if (document.activeElement && document.activeElement !== document.body) return;
    if (!table.hasAttribute("tabindex")) table.setAttribute("tabindex", "-1");
    table.focus();
  }, [done]);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || done || loading || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (asked.current || pending.current || !entries.some((entry) => entry.isIntersecting)) return;
      asked.current = true;
      ask(latest.current);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [done, loading, loaded]);
  if (done) return null;
  return (
    <div ref={sentinel} className="list-table__more">
      <button
        type="button"
        className="list-table__more-button"
        disabled={loading}
        aria-busy={loading || undefined}
        onFocus={(event) => {
          focusTable.current = event.currentTarget.closest<HTMLElement>('[role="table"]');
        }}
        onBlur={(event) => {
          if (event.relatedTarget) focusTable.current = null;
        }}
        onClick={() => {
          if (pending.current) return;
          asked.current = true;
          ask(onLoadMore);
        }}
      >
        {loading ? "Loading…" : label}
      </button>
    </div>
  );
}

/**
 * The floating bar over a selection: "2 selected", the bulk actions, and a
 * button that clears the selection. A live region announces the count as it
 * changes. The bar is a labelled group in the normal Tab order. Escape in the
 * bar clears the selection. When the bar closes from inside (Clear, Escape, or
 * a bulk action that clears the selection), focus moves to the header checkbox
 * of the nearest table, so it does not fall to the page.
 */
const BarContext = createContext<((run: () => void) => () => void) | null>(null);

export function SelectionBar({ count, onClear, children }: { count: number; onClear: () => void; children?: ReactNode }) {
  const open = count > 0;
  const bar = useRef<HTMLDivElement>(null);
  // Set while focus is in the bar. When the bar closes, now or after an async
  // bulk action, and focus fell to the page, it goes to this checkbox.
  const restore = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open || !restore.current) return;
    const target = restore.current;
    restore.current = null;
    const active = document.activeElement;
    if (target.isConnected && (!active || active === document.body)) target.focus();
  }, [open]);
  const inside = (run: () => void) => () => run();
  return (
    <>
      <p role="status" className="visually-hidden">
        {open ? selectedLabel(count) : ""}
      </p>
      {open ? (
        <BarContext.Provider value={inside}>
          <div
            ref={bar}
            role="group"
            aria-label="Bulk actions"
            className="selection-bar"
            onFocus={() => {
              restore.current = headerCheckbox(bar.current);
            }}
            onBlur={(event) => {
              if (event.relatedTarget && !bar.current?.contains(event.relatedTarget as Node)) restore.current = null;
            }}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === "Escape") inside(onClear)();
            }}
          >
            <span className="selection-bar__count">{selectedLabel(count)}</span>
            <span className="selection-bar__rule" aria-hidden="true" />
            {children}
            <span className="selection-bar__rule" aria-hidden="true" />
            <button type="button" className="selection-bar__clear" aria-label="Clear selection" onClick={inside(onClear)}>
              <Icon name="close" {...icon} />
            </button>
          </div>
        </BarContext.Provider>
      ) : null}
    </>
  );
}

/** The header checkbox of the table that shares the bar's nearest container. */
function headerCheckbox(bar: HTMLElement | null): HTMLElement | null {
  for (let node = bar?.parentElement; node; node = node.parentElement) {
    const found = node.querySelector<HTMLElement>('[role="table"] .list-table__head [role="checkbox"]');
    if (found) return found;
  }
  return null;
}

/** A bulk action: an icon and a label. The tone colours the icon only. */
export function SelectionAction({
  icon: iconName,
  tone,
  onClick,
  children,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  tone?: "good" | "critical";
  onClick: () => void;
  children: ReactNode;
}) {
  const inside = useContext(BarContext);
  return (
    <button type="button" className="selection-bar__action" data-tone={tone} onClick={inside ? inside(onClick) : onClick}>
      <Icon name={iconName} size={14} {...icon} />
      {children}
    </button>
  );
}

/**
 * The first cell of a two-line row: a lead (a Tile), a 14px title with room
 * for tags beside it, and a grey line under it. A one-line row has no `sub`.
 */
export function CellStack({ lead, title, tags, sub }: { lead?: ReactNode; title: ReactNode; tags?: ReactNode; sub?: ReactNode }) {
  return (
    <span className="cell-stack">
      {lead}
      <span className="cell-stack__text">
        <span className="cell-stack__title">
          <span>{title}</span>
          {tags}
        </span>
        {sub ? <span className="cell-stack__sub">{sub}</span> : null}
      </span>
    </span>
  );
}
