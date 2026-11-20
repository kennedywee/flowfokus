"use client"

import * as React from "react"
import { Switch as SwitchPrimitive, SwitchThumb } from "@ui-sdk/react/switch"
import { cn } from "@/lib/utils"

/*
 * An on/off switch. ui-sdk gives it the switch role, Space and Enter, and a
 * hidden form input. Styled by `.switch` in styles/components.css. Name it
 * with a <label htmlFor> that points at its id.
 */
function Switch({
  className,
  ...props
}: Omit<React.ComponentProps<typeof SwitchPrimitive>, "className"> & { className?: string }) {
  return (
    <SwitchPrimitive className={cn("switch", className)} {...props}>
      <SwitchThumb className="switch__thumb" />
    </SwitchPrimitive>
  )
}

export { Switch }
