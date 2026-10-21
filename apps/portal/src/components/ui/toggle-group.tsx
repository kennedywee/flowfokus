"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { cn } from "@/lib/utils"

/*
 * A row of toggle buttons. With the default single mode, one stays pressed.
 * Base UI moves between them with the arrow keys and sets aria-pressed.
 * Styled by `.toggle-group` in styles/components.css.
 */
function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return <ToggleGroupPrimitive data-slot="toggle-group" className={cn("toggle-group", className)} {...props} />
}

function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props) {
  return <TogglePrimitive data-slot="toggle-group-item" className={cn("toggle-group__item", className)} {...props} />
}

export { ToggleGroup, ToggleGroupItem }
