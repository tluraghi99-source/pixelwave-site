import type { ReactNode } from "react"
import { motion } from "framer-motion"

interface MarqueeProps {
  children: ReactNode
  speed?: number
  reverse?: boolean
  className?: string
}

/** Infinite horizontal ticker — duplicates its content and loops the translate. */
export function Marquee({ children, speed = 32, reverse = false, className }: MarqueeProps) {
  return (
    <div className={["marquee", className].filter(Boolean).join(" ")}>
      <motion.div
        className="marquee__track"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      >
        <span className="marquee__group">{children}</span>
        <span className="marquee__group" aria-hidden="true">
          {children}
        </span>
      </motion.div>
    </div>
  )
}
