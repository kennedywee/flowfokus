import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

/*
 * An input with a fixed prefix or suffix, like "RM" before an amount. The
 * group draws the border and focus ring; the input inside has none. Styled by
 * `.input-group` in styles/components.css.
 */
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="input-group" className={cn("input-group", className)} {...props} />
}

/** A prefix or suffix. Decoration only: say the unit in the label or hint too. */
function InputGroupAddon({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="input-group-addon" aria-hidden="true" className={cn("input-group__affix", className)} {...props} />
}

function InputGroupInput({ ...props }: React.ComponentProps<typeof Input>) {
  return <Input data-slot="input-group-control" {...props} />
}

export { InputGroup, InputGroupAddon, InputGroupInput }
