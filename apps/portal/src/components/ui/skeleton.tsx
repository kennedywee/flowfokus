import * as React from "react"
import { cn } from "@/lib/utils"

/* A loading bar, styled by `.skeleton` in styles/components.css. */
function Skeleton({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="skeleton" className={cn("skeleton", className)} {...props} />
}

export { Skeleton }
