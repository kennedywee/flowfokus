import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
import { Icon, type IconName } from "@/components/ui/icon";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { filterOperator, toggleOperator, withValue, type ActiveFilter, type SortState } from "@/lib/list-parts";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dot, type DotTone } from "./marks";

const icon = { "aria-hidden": true, focusable: false } as const;

/*
 * The filter bar (Paper "Members — filter operator"): a Filter button, then a
 * chip for each active filter, then search and Display on the right. A chip
 * reads field, operator, value, remove. A click on the operator flips "is" and
 * "is not" (or "is any of" and "is none of"). There is no operator menu.
 */

export interface FilterOption {
  value: string;
  label: string;
  /** A tag colour. Shown as a dot beside the label. */
  dot?: DotTone;
  /** How many rows have this value. */
  count?: number;
}

export interface FilterField {
  key: string;
  label: string;
  icon?: IconName;
  options: readonly FilterOption[];
}

export function FilterBar({
  fields,
  filters,
  onChange,
  search,
  display,
  className,
}: {
  fields: readonly FilterField[];
  filters: readonly ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
  /** The search field, on the right. Use SearchField. */
  search?: ReactNode;
  /** The Display popover, after search. */
  display?: ReactNode;
  className?: string;
}) {
  const filterButton = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  // A chip that removes itself takes the focused element with it. Focus goes to the Filter button.
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    filterButton.current?.focus();
  }, [filters]);
  // A changed filter keeps its place. A new one goes last. `null` removes it.
  const setFilter = (field: string, next: ActiveFilter | null) => {
    const exists = filters.some((filter) => filter.field === field);
    if (!next) onChange(filters.filter((filter) => filter.field !== field));
    else if (exists) onChange(filters.map((filter) => (filter.field === field ? next : filter)));
    else onChange([...filters, next]);
  };
  const valuesOf = (field: string) => filters.find((filter) => filter.field === field);
  return (
    <div className={cn("filter-bar", className)} role="group" aria-label="Filters">
      <DropdownMenu>
        <DropdownMenuTrigger ref={filterButton} className={buttonVariants({ variant: "secondary", size: "compact" })}>
          <Icon name="filter" size={14} {...icon} />
          Filter
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="filter-menu">
          {fields.map((field) => (
            <DropdownMenuSub key={field.key}>
              <DropdownMenuSubTrigger>
                {field.icon ? <Icon name={field.icon} size={14} {...icon} /> : null}
                {field.label}
                <DropdownMenuShortcut>
                  <Icon name="chevronRight" {...icon} />
                </DropdownMenuShortcut>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="filter-menu">
                <FieldOptions field={field} filter={valuesOf(field.key)} onChange={(next) => setFilter(field.key, next)} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {filters.map((filter) => {
        const field = fields.find((item) => item.key === filter.field);
        if (!field) return null;
        return (
          <FilterBarChip
            key={filter.field}
            field={field}
            filter={filter}
            onChange={(next) => {
              if (!next) refocus.current = true;
              setFilter(filter.field, next);
            }}
          />
        );
      })}
      <span className="filter-bar__space" />
      {search}
      {display}
    </div>
  );
}

function FieldOptions({ field, filter, onChange }: { field: FilterField; filter: ActiveFilter | undefined; onChange: (next: ActiveFilter | null) => void }) {
  return field.options.map((option) => (
    <DropdownMenuCheckboxItem
      key={option.value}
      value={option.value}
      checked={filter?.values.includes(option.value) ?? false}
      onCheckedChange={(on) => onChange(withValue(filter, field.key, option.value, Boolean(on)))}
    >
      {option.dot ? <Dot tone={option.dot} /> : null}
      {option.label}
      {option.count !== undefined ? <DropdownMenuShortcut className="filter-menu__count">{option.count}</DropdownMenuShortcut> : null}
    </DropdownMenuCheckboxItem>
  ));
}

/** One active filter: field, operator, value, remove. `demo` shows hover or focus without a pointer, for the gallery. */
export function FilterBarChip({
  field,
  filter,
  onChange,
  demo,
}: {
  field: FilterField;
  filter: ActiveFilter;
  /** `null` removes the filter. */
  onChange: (next: ActiveFilter | null) => void;
  demo?: "hover" | "focus";
}) {
  const operator = filterOperator(filter);
  const other = filterOperator(toggleOperator(filter));
  const chosen = field.options.filter((option) => filter.values.includes(option.value));
  const text = chosen.map((option) => option.label).join(", ");
  const single = chosen.length === 1 ? chosen[0] : undefined;
  return (
    <span className="filter-bar__chip" role="group" aria-label={`${field.label} ${operator} ${text}`} data-demo={demo}>
      <span className="filter-bar__part filter-bar__field">
        {field.icon ? <Icon name={field.icon} size={14} {...icon} /> : null}
        {field.label}
      </span>
      <button
        type="button"
        className="filter-bar__part filter-bar__operator"
        aria-label={`${field.label} ${operator}. Change to ${other}`}
        onClick={() => onChange(toggleOperator(filter))}
      >
        <span className="filter-bar__operator-text">{operator}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger className="filter-bar__part filter-bar__values" aria-label={`${field.label} values: ${text}. Change`}>
          {single?.dot ? <Dot tone={single.dot} /> : null}
          <span className="filter-bar__text">{text}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="filter-menu">
          <FieldOptions field={field} filter={filter} onChange={onChange} />
        </DropdownMenuContent>
      </DropdownMenu>
      <button type="button" className="filter-bar__part filter-bar__remove" aria-label={`Remove the ${field.label.toLowerCase()} filter`} onClick={() => onChange(null)}>
        <Icon name="close" size={12} {...icon} />
      </button>
    </span>
  );
}

export interface DisplayColumn {
  id: string;
  label: string;
  on: boolean;
}

/**
 * The Display popover (Paper "few filters + Display open"): Sort by with a
 * direction button, one toggle, column chips, and Reset to default. It traps
 * focus; Escape closes it and focus returns to the Display button.
 */
export function DisplayPopover({
  sortFields,
  sort,
  onSort,
  toggle,
  columns,
  onColumn,
  isDefault,
  onReset,
}: {
  sortFields: readonly { value: string; label: string }[];
  sort: SortState;
  onSort: (next: SortState) => void;
  /** One on/off setting, such as "Show ended members". */
  toggle?: { label: string; checked: boolean; onChange: (on: boolean) => void };
  columns: readonly DisplayColumn[];
  onColumn: (id: string, on: boolean) => void;
  /** True when nothing differs from the default. Reset is then dimmed and does nothing. It stays focusable, so focus is not lost after a reset. */
  isDefault: boolean;
  onReset: () => void;
}) {
  const id = useId();
  const sortId = `${id}-sort`;
  const toggleId = `${id}-toggle`;
  return (
    <Popover modal="trap-focus">
      <PopoverTrigger className={buttonVariants({ variant: "secondary", size: "compact" })}>
        <Icon name="display" size={14} {...icon} />
        Display
      </PopoverTrigger>
      <PopoverContent className="display-popover">
        <PopoverTitle className="visually-hidden">Display</PopoverTitle>
        <div className="display-popover__section">
          <div className="display-popover__row">
            <label htmlFor={sortId} className="display-popover__label">
              Sort by
            </label>
            <NativeSelect id={sortId} className="display-popover__select" value={sort.column} onChange={(event) => onSort({ ...sort, column: event.target.value })}>
              {sortFields.map((field) => (
                <NativeSelectOption key={field.value} value={field.value}>
                  {field.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button
              variant="secondary"
              size="icon-compact"
              aria-label={sort.direction === "asc" ? "Ascending. Switch to descending" : "Descending. Switch to ascending"}
              onClick={() => onSort({ ...sort, direction: sort.direction === "asc" ? "desc" : "asc" })}
            >
              <Icon name="arrowDown" size={14} {...icon} data-direction={sort.direction} className="display-popover__direction" />
            </Button>
          </div>
          {toggle ? (
            <div className="display-popover__row">
              <label htmlFor={toggleId} className="display-popover__label">
                {toggle.label}
              </label>
              <Switch id={toggleId} checked={toggle.checked} onCheckedChange={(on) => toggle.onChange(Boolean(on))} />
            </div>
          ) : null}
        </div>
        <div className="display-popover__section display-popover__section--columns" role="group" aria-label="Columns">
          <p className="display-popover__caption">Columns</p>
          <div className="display-popover__chips">
            {columns.map((column) => (
              <button
                key={column.id}
                type="button"
                className="display-popover__chip"
                aria-pressed={column.on}
                onClick={() => onColumn(column.id, !column.on)}
              >
                {column.label}
              </button>
            ))}
          </div>
        </div>
        <div className="display-popover__foot">
          <button
            type="button"
            className="display-popover__reset"
            aria-disabled={isDefault || undefined}
            onClick={() => {
              if (!isDefault) onReset();
            }}
          >
            Reset to default
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
