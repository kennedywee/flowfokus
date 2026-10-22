"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * A menu that opens from a button. Base UI positions it, moves focus, handles
 * arrow keys and typeahead, and closes it on Escape or a click outside. The
 * look comes from the `.menu` classes in styles/shell.css.
 */
function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 8,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="menu-positioner"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup data-slot="dropdown-menu-content" className={cn("menu", className)} {...props} />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

/** Plain content above the items, for example who is signed in. Not focusable. */
function DropdownMenuHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dropdown-menu-header" className={cn("menu__header", className)} {...props} />
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return <MenuPrimitive.GroupLabel data-slot="dropdown-menu-label" className={cn("menu__label", className)} {...props} />
}

function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return <MenuPrimitive.Item data-slot="dropdown-menu-item" className={cn("menu__item", className)} {...props} />
}

function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator data-slot="dropdown-menu-separator" className={cn("menu__separator", className)} {...props} />
  )
}

/**
 * A choice of one value. The chosen item shows a check on its left. A pick
 * closes the menu, like a plain item. Pass `closeOnClick={false}` to keep it open.
 */
function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
}

function DropdownMenuRadioItem({ className, children, closeOnClick = true, ...props }: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn("menu__item", className)}
      closeOnClick={closeOnClick}
      {...props}
    >
      {/* The slot keeps its width when empty, so every label lines up. */}
      <span className="menu__check">
        <MenuPrimitive.RadioItemIndicator render={<Check strokeWidth={2} aria-hidden="true" focusable="false" />} />
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

/** A submenu. It opens on hover, on Enter, or on the Right arrow key. */
function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({ className, ...props }: MenuPrimitive.SubmenuTrigger.Props) {
  return (
    <MenuPrimitive.SubmenuTrigger data-slot="dropdown-menu-sub-trigger" className={cn("menu__item", className)} {...props} />
  )
}

function DropdownMenuSubContent({
  className,
  side = "inline-end",
  // Measured from the trigger, which sits 7px inside the menu edge: an 8px gap.
  sideOffset = 15,
  alignOffset = -7,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn("menu--sub", className)}
      side={side}
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
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
}
