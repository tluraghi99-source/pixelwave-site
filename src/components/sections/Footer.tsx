import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { FitText } from "@/components/motion/FitText"
import { InteractiveHoverButton } from "@/components/pw/InteractiveHoverButton"
import { useScreenSize } from "@/components/hooks/use-screen-size"

const SOCIALS = [
  { label: "Instagram", href: "#" },
  { label: "Tiktok", href: "#" },
  { label: "LinkedIn", href: "#" },
]

export function Footer() {
  const footerRef = useRef<HTMLElement>(null)
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  // Footer is the last element on the page, so the range has to be reachable
  // within the page's actual max scroll — "start end" → "end end" completes
  // exactly at natural scroll-end (footer's own bottom hitting the viewport
  // bottom) instead of a fixed viewport-fraction range that could require
  // more scroll distance than exists past the last element on the page.
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"],
  })
  const clipRight = useTransform(scrollYProgress, [0, 1], ["100%", "0%"])
  const clipPath = useTransform(clipRight, (v) => `inset(0 ${v} 0 0)`)

  return (
    <footer data-screen-label="Footer" ref={footerRef}>
      <div className="wrap foot__row">
        <Reveal className="foot__addr">
          <span>Milano, Italia</span>
        </Reveal>

        <RevealGroup className="foot__social" stagger={0.06}>
          {SOCIALS.map((s) => (
            <RevealItem key={s.label}>
              <a className="foot__social-link" href={s.href}>
                {s.label}
              </a>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal className="foot__cta-wrap" delay={0.1}>
          <InteractiveHoverButton text="Let's chat" href="/contact" scramble={false} />
        </Reveal>
      </div>

      {isDesktop ? (
        <motion.div style={{ clipPath }}>
          <FitText
            text="YourVisionOurWave"
            className="foot__giant"
            textClassName="foot__giant-text"
            aria-hidden="true"
          />
        </motion.div>
      ) : (
        <FitText
          text="YourVisionOurWave"
          className="foot__giant"
          textClassName="foot__giant-text"
          aria-hidden="true"
        />
      )}
    </footer>
  )
}
