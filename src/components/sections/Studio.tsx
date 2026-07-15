import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Counter } from "@/components/motion/Counter"
import { useScreenSize } from "@/components/hooks/use-screen-size"

const STATS = [
  { value: 40, suffix: "+", label: "Projects shipped" },
  { value: 98, suffix: "%", label: "Client satisfaction" },
  { value: 6, suffix: "", label: "Disciplines, one studio" },
]

function StatRow({
  stat,
  index,
  total,
  progress,
}: {
  stat: (typeof STATS)[number]
  index: number
  total: number
  progress: MotionValue<number>
}) {
  const start = index / total
  const end = (index + 0.7) / total
  // Callback-form useTransform, not the array-range form — matches the
  // established workaround for framer-motion v12's array-range
  // hardware-acceleration bug when several siblings derive different ranges
  // off the same shared progress value (see Services.tsx's ServiceRow).
  const scaleX = useTransform(progress, (v) => Math.min(1, Math.max(0, (v - start) / (end - start))))

  return (
    <div className="stat stat--scrubbed">
      <motion.span className="stat__rule" style={{ scaleX }} />
      <span className="stat__label">{stat.label}</span>
      <span className="stat__num">
        <Counter value={stat.value} suffix={stat.suffix} />
      </span>
    </div>
  )
}

/** Desktop: each stat row's divider rule draws in left-to-right, scrubbed by
 *  scroll position through the section — not a pinned section like WorkReel/
 *  Services, just a local (non-pinned) scroll-linked progress value, same
 *  mechanism as WorkAmbient's mobile drift in Work.tsx. */
function StudioScrubbed() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.75", "start 0.15"],
  })

  return (
    <section id="studio" className="sec sec--tint" data-screen-label="Studio" ref={sectionRef}>
      <div className="wrap studio__grid">
        <div>
          <Reveal>
            <SectionLabel number="02">Studio</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="studio__statement">
              We're a small team that treats every pixel like it matters — pairing{" "}
              <span className="accent-orange">precise craft</span> with{" "}
              <span className="accent-cyan">fluid momentum</span> to ship work that feels
              considered, not templated.
            </p>
          </Reveal>
        </div>

        <div className="studio__stats studio__stats--scrubbed">
          {STATS.map((s, i) => (
            <StatRow key={s.label} stat={s} index={i} total={STATS.length} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  )
}

/** Mobile/tablet: plain trigger-once fade/rise, same as every other ambient
 *  variant on the site — pinned/scrubbed scroll reads as janky at that size. */
function StudioAmbient() {
  return (
    <section id="studio" className="sec sec--tint" data-screen-label="Studio">
      <div className="wrap studio__grid">
        <div>
          <Reveal>
            <SectionLabel number="02">Studio</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="studio__statement">
              We're a small team that treats every pixel like it matters — pairing{" "}
              <span className="accent-orange">precise craft</span> with{" "}
              <span className="accent-cyan">fluid momentum</span> to ship work that feels
              considered, not templated.
            </p>
          </Reveal>
        </div>

        <RevealGroup className="studio__stats">
          {STATS.map((s) => (
            <RevealItem className="stat" key={s.label}>
              <span className="stat__label">{s.label}</span>
              <span className="stat__num">
                <Counter value={s.value} suffix={s.suffix} />
              </span>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

export function Studio() {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")

  return isDesktop ? <StudioScrubbed /> : <StudioAmbient />
}
