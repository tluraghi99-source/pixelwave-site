import { useEffect, useState } from "react"
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion"

/** How long the hint stays up before fading, regardless of mouse movement
 *  (or of scroll, on the `dismissOnScroll` path — a safety net in case the
 *  visitor never actually scrolls). */
const DEFAULT_AUTO_HIDE_MS = 3500

/** `idleReappear` mode: how long the mouse must rest before the hint comes
 *  back, and how far down the page it still does (as a fraction of the
 *  viewport height) — past that the visitor is clearly already scrolling. */
const IDLE_REAPPEAR_MS = 900
const IDLE_MAX_SCROLL = 0.2

/** `idleReappear` mode anchors the hint to the custom cursor dot: the same
 *  spring (CustomCursor.tsx) so it trails exactly as the dot does, and a fixed
 *  18px to the right of the dot's centre, vertically centred on it. */
const DOT_SPRING = { stiffness: 300, damping: 40, mass: 0.5 }
const ANCHORED_OFFSET_X = 18

interface CursorHintProps {
  text: string
  /** "glow" breathes an orange text-shadow (Contact's "Let's chat" nudge);
   *  "bounce" bobs the text up and down instead, to mimic scroll motion
   *  (Hero's "Scroll" nudge). */
  variant?: "glow" | "bounce"
  /** @default 3500 */
  autoHideMs?: number
  /** Also dismiss the instant the page actually scrolls, in addition to the
   *  autoHideMs fallback — appropriate when the hint's own text is itself
   *  the action being suggested. Ignored when `visible` is passed. */
  dismissOnScroll?: boolean
  /** Caller-driven show/hide, replacing the internal auto-hide-timer/
   *  dismissOnScroll logic entirely — for a hint that should track some
   *  external state (e.g. a scroll-progress range) instead of "goes away
   *  after a timer or the first scroll event" (WorkReel's pinned "Keep
   *  scrolling" needs this: the visitor is already scrolling by the time
   *  it mounts, so dismissOnScroll's first-scroll-event rule would hide it
   *  almost immediately). Omit for the default self-managed behavior. */
  visible?: boolean
  /** Instead of a one-time nudge: shown on arrival, hidden while the mouse
   *  moves, and back every time the mouse comes to rest (and again after
   *  scrolling back to the top). Stays away once the page has scrolled past
   *  the first fifth of the viewport. Replaces autoHideMs/dismissOnScroll. */
  idleReappear?: boolean
}

/** Small text label that trails the cursor on arrival, fine-pointer (desktop)
 *  only — a one-time nudge, not a persistent nag. Fades on a fixed timer
 *  (and optionally on first scroll) rather than on first mouse move, so it
 *  reads even if the visitor's mouse is already resting somewhere — unless
 *  `visible` is passed, in which case the caller owns timing entirely. */
export function CursorHint({
  text,
  variant = "glow",
  autoHideMs = DEFAULT_AUTO_HIDE_MS,
  dismissOnScroll = false,
  visible: controlledVisible,
  idleReappear = false,
}: CursorHintProps) {
  const [enabled, setEnabled] = useState(false)
  // Anchored mode starts hidden: until the first mouse move there is no
  // pointer position to anchor to, and a hint floating mid-screen reads as
  // misplaced.
  const [internalVisible, setInternalVisible] = useState(!idleReappear)
  const isControlled = controlledVisible !== undefined
  const visible = isControlled ? controlledVisible : internalVisible
  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const springConfig = idleReappear ? DOT_SPRING : { stiffness: 500, damping: 40, mass: 0.5 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)")
    setEnabled(mq.matches)
    const onChange = () => setEnabled(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (!enabled) return
    // Real cursor position isn't known until the first mousemove — starts
    // centered so it's visible immediately on arrival either way (anchored
    // mode waits for the first move instead).
    if (!idleReappear) {
      x.set(window.innerWidth / 2 + 18)
      y.set(window.innerHeight / 2 - 72)
    }

    let idleTimer: ReturnType<typeof setTimeout> | undefined
    const nearTop = () => window.scrollY <= window.innerHeight * IDLE_MAX_SCROLL
    const armIdle = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => setInternalVisible(nearTop()), IDLE_REAPPEAR_MS)
    }

    function handleMove(e: MouseEvent) {
      x.set(e.clientX + (idleReappear ? ANCHORED_OFFSET_X : 18))
      y.set(idleReappear ? e.clientY : e.clientY - 12)
      if (idleReappear && !isControlled) {
        setInternalVisible(false)
        armIdle()
      }
    }
    window.addEventListener("mousemove", handleMove)

    if (isControlled) {
      return () => window.removeEventListener("mousemove", handleMove)
    }

    if (idleReappear) {
      function handleIdleScroll() {
        setInternalVisible(false)
        if (nearTop()) armIdle()
        else clearTimeout(idleTimer)
      }
      window.addEventListener("scroll", handleIdleScroll, { passive: true })
      return () => {
        window.removeEventListener("mousemove", handleMove)
        window.removeEventListener("scroll", handleIdleScroll)
        clearTimeout(idleTimer)
      }
    }

    function handleScroll() {
      setInternalVisible(false)
    }
    if (dismissOnScroll) window.addEventListener("scroll", handleScroll, { passive: true })
    const timer = setTimeout(() => setInternalVisible(false), autoHideMs)
    return () => {
      window.removeEventListener("mousemove", handleMove)
      if (dismissOnScroll) window.removeEventListener("scroll", handleScroll)
      clearTimeout(timer)
    }
  }, [enabled, x, y, autoHideMs, dismissOnScroll, isControlled, idleReappear])

  if (!enabled) return null

  // Anchored mode keeps the label mounted and only fades its opacity. Mounting
  // and unmounting it would freeze the springs that move it (they stop when
  // their element is removed), so it would reappear wherever it last was
  // instead of next to the dot.
  if (idleReappear) {
    return (
      <motion.span
        className="cursor-hint cursor-hint--anchored"
        style={{ x: springX, y: springY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        aria-hidden="true"
      >
        <span className={`cursor-hint__inner cursor-hint__inner--${variant}`}>{text}</span>
      </motion.span>
    )
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          className="cursor-hint"
          style={{ x: springX, y: springY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          aria-hidden="true"
        >
          <span className={`cursor-hint__inner cursor-hint__inner--${variant}`}>{text}</span>
        </motion.span>
      )}
    </AnimatePresence>
  )
}
