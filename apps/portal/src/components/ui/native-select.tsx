import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * A native select, styled by `.select` in styles/components.css (it draws its
 * own chevron). Native keeps the platform picker, which suits the desk.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn("select", className)}
      {...props}
    />
  )
}

function NativeSelectOption({ ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />
}

function NativeSelectOptGroup({ ...props }: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" {...props} />
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
