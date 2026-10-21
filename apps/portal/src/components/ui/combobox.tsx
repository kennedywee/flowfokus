"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * A combobox: a text box that filters a list and picks one item. Base UI
 * handles the ARIA combobox pattern, filtering, arrow keys, and the hidden
 * form value. The look comes from the `.combobox` classes in
 * styles/components.css. A `className` on a part replaces its default class,
 * so another look can start clean, as the top bar switchers do.
 */
const Combobox = ComboboxPrimitive.Root

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return <ComboboxPrimitive.Input data-slot="combobox-input" className={cn(className ?? "input")} {...props} />
}

function ComboboxTrigger({ ...props }: ComboboxPrimitive.Trigger.Props) {
  return <ComboboxPrimitive.Trigger data-slot="combobox-trigger" {...props} />
}

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  collisionPadding = 12,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor" | "collisionPadding"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        className="combobox-positioner"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        anchor={anchor}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(className ?? "combobox__popup")}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return <ComboboxPrimitive.List data-slot="combobox-list" className={cn(className ?? "combobox__list")} {...props} />
}

function ComboboxItem({ className, ...props }: ComboboxPrimitive.Item.Props) {
  return <ComboboxPrimitive.Item data-slot="combobox-item" className={cn(className ?? "combobox__option")} {...props} />
}

/** The check beside the chosen item. Renders only for the chosen one. */
function ComboboxItemIndicator({ className, ...props }: ComboboxPrimitive.ItemIndicator.Props) {
  return (
    <ComboboxPrimitive.ItemIndicator
      data-slot="combobox-item-indicator"
      render={<Check strokeWidth={2} aria-hidden="true" focusable="false" />}
      className={cn(className ?? "combobox__check")}
      {...props}
    />
  )
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return <ComboboxPrimitive.Empty data-slot="combobox-empty" className={cn(className ?? "combobox__empty")} {...props} />
}

function ComboboxStatus({ className, ...props }: ComboboxPrimitive.Status.Props) {
  return <ComboboxPrimitive.Status data-slot="combobox-status" className={cn("visually-hidden", className)} {...props} />
}

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxStatus,
  ComboboxTrigger,
  ComboboxValue,
}
