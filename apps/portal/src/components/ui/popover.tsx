"use client"

import * as React from "react"
import {
  Popover as PopoverPrimitive,
  PopoverClose as PopoverClosePrimitive,
  PopoverContent as PopoverContentPrimitive,
  PopoverTitle as PopoverTitlePrimitive,
  PopoverTrigger as PopoverTriggerPrimitive,
} from "@ui-sdk/react/popover"
import { cn } from "@/lib/utils"

/*
 * A small panel beside its trigger, for a task that belongs to it, such as
 * the Display settings of a list. ui-sdk opens it in the top layer, places it,
 * moves focus into it, traps focus with `modal="trap-focus"`, closes it on
 * Escape or a press outside, and returns focus to the trigger. Styled by
 * `.popover` in styles/parts.css. Give it a PopoverTitle (it can be hidden)
 * so the dialog has a name.
 */
type WithClass<T extends React.ElementType> = Omit<React.ComponentProps<T>, "className"> & { className?: string }

const Popover = PopoverPrimitive

function PopoverTrigger({ className, ...props }: WithClass<typeof PopoverTriggerPrimitive>) {
  return <PopoverTriggerPrimitive className={className} {...props} />
}

function PopoverContent({
  align = "end",
  sideOffset = 8,
  className,
  ...props
}: WithClass<typeof PopoverContentPrimitive>) {
  return <PopoverContentPrimitive className={cn("popover", className)} align={align} sideOffset={sideOffset} {...props} />
}

function PopoverTitle({ className, ...props }: WithClass<typeof PopoverTitlePrimitive>) {
  return <PopoverTitlePrimitive className={cn("popover__title", className)} {...props} />
}

function PopoverClose({ className, ...props }: WithClass<typeof PopoverClosePrimitive>) {
  return <PopoverClosePrimitive className={className} {...props} />
}

export { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger }
