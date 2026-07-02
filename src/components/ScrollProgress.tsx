import { motion, useScroll, useSpring } from "framer-motion"

/** Thin fixed progress line tracking scroll depth through the page. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.3 })

  return <motion.div className="scroll-progress" style={{ scaleX }} />
}
