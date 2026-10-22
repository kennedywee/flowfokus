import * as React from "react"
import { cn } from "@/lib/utils"

/* A multi-line text box. Styled by `textarea.input` in styles/components.css. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn("input", className)} {...props} />
}

export { Textarea }
