import * as React from "react"
import {
  Avatar as AvatarPrimitive,
  AvatarFallback as AvatarFallbackPrimitive,
  AvatarImage as AvatarImagePrimitive,
} from "@ui-sdk/react/avatar"
import { cn } from "@/lib/utils"

/*
 * A round avatar, styled by `.avatar` in styles/components.css. ui-sdk shows
 * the fallback (initials) until an image loads, or when there is none.
 */
function Avatar({
  className,
  size = 24,
  ...props
}: Omit<React.ComponentProps<typeof AvatarPrimitive>, "className" | "style"> & {
  className?: string
  size?: number
}) {
  return (
    <AvatarPrimitive
      className={cn("avatar", className)}
      style={{ "--size": `${size}px` } as React.CSSProperties}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: Omit<React.ComponentProps<typeof AvatarImagePrimitive>, "className"> & { className?: string }) {
  return <AvatarImagePrimitive className={cn("size-full rounded-full object-cover", className)} {...props} />
}

function AvatarFallback(props: React.ComponentProps<typeof AvatarFallbackPrimitive>) {
  return <AvatarFallbackPrimitive {...props} />
}

export { Avatar, AvatarFallback, AvatarImage }
