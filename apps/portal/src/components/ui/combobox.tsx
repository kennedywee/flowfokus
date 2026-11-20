"use client"

import * as React from "react"
import {
  Combobox,
  ComboboxContent as ComboboxContentPrimitive,
  ComboboxEmpty as ComboboxEmptyPrimitive,
  ComboboxInput as ComboboxInputPrimitive,
  ComboboxItem as ComboboxItemPrimitive,
  ComboboxItemIndicator as ComboboxItemIndicatorPrimitive,
  ComboboxList as ComboboxListPrimitive,
  ComboboxTrigger,
} from "@ui-sdk/react/combobox"
import { Check } from "lucide-react"

/*
 * A combobox: a text box that filters a list and picks one item. ui-sdk
 * handles the ARIA combobox pattern, arrow keys, the top layer popup, and the
 * hidden form value. The look comes from the `.combobox` classes in
 * styles/components.css. A `className` on a part replaces its default class,
 * so another look can start clean, as the top bar switchers do.
 */
type WithClass<T extends React.ElementType> = Omit<React.ComponentProps<T>, "className"> & { className?: string }

function ComboboxInput({ className, ...props }: WithClass<typeof ComboboxInputPrimitive>) {
  return <ComboboxInputPrimitive className={className ?? "input"} {...props} />
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  collisionPadding = 12,
  ...props
}: WithClass<typeof ComboboxContentPrimitive>) {
  return (
    <ComboboxContentPrimitive
      className={className ?? "combobox__popup"}
      side={side}
      sideOffset={sideOffset}
      align={align}
      collisionPadding={collisionPadding}
      {...props}
    />
  )
}

function ComboboxList({ className, ...props }: WithClass<typeof ComboboxListPrimitive>) {
  return <ComboboxListPrimitive className={className ?? "combobox__list"} {...props} />
}

function ComboboxItem({ className, ...props }: WithClass<typeof ComboboxItemPrimitive>) {
  return <ComboboxItemPrimitive className={className ?? "combobox__option"} {...props} />
}

/** The check beside the chosen item. Renders only for the chosen one. */
function ComboboxItemIndicator({ className, ...props }: WithClass<typeof ComboboxItemIndicatorPrimitive>) {
  return (
    <ComboboxItemIndicatorPrimitive
      render={<Check strokeWidth={2} aria-hidden="true" focusable="false" />}
      className={className ?? "combobox__check"}
      {...props}
    />
  )
}

function ComboboxEmpty({ className, ...props }: WithClass<typeof ComboboxEmptyPrimitive>) {
  return <ComboboxEmptyPrimitive className={className ?? "combobox__empty"} {...props} />
}

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
}
