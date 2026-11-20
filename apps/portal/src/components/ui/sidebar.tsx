"use client"

import * as React from "react"
import { mergeProps, renderElement, type RenderProp } from "@ui-sdk/react/primitive"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/*
 * The app sidebar: its parts and state, with the portal look and motion in
 * styles/shell.css.
 *
 * Three layouts, by width:
 *  - Desk (1181px and up): the full sidebar. Staff can collapse it to the icon
 *    rail with the button or Ctrl/⌘+B.
 *  - Tablet (768px to 1180px): always the icon rail.
 *  - Phone (below 768px): a drawer (a sheet) opened from the top bar.
 *
 * The collapsed state lives in React only, so a reload opens the full sidebar.
 */

const SIDEBAR_KEYBOARD_SHORTCUT = "b"
const RAIL_QUERY = "(min-width: 768px) and (max-width: 1180px)"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  /** The desk choice: full sidebar or icon rail. */
  open: boolean
  setOpen: (open: boolean) => void
  /** The phone drawer. */
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  /** True when the icon rail shows, by choice on a desk or always on a tablet. */
  isRail: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider.")
  return context
}

function subscribeTo(query: string) {
  return (onChange: () => void) => {
    const list = window.matchMedia(query)
    list.addEventListener("change", onChange)
    return () => list.removeEventListener("change", onChange)
  }
}

function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    React.useMemo(() => subscribeTo(query), [query]),
    () => window.matchMedia(query).matches,
    () => false,
  )
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const isTablet = useMediaQuery(RAIL_QUERY)
  const [openMobile, setOpenMobile] = React.useState(false)
  const [localOpen, setLocalOpen] = React.useState(defaultOpen)
  const open = openProp ?? localOpen

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (onOpenChange) onOpenChange(value)
      else setLocalOpen(value)
    },
    [onOpenChange],
  )

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((value) => !value)
    else setOpen(!open)
  }, [isMobile, open, setOpen])

  // The drawer only exists on a phone. Close it if the window grows past one.
  React.useEffect(() => {
    if (!isMobile) setOpenMobile(false)
  }, [isMobile])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggleSidebar])

  const isRail = !isMobile && (isTablet || !open)
  const context = React.useMemo<SidebarContextProps>(
    () => ({
      state: isRail ? "collapsed" : "expanded",
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      isRail,
      toggleSidebar,
    }),
    [isRail, open, setOpen, openMobile, isMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={context}>
      <div data-slot="sidebar-wrapper" data-collapsed={!open} className={cn("shell", className)} {...props}>
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

/** The sidebar panel. On a phone it renders inside the drawer. */
function Sidebar({ className, children, ...props }: React.ComponentProps<"div">) {
  const { isMobile, openMobile, setOpenMobile } = useSidebar()
  const panel = (
    <div data-slot="sidebar" className={cn("sidebar", className)} {...props}>
      {children}
    </div>
  )
  if (!isMobile) return panel
  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent className="sidebar-sheet">
        <SheetTitle className="visually-hidden">Navigation</SheetTitle>
        {panel}
      </SheetContent>
    </Sheet>
  )
}

/** Opens or closes the sidebar: the rail on a desk, the drawer on a phone. */
function SidebarTrigger({ onClick, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar, isMobile, open, openMobile } = useSidebar()
  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      aria-expanded={isMobile ? openMobile : open}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    />
  )
}

/** The main column beside the sidebar. */
function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-inset" className={cn("shell__main", className)} {...props} />
}

/** The logo row. It matches the top bar height. */
function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("sidebar__brand", className)} {...props} />
}

/** The navigation. Name it with aria-label. */
function SidebarContent({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav data-slot="sidebar-content" className={cn("nav", className)} {...props} />
}

/** The foot of the sidebar: the account menu. */
function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("sidebar__footer", className)} {...props} />
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" className={cn("nav-group", className)} {...props} />
}

/** A group title. On the rail it becomes a short divider; the words stay for assistive technology. */
function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div className="nav-group__head">
      <p data-slot="sidebar-group-label" className={cn("nav-group__label", className)} {...props} />
    </div>
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" className={cn("nav-list", className)} {...props} />
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn(className)} {...props} />
}

/**
 * A sidebar link or button. Pass the element in `render`, for example a
 * router `Link`. With `tooltip`, the rail shows the label beside the icon.
 */
function SidebarMenuButton({
  render,
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & { render?: RenderProp; tooltip?: string }) {
  const { isRail } = useSidebar()
  const merged = mergeProps({ "data-slot": "sidebar-menu-button", className: cn("nav-item", className) }, props)
  if (!tooltip) return renderElement("button", merged, render)
  return (
    <Tooltip disabled={!isRail}>
      <TooltipTrigger render={render} {...merged} />
      <TooltipContent side="right" sideOffset={12}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
}
