import * as React from "react"
import { cn } from "@/lib/utils"

/* Styled by `textarea.input` in styles/components.css. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn("input", className)}
      {...props}
    />
  )
}

export { Textarea }
