import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * Badges, styled by `.pill`, `.tag`, and `.demo-tag` in styles/components.css.
 * A pill always shows an icon and a label, never colour alone.
 */
const badgeVariants = cva("", {
  variants: {
    variant: {
      pill: "pill",
      square: "pill pill--square",
      tag: "tag",
      demo: "demo-tag",
    },
  },
  defaultVariants: {
    variant: "pill",
  },
})

type BadgeTone = "good" | "warning" | "critical" | "info" | "neutral"

function Badge({
  className,
  variant = "pill",
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { tone?: BadgeTone }) {
  return (
    <span
      data-slot="badge"
      data-tone={tone}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants, type BadgeTone }
