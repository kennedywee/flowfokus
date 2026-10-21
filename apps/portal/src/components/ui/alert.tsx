import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * Inline alerts, styled by the `.notice` classes in styles/components.css.
 * Put a status icon first, then `AlertContent` with the title and description.
 */
type AlertTone = "info" | "error" | "warning" | "success"

function Alert({ className, tone = "info", ...props }: React.ComponentProps<"div"> & { tone?: AlertTone }) {
  return <div data-slot="alert" data-tone={tone} className={cn("notice", className)} {...props} />
}

function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-content" className={cn("notice__content", className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="alert-title" className={cn("notice__title", className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("notice__body", className)} {...props} />
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-action" className={cn("notice__action", className)} {...props} />
}

export { Alert, AlertAction, AlertContent, AlertDescription, AlertTitle, type AlertTone }
