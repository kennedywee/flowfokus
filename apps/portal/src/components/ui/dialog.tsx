"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"

/*
 * A modal dialog. Base UI traps focus, closes on Escape and on a click on the
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
function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn("dialog-backdrop", className)}
      {...props}
    />
  )
}

function DialogContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn("dialog", className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPortal>
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

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("dialog__title", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      render={<div />}
      className={cn("dialog__text", className)}
      {...props}
    />
  )
}

/**
 * For a dialog that the parent mounts to open and unmounts to close. Base UI
 * returns focus only when a dialog closes while still mounted, so this puts
 * focus back on the opener when the component unmounts. The opener is read
 * during the first render, before Base UI moves focus into the dialog.
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
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogMedia,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  useRestoreFocus,
}
