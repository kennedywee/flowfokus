import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * Flowfokus keeps its own look for this shadcn component. The variants map to
 * the button classes in styles/components.css, and Base UI gives the
 * behaviour. Use `buttonVariants` on a router `Link` that looks like a button.
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
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
