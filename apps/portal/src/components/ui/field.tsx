import * as React from "react"
import { TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

/*
 * Form field parts, styled by `.field` in styles/components.css. A field is a
 * label, the control, an optional hint, and an optional error.
 */
function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field" className={cn("field", className)} {...props} />
}

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return <fieldset data-slot="field-set" className={cn("field", className)} {...props} />
}

function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) {
  return <legend data-slot="field-legend" className={cn(className)} {...props} />
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("form", className)} {...props} />
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn(className)} {...props} />
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-description" className={cn("field__hint", className)} {...props} />
}

/** An error message with its warning icon. Renders nothing without children. */
function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  if (!children) return null
  return (
    <p data-slot="field-error" className={cn("field__error", className)} {...props}>
      <TriangleAlert strokeWidth={2} aria-hidden="true" focusable="false" />
      <span>{children}</span>
    </p>
  )
}

export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet }
