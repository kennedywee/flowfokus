import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Field, describedBy as fieldDescribedBy } from "./ui";

/*
 * A date field: a button that opens a calendar in a popover, built on the
 * shadcn popover and calendar. Values are calendar dates as "YYYY-MM-DD",
 * with no time and no time zone.
 *
 *   <DatePicker
 *     id="starts-on"
 *     label="Starts on"
 *     value={startsOn}
 *     onChange={setStartsOn}
 *     min={today}
 *     name="starts_on"
 *   />
 *
 * Keys: Enter or Space opens the calendar on the chosen day, or on today.
 * Arrow keys move by day and week, Page Up and Page Down by month, Home and
 * End to the week's ends. Enter picks the day and closes. Escape closes.
 */

export function DatePicker({
  id,
  label,
  value,
  onChange,
  placeholder = "Pick a date",
  name,
  min,
  max,
  hint,
  error,
  invalid = false,
  describedBy,
  disabled = false,
}: {
  id: string;
  label: string;
  /** The chosen date as "YYYY-MM-DD", or null for none. */
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** Renders a hidden input with the chosen date, so a plain form submits it. */
  name?: string;
  /** The first date that can be picked, as "YYYY-MM-DD". */
  min?: string;
  /** The last date that can be picked, as "YYYY-MM-DD". */
  max?: string;
  hint?: string;
  error?: string;
  invalid?: boolean;
  /** Extra ids for aria-describedby, in addition to the hint and error. */
  describedBy?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseDate(value) : undefined;
  const first = min ? parseDate(min) : undefined;
  const last = max ? parseDate(max) : undefined;
  const outOfRange: Matcher[] = [];
  if (first) outOfRange.push({ before: first });
  if (last) outOfRange.push({ after: last });

  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          className="select select-trigger date-picker"
          disabled={disabled}
          data-placeholder={selected ? undefined : ""}
          aria-invalid={invalid || error ? true : undefined}
          aria-describedby={[fieldDescribedBy(id, hint, error), describedBy].filter(Boolean).join(" ") || undefined}
        >
          <CalendarDays strokeWidth={1.75} aria-hidden="true" focusable="false" />
          <span className="select__value">{selected ? DISPLAY.format(selected) : placeholder}</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="popover--calendar" aria-label={label}>
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? first}
            startMonth={first}
            endMonth={last}
            disabled={outOfRange}
            autoFocus
            onSelect={(date) => {
              onChange(date ? toDateString(date) : null);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
    </Field>
  );
}

const DISPLAY = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" });

/** "2026-10-22" to a local Date at midnight. The calendar works in local days. */
function parseDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
