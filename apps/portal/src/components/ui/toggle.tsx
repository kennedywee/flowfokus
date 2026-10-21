"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cn } from "@/lib/utils"

/* One pressed/unpressed button, styled like a toggle group item. */
function Toggle({ className, ...props }: TogglePrimitive.Props) {
  return <TogglePrimitive data-slot="toggle" className={cn("toggle-group__item", className)} {...props} />
}

export { Toggle }
