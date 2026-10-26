import { Link } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
import { ROUTES } from "@/lib/routes"

/** The contact CTA box in the page's top-right corner, right under the menu
 *  button (same look as the home hero's). Positions itself against the
 *  nearest positioned ancestor, so the parent needs `position: relative` and
 *  its top edge at the top of the page. */
export function CornerCta() {
  return (
    <div className="corner-cta-wrap">
      <Link to={ROUTES.contact} className="corner-cta">
        <span className="corner-cta__label">Hai una wave in mente?</span>
        <span className="corner-cta__main">
          Let’s chat
          <ArrowUpRight size={20} aria-hidden="true" />
        </span>
      </Link>
    </div>
  )
}
