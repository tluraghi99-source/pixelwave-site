import { useRef, useState } from "react"
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/pw/Button"
import { BrandLogo } from "@/components/pw/Logo"
import { EASE_WAVE } from "@/lib/motion"

const links = [
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Studio", href: "#studio" },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [onDark, setOnDark] = useState(true)
  const lastY = useRef(0)
  const { scrollY } = useScroll()
  const vh = typeof window !== "undefined" ? window.innerHeight : 900

  // Picks up the hand-off from the hero's big mark as it shrinks away.
  const logoOpacity = useTransform(scrollY, [vh * 0.35, vh * 0.85], [0, 1])
  const logoScale = useTransform(scrollY, [vh * 0.35, vh * 0.85], [0.6, 1])

  useMotionValueEvent(scrollY, "change", (latest) => {
    const heroThreshold = window.innerHeight * 0.85
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
      className="nav"
      data-theme={onDark ? "dark" : "light"}
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.4, ease: EASE_WAVE }}
    >
      <div className="wrap nav__inner">
        <a href="#top" aria-label="PixellWave home">
          <motion.span
            style={{ opacity: logoOpacity, scale: logoScale, display: "inline-block" }}
          >
            <BrandLogo height={26} invert={!onDark} />
          </motion.span>
        </a>

        <nav className="hidden items-center gap-9 md:flex">
          {links.map((link) => (
            <a key={link.href} className="nav__link" href={link.href}>
              {link.label}
            </a>
          ))}
          <Button variant="primary" size="sm" href="#contact">
            Let's talk
          </Button>
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          className={`cursor-pointer md:hidden ${onDark || open ? "text-white" : "text-black"}`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="nav__mobile wrap flex flex-col gap-5 py-6 md:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              className="nav__link text-base"
              href={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Button
            variant="primary"
            size="sm"
            href="#contact"
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
