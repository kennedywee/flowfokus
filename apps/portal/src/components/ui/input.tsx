import * as React from "react"
import { Input as InputPrimitive } from "@ui-sdk/react/input"
import { cn } from "@/lib/utils"

/* Styled by `.input` in styles/components.css. Add `input--small` or `input--mono` as needed. */
function Input({
  className,
  ...props
}: Omit<React.ComponentProps<typeof InputPrimitive>, "className"> & { className?: string }) {
  return <InputPrimitive data-slot="input" className={cn("input", className)} {...props} />
}

export { Input }
