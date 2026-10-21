import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cn } from "@/lib/utils"

/*
 * A round avatar, styled by `.avatar` in styles/components.css. Base UI shows
 * the fallback (initials) until an image loads, or when there is none.
 */
function Avatar({
  className,
  size = 24,
  ...props
}: Omit<AvatarPrimitive.Root.Props, "style"> & { size?: number }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn("avatar", className)}
      style={{ "--size": `${size}px` } as React.CSSProperties}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("size-full rounded-full object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return <AvatarPrimitive.Fallback data-slot="avatar-fallback" className={cn(className)} {...props} />
}

export { Avatar, AvatarFallback, AvatarImage }
