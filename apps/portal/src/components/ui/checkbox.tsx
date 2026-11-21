"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive, CheckboxIndicator } from "@ui-sdk/react/checkbox"
import { Icon } from "@/components/ui/icon";
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
            <span className="checkbox__dash" aria-hidden="true" />
          ) : (
            <Icon name="check" aria-hidden="true" focusable="false" />
          )
        }
      </CheckboxIndicator>
    </CheckboxPrimitive>
  )
}

export { Checkbox }
