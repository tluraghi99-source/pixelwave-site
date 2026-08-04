import { useEffect, useState } from "react"
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion"

/** How long the hint stays up before fading, regardless of mouse movement
 *  (or of scroll, on the `dismissOnScroll` path — a safety net in case the
 *  visitor never actually scrolls). */
const DEFAULT_AUTO_HIDE_MS = 3500

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
   *  the action being suggested. */
  dismissOnScroll?: boolean
}

/** Small text label that trails the cursor on arrival, fine-pointer (desktop)
 *  only — a one-time nudge, not a persistent nag. Fades on a fixed timer
 *  (and optionally on first scroll) rather than on first mouse move, so it
 *  reads even if the visitor's mouse is already resting somewhere. */
export function CursorHint({ text, variant = "glow", autoHideMs = DEFAULT_AUTO_HIDE_MS, dismissOnScroll = false }: CursorHintProps) {
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(true)
  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const springX = useSpring(x, { stiffness: 500, damping: 40, mass: 0.5 })
  const springY = useSpring(y, { stiffness: 500, damping: 40, mass: 0.5 })

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
    // centered so it's visible immediately on arrival either way.
    x.set(window.innerWidth / 2 + 18)
    y.set(window.innerHeight / 2 - 72)

    function handleMove(e: MouseEvent) {
      x.set(e.clientX + 18)
      y.set(e.clientY - 12)
    }
    function handleScroll() {
      setVisible(false)
    }
    window.addEventListener("mousemove", handleMove)
    if (dismissOnScroll) window.addEventListener("scroll", handleScroll, { passive: true })
    const timer = setTimeout(() => setVisible(false), autoHideMs)
    return () => {
      window.removeEventListener("mousemove", handleMove)
      if (dismissOnScroll) window.removeEventListener("scroll", handleScroll)
      clearTimeout(timer)
    }
  }, [enabled, x, y, autoHideMs, dismissOnScroll])

  if (!enabled) return null

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
