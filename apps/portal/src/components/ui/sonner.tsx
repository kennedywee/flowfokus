"use client"

import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/*
 * The toast region. The portal is dark only, so the theme is fixed. Toasts
 * render our own card (see components/Toast.tsx), so Sonner draws nothing of
 * its own: it only stacks, times, and announces them. Bottom right on a desk
 * screen, top centre below 1181px, under the top bar.
 */
const WIDE = "(min-width: 1181px)"

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const Toaster = ({ ...props }: ToasterProps) => {
  const wide = React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => true,
  )

  return (
    <Sonner
      theme="dark"
      className="toaster"
      position={wide ? "bottom-right" : "top-center"}
      offset={wide ? 24 : { top: 64 }}
      mobileOffset={{ top: 64, left: 16, right: 16 }}
      gap={8}
      visibleToasts={3}
      expand
      toastOptions={{ unstyled: true, className: "toaster__item" }}
      style={{ "--width": "380px" } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
