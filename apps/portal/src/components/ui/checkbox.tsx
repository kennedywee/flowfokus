"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive, CheckboxIndicator } from "@ui-sdk/react/checkbox"
import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * A checkbox. ui-sdk gives it the checkbox role, Space, the mixed state, and
 * a hidden form input. Styled by `.checkbox` in styles/components.css to match
 * the native checkboxes. Name it with a <label htmlFor> that points at its id.
 */
function Checkbox({
  className,
  indeterminate,
  checked,
  ...props
}: Omit<React.ComponentProps<typeof CheckboxPrimitive>, "className"> & {
  className?: string
  indeterminate?: boolean
}) {
  return (
    <CheckboxPrimitive
      className={cn("checkbox", className)}
      checked={indeterminate ? "indeterminate" : checked}
      {...props}
    >
      <CheckboxIndicator className="checkbox__mark">
        {(state) =>
          state.indeterminate ? (
            <Minus strokeWidth={3} aria-hidden="true" focusable="false" />
          ) : (
            <Check strokeWidth={3} aria-hidden="true" focusable="false" />
          )
        }
      </CheckboxIndicator>
    </CheckboxPrimitive>
  )
}

export { Checkbox }
