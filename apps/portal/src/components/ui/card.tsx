import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * Card parts, styled by the `.plate` classes in styles/components.css. A card
 * is a header (an optional icon tile, a heading block, and an action), a body,
 * and an optional footer.
 */
function Card({ className, ...props }: React.ComponentProps<"section">) {
  return <section data-slot="card" className={cn("plate", className)} {...props} />
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("plate__head", className)} {...props} />
}

/** The square icon tile left of the title. Decoration only. */
function CardIcon({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="card-icon" aria-hidden="true" className={cn("plate__icon", className)} {...props} />
}

/** Holds the title and description, so they stack beside the icon. */
function CardHeading({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-heading" className={cn("plate__text", className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="card-title" className={cn(className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn(className)} {...props} />
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("plate__action", className)} {...props} />
}

/** The body. `flush` removes the padding, for a table or list that runs edge to edge. */
function CardContent({ className, flush = false, ...props }: React.ComponentProps<"div"> & { flush?: boolean }) {
  return (
    <div
      data-slot="card-content"
      className={cn("plate__body", flush && "plate__body--flush", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("plate__footer", className)} {...props} />
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardHeading, CardIcon, CardTitle }
