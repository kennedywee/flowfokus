"use client"

import * as React from "react"
import {
  Tooltip as TooltipPrimitive,
  TooltipContent as TooltipContentPrimitive,
  TooltipTrigger,
} from "@ui-sdk/react/tooltip"
import { cn } from "@/lib/utils"

/*
 * A short label on hover or keyboard focus. ui-sdk opens it in the top layer
 * and positions it. Styled by `.tooltip` in styles/components.css.
 */
function Tooltip({ delay = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive>) {
  return <TooltipPrimitive delay={delay} {...props} />
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 8,
  ...props
}: Omit<React.ComponentProps<typeof TooltipContentPrimitive>, "className"> & { className?: string }) {
  return (
    <TooltipContentPrimitive
      className={cn("tooltip", className)}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

export { Tooltip, TooltipContent, TooltipTrigger }
