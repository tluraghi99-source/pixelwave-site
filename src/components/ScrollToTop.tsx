import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/** React Router doesn't reset scroll position on navigation — without this,
 *  going from mid-scroll on one page to a different route lands mid-scroll
 *  on the new page instead of at its top. A plain effect (not layout effect)
 *  so it runs after Header's own body-scroll-lock cleanup when navigating
 *  out of the open menu, rather than racing it. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [pathname])

  return null
}
