import { Link } from "react-router-dom"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { ROUTES } from "@/lib/routes"

/** The contact CTA box in the page's top-right corner, right under the menu
 *  button (same look as the home hero's). It stays where it is and fades out
 *  over the first stretch of scrolling — the same way the home hero's does —
 *  instead of scrolling away with the page. */
export function CornerCta() {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, (y) => Math.max(0, 1 - y / (window.innerHeight * 0.15)))
  const pointerEvents = useTransform(scrollY, (y) => (y > window.innerHeight * 0.12 ? "none" : "auto"))
  return (
    <motion.div className="corner-cta-wrap corner-cta-wrap--fixed" style={{ opacity, pointerEvents }}>
      <Link to={ROUTES.contact} className="corner-cta">
        <span className="corner-cta__label">Hai una wave in mente?</span>
        <span className="corner-cta__main">
          Let’s chat
          <ArrowUpRight size={20} aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  )
}
