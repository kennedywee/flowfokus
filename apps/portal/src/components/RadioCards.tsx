import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";

/*
 * Radio cards: a group of large choices where one is picked. Each card holds a
 * native radio input, so Tab, the arrow keys, and form submission work as
 * browsers expect.
 *
 *   <RadioCards
 *     name="method"
 *     legend="Method"
 *     options={[
 *       { value: "cash", title: "Cash", meta: "Paid at the desk" },
 *       { value: "bank_transfer", title: "Bank transfer", meta: "Add a reference" },
 *     ]}
 *     value={method}
 *     onChange={setMethod}
 *   />
 *
 * `trailing` sits on the right, for example a price. `columns` puts the cards
 * side by side from 640px wide. Pass `describedBy` for an error or hint id.
 */

export type RadioCardOption = {
  value: string;
  title: string;
  meta?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
};

export function RadioCards({
  name,
  legend,
  options,
  value,
  onChange,
  describedBy,
  columns,
  hideLegend = false,
}: {
  name: string;
  legend: string;
  options: RadioCardOption[];
  /** The picked value, or null for none. */
  value: string | null;
  onChange: (value: string) => void;
  describedBy?: string;
  columns?: number;
  /** Hide the legend visually when a heading nearby already names the group. */
  hideLegend?: boolean;
}) {
  return (
    <fieldset className="radio-group" aria-describedby={describedBy}>
      <legend className={hideLegend ? "visually-hidden" : undefined}>{legend}</legend>
      <div
        className="radio-cards"
        data-columns={columns}
        style={columns ? ({ "--columns": columns } as CSSProperties) : undefined}
      >
        {options.map((option) => (
          <label key={option.value} className="radio-card">
            <input
              className="radio-card__input"
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
            />
            <span className="radio-card__mark" aria-hidden="true">
              <Check strokeWidth={3} focusable="false" />
            </span>
            <span className="radio-card__text">
              <span className="radio-card__title">{option.title}</span>
              {option.meta ? <span className="radio-card__meta">{option.meta}</span> : null}
            </span>
            {option.trailing ? <span className="radio-card__trailing">{option.trailing}</span> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
