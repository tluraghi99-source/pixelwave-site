import { useEffect } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { Marquee } from "@/components/motion/Marquee"

const ITEMS = ["Web Design", "Brand Identity", "Motion", "Development", "Design Systems"]

/** Ticker items tilt toward whichever side of the viewport the cursor is on. */
const MAX_ROTATION = 5

export function TickerStrip() {
  const rotate = useMotionValue(0)
  const springRotate = useSpring(rotate, { stiffness: 200, damping: 20 })

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const midpoint = window.innerWidth / 2
      const distance = Math.abs(e.clientX - midpoint)
      const amount = (distance / midpoint) * MAX_ROTATION
      rotate.set(e.clientX > midpoint ? amount : -amount)
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [rotate])

  return (
    <div className="ticker" data-theme="dark" aria-hidden="true">
      <Marquee speed={34}>
        {ITEMS.map((item, i) => (
          <motion.span className="ticker__item" key={item} style={{ rotate: springRotate }}>
            {item}
            <span className={`ticker__dot ${i % 2 === 0 ? "ticker__dot--orange" : ""}`} />
          </motion.span>
        ))}
      </Marquee>
    </div>
  )
}
