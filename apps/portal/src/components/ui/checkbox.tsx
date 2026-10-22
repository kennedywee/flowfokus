"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * A checkbox. Base UI gives it the checkbox role, Space, the mixed state, and
 * a hidden form input. Styled by `.checkbox` in styles/components.css to match
 * the native checkboxes. Name it with a <label htmlFor> that points at its id.
 */
function Checkbox({ className, indeterminate, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn("checkbox", className)}
      indeterminate={indeterminate}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="checkbox__mark">
        {indeterminate ? (
          <Minus strokeWidth={3} aria-hidden="true" focusable="false" />
        ) : (
          <Check strokeWidth={3} aria-hidden="true" focusable="false" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
