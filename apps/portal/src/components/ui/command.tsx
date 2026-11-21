"use client"

import * as React from "react"
import {
  Command as CommandPrimitive,
  CommandEmpty as CommandEmptyPrimitive,
  CommandGroup as CommandGroupPrimitive,
  CommandGroupLabel,
  CommandInput as CommandInputPrimitive,
  CommandItem as CommandItemPrimitive,
  CommandList as CommandListPrimitive,
  CommandSeparator as CommandSeparatorPrimitive,
} from "@ui-sdk/react/command"
import { Icon } from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/*
 * A searchable list of actions, from ui-sdk. Focus stays in the search box and
 * the arrow keys move the highlight. The search text lives on `Command`
 * (`query` and `onQueryChange`). Keep status messages outside `CommandList`:
 * it holds only commands. Styled by the `.command` classes in
 * styles/components.css. CommandDialog puts it in a modal, for a command
 * palette. To pick a value in a form, use Combobox instead.
 */
type WithClass<T extends React.ElementType> = Omit<React.ComponentProps<T>, "className"> & { className?: string }

function Command({ className, autoHighlight = true, ...props }: WithClass<typeof CommandPrimitive>) {
  return <CommandPrimitive className={cn("command", className)} autoHighlight={autoHighlight} {...props} />
}

function CommandDialog({
  title = "Command palette",
  description = "Search for a command to run.",
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogContent className={cn("command-dialog", className)}>
        <DialogTitle className="visually-hidden">{title}</DialogTitle>
        <DialogDescription className="visually-hidden">{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}

/** The search box of the palette, with its icon. */
function CommandInput({ className, ...props }: WithClass<typeof CommandInputPrimitive>) {
  return (
    <div data-slot="command-input-wrapper" className="command__search">
      <div className="search-field">
        <Icon name="search" aria-hidden="true" focusable="false" />
        <CommandInputPrimitive className={cn("input", className)} {...props} />
      </div>
    </div>
  )
}

/** A `className` replaces the default class, for a list inside a scroll area of its own. */
function CommandList({ className, ...props }: WithClass<typeof CommandListPrimitive>) {
  return <CommandListPrimitive className={className ?? "command__list"} {...props} />
}

function CommandEmpty({ className, ...props }: WithClass<typeof CommandEmptyPrimitive>) {
  return <CommandEmptyPrimitive className={cn("command__empty", className)} {...props} />
}

/** A named group of commands. */
function CommandGroup({
  className,
  heading,
  children,
  ...props
}: Omit<WithClass<typeof CommandGroupPrimitive>, "children"> & { heading?: string; children?: React.ReactNode }) {
  return (
    <CommandGroupPrimitive className={cn("command__group", className)} {...props}>
      {heading ? <CommandGroupLabel className="command__group-label">{heading}</CommandGroupLabel> : null}
      {children}
    </CommandGroupPrimitive>
  )
}

function CommandSeparator({ className, ...props }: WithClass<typeof CommandSeparatorPrimitive>) {
  return <CommandSeparatorPrimitive className={cn("command__separator", className)} {...props} />
}

function CommandItem({ className, ...props }: WithClass<typeof CommandItemPrimitive>) {
  return <CommandItemPrimitive className={cn("command__item", className)} {...props} />
}

/** The right side of an item: a shortcut or a current value. */
function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="command-shortcut" className={cn("command__shortcut", className)} {...props} />
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandInputPrimitive,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}
