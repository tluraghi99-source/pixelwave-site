import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { useScreenSize } from "@/components/hooks/use-screen-size"

// Bright lines read as the primary statement; mid/dim lines are de-emphasized
// supporting copy — matches the wireframe's white-to-grey graduated look.
// This color weight is permanent; the reveal itself (below) is separate.
const INTRO_LINES = [
  { text: "We're fourteen people", tone: "bright" },
  { text: "working out of two floors —", tone: "bright" },
  { text: "no open-plan pretending, no ping-pong table.", tone: "mid" },
  { text: "Just a place built for the work.", tone: "dim" },
] as const

function IntroLine({
  line,
  index,
  total,
  progress,
}: {
  line: (typeof INTRO_LINES)[number]
  index: number
  total: number
  progress: MotionValue<number>
}) {
  // Each line claims a slice of the section's own scroll progress, sized
  // evenly by line count — same shape as the old Studio section's stat rows
  // and Services' original scroll-scrubbed rows. Callback-form useTransform,
  // not array-range: several sibling lines derive different ranges off the
  // same shared progress value here, which is exactly the case that trips
  // framer-motion v12's array-range hardware-acceleration bug elsewhere in
  // this codebase (see WorkReel.tsx/Services.tsx's own comments on this).
  const start = index / total
  const end = (index + 0.7) / total
  const opacity = useTransform(progress, (v) => Math.min(1, Math.max(0, (v - start) / (end - start))))
  const y = useTransform(progress, (v) => 32 * (1 - Math.min(1, Math.max(0, (v - start) / (end - start)))))

  return (
    <motion.p className={`studio-intro__line studio-intro__line--${line.tone}`} style={{ opacity, y }}>
      {line.text}
    </motion.p>
  )
}

/** Desktop: scroll-scrubbed, not pinned — the section scrolls past normally,
 *  but each line's reveal progress is driven by scroll position through the
 *  section rather than firing once on viewport-enter. */
function StudioIntroScrubbed() {
  const sectionRef = useRef<HTMLElement>(null)
  // This section sits at the very top of the page (no hero/runway above it
  // on /studio), so a viewport-entry offset like ["start 0.8","start 0.2"]
  // resolves to fully-revealed before the user ever scrolls — there's no
  // distance to scrub through before it's already "entered." Using the
  // section's own height as the scrub distance instead (progress 0 at its
  // top, 1 once its bottom reaches the viewport top) gives it real runway.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] })

  return (
    <section className="studio-intro" data-theme="dark" data-screen-label="Studio Intro" ref={sectionRef}>
      <div className="grain-overlay" aria-hidden="true" />
      <div className="wrap">
        {INTRO_LINES.map((line, i) => (
          <IntroLine key={line.text} line={line} index={i} total={INTRO_LINES.length} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  )
}

/** Mobile/tablet: plain trigger-once fade/rise, same as every other ambient
 *  variant on the site — a scroll-scrub reads as janky at that size. */
function StudioIntroAmbient() {
  return (
    <section className="studio-intro" data-theme="dark" data-screen-label="Studio Intro">
      <div className="grain-overlay" aria-hidden="true" />
      <RevealGroup className="wrap" stagger={0.08}>
        {INTRO_LINES.map((line) => (
          <RevealItem key={line.text}>
            <p className={`studio-intro__line studio-intro__line--${line.tone}`}>{line.text}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  )
}

export function StudioIntro() {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  return isDesktop ? <StudioIntroScrubbed /> : <StudioIntroAmbient />
}
