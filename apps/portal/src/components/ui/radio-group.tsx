"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * A radio group. Base UI handles the arrow keys, one tab stop for the group,
 * and the hidden form input. The look is the radio card set in
 * styles/components.css: put each `RadioGroupItem` inside a `.radio-card`
 * label with its text.
 */
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return <RadioGroupPrimitive data-slot="radio-group" className={cn("radio-cards", className)} {...props} />
}

/** The round mark. It shows a check when picked. */
function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root data-slot="radio-group-item" className={cn("radio-card__mark", className)} {...props}>
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        render={<Check strokeWidth={3} aria-hidden="true" focusable="false" />}
      />
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
