import { motion, type Variants } from "framer-motion"
import { EASE_WAVE } from "@/lib/motion"

interface SplitTextProps {
  text: string
  className?: string
  wordClassName?: string
  delay?: number
  stagger?: number
  /** "view" animates on scroll-into-view; "mount" is externally gated via `start`. */
  mode?: "view" | "mount"
  start?: boolean
}

const word: Variants = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.85, ease: EASE_WAVE } },
}

/** Splits text into words, each masked and sliding up into place — the hero/statement reveal motif. */
export function SplitText({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.06,
  mode = "view",
  start = true,
}: SplitTextProps) {
  const words = text.split(" ")

  const dynamicContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  }

  const viewProps =
    mode === "view"
      ? { whileInView: "show", viewport: { once: true, amount: 0.4 } }
      : { animate: start ? "show" : "hidden" }

  return (
    <motion.span
      className={className}
      initial="hidden"
      variants={dynamicContainer}
      {...viewProps}
    >
      {words.map((w, i) => (
        <span className="split-text__mask" key={i}>
          <motion.span className={["split-text__word", wordClassName].filter(Boolean).join(" ")} variants={word}>
            {w}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </motion.span>
  )
}
