import * as React from "react"
import { bindHold } from "@ui-sdk/core"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { isEditable, overlayOpen } from "@/lib/shortcuts"
import { cn } from "@/lib/utils"

/*
 * A button that confirms only when pressed and held. It sits between a plain
 * button and a ConfirmDialog: for safe actions that should not fire on a stray
 * click. ui-sdk's `bindHold` tracks the press and sets `data-holding`, and
 * styles/components.css fills `.hold-button` over `--duration-hold`.
 *
 * Screen readers and switch controls cannot hold, so a click that does not
 * come from a pointer confirms at once.
 */

/** Keep in step with `--duration-hold` and `--duration-drain` in tokens.css. */
export const HOLD_MS = 600
export const HINT_MS = 1500
/** The hover hint waits this long, so a passing pointer does not open it. */
const HOVER_HINT_DELAY_MS = 400

const POINTER_TYPES = ["mouse", "touch", "pen"]

type HoldButtonProps = Omit<React.ComponentProps<typeof Button>, "variant" | "onClick" | "children" | "ref"> & {
  /** The action, such as "Check in". It stays the button's accessible name. */
  children: React.ReactNode
  /** Runs once the hold completes. Return a Promise to keep the confirmed state until it settles. */
  onConfirm: () => unknown
  /** The hint for the gesture, such as "Hold to check in". It is also the button's description. */
  holdLabel: string
  /** The label while the request runs, such as "Checked in". */
  confirmedLabel: React.ReactNode
  variant?: "secondary" | "default"
  /**
   * How the hold shows progress: a fill across the button (`sweep`), dither
   * dots (`dots`), a 2px line under it (`line`), or a ring around an icon
   * (`ring`). A ring button takes an icon as children and an `aria-label`.
   */
  fill?: "sweep" | "dots" | "line" | "ring"
  /** A single key, such as "c". Holding it anywhere on the page holds the button. */
  shortcut?: string
}

/** A matrix cannot blend into scaleX(0), so both ends of a drain use scaleX. */
function scaleX(transform: string) {
  return transform === "none" ? "none" : `scaleX(${new DOMMatrix(transform).a})`
}

/**
 * Drains the fill from where it is over --duration-drain. Without this, the
 * browser reverses the running CSS transition and shortens it by how far the
 * fill got, so an early release snaps back instead of draining.
 */
function drain(button: HTMLElement) {
  const fill = button.querySelector<HTMLElement>(".hold-button__fill")
  if (!fill || typeof fill.animate !== "function" || typeof fill.getAnimations !== "function") return
  const style = getComputedStyle(button)
  const duration = parseFloat(style.getPropertyValue("--duration-drain")) || 200
  const easing = style.getPropertyValue("--ease-out").trim() || "ease-out"
  const now = getComputedStyle(fill)
  // Copy the values now: the computed style is live, and cancelling below changes it.
  const read = () => ({
    transform: scaleX(now.transform),
    opacity: now.opacity,
    right: now.right,
    strokeDashoffset: now.strokeDashoffset,
  })
  const from = read()
  // A running transition outranks an animation in the cascade, so stop it first.
  // The fill then computes its resting values, which are where the drain ends.
  for (const running of fill.getAnimations()) running.cancel()
  fill.animate([from, read()], { duration, easing })
}

/** A click from assistive tech: a keyboard-free activation with no pointer behind it. */
export function isAssistiveClick(event: Pick<MouseEvent, "detail"> & { pointerType?: string }) {
  if (event.detail === 0) return true
  return typeof event.pointerType === "string" && !POINTER_TYPES.includes(event.pointerType)
}

function HoldButton({
  onConfirm,
  holdLabel,
  confirmedLabel,
  variant = "secondary",
  fill = "sweep",
  shortcut,
  className,
  children,
  disabled,
  ...props
}: HoldButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null)
  const [confirmed, setConfirmed] = React.useState(false)
  const [hint, setHint] = React.useState(false)
  const [hover, setHover] = React.useState(false)
  const hintTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  // A short Space or Enter press ends in a synthetic click; that click must not confirm.
  const skipClick = React.useRef(false)

  const state = React.useRef({ confirmed, disabled, onConfirm })
  state.current = { confirmed, disabled, onConfirm }

  const confirm = React.useCallback(async () => {
    if (state.current.confirmed || state.current.disabled) return
    setHint(false)
    setConfirmed(true)
    state.current.confirmed = true
    try {
      await state.current.onConfirm()
    } catch (error) {
      // onConfirm owns its error feedback. Report what escapes it without an unhandled rejection.
      reportError(error)
    } finally {
      state.current.confirmed = false
      setConfirmed(false)
    }
  }, [])

  const showHint = React.useCallback(() => {
    clearTimeout(hintTimer.current)
    setHint(true)
    hintTimer.current = setTimeout(() => setHint(false), HINT_MS)
  }, [])

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const bind = () =>
      bindHold(el, {
        delay: HOLD_MS,
        disabled: () => Boolean(state.current.confirmed || state.current.disabled),
        onPress: () => {
          clearTimeout(hintTimer.current)
          setHint(false)
          setHover(false)
        },
        onHold: () => {
          void confirm()
        },
        onEnd: ({ held, canceled, input }) => {
          if (held) return
          if (input === "keyboard" && !canceled) skipClick.current = true
          drain(el)
          showHint()
        },
      })
    let unbind = bind()
    // Moving off the button cancels the hold, as letting go does.
    const onLeave = () => {
      if (!el.hasAttribute("data-holding") || el.hasAttribute("data-held")) return
      // The cleanup stops the press without `onEnd`; bind again for the next press.
      unbind()
      unbind = bind()
      drain(el)
      showHint()
    }
    // A touch or pen keeps sending moves to the button after it leaves, so check the bounds too.
    const onMove = (event: PointerEvent) => {
      // Only the primary pointer holds; a second finger's moves do not count.
      if (!event.isPrimary) return
      const box = el.getBoundingClientRect()
      const { clientX: x, clientY: y } = event
      if (x < box.left || x > box.right || y < box.top || y > box.bottom) onLeave()
    }
    // Only the primary pointer holds; a second finger leaving does not count.
    const onPointerLeave = (event: PointerEvent) => event.isPrimary && onLeave()
    el.addEventListener("pointerleave", onPointerLeave)
    el.addEventListener("pointermove", onMove)

    // The shortcut holds the button from anywhere, with the single-key rules of lib/shortcuts.ts.
    let keyTimer: ReturnType<typeof setTimeout> | undefined
    let keyHolding = false
    const isShortcut = (event: KeyboardEvent) => Boolean(shortcut) && event.key.toLowerCase() === shortcut!.toLowerCase()
    const onKeyDown = (event: KeyboardEvent) => {
      // Escape cancels a shortcut hold, as it cancels a pointer or Space hold.
      if (event.key === "Escape" && keyTimer) return releaseKey()
      if (!isShortcut(event) || event.repeat || event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (isEditable(event.target) || overlayOpen() || el.hasAttribute("data-holding")) return
      if (state.current.confirmed || state.current.disabled) return
      event.preventDefault()
      clearTimeout(hintTimer.current)
      setHint(false)
      keyHolding = true
      el.setAttribute("data-holding", "")
      keyTimer = setTimeout(() => {
        keyTimer = undefined
        void confirm()
      }, HOLD_MS)
    }
    // Letting go before the timer fires cancels; after it, the hold has confirmed.
    const releaseKey = () => {
      if (!keyHolding) return
      keyHolding = false
      el.removeAttribute("data-holding")
      if (!keyTimer) return
      clearTimeout(keyTimer)
      keyTimer = undefined
      drain(el)
      showHint()
    }
    const onKeyUp = (event: KeyboardEvent) => isShortcut(event) && releaseKey()
    if (shortcut) {
      window.addEventListener("keydown", onKeyDown)
      window.addEventListener("keyup", onKeyUp)
      window.addEventListener("blur", releaseKey)
    }
    return () => {
      el.removeEventListener("pointerleave", onPointerLeave)
      el.removeEventListener("pointermove", onMove)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", releaseKey)
      clearTimeout(keyTimer)
      unbind()
      clearTimeout(hintTimer.current)
    }
  }, [confirm, showHint, shortcut])

  const onClick = (event: React.MouseEvent<HTMLElement>) => {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    if (isAssistiveClick({ detail: event.detail, pointerType: (event.nativeEvent as PointerEvent).pointerType })) {
      void confirm()
    }
  }

  return (
    <Tooltip
      type="description"
      delay={HOVER_HINT_DELAY_MS}
      open={!confirmed && (hint || hover)}
      onOpenChange={(open) => setHover(open)}
    >
      <TooltipTrigger
        render={
          <Button
            ref={ref}
            variant={variant}
            size={fill === "ring" ? "icon-sm" : undefined}
            className={cn("hold-button", fill !== "sweep" && `hold-button--${fill}`, className)}
            aria-keyshortcuts={shortcut?.toUpperCase()}
            disabled={disabled}
            data-confirmed={confirmed ? "" : undefined}
            aria-busy={confirmed || undefined}
            onClick={onClick}
            {...props}
          />
        }
      >
        {fill === "ring" ? (
          <svg className="hold-button__ring" viewBox="0 0 32 32" aria-hidden="true">
            <circle className="hold-button__fill" cx="16" cy="16" r="15" pathLength={100} />
          </svg>
        ) : (
          <span className="hold-button__fill" aria-hidden="true" />
        )}
        {confirmed ? (
          <>
            {/* The action stays the accessible name; the success label is for sight. */}
            <span className="visually-hidden">{children}</span>
            <span className="hold-button__label" aria-hidden="true">
              <Check />
              {fill === "ring" ? null : confirmedLabel}
            </span>
          </>
        ) : (
          <span className="hold-button__label">
            {children}
            {shortcut ? (
              <span className="kbd" aria-hidden="true">
                Hold {shortcut.toUpperCase()}
              </span>
            ) : null}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>{holdLabel}</TooltipContent>
    </Tooltip>
  )
}

export { HoldButton }
export type { HoldButtonProps }
