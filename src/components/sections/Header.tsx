import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { Link, useLocation } from "react-router-dom"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/pw/Button"
import { InteractiveHoverButton } from "@/components/pw/InteractiveHoverButton"
import { BrandLogo } from "@/components/pw/Logo"
import { PixelTrail } from "@/components/ui/pixel-trail"
import { EASE_WAVE, HERO_CROSSFADE_RATIO, HERO_NAV_HIDE_AFTER, HERO_REVEAL_END, HERO_REVEAL_START } from "@/lib/motion"
import { SERVICES } from "@/data/services"
import { PROJECTS } from "@/data/work"

// "Work" goes to the dedicated /work page (like the carousel's "All projects"
// button); the rest are in-page anchors on the homepage.
const links = [
  { label: "Work", href: "/work" },
  { label: "Services", href: "#services" },
  { label: "Studio", href: "/studio" },
]

// Desktop-only full menu panel — columns mirror the top-level nav, filled
// out with a level of real sub-navigation (mirrors a reference layout).
const FEATURED_WORK = PROJECTS.filter((p) => p.tags.some(([variant]) => variant === "orange"))
const MENU_COLUMNS = [
  {
    label: "Work",
    href: "/work",
    links: FEATURED_WORK.map((p) => ({ label: p.title, href: `/work/${p.slug}` })),
  },
  {
    label: "Services",
    href: "#services",
    links: SERVICES.map((s) => ({ label: s.name, href: "#services" })),
  },
  {
    label: "Studio",
    href: "/studio",
    links: [] as { label: string; href: string }[],
  },
  {
    label: "Contact",
    href: "/contact",
    links: [
      { label: "Instagram", href: "#" },
      { label: "Tiktok", href: "#" },
      { label: "LinkedIn", href: "#" },
    ],
  },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [onDark, setOnDark] = useState(true)
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

  // Path hrefs get client-side routing; real in-page anchors get the
  // cross-page homeHref treatment; bare "#" placeholders stay as-is.
  const renderLink = (href: string, label: string, key: string, className: string, onClick: () => void) => {
    if (href.startsWith("/")) {
      return (
        <Link key={key} className={className} to={href} onClick={onClick}>
          {label}
        </Link>
      )
    }
    return (
      <a key={key} className={className} href={href === "#" ? href : homeHref(href)} onClick={onClick}>
        {label}
      </a>
    )
  }

  // The custom cursor dot is brand-orange and would vanish over this same
  // orange panel — flag it on the root element so CustomCursor's CSS (which
  // has no other way to know the panel is open, it's a sibling not a
  // descendant) can swap its color while the panel is up.
  useEffect(() => {
    document.documentElement.classList.toggle("nav-open", open)
  }, [open])

  // The full-panel menu is a fixed overlay, so lock page scroll while it's
  // open on desktop (mobile's dropdown stays in normal flow, no lock needed).
  // Releasing the lock happens in releaseScrollLock (called from
  // AnimatePresence's onExitComplete below), NOT in this effect's own
  // cleanup — the exit animation runs for 0.5s after `open` already flips to
  // false, and restoring the scrollbar that early snapped the still-visible,
  // still-animating panel's width mid-transition.
  useEffect(() => {
    if (!open) return
    const isDesktop = window.innerWidth >= 768
    if (isDesktop && !scrollLockedRef.current) {
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
      className={`nav ${open ? "nav--open" : ""}`}
      data-theme={onDark ? "dark" : "light"}
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.4, ease: EASE_WAVE }}
    >
      <div className="wrap nav__inner">
        <a href={isHome ? "#top" : "/"} aria-label="PixellWave home">
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

        <div className="nav__menu-btn hidden md:block">
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

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          className={`cursor-pointer md:hidden ${onDark ? "text-white" : "text-black"}`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
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

      {open && (
        <div className="nav__mobile wrap flex flex-col gap-5 py-6 md:hidden">
          {links.map((link) =>
            renderLink(link.href, link.label, link.href, "nav__link text-base", () => setOpen(false))
          )}
          <Button
            variant="primary"
            size="sm"
            href="/contact"
            onClick={() => setOpen(false)}
            className="w-fit"
          >
            Let's talk
          </Button>
        </div>
      )}
    </motion.header>
  )
}
