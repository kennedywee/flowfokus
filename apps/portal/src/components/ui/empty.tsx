import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * Empty and page states, styled by `.empty` and `.state` in
 * styles/components.css: an icon, a title, a sentence, and one action.
 */
function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty" className={cn("empty", className)} {...props} />
}

/** The icon above the title. Pass a Lucide icon element. */
function EmptyMedia({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="empty-media" aria-hidden="true" className={cn("empty__icon", className)} {...props} />
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="empty-title" className={cn("empty__title", className)} {...props} />
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="empty-description" className={cn(className)} {...props} />
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-content" className={cn(className)} {...props} />
}

export { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle }
