"use client"

import * as React from "react"
import {
  AlertDialog as AlertDialogPrimitive,
  AlertDialogBackdrop,
  AlertDialogContent as AlertDialogContentPrimitive,
  AlertDialogDescription as AlertDialogDescriptionPrimitive,
  AlertDialogTitle as AlertDialogTitlePrimitive,
} from "@ui-sdk/react/alert-dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { focusTarget, type InitialFocus } from "@/components/ui/dialog"

/*
 * A dialog that asks for one decision. Unlike `Dialog`, a click on the
 * backdrop does not close it: the person must choose. Escape still cancels.
 * Styled by the `.dialog` classes in styles/components.css.
 */
const AlertDialog = AlertDialogPrimitive

function AlertDialogContent({
  className,
  tone = "default",
  initialFocus,
  ...props
}: Omit<React.ComponentProps<typeof AlertDialogContentPrimitive>, "className" | "initialFocus"> & {
  className?: string
  tone?: "default" | "critical"
  initialFocus?: InitialFocus
}) {
  return (
    <>
      <AlertDialogBackdrop className="dialog-backdrop" />
      <AlertDialogContentPrimitive data-tone={tone} className={cn("dialog", className)} initialFocus={focusTarget(initialFocus)} {...props} />
    </>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cn("dialog__body", className)} {...props} />
}

function AlertDialogMedia({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="alert-dialog-media" aria-hidden="true" className={cn("dialog__icon", className)} {...props} />
}

function AlertDialogTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof AlertDialogTitlePrimitive>, "className"> & { className?: string }) {
  return <AlertDialogTitlePrimitive className={cn("dialog__title", className)} {...props} />
}

function AlertDialogDescription({
  className,
  ...props
}: Omit<React.ComponentProps<typeof AlertDialogDescriptionPrimitive>, "className"> & { className?: string }) {
  return <AlertDialogDescriptionPrimitive render={<div />} className={cn("dialog__text", className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-footer" className={cn("dialog__footer", className)} {...props} />
}

function AlertDialogAction(props: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" {...props} />
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
}
