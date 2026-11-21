"use client"

import * as React from "react"
import {
  Collapsible as CollapsiblePrimitive,
  CollapsiblePanel as CollapsiblePanelPrimitive,
  CollapsibleTrigger as CollapsibleTriggerPrimitive,
} from "@ui-sdk/react/collapsible"
import { cn } from "@/lib/utils"

/*
 * One panel that shows and hides. ui-sdk gives the trigger `aria-expanded`
 * and `aria-controls`, Enter and Space, and keeps the panel's content. The
 * look comes from the part that uses it (a list group, in styles/parts.css).
 */
type WithClass<T extends React.ElementType> = Omit<React.ComponentProps<T>, "className"> & { className?: string }

function Collapsible({ className, ...props }: WithClass<typeof CollapsiblePrimitive>) {
  return <CollapsiblePrimitive className={cn("collapsible", className)} {...props} />
}

function CollapsibleTrigger({ className, ...props }: WithClass<typeof CollapsibleTriggerPrimitive>) {
  return <CollapsibleTriggerPrimitive className={cn("collapsible__trigger", className)} {...props} />
}

function CollapsiblePanel({ className, ...props }: WithClass<typeof CollapsiblePanelPrimitive>) {
  return <CollapsiblePanelPrimitive className={cn("collapsible__panel", className)} {...props} />
}

export { Collapsible, CollapsiblePanel, CollapsibleTrigger }
