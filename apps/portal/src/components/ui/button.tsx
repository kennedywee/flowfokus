import * as React from "react"
import { Button as ButtonPrimitive } from "@ui-sdk/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * The portal button. The variants map to the button classes in
 * styles/components.css, and ui-sdk gives the behaviour. Use `buttonVariants` on a router `Link` that looks like a button.
 */
const buttonVariants = cva("button", {
  variants: {
    variant: {
      default: "",
      secondary: "button--secondary",
      outline: "button--secondary",
      ghost: "button--ghost",
      destructive: "button--critical",
    },
    size: {
      default: "",
      sm: "button--small",
      lg: "button--large",
      icon: "button--icon",
      "icon-sm": "button--icon button--small",
      compact: "button--compact",
      "icon-compact": "button--icon button--compact",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: Omit<React.ComponentProps<typeof ButtonPrimitive>, "className"> & {
  className?: string
} & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
