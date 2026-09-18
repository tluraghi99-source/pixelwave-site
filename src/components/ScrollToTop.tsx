import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/** React Router doesn't reset scroll position on navigation — without this,
 *  going from mid-scroll on one page to a different route lands mid-scroll
 *  on the new page instead of at its top. A plain effect (not layout effect)
 *  so it runs after Header's own body-scroll-lock cleanup when navigating
 *  out of the open menu, rather than racing it.
 *
 *  A destination with a hash (e.g. the nav's "Services" link, "/#services"
 *  from another page) scrolls to that element instead of the top. Needed
 *  because the browser's own native on-load hash-scroll only fires once,
 *  before this client-rendered SPA's target route has actually mounted —
 *  nothing has that id in the DOM yet at that point — so it was silently
 *  landing at the top instead of the section. Double rAF gives the new
 *  route a frame to mount and lay out before we look for the element.
 *
 *  A second, delayed call corrects for layout that shifts after that:
 *  confirmed live on mobile, where the homepage's real (unsized) project
 *  images pop in and push everything below them down as they load — the
 *  first scrollIntoView's native smooth-scroll animation had already
 *  committed to a target 373px short of the section's actual position by
 *  the time that happened, and (being already in flight) didn't re-target
 *  itself once the page grew. Desktop's own work carousel is a fixed-size
 *  WebGL canvas, so it never hit this — but nothing here is desktop/mobile-
 *  specific, just a general "the page may still be settling" guard. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1)
      const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
      requestAnimationFrame(() => requestAnimationFrame(scroll))
      const correction = setTimeout(scroll, 600)
      return () => clearTimeout(correction)
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
    // iOS Safari only repaints position: fixed elements that reach into the
    // safe area (the homepage hero background, the header, etc. — anything
    // sized with bottom: 0 instead of a height calc) against their real
    // on-screen edges in response to an actual scroll event, confirmed live
    // via the mobile nav menu's own version of this bug (see Header.tsx's
    // mobileBarOrange effect). Without a nudge here, first load can leave a
    // flat, graphic-less strip at the screen edges until the visitor
    // scrolls once themselves. The short delay lets first paint settle.
    const nudge = setTimeout(() => {
      window.scrollBy(0, 1)
      window.scrollBy(0, -1)
    }, 150)
    return () => clearTimeout(nudge)
  }, [pathname, hash])

  return null
}
