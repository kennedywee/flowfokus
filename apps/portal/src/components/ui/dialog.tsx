"use client"

import * as React from "react"
import {
  Dialog as DialogPrimitive,
  DialogBackdrop,
  DialogClose,
  DialogContent as DialogContentPrimitive,
  DialogDescription as DialogDescriptionPrimitive,
  DialogTitle as DialogTitlePrimitive,
  DialogTrigger,
  type DialogInitialFocus,
} from "@ui-sdk/react/dialog"
import { cn } from "@/lib/utils"

/*
 * A modal dialog. ui-sdk traps focus, closes on Escape and on a click on the
 * backdrop, and returns focus to the opener. The look comes from the `.dialog`
 * classes in styles/components.css: a centred panel on desktop, a bottom sheet
 * on a phone.
 *
 *   <Dialog open={open} onOpenChange={setOpen}>
 *     <DialogContent>
 *       <DialogBody>
 *         <DialogTitle>Add member</DialogTitle>
 *         …
 *       </DialogBody>
 *       <DialogFooter>…</DialogFooter>
 *     </DialogContent>
 *   </Dialog>
 */
const Dialog = DialogPrimitive

type InitialFocus = DialogInitialFocus | React.RefObject<HTMLElement | null>

/** Accepts a React ref as well as ui-sdk's targets. */
function focusTarget(target: InitialFocus | undefined): DialogInitialFocus | undefined {
  if (target && typeof target === "object" && "current" in target) return () => target.current
  return target
}

function DialogContent({
  className,
  children,
  initialFocus,
  ...props
}: Omit<React.ComponentProps<typeof DialogContentPrimitive>, "className" | "initialFocus"> & {
  className?: string
  initialFocus?: InitialFocus
}) {
  return (
    <>
      <DialogBackdrop className="dialog-backdrop" />
      <DialogContentPrimitive className={cn("dialog", className)} initialFocus={focusTarget(initialFocus)} {...props}>
        {children}
      </DialogContentPrimitive>
    </>
  )
}

/** The padded body: an optional icon, the title, the description, and any form. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-body" className={cn("dialog__body", className)} {...props} />
}

/** The icon tile above the title. Decoration only. */
function DialogMedia({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="dialog-media" aria-hidden="true" className={cn("dialog__icon", className)} {...props} />
}

function DialogTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DialogTitlePrimitive>, "className"> & { className?: string }) {
  return <DialogTitlePrimitive className={cn("dialog__title", className)} {...props} />
}

function DialogDescription({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DialogDescriptionPrimitive>, "className"> & { className?: string }) {
  return <DialogDescriptionPrimitive render={<div />} className={cn("dialog__text", className)} {...props} />
}

/**
 * For a dialog that the parent mounts to open and unmounts to close. A dialog
 * returns focus only when it closes while still mounted, so this puts focus
 * back on the opener when the component unmounts. The opener is read during
 * the first render, before focus moves into the dialog.
 */
function useRestoreFocus() {
  const [opener] = React.useState(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  )
  React.useEffect(() => () => opener?.focus(), [opener])
}

/** Buttons under a hairline, aligned right. */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("dialog__footer", className)} {...props} />
}

export {
  focusTarget,
  type InitialFocus,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogMedia,
  DialogTitle,
  DialogTrigger,
  useRestoreFocus,
}
