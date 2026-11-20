import { useMemo, useState, type ReactNode } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";

/*
 * A top bar switcher: a button that opens a panel with a search box, a list to
 * pick one item from, and optional footer actions. It is the ui-sdk combobox
 * with the search box inside the popup. ui-sdk handles the ARIA pattern, arrow
 * keys, Enter, and Escape. Focus returns to the button after it closes.
 */

export type SwitcherOption = {
  value: string;
  label: string;
  /** A second line under the name. */
  detail?: string;
  /** A short fact at the right of the row, such as the role. */
  aside?: string;
  icon?: ReactNode;
};

export function ContextSwitcher({
  label,
  icon,
  current,
  options,
  value,
  onSelect,
  searchLabel,
  emptyText,
  footer,
  strong = false,
}: {
  /** What the switcher chooses, for example "Organization". Names the button and the list. */
  label: string;
  /** Shown before the current name on the button. */
  icon?: ReactNode;
  /** The name on the button. */
  current: string;
  options: SwitcherOption[];
  value: string | null;
  onSelect: (value: string) => void;
  /** Placeholder and accessible name of the search box, for example "Search locations". */
  searchLabel: string;
  emptyText: string;
  /** Actions under the list. Call `close` before leaving the page. */
  footer?: (close: () => void) => ReactNode;
  /** Bold button text, for the first switcher in the row. */
  strong?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [button, setButton] = useState<HTMLButtonElement | null>(null);
  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      options.filter(
        (option) =>
          !needle ||
          option.label.toLowerCase().includes(needle) ||
          (option.aside?.toLowerCase().includes(needle) ?? false) ||
          (option.detail?.toLowerCase().includes(needle) ?? false),
      ),
    [options, needle],
  );

  return (
    <Combobox
      value={value}
      open={open}
      onOpenChange={(next) => {
        if (next) setQuery("");
        setOpen(next);
      }}
      onOpenChangeComplete={(next) => {
        if (!next) button?.focus();
      }}
      onValueChange={(next) => {
        if (typeof next === "string" && next !== value) onSelect(next);
      }}
      // Opening highlights the current item; typing highlights the first match, so Enter picks it.
      autoHighlight="always"
      itemToLabel={(option) => options.find((item) => item.value === option)?.label ?? String(option)}
      filter={false}
      query={query}
      onQueryChange={setQuery}
    >
      <div className="switcher">
        <ComboboxTrigger
          ref={setButton}
          className="switcher__button"
          data-strong={strong}
          aria-label={`${label}: ${current}. Change ${label.toLowerCase()}`}
        >
          {icon ? <span className="switcher__icon">{icon}</span> : null}
          <span className="switcher__current">{current}</span>
          <ChevronsUpDown className="switcher__chevron" strokeWidth={1.75} aria-hidden="true" focusable="false" />
        </ComboboxTrigger>
      </div>
      <ComboboxContent className="switcher__panel" aria-label={label} anchor={button}>
        <div className="switcher__search">
          <Search strokeWidth={1.75} aria-hidden="true" focusable="false" />
          <ComboboxInput
            autoFocus
            className="switcher__input"
            aria-label={searchLabel}
            placeholder={searchLabel}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
        <ComboboxEmpty className="switcher__empty">{emptyText}</ComboboxEmpty>
        <ComboboxList className="switcher__list" aria-label={label}>
          {matches.map((option) => (
            <ComboboxItem key={option.value} value={option.value} label={option.label} className="switcher__option">
              {option.icon ? <span className="switcher__option-icon">{option.icon}</span> : null}
              <span className="switcher__option-text">
                <span className="switcher__option-label">{option.label}</span>
                {option.detail ? <span className="switcher__option-detail">{option.detail}</span> : null}
              </span>
              {option.aside ? <span className="switcher__option-aside">{option.aside}</span> : null}
              <ComboboxItemIndicator className="switcher__check" />
            </ComboboxItem>
          ))}
        </ComboboxList>
        {footer ? <div className="switcher__footer">{footer(() => setOpen(false))}</div> : null}
      </ComboboxContent>
    </Combobox>
  );
}
