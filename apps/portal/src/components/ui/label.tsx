import * as React from "react"
import { cn } from "@/lib/utils"

/* Inside a `Field`, `.field label` in styles/components.css styles it. */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cn(className)} {...props} />
}

export { Label }
