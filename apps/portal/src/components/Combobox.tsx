import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import {
  Combobox as ComboboxRoot,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, describedBy as fieldDescribedBy } from "./ui";

/*
 * A combobox: a text box that filters a list and picks one item, built on the
 * shadcn combobox (Base UI). Base UI follows the ARIA 1.2 combobox pattern:
 * focus stays in the input, and the highlighted option is announced.
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
  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);
  // What the person has typed. Base UI puts the picked label in the box after a pick.
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const needle = query.trim().toLowerCase();
  const matches = useMemo(() => (needle ? options.filter((option) => matchesOption(option, needle)) : options), [options, needle]);
  const status = open ? (matches.length === 0 ? "No matches" : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`) : "";

  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <ComboboxRoot<ComboboxOption>
        items={options}
        value={selected}
        onValueChange={(next) => onChange(next?.value ?? null)}
        // Typing highlights the first match, so Enter picks it.
        autoHighlight
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.value}
        isItemEqualToValue={(item, current) => item.value === current.value}
        filter={(option, search) => matchesOption(option, search.trim().toLowerCase())}
        limit={MAX_VISIBLE}
        onInputValueChange={(next, details) => {
          setQuery(next);
          // Emptying the box clears the pick, so the form cannot submit a stale member.
          if (next === "" && value !== null && (details.reason === "input-change" || details.reason === "input-clear")) {
            onChange(null);
          }
        }}
        onOpenChange={setOpen}
        name={name}
        disabled={disabled}
        required={required}
      >
        <div className="combobox">
          <div className="combobox__field">
            <Search strokeWidth={1.75} aria-hidden="true" focusable="false" />
            <ComboboxInput
              id={id}
              className="input combobox__input"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={placeholder}
              aria-invalid={invalid || error ? true : undefined}
              aria-describedby={[fieldDescribedBy(id, hint, error), describedBy].filter(Boolean).join(" ") || undefined}
              aria-required={required || undefined}
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
        </div>
        <ComboboxContent aria-label={label}>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(option: ComboboxOption) => (
              <ComboboxItem key={option.value} value={option}>
                <span className="combobox__option-text">
                  <span className="combobox__label">
                    <Highlight text={option.label} needle={needle} />
                  </span>
                  {option.detail ? <span className="combobox__detail">{option.detail}</span> : null}
                </span>
                <ComboboxItemIndicator />
              </ComboboxItem>
            )}
          </ComboboxList>
          {matches.length > MAX_VISIBLE ? (
            <p className="combobox__empty">
              Showing {MAX_VISIBLE} of {matches.length}. Keep typing to narrow the list.
            </p>
          ) : null}
        </ComboboxContent>
      </ComboboxRoot>
    </Field>
  );
}

/** Case-insensitive match on the label or the detail. `needle` is already lowercase. */
function matchesOption(option: ComboboxOption, needle: string): boolean {
  if (!needle) return true;
  return option.label.toLowerCase().includes(needle) || (option.detail?.toLowerCase().includes(needle) ?? false);
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
