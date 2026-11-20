import * as React from "react"
import { bindDrag, bindHold } from "@ui-sdk/core"
import { Check, ChevronRight } from "lucide-react"
import { HOLD_MS, isAssistiveClick } from "@/components/ui/hold-button"
import { cn } from "@/lib/utils"

/*
 * Swipe to confirm: drag the knob to the end of the track. Distance, not
 * time, so it suits a phone or tablet at the desk. ui-sdk's `bindDrag` follows
 * the finger; a release before 90% springs the knob back.
 *
 * The knob is a button named for the action. Holding Space or Enter on it
 * slides it across over 600 ms, as a HoldButton does, and a click from a
 * screen reader or switch control confirms at once.
 */

/** How far the knob must travel, as a share of the track, before a release confirms. */
export const SWIPE_THRESHOLD = 0.9

type SwipeConfirmProps = {
  /** The action, such as "Check in". It names the knob. */
  label: string
  /** The track's text, such as "Slide to check in". It is also the knob's description. */
  slideLabel: string
  /** The label while the request runs, such as "Checked in". */
  confirmedLabel: React.ReactNode
  /** Runs once the knob reaches the end. Return a Promise to keep the confirmed state until it settles. */
  onConfirm: () => unknown
  disabled?: boolean
  className?: string
}

function SwipeConfirm({ label, slideLabel, confirmedLabel, onConfirm, disabled, className }: SwipeConfirmProps) {
  const knob = React.useRef<HTMLButtonElement>(null)
  const hintId = React.useId()
  // How far the knob has travelled, from 0 to 1, and what moves it: a finger
  // (no transition), a held key (the hold time), or a release (the spring).
  const [progress, setProgress] = React.useState(0)
  const [mode, setMode] = React.useState<"drag" | "hold" | "release">("release")
  const [confirmed, setConfirmed] = React.useState(false)
  const skipClick = React.useRef(false)

  const state = React.useRef({ confirmed, disabled, onConfirm })
  state.current = { confirmed, disabled, onConfirm }

  const confirm = React.useCallback(async () => {
    if (state.current.confirmed || state.current.disabled) return
    state.current.confirmed = true
    setMode("release")
    setProgress(1)
    setConfirmed(true)
    try {
      await state.current.onConfirm()
    } catch (error) {
      // onConfirm owns its error feedback. Report what escapes it without an unhandled rejection.
      reportError(error)
    } finally {
      state.current.confirmed = false
      setConfirmed(false)
      setProgress(0)
    }
  }, [])

  // Keyboard: holding Space or Enter slides the knob across. Pointers drag instead.
  React.useEffect(() => {
    const el = knob.current
    if (!el) return
    return bindHold(el, {
      delay: HOLD_MS,
      disabled: () => Boolean(state.current.confirmed || state.current.disabled),
      onPress: ({ input }) => {
        if (input !== "keyboard") return false
        setMode("hold")
        setProgress(1)
      },
      onHold: () => {
        void confirm()
      },
      onEnd: ({ held, canceled }) => {
        if (held) return
        if (!canceled) skipClick.current = true
        setMode("release")
        setProgress(0)
      },
    })
  }, [confirm])

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const el = knob.current
    const track = el?.closest<HTMLElement>(".swipe")
    // One finger drags; a second one does not start its own drag.
    if (!el || !track || event.button !== 0 || !event.isPrimary) return
    if (state.current.confirmed || state.current.disabled) return
    // The knob travels the track's inner width, less its own width.
    const travel = track.clientWidth - el.offsetWidth - 6
    const startX = event.clientX
    const reach = (x: number) => Math.min(1, Math.max(0, (x - startX) / travel))
    setMode("drag")
    bindDrag(el, event.nativeEvent, {
      onMove: ({ x }) => setProgress(reach(x)),
      // Decide from where the finger lifted, not from the last move.
      onEnd: (up, canceled) => {
        if (!canceled && reach(up.clientX) >= SWIPE_THRESHOLD) {
          void confirm()
        } else {
          setMode("release")
          setProgress(0)
        }
      },
    })
  }

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    if (isAssistiveClick({ detail: event.detail, pointerType: (event.nativeEvent as PointerEvent).pointerType })) {
      void confirm()
    }
  }

  return (
    <div
      className={cn("swipe", className)}
      data-mode={mode}
      data-confirmed={confirmed ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      style={{ "--swipe-progress": progress } as React.CSSProperties}
    >
      <span className="swipe__text" aria-hidden="true">
        {confirmed ? (
          <>
            <Check />
            {confirmedLabel}
          </>
        ) : (
          slideLabel
        )}
      </span>
      <span className="swipe__trail">
        <button
          ref={knob}
          type="button"
          className="swipe__knob"
          aria-label={label}
          aria-describedby={hintId}
          aria-busy={confirmed || undefined}
          disabled={disabled}
          onPointerDown={onPointerDown}
          onClick={onClick}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </span>
      <span id={hintId} hidden>
        {slideLabel}
      </span>
    </div>
  )
}

export { SwipeConfirm }
export type { SwipeConfirmProps }
