import { useId, type CSSProperties, type ReactNode } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/*
 * Radio cards: a group of large choices where one is picked, built on the
 * shadcn radio group (Base UI). Tab reaches the group once, the arrow keys
 * move between cards, and the group submits its value with a form.
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
  const legendId = useId();
  return (
    <fieldset className="radio-group">
      <legend id={legendId} className={hideLegend ? "visually-hidden" : undefined}>
        {legend}
      </legend>
      <RadioGroup
        name={name}
        value={value}
        onValueChange={(next) => onChange(next as string)}
        aria-labelledby={legendId}
        aria-describedby={describedBy}
        data-columns={columns}
        style={columns ? ({ "--columns": columns } as CSSProperties) : undefined}
      >
        {options.map((option, index) => (
          <label key={option.value} className="radio-card">
            {/* The mark is not a native input, so name it from the card text. */}
            <RadioGroupItem
              value={option.value}
              disabled={option.disabled}
              aria-labelledby={`${legendId}-${index}-title`}
              aria-describedby={option.meta ? `${legendId}-${index}-meta` : undefined}
            />
            <span className="radio-card__text">
              <span className="radio-card__title" id={`${legendId}-${index}-title`}>
                {option.title}
              </span>
              {option.meta ? (
                <span className="radio-card__meta" id={`${legendId}-${index}-meta`}>
                  {option.meta}
                </span>
              ) : null}
            </span>
            {option.trailing ? <span className="radio-card__trailing">{option.trailing}</span> : null}
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
