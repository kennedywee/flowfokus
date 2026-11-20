"use client"

import * as React from "react"
import {
  Dialog as SheetPrimitive,
  DialogBackdrop,
  DialogContent,
  DialogTitle,
} from "@ui-sdk/react/dialog"
import { cn } from "@/lib/utils"

/*
 * A panel that slides in from the left edge, over a scrim: the phone
 * navigation drawer. It is a ui-sdk dialog, so it traps focus, closes on
 * Escape or a click on the scrim, and returns focus to the button that opened
 * it. Styled by `.sheet` in styles/shell.css.
 */
const Sheet = SheetPrimitive

function SheetContent({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DialogContent>, "className"> & { className?: string }) {
  return (
    <>
      <DialogBackdrop className="sheet-backdrop" />
      <DialogContent className={cn("sheet", className)} {...props}>
        {children}
      </DialogContent>
    </>
  )
}

function SheetTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DialogTitle>, "className"> & { className?: string }) {
  return <DialogTitle className={cn(className)} {...props} />
}

export { Sheet, SheetContent, SheetTitle }
