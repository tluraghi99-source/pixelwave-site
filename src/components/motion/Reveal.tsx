import type { ReactNode } from "react"
import { motion, type Variants } from "framer-motion"
import { EASE_WAVE } from "@/lib/motion"

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  duration?: number
  once?: boolean
  amount?: number
}

/** Fade + slide-up reveal, triggered when the element scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 32,
  duration = 0.9,
  once = true,
  amount = 0.3,
}: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE_WAVE }}
    >
      {children}
    </motion.div>
  )
}

interface RevealGroupProps {
  children: ReactNode
  className?: string
  stagger?: number
  delayChildren?: number
  once?: boolean
  amount?: number
  "data-screen-label"?: string
}

/** Stagger container — pair with <RevealItem> children. */
export function RevealGroup({
  children,
  className,
  stagger = 0.12,
  delayChildren = 0,
  once = true,
  amount = 0.2,
  "data-screen-label": dataScreenLabel,
}: RevealGroupProps) {
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  }

  return (
    <motion.div
      className={className}
      data-screen-label={dataScreenLabel}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={variants}
    >
      {children}
    </motion.div>
  )
}

interface RevealItemProps {
  children: ReactNode
  className?: string
  y?: number
  duration?: number
}

export function RevealItem({ children, className, y = 24, duration = 0.8 }: RevealItemProps) {
  const variants: Variants = {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration, ease: EASE_WAVE } },
  }

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}
