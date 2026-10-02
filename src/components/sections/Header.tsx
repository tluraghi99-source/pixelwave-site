import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { Link, useLocation } from "react-router-dom"
import { Menu, X } from "lucide-react"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { InteractiveHoverButton } from "@/components/pw/InteractiveHoverButton"
import { BrandLogo } from "@/components/pw/Logo"
import { PixelTrail } from "@/components/ui/pixel-trail"
import { EASE_WAVE, HERO_CROSSFADE_RATIO, HERO_NAV_HIDE_AFTER, HERO_REVEAL_END, HERO_REVEAL_START } from "@/lib/motion"

// Desktop-only full menu panel — columns mirror the top-level nav, filled
// out with a level of real sub-navigation (mirrors a reference layout).
const MENU_COLUMNS = [
  {
    label: "Work",
    href: "/work",
    // Land directly on a filter mode — WorkPage.tsx reads ?mode= once on mount.
    links: [
      { label: "Category", href: "/work?mode=category" },
      { label: "Client", href: "/work?mode=client" },
    ],
  },
  {
    label: "Services",
    href: "#services",
    links: [] as { label: string; href: string }[],
  },
  {
    label: "Studio",
    href: "/studio",
    links: [] as { label: string; href: string }[],
  },
  {
    label: "Let's chat",
    href: "/contact",
    links: [
      { label: "Join us", href: "/careers" },
      { label: "Instagram", href: "https://www.instagram.com/pixelwave_studio/" },
      { label: "YouTube", href: "https://www.youtube.com/@PixelWaveStudio" },
      { label: "LinkedIn", href: "https://www.linkedin.com/company/pixelwavestudio/" },
    ],
  },
]

// The mobile takeover's own clip-path exit transition (see its
// motion.transition below) — shared so the header's orange background can
// be timed to match it exactly, in both places, from one source of truth.
const MOBILE_NAV_EXIT_S = 0.45

export function Header() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [onDark, setOnDark] = useState(true)
  // Mirrors `open`, except on close it stays true for MOBILE_NAV_EXIT_S
  // longer — long enough for .nav__mobile's own curtain-retract to finish —
  // via a plain timer rather than AnimatePresence's onExitComplete. A real
  // iOS Safari device was observed leaving .nav__mobile mounted (invisible,
  // clipped to nothing) indefinitely after closing, presumably because its
  // exit animation's completion never resolved there; when the header's
  // orange background was tied to that panel's DOM presence (`:has()`), the
  // bar stayed orange forever until a full page reload. A fixed timer always
  // clears regardless of whether the panel's own exit ever reports done.
  const [mobileBarOrange, setMobileBarOrange] = useState(false)
  const mobileBarTimeoutRef = useRef<number>(undefined)
  const themeColorDefaultRef = useRef<string | null>(null)
  // mobileBarOrange flips true whenever `open` does, on every viewport —
  // its own CSS effect (the orange bar) only actually shows under 768px,
  // gated by a media query there instead of here. The logo-hiding effect
  // below needs the same "narrow enough for the full-screen mobile panel"
  // check explicitly, since aria-hidden/tabIndex have no CSS-media-query
  // equivalent — without this the logo would go aria-hidden and keyboard-
  // unreachable on desktop too, despite staying visibly on screen there
  // (the desktop nav is a small dropdown, not a takeover panel covering it).
  const screenSize = useScreenSize()
  const hideLogo = mobileBarOrange && screenSize.lessThan("md")
  const lastY = useRef(0)
  const headerRef = useRef<HTMLElement>(null)
  const scrollLockedRef = useRef(false)
  const prevOverflowRef = useRef("")
  const prevPaddingRightRef = useRef("")
  const { scrollY } = useScroll()
  const vh = typeof window !== "undefined" ? window.innerHeight : 900
  const { pathname } = useLocation()
  const isHome = pathname === "/"
  // Off the homepage there's no hero-mark to hand off from, so the logo is
  // just always visible, and the nav hides on scroll-down almost immediately.
  const homeHref = (hash: string) => (isHome ? hash : `/${hash}`)

  // Path hrefs and real in-page anchors (with the cross-page homeHref
  // treatment) both get client-side routing — a plain <a> to "/#services"
  // from another page would trigger a full page reload, and the browser's
  // native on-load hash-scroll fires before this SPA's home route has
  // actually rendered anything with that id, silently landing at the top
  // instead of the section (see ScrollToTop, which does the actual
  // scrolling once <Link> lands us on the right route/hash). Bare "#"
  // placeholders (not wired to a real target yet) stay a plain, inert <a>.
  const renderLink = (href: string, label: string, key: string, className: string, onClick: () => void) => {
    if (href === "#") {
      return (
        <a key={key} className={className} href={href} onClick={onClick}>
          {label}
        </a>
      )
    }
    const to = href.startsWith("/") ? href : homeHref(href)
    return (
      <Link key={key} className={className} to={to} onClick={onClick}>
        {label}
      </Link>
    )
  }

  // The custom cursor dot is brand-orange and would vanish over this same
  // orange panel — flag it on the root element so CustomCursor's CSS (which
  // has no other way to know the panel is open, it's a sibling not a
  // descendant) can swap its color while the panel is up.
  useEffect(() => {
    document.documentElement.classList.toggle("nav-open", open)
  }, [open])

  useEffect(() => {
    if (mobileBarTimeoutRef.current) window.clearTimeout(mobileBarTimeoutRef.current)
    if (open) {
      setMobileBarOrange(true)
    } else {
      mobileBarTimeoutRef.current = window.setTimeout(() => {
        setMobileBarOrange(false)
        // The same unreliable-exit-callback problem mobileBarOrange itself
        // works around (see above) can also leave the page's scroll lock on;
        // releaseScrollLock() is a no-op if onExitComplete already handled it.
        releaseScrollLock()
        // Confirmed live on a real iPhone: iOS Safari only repaints the
        // status-bar/Dynamic-Island tint over the safe area on an actual
        // scroll event — the theme-color change above and the header's own
        // background change do NOT trigger it, so that strip stayed orange
        // indefinitely without this. A 1px nudge and back forces the repaint
        // with no visible movement.
        const y = window.scrollY
        window.scrollTo(0, y + 1)
        window.scrollTo(0, y)
      }, MOBILE_NAV_EXIT_S * 1000)
    }
    return () => {
      if (mobileBarTimeoutRef.current) window.clearTimeout(mobileBarTimeoutRef.current)
    }
  }, [open])

  // A screen recording on a real iPhone showed the header's own background
  // reverting correctly (confirmed via the DOM/CSS above), but iOS Safari's
  // status-bar/Dynamic Island tint itself stayed orange indefinitely after
  // that — it only seems to re-sample the page's content color on certain
  // triggers (e.g. a scroll), not on an ordinary class/background change.
  // Updating the theme-color meta tag directly gives it an explicit,
  // immediate signal instead of relying on that sampling.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    if (themeColorDefaultRef.current === null) {
      themeColorDefaultRef.current = meta.getAttribute("content") ?? "#000000"
    }
    meta.setAttribute("content", mobileBarOrange ? "#FF5B00" : themeColorDefaultRef.current)
  }, [mobileBarOrange])

  // Both menus are fixed overlays now (desktop's dropdown panel, mobile's
  // full-screen takeover), so page scroll is locked behind either one.
  // Releasing the lock happens in releaseScrollLock (called from each
  // AnimatePresence's onExitComplete below), NOT in this effect's own
  // cleanup — the exit animation runs for a few hundred ms after `open`
  // already flips to false, and restoring the scrollbar that early snapped
  // the still-visible, still-animating panel's width mid-transition.
  useEffect(() => {
    if (!open) return
    if (!scrollLockedRef.current) {
      // Locking overflow removes the scrollbar, widening the layout viewport.
      // Body's own in-flow content is compensated the standard way (padding
      // matching the vanished scrollbar's width), but position:fixed elements
      // (header, .nav__panel) ignore body padding — they read the same width
      // via the --scroll-comp CSS var instead (index.css), so both cancel the
      // widening and stay pinned in place, in lockstep with each other.
      prevOverflowRef.current = document.body.style.overflow
      prevPaddingRightRef.current = document.body.style.paddingRight
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = "hidden"
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
        document.documentElement.style.setProperty("--scroll-comp", `${scrollbarWidth}px`)
      }
      scrollLockedRef.current = true
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    // The panel doesn't cover the full viewport (it hugs its own content
    // height), so anywhere below/beside it is still "the page" as far as
    // clicks go — close on any click landing outside the header itself.
    // The trigger button that opened it lives inside headerRef too, so its
    // own click isn't seen as "outside" and doesn't fight the toggle.
    const onClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onClickOutside)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onClickOutside)
    }
  }, [open])

  function releaseScrollLock() {
    if (!scrollLockedRef.current) return
    document.body.style.overflow = prevOverflowRef.current
    document.body.style.paddingRight = prevPaddingRightRef.current
    document.documentElement.style.setProperty("--scroll-comp", "0px")
    scrollLockedRef.current = false
  }

  // Same HERO_REVEAL_START/END window as Hero's own revealProgress and
  // WorkReel's video iris — independently computed here off the identical
  // shared constants so it tracks frame-by-frame instead of just "eventually."
  const revealProgress = useTransform(scrollY, [vh * HERO_REVEAL_START, vh * HERO_REVEAL_END], [0, 1])
  const heroLogoOpacity = useTransform(revealProgress, [HERO_CROSSFADE_RATIO, 1], [0, 1])

  // Header never unmounts across route changes, so `onDark`'s guess only ever
  // updates via scroll events otherwise — stale (wrong) on first load, and on
  // every client-side navigation between two pages of the same isHome-ness
  // (e.g. /work -> /contact never toggles isHome, so that alone can't be the
  // dependency) unless a scroll happens to fire in between. Keyed on the full
  // pathname instead so it re-samples on every route change.
  useLayoutEffect(() => {
    const sample = () => {
      const behind = document.elementFromPoint(window.innerWidth / 2, 90)
      setOnDark(!!behind?.closest('[data-theme="dark"]'))
    }
    sample()
    // A link clicked from inside the full-panel menu navigates almost
    // immediately, but the panel itself (data-theme="dark") takes 0.5s to
    // exit-animate away — if it's still covering the sample point right now,
    // this first read is a false positive that would otherwise stick until
    // the next scroll. Re-sample once the exit transition has definitely
    // finished to correct for that.
    const t = setTimeout(sample, 550)
    return () => clearTimeout(t)
  }, [pathname])

  useMotionValueEvent(scrollY, "change", (latest) => {
    // Later than HERO_DOCK_END on purpose — gives the just-docked logo a beat
    // to sit still before scroll-down auto-hide is allowed to kick in.
    const heroThreshold = isHome ? window.innerHeight * HERO_NAV_HIDE_AFTER : 80
    const scrollingDown = latest > lastY.current
    lastY.current = latest

    setHidden(latest < heroThreshold ? false : scrollingDown)
    if (open) setOpen(false)

    // Sample just below the nav bar to see which section is actually behind it.
    const behind = document.elementFromPoint(window.innerWidth / 2, 90)
    setOnDark(!!behind?.closest('[data-theme="dark"]'))
  })

  return (
    <motion.header
      ref={headerRef}
      className={`nav ${mobileBarOrange ? "nav--open" : ""}`}
      data-theme={onDark ? "dark" : "light"}
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.4, ease: EASE_WAVE }}
    >
      <div className="wrap nav__inner">
        <a
          href={isHome ? "#top" : "/"}
          // Hidden while the full-screen mobile menu is open — tied to
          // mobileBarOrange (via hideLogo) rather than the raw `open` boolean
          // so it stays hidden through the panel's own close animation too,
          // matching how long the bar itself stays solid orange (see
          // mobileBarOrange's own comment above), instead of popping back in
          // while the bar is still mid-retract.
          className={`nav__logo${hideLogo ? " nav__logo--hidden" : ""}`}
          aria-label="PixelWave home"
          aria-hidden={hideLogo}
          tabIndex={hideLogo ? -1 : undefined}
          // Native hash-anchor scrolling landed short of the true top when
          // clicked from partway down the page — WorkReel's pinned section
          // (.reel__inner, position: sticky over an 850vh-tall .reel) sits
          // between here and #top, and the browser's own smooth-scroll-to-
          // anchor doesn't reliably run to completion when a sticky/pinned
          // ancestor's layout shifts mid-scroll (it was consistently
          // stopping right at HERO_REVEAL_END, exactly where that pin's
          // fixed reveal overlay hands off). A direct scrollTo(0) has no
          // such dependency on the target element's own position.
          onClick={
            isHome
              ? (e) => {
                  e.preventDefault()
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }
              : undefined
          }
        >
          {/* Separate elements rather than one swapping opacity between a
              MotionValue (home) and a plain number (elsewhere) — framer-motion
              doesn't reliably pick up that type change on the same element,
              so the logo could get stuck at the home page's last hero-crossfade
              opacity after navigating away. */}
          {isHome ? (
            <motion.span style={{ opacity: heroLogoOpacity, display: "inline-block" }}>
              <BrandLogo height={26} invert={onDark} />
            </motion.span>
          ) : (
            <span style={{ display: "inline-block" }}>
              <BrandLogo height={26} invert={onDark} />
            </span>
          )}
        </a>

        <div className="nav__menu-btn">
          <PixelTrail
            pixelSize={10}
            fadeDuration={600}
            className="nav__menu-btn-grid"
            pixelClassName="nav__menu-btn-pixel"
          />
          <InteractiveHoverButton
            text={open ? "Close" : "Menu"}
            icon={open ? <X size={16} /> : <Menu size={16} />}
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative z-10 border-none bg-transparent text-foreground"
            onClick={() => setOpen((v) => !v)}
          />
        </div>
      </div>

      <AnimatePresence onExitComplete={releaseScrollLock}>
        {open && (
          <motion.div
            key="nav-panel"
            className="nav__panel"
            data-theme="dark"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_WAVE }}
          >
            <div className="wrap nav__panel-grid">
              {MENU_COLUMNS.map((col) => (
                <div className="nav__panel-col" key={col.label}>
                  {renderLink(col.href, col.label, col.label, "nav__panel-heading", () => setOpen(false))}
                  {col.links.length > 0 && (
                    <div className="nav__panel-sublinks">
                      {col.links.map((l, i) =>
                        renderLink(l.href, l.label, `${col.label}-${i}`, "nav__panel-sublink", () =>
                          setOpen(false)
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={releaseScrollLock}>
        {open && (
          <motion.div
            key="nav-mobile"
            className="nav__mobile md:hidden"
            // clip-path, not scaleY like the desktop panel's own "window
            // shade" — scaling a full-height box with real text content
            // would visibly squash/stretch the words as it grows/shrinks;
            // clipping reveals the fully-rendered panel progressively
            // instead, top-down like a curtain, with zero text distortion.
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: MOBILE_NAV_EXIT_S, ease: EASE_WAVE }}
          >
            <div className="nav__mobile-links">
              {/* Same MENU_COLUMNS data as the desktop panel (Join us/
                  Instagram/YouTube/LinkedIn under "Let's chat"), just stacked
                  in one column instead of desktop's side-by-side ones —
                  "Let's chat" reads as a plain heading like Work/Services/
                  Studio now, not a standalone button. */}
              {MENU_COLUMNS.map((col) => (
                <div className="nav__mobile-group" key={col.label}>
                  {renderLink(col.href, col.label, col.label, "nav__link", () => setOpen(false))}
                  {col.links.length > 0 && (
                    <div className="nav__mobile-sublinks">
                      {col.links.map((l, i) =>
                        renderLink(l.href, l.label, `${col.label}-${i}`, "nav__mobile-sublink", () =>
                          setOpen(false)
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
