import { useEffect, useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

/** Small branded dot that replaces the native arrow — fine-pointer (desktop) only. */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
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
    function handleMove(e: MouseEvent) {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    window.addEventListener("mousemove", handleMove)
    return () => window.removeEventListener("mousemove", handleMove)
  }, [enabled, x, y])

  if (!enabled) return null

  return <motion.div className="cursor-dot" style={{ x: springX, y: springY }} aria-hidden="true" />
}
