"use client"

import * as React from "react"
import {
  SegmentedControl as SegmentedControlPrimitive,
  SegmentedControlIndicator,
  SegmentedControlItem as SegmentedControlItemPrimitive,
} from "@ui-sdk/react/segmented-control"
import { cn } from "@/lib/utils"

/*
 * A row of two to four views where one is chosen, with an indicator that
 * slides to it, such as All, Comments, Activity. ui-sdk gives it one tab
 * stop, arrow-key movement, and the radio-group semantics. Name it with
 * `aria-label`. Styled by `.segmented-control` in styles/parts.css. For a
 * set of independent toggles, use ToggleGroup.
 */
function SegmentedControl({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof SegmentedControlPrimitive>, "className" | "children"> & { className?: string; children?: React.ReactNode }) {
  return (
    <SegmentedControlPrimitive className={cn("segmented-control", className)} {...props}>
      <SegmentedControlIndicator className="segmented-control__indicator" />
      {children}
    </SegmentedControlPrimitive>
  )
}

function SegmentedControlItem({
  className,
  ...props
}: Omit<React.ComponentProps<typeof SegmentedControlItemPrimitive>, "className"> & { className?: string }) {
  return <SegmentedControlItemPrimitive className={cn("segmented-control__item", className)} {...props} />
}

export { SegmentedControl, SegmentedControlItem }
