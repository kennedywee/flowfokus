"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * Tabs that switch panels on one page. Base UI gives the tab roles, arrow
 * keys, and the panel links. The `default` list is the `.segmented` control;
 * the `line` list is the `.tabs` page tabs. Both are in styles/components.css.
 * For tabs that change the URL, use links in a `.tabs` nav instead.
 */
function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      orientation={orientation}
      className={cn("tabs-root", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva("", {
  variants: {
    variant: {
      default: "segmented",
      line: "tabs",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ ...props }: TabsPrimitive.Tab.Props) {
  return <TabsPrimitive.Tab data-slot="tabs-trigger" {...props} />
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("tabs-root__panel", className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants }
