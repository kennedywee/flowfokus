"use client"

import * as React from "react"
import { Toggle, ToggleGroup as ToggleGroupPrimitive } from "@ui-sdk/react/toggle"
import { cn } from "@/lib/utils"

/*
 * A row of toggle buttons. With the default single mode, one stays pressed.
 * ui-sdk moves between them with the arrow keys and sets aria-pressed.
 * Styled by `.toggle-group` in styles/components.css.
 */
function ToggleGroup({
  className,
  ...props
}: Omit<React.ComponentProps<typeof ToggleGroupPrimitive>, "className"> & { className?: string }) {
  return <ToggleGroupPrimitive className={cn("toggle-group", className)} {...props} />
}

function ToggleGroupItem({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Toggle>, "className"> & { className?: string }) {
  return <Toggle className={cn("toggle-group__item", className)} {...props} />
}

export { ToggleGroup, ToggleGroupItem }
