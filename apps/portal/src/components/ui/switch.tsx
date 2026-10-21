"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

/*
 * An on/off switch. Base UI gives it the switch role, Space and Enter, and a
 * hidden form input. Styled by `.switch` in styles/components.css. Name it
 * with a <label htmlFor> that points at its id.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root data-slot="switch" className={cn("switch", className)} {...props}>
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className="switch__thumb" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
