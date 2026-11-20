"use client"

import * as React from "react"
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@ui-sdk/react/menu"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * A menu that opens from a button. ui-sdk opens it in the top layer, positions
 * it, moves focus, handles arrow keys and typeahead, and closes it on Escape or
 * a click outside. The look comes from the `.menu` classes in styles/shell.css.
 */
type WithClass<T extends React.ElementType> = Omit<React.ComponentProps<T>, "className"> & { className?: string }

const DropdownMenu = Menu
const DropdownMenuTrigger = MenuTrigger
const DropdownMenuGroup = MenuGroup
const DropdownMenuSub = MenuSub

function DropdownMenuContent({
  align = "start",
  sideOffset = 8,
  className,
  ...props
}: WithClass<typeof MenuContent>) {
  return <MenuContent className={cn("menu", className)} align={align} sideOffset={sideOffset} {...props} />
}

/** Plain content above the items, for example who is signed in. Not focusable. */
function DropdownMenuHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dropdown-menu-header" className={cn("menu__header", className)} {...props} />
}

function DropdownMenuLabel({ className, ...props }: WithClass<typeof MenuGroupLabel>) {
  return <MenuGroupLabel className={cn("menu__label", className)} {...props} />
}

/** A command. `onClick` runs when it is chosen with the pointer or the keyboard. */
function DropdownMenuItem({
  className,
  onClick,
  ...props
}: Omit<WithClass<typeof MenuItem>, "onClick" | "onSelect"> & { onClick?: () => unknown }) {
  return <MenuItem className={cn("menu__item", className)} onSelect={onClick ? () => onClick() : undefined} {...props} />
}

function DropdownMenuSeparator({ className, ...props }: WithClass<typeof MenuSeparator>) {
  return <MenuSeparator className={cn("menu__separator", className)} {...props} />
}

/** A choice of one value. The chosen item shows a check on its left. A pick closes the menu. */
const DropdownMenuRadioGroup = MenuRadioGroup

function DropdownMenuRadioItem({
  className,
  children,
  closeOnSelect = true,
  ...props
}: Omit<WithClass<typeof MenuRadioItem>, "children"> & { children?: React.ReactNode }) {
  return (
    <MenuRadioItem className={cn("menu__item", className)} closeOnSelect={closeOnSelect} {...props}>
      {/* The slot keeps its width when empty, so every label lines up. */}
      <span className="menu__check">
        <MenuItemIndicator render={<Check strokeWidth={2} aria-hidden="true" focusable="false" />} />
      </span>
      {children}
    </MenuRadioItem>
  )
}

/**
 * An on/off choice, such as one filter value. The check shows on its left.
 * It stays open after a pick by default, so staff can tick several.
 */
function DropdownMenuCheckboxItem({
  className,
  children,
  closeOnSelect = false,
  value,
  ...props
}: Omit<WithClass<typeof MenuCheckboxItem>, "children" | "value"> & { children?: React.ReactNode; value?: string }) {
  const id = React.useId()
  return (
    <MenuCheckboxItem
      className={cn("menu__item", className)}
      closeOnSelect={closeOnSelect}
      value={value ?? id}
      {...props}
    >
      <span className="menu__check menu__check--box">
        <MenuItemIndicator render={<Check strokeWidth={2.5} aria-hidden="true" focusable="false" />} />
      </span>
      {children}
    </MenuCheckboxItem>
  )
}

/** A submenu trigger. The submenu opens on hover, on Enter, or on the Right arrow key. */
function DropdownMenuSubTrigger({ className, ...props }: WithClass<typeof MenuSubTrigger>) {
  return <MenuSubTrigger className={cn("menu__item", className)} {...props} />
}

function DropdownMenuSubContent({
  className,
  // Measured from the trigger, which sits 7px inside the menu edge: an 8px gap.
  sideOffset = 15,
  alignOffset = -7,
  ...props
}: WithClass<typeof MenuSubContent>) {
  return (
    <MenuSubContent
      className={cn("menu menu--sub", className)}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      {...props}
    />
  )
}

/** The right side of an item: a current value, a shortcut, or a submenu chevron. */
function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="dropdown-menu-shortcut" className={cn("menu__meta", className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
}
