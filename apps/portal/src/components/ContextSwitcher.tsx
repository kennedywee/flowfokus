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
 * pick one item from, and optional footer actions. It is the shadcn combobox
 * (Base UI) with the search box inside the popup. Base UI handles the ARIA
 * pattern, arrow keys, Enter, Escape, and focus return to the button.
 */

export type SwitcherOption = {
  value: string;
  label: string;
  detail?: string;
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
  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  return (
    <Combobox<SwitcherOption>
      items={options}
      value={selected}
      open={open}
      onOpenChange={setOpen}
      onValueChange={(next) => {
        if (next && next.value !== value) onSelect(next.value);
      }}
      // Typing highlights the first match, so Enter picks it.
      autoHighlight
      itemToStringLabel={(option) => option.label}
      isItemEqualToValue={(item, chosen) => item.value === chosen.value}
      filter={(option, search) => {
        const needle = search.trim().toLowerCase();
        return (
          !needle ||
          option.label.toLowerCase().includes(needle) ||
          (option.detail?.toLowerCase().includes(needle) ?? false)
        );
      }}
    >
      <div className="switcher">
        {/* Base UI gives the trigger the combobox role, which takes its name from aria-label, not its text. */}
        <ComboboxTrigger
          className="switcher__button"
          data-strong={strong}
          aria-label={`${label}: ${current}. Change ${label.toLowerCase()}`}
        >
          {icon ? <span className="switcher__icon">{icon}</span> : null}
          <span className="switcher__current">{current}</span>
          <ChevronsUpDown className="switcher__chevron" strokeWidth={1.75} aria-hidden="true" focusable="false" />
        </ComboboxTrigger>
      </div>
      <ComboboxContent className="switcher__panel" aria-label={label}>
        <div className="switcher__search">
          <Search strokeWidth={1.75} aria-hidden="true" focusable="false" />
          <ComboboxInput
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
          {(option: SwitcherOption) => (
            <ComboboxItem key={option.value} value={option} className="switcher__option">
              {option.icon ? <span className="switcher__option-icon">{option.icon}</span> : null}
              <span className="switcher__option-text">
                <span className="switcher__option-label">{option.label}</span>
                {option.detail ? <span className="switcher__option-detail">{option.detail}</span> : null}
              </span>
              <ComboboxItemIndicator className="switcher__check" />
            </ComboboxItem>
          )}
        </ComboboxList>
        {footer ? <div className="switcher__footer">{footer(() => setOpen(false))}</div> : null}
      </ComboboxContent>
    </Combobox>
  );
}
