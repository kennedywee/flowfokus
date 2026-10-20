import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, Search } from "lucide-react";
import { Field, describedBy as fieldDescribedBy } from "./ui";

/*
 * A combobox: a text box that filters a list and picks one item. It follows the
 * ARIA 1.2 combobox pattern with a listbox popup. Focus stays in the input; the
 * highlighted option is announced with aria-activedescendant.
 *
 *   <Combobox
 *     id="member"
 *     label="Member"
 *     options={members.map((m) => ({ value: m.id, label: m.name, detail: m.email }))}
 *     value={memberId}
 *     onChange={setMemberId}
 *     name="member_id"
 *   />
 *
 * Keys: Down and Up move (and open the list), Enter picks the highlighted
 * option, Escape closes and restores the picked text, Home and End jump to the
 * first and last option while the list is open, Tab closes.
 *
 * `onChange(null)` fires when the person empties the text box, so the picked
 * item is cleared. Filtering is on the client, case-insensitive, on the label
 * and the detail. At most MAX_VISIBLE options show at once.
 */

export type ComboboxOption = { value: string; label: string; detail?: string };

const MAX_VISIBLE = 50;

export function Combobox({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  emptyText = "Nothing matches. Check the spelling or clear the search.",
  name,
  hint,
  error,
  invalid = false,
  describedBy,
  disabled = false,
  required = false,
}: {
  id: string;
  label: string;
  options: ComboboxOption[];
  /** The picked option's value, or null for none. */
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** Shown when the search matches nothing. Say what to try next. */
  emptyText?: ReactNode;
  /** Renders a hidden input with the picked value, so a plain form submits it. */
  name?: string;
  hint?: string;
  error?: string;
  invalid?: boolean;
  /** Extra ids for aria-describedby, in addition to the hint and error. */
  describedBy?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const listId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);
  // `query` is null until the person types. Then the box shows the picked label.
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const text = query ?? selected?.label ?? "";
  const needle = (query ?? "").trim().toLowerCase();

  const matches = useMemo(() => {
    if (!needle) return options;
    return options.filter(
      (option) => option.label.toLowerCase().includes(needle) || (option.detail?.toLowerCase().includes(needle) ?? false),
    );
  }, [options, needle]);
  const visible = matches.slice(0, MAX_VISIBLE);

  // Keep the highlighted option in view as the arrows move.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function openList() {
    if (open || disabled) return;
    const index = selected ? visible.findIndex((option) => option.value === selected.value) : -1;
    setActive(index === -1 ? 0 : index);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery(null);
  }

  function pick(option: ComboboxOption) {
    onChange(option.value);
    close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openList();
        else if (visible.length > 0) setActive((active + 1) % visible.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          openList();
          setActive(Math.max(visible.length - 1, 0));
        } else if (visible.length > 0) setActive((active - 1 + visible.length) % visible.length);
        break;
      case "Home":
        if (open && visible.length > 0) {
          event.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open && visible.length > 0) {
          event.preventDefault();
          setActive(visible.length - 1);
        }
        break;
      case "Enter": {
        // Only take Enter while the list is open, so Enter can still submit a form.
        const option = open ? visible[active] : undefined;
        if (option) {
          event.preventDefault();
          pick(option);
        }
        break;
      }
      case "Escape":
        if (open) {
          // Close the list only. A dialog around the combobox stays open.
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        break;
      case "Tab":
        close();
        break;
    }
  }

  const status = open ? (matches.length === 0 ? "No matches" : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`) : "";

  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className="combobox">
        <div className="combobox__field">
          <Search strokeWidth={1.75} aria-hidden="true" focusable="false" />
          <input
            id={id}
            className="input combobox__input"
            role="combobox"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && visible[active] ? optionId(active) : undefined}
            aria-invalid={invalid || error ? true : undefined}
            aria-describedby={[fieldDescribedBy(id, hint, error), describedBy].filter(Boolean).join(" ") || undefined}
            aria-required={required || undefined}
            placeholder={placeholder}
            disabled={disabled}
            value={text}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              setActive(0);
              setOpen(true);
              if (next === "" && value !== null) onChange(null);
            }}
            onClick={openList}
            onBlur={close}
            onKeyDown={onKeyDown}
          />
          {open ? (
            <span className="combobox__count" aria-hidden="true">
              {matches.length}
            </span>
          ) : null}
        </div>
        <span className="visually-hidden" role="status">
          {status}
        </span>
        {open ? (
          // Keep focus in the input when the pointer presses anywhere in the popup.
          <div className="combobox__popup" onMouseDown={(event) => event.preventDefault()}>
            <ul ref={listRef} className="combobox__list" id={listId} role="listbox" aria-label={label}>
              {visible.map((option, index) => (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  className="combobox__option"
                  data-index={index}
                  data-active={index === active}
                  aria-selected={option.value === value}
                  onMouseMove={() => {
                    if (active !== index) setActive(index);
                  }}
                  onClick={() => pick(option)}
                >
                  <span className="combobox__option-text">
                    <span className="combobox__label">
                      <Highlight text={option.label} needle={needle} />
                    </span>
                    {option.detail ? <span className="combobox__detail">{option.detail}</span> : null}
                  </span>
                  {option.value === value ? (
                    <Check className="combobox__check" strokeWidth={2} aria-hidden="true" focusable="false" />
                  ) : null}
                </li>
              ))}
            </ul>
            {matches.length === 0 ? <p className="combobox__empty">{emptyText}</p> : null}
            {matches.length > MAX_VISIBLE ? (
              <p className="combobox__empty">
                Showing {MAX_VISIBLE} of {matches.length}. Keep typing to narrow the list.
              </p>
            ) : null}
          </div>
        ) : null}
        {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      </div>
    </Field>
  );
}

/** Bold the first match of the search in a label. */
function Highlight({ text, needle }: { text: string; needle: string }) {
  const start = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (start === -1) return <>{text}</>;
  const end = start + needle.length;
  return (
    <>
      {text.slice(0, start)}
      <strong>{text.slice(start, end)}</strong>
      {text.slice(end)}
    </>
  );
}
