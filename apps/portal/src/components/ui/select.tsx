"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * A select with a custom list. Base UI handles the listbox pattern, arrow
 * keys, typeahead, and the hidden form value. The trigger looks like the
 * native `.select`; the list uses the `.select__*` classes in
 * styles/components.css. Prefer NativeSelect for a short, plain list: it
 * keeps the platform picker. Use this one when options need icons or details.
 *
 *   <Select name="kind" items={kinds} defaultValue="day">
 *     <SelectTrigger id="kind"><SelectValue /></SelectTrigger>
 *     <SelectContent>
 *       {kinds.map((kind) => <SelectItem key={kind.value} value={kind.value}>{kind.label}</SelectItem>)}
 *     </SelectContent>
 *   </Select>
 *
 * Pass `items` to the root so the trigger shows the label, not the value.
 */
const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn("select__group", className)} {...props} />
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value data-slot="select-value" className={cn("select__value", className)} {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn("select select-trigger", size === "sm" && "select--small", className)}
      {...props}
    />
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = false,
  collisionPadding = 12,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger" | "collisionPadding"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="select-positioner"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        collisionPadding={collisionPadding}
      >
        <SelectPrimitive.Popup data-slot="select-content" className={cn("select__popup", className)} {...props}>
          <SelectScrollUpButton />
          <SelectPrimitive.List className="select__list">{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return <SelectPrimitive.GroupLabel data-slot="select-label" className={cn("select__label", className)} {...props} />
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cn("select__item", className)} {...props}>
      <SelectPrimitive.ItemText className="select__item-text">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        className="select__check"
        render={<Check strokeWidth={2} aria-hidden="true" focusable="false" />}
      />
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator data-slot="select-separator" className={cn("select__separator", className)} {...props} />
  )
}

function SelectScrollUpButton({ className, ...props }: SelectPrimitive.ScrollUpArrow.Props) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn("select__scroll select__scroll--up", className)}
      {...props}
    >
      <ChevronUp strokeWidth={1.75} aria-hidden="true" focusable="false" />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({ className, ...props }: SelectPrimitive.ScrollDownArrow.Props) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn("select__scroll select__scroll--down", className)}
      {...props}
    >
      <ChevronDown strokeWidth={1.75} aria-hidden="true" focusable="false" />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
