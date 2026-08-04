import { useEffect, useState } from "react"
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion"

/** How long the hint stays up before fading, regardless of mouse movement. */
const VISIBLE_MS = 3500

/** Small "Let's chat" label that trails the cursor on arrival, fine-pointer
 *  (desktop) only — a one-time nudge toward the page's own purpose, not a
 *  persistent nag. Fades on a fixed timer rather than on first move, so it
 *  reads even if the visitor's mouse is already resting somewhere. */
export function CursorHint() {
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
    window.addEventListener("mousemove", handleMove)
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS)
    return () => {
      window.removeEventListener("mousemove", handleMove)
      clearTimeout(timer)
    }
  }, [enabled, x, y])

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
          Let's chat
        </motion.span>
      )}
    </AnimatePresence>
  )
}
