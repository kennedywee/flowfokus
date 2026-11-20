import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, ListFilter, Search, X } from "lucide-react";
import { Kbd } from "./ui";
import { useOrganization } from "../lib/organization";
import { useShortcut } from "../lib/shortcuts";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const icon = { strokeWidth: 1.5, "aria-hidden": true, focusable: false } as const;

/** One value in a filter group, with the number of rows that have it. */
export interface FilterOption {
  value: string;
  label: string;
  count: number;
  icon?: ReactNode;
}

/** One fact staff can filter by, such as Payment, and the values chosen now. */
export interface FilterGroup<K extends string = string> {
  key: K;
  title: string;
  options: readonly FilterOption[];
  chosen: readonly string[];
}

/**
 * Paper "Table toolbar": Filter and the active chips on the left, search on
 * the right. Phones put Filter on its own row, then search, then the chips.
 */
export function ListToolbar({ filter, chips, search }: { filter?: ReactNode; chips?: ReactNode; search?: ReactNode }) {
  return (
    <div className="list-toolbar">
      {filter ? <div className="list-toolbar__filter">{filter}</div> : null}
      {chips ? <div className="list-toolbar__chips">{chips}</div> : null}
      {search ? <div className="list-toolbar__search">{search}</div> : null}
    </div>
  );
}

/** Filter: one submenu per group, with a count per value. `onChange` gets the new values in menu order. */
export function FilterMenu<K extends string>({
  groups,
  onChange,
}: {
  groups: readonly FilterGroup<K>[];
  onChange: (key: K, values: string[]) => void;
}) {
  const toggle = (group: FilterGroup<K>, value: string, on: boolean) => {
    const next = new Set(group.chosen);
    if (on) next.add(value);
    else next.delete(value);
    onChange(
      group.key,
      group.options.map((option) => option.value).filter((item) => next.has(item)),
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "secondary", size: "compact" })}>
        <ListFilter {...icon} />
        Filter
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="filter-menu">
        {groups.map((group) => (
          <DropdownMenuSub key={group.key}>
            <DropdownMenuSubTrigger>
              {group.title}
              <DropdownMenuShortcut>
                <ChevronRight {...icon} />
              </DropdownMenuShortcut>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="filter-menu">
              {group.options.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={group.chosen.includes(option.value)}
                  onCheckedChange={(on) => toggle(group, option.value, on)}
                >
                  {option.icon}
                  {option.label}
                  <DropdownMenuShortcut className="filter-menu__count">{option.count}</DropdownMenuShortcut>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Adds the row count to each filter value. */
export function withCounts(items: readonly { value: string; label: string; icon?: ReactNode }[], counts: Record<string, number>): FilterOption[] {
  return items.map((item) => ({ ...item, count: counts[item.value] ?? 0 }));
}

/** A chip for each group with chosen values. */
export function FilterChips<K extends string>({ groups, onClear }: { groups: readonly FilterGroup<K>[]; onClear: (key: K) => void }) {
  return groups.map((group) => (
    <FilterChip
      key={group.key}
      name={group.title}
      values={group.options.filter((option) => group.chosen.includes(option.value)).map((option) => option.label)}
      onClear={() => onClear(group.key)}
    />
  ));
}

/** One active filter: "Payment · is any of · Unpaid, Part paid", and a button that clears it. */
export function FilterChip({ name, values, onClear }: { name: string; values: readonly string[]; onClear: () => void }) {
  if (!values.length) return null;
  return (
    <span className="filter-chip">
      <span className="filter-chip__part filter-chip__name">{name}</span>
      <span className="filter-chip__part filter-chip__op">{values.length > 1 ? "is any of" : "is"}</span>
      <span className="filter-chip__part filter-chip__values">{values.join(", ")}</span>
      <button type="button" className="filter-chip__clear" aria-label={`Clear the ${name.toLowerCase()} filter`} onClick={onClear}>
        <X {...icon} />
      </button>
    </span>
  );
}

/**
 * Searches as staff type, after a short pause, and at once on Enter. "/"
 * focuses it; Escape clears it.
 */
export function SearchField({
  id,
  label,
  placeholder,
  q,
  onSearch,
  delay = 250,
}: {
  id: string;
  /** Names the field for assistive technology, for example "Search sales by member or item". */
  label: string;
  placeholder: string;
  q: string;
  onSearch: (q: string) => void;
  delay?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(q);
  useShortcut("/", () => input.current?.focus());

  // A search from elsewhere, such as "Clear search", replaces the typed text.
  useEffect(() => {
    setValue((current) => (current.trim() === q ? current : q));
  }, [q]);

  const search = (next: string) => {
    if (next.trim() !== q) onSearch(next.trim());
  };

  useEffect(() => {
    const timer = window.setTimeout(() => search(value), delay);
    return () => window.clearTimeout(timer);
    // Only typing restarts the pause.
  }, [value]);

  return (
    <form
      role="search"
      className="list-search"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        search(value);
      }}
    >
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <Search className="list-search__icon" {...icon} />
      <input
        ref={input}
        id={id}
        className="list-search__input"
        type="search"
        placeholder={placeholder}
        autoComplete="off"
        maxLength={200}
        aria-keyshortcuts="/"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            setValue("");
            search("");
          }
        }}
      />
      <Kbd>/</Kbd>
    </form>
  );
}

/** The loading shape of the toolbar: a Filter button and a search field. */
export function ListToolbarLoading({ filter = true }: { filter?: boolean }) {
  return (
    <div className="list-toolbar" aria-hidden="true">
      {filter ? (
        <div className="list-toolbar__filter">
          <span className="skeleton-block list-toolbar__skeleton-button" />
        </div>
      ) : null}
      <div className="list-toolbar__search">
        <span className="list-search skeleton-block" />
      </div>
    </div>
  );
}

type ListRoute = "/$org/members" | "/$org/sales" | "/$org/programs" | "/$org/products" | "/$org/check-in" | "/$org/schedule";

/**
 * Updates a list URL. The URL holds filters and search, so Back and reload
 * keep them. Only `keys` stay, so old link params leave on the first change.
 * Empty values leave the URL.
 */
export function useSetListSearch<S extends object>(to: ListRoute, current: S, keys: readonly (keyof S & string)[]) {
  const organization = useOrganization();
  const navigate = useNavigate();
  return (next: Partial<S>) => {
    void navigate({ to, params: { org: organization.slug }, search: nextListSearch(current, next, keys) as never, replace: true });
  };
}

/** The next list search: `current` with `next` applied, keeping only `keys` with a value. */
export function nextListSearch<S extends object>(current: S, next: Partial<S>, keys: readonly (keyof S & string)[]): Partial<S> {
  const merged: Partial<S> = { ...current, ...next };
  return Object.fromEntries(keys.filter((key) => merged[key]).map((key) => [key, merged[key]])) as Partial<S>;
}
