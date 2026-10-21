import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

/*
 * A top bar switcher: a button that opens a small panel with a search box, a
 * list to pick one item from, and optional footer actions. The search box and
 * list follow the ARIA 1.2 combobox pattern, like `Combobox`: focus stays in
 * the search box and the highlighted option is announced with
 * aria-activedescendant.
 *
 * Keys: Down and Up move, Home and End jump, Enter picks, Escape closes and
 * returns focus to the button. Tab moves on to the footer actions. A click
 * outside the panel closes it.
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
  const id = useId();
  const panelId = `${id}-panel`;
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      needle
        ? options.filter(
            (option) =>
              option.label.toLowerCase().includes(needle) || (option.detail?.toLowerCase().includes(needle) ?? false),
          )
        : options,
    [options, needle],
  );

  function show() {
    const index = options.findIndex((option) => option.value === value);
    setQuery("");
    setActive(index === -1 ? 0 : index);
    setOpen(true);
  }

  function close(returnFocus = false) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  function pick(option: SwitcherOption) {
    close(true);
    if (option.value !== value) onSelect(option.value);
  }

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const last = matches.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (last >= 0) setActive(active >= last ? 0 : active + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (last >= 0) setActive(active <= 0 ? last : active - 1);
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(Math.max(last, 0));
        break;
      case "Enter": {
        event.preventDefault();
        const option = matches[active];
        if (option) pick(option);
        break;
      }
    }
  }

  return (
    <div
      className="switcher"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          close(true);
        }
      }}
      onBlur={(event) => {
        // Close when focus leaves the switcher, for example on Tab past the footer.
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className="switcher__button"
        data-strong={strong}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : show())}
      >
        {icon ? <span className="switcher__icon">{icon}</span> : null}
        <span className="switcher__current">{current}</span>
        <span className="visually-hidden">: change {label.toLowerCase()}</span>
        <ChevronsUpDown className="switcher__chevron" strokeWidth={1.75} aria-hidden="true" focusable="false" />
      </button>
      {open ? (
        <div className="switcher__panel" id={panelId} role="dialog" aria-label={label}>
          <div className="switcher__search">
            <Search strokeWidth={1.75} aria-hidden="true" focusable="false" />
            <input
              ref={input}
              className="switcher__input"
              role="combobox"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label={searchLabel}
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={matches[active] ? optionId(active) : undefined}
              placeholder={searchLabel}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
            />
          </div>
          <ul className="switcher__list" id={listId} role="listbox" aria-label={label}>
            {matches.map((option, index) => {
              const selected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  className="switcher__option"
                  data-active={index === active}
                  // Keep focus in the search box while the pointer picks.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={() => pick(option)}
                >
                  {option.icon ? <span className="switcher__option-icon">{option.icon}</span> : null}
                  <span className="switcher__option-text">
                    <span className="switcher__option-label">{option.label}</span>
                    {option.detail ? <span className="switcher__option-detail">{option.detail}</span> : null}
                  </span>
                  {selected ? (
                    <Check className="switcher__check" strokeWidth={2} aria-hidden="true" focusable="false" />
                  ) : null}
                </li>
              );
            })}
          </ul>
          {matches.length === 0 ? <p className="switcher__empty">{emptyText}</p> : null}
          {footer ? <div className="switcher__footer">{footer(() => close())}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
