import { useEffect, useRef, useState } from "react"
import type { AnimationPlaybackControls } from "framer-motion"
import { animate, motion, useMotionValue, useMotionValueEvent } from "framer-motion"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Reveal } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { EASE_WAVE } from "@/lib/motion"
import { useTeamMembers } from "@/hooks/useTeamMembers"

// Set once at module load, not per-render — matches the codebase's existing
// window.matchMedia usage (e.g. Work.tsx's "(pointer: coarse)" check).
const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

interface StatBlockProps {
  value: number
  label: string
  accent?: boolean
  delay: number
  /** Appended after the number, both animated and final (e.g. "+" for an
   *  open-ended "100+"). Not counted itself — only `value` animates. */
  suffix?: string
}

/** Counts up from 0 to `value` once scrolled into view, staggered by `delay`.
 *  Skips straight to the final value under prefers-reduced-motion instead of
 *  forcing the count-up on people who've asked their OS to reduce motion. */
function StatBlock({ value, label, accent, delay, suffix = "" }: StatBlockProps) {
  const count = useMotionValue(PREFERS_REDUCED_MOTION ? value : 0)
  const [display, setDisplay] = useState(count.get())
  const controlsRef = useRef<AnimationPlaybackControls | null>(null)
  const hasEnteredRef = useRef(false)
  useMotionValueEvent(count, "change", (v) => setDisplay(Math.round(v)))
  useEffect(() => {
    return () => controlsRef.current?.stop()
  }, [])

  // `value` can arrive asynchronously (e.g. People's team-member count, which
  // starts at 0 until the fetch resolves). If it changes after this stat has
  // already entered the viewport — whileInView only fires once — re-animate
  // (or, under reduced motion, jump) to the corrected value instead of
  // leaving the count-up stuck at whatever it was when data first arrived.
  useEffect(() => {
    if (!hasEnteredRef.current) return
    controlsRef.current?.stop()
    if (PREFERS_REDUCED_MOTION) {
      count.set(value)
      return
    }
    controlsRef.current = animate(count, value, { duration: 0.9, ease: [0.16, 0.84, 0.44, 1] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <motion.div
      className="studio-stats__stat"
      role="img"
      aria-label={`${value}${suffix} ${label}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, delay, ease: EASE_WAVE }}
      onViewportEnter={() => {
        hasEnteredRef.current = true
        if (PREFERS_REDUCED_MOTION) return
        // A stat with a small target (e.g. Floors=2) reaches its final
        // rounded value well before one with a large target (e.g. the
        // live People count) even with a later start delay — it needs far
        // less of the easing curve's progress to round to its integer.
        // Not a bug.
        controlsRef.current = animate(count, value, { duration: 0.9, delay, ease: [0.16, 0.84, 0.44, 1] })
      }}
    >
      <span className={accent ? "studio-stats__value studio-stats__value--accent" : "studio-stats__value"}>
        <span className="studio-stats__value-ghost" aria-hidden="true">{value}{suffix}</span>
        <span aria-hidden="true">{display}{suffix}</span>
      </span>
      <span aria-hidden="true" className="studio-stats__caption">{label}</span>
    </motion.div>
  )
}

export function StudioStats() {
  const teamMembers = useTeamMembers()

  return (
    <section className="studio-stats" data-theme="dark" data-screen-label="Studio Stats">
      <CursorGlow className="cursor-glow" variant="dark" glow />
      <div className="studio-stats__hero" aria-hidden="true" />
      <div className="wrap">
        <Reveal>
          <SectionLabel number="01">The studio</SectionLabel>
        </Reveal>
        <div className="studio-stats__row">
          <StatBlock value={teamMembers.length} label="People" delay={0.1} />
          <StatBlock value={2} label="Floors" accent delay={0.35} />
          <StatBlock value={100} label="Projects" suffix="+" delay={0.6} />
          <motion.p
            className="studio-stats__tail"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.9, ease: EASE_WAVE }}
          >
            A space where creativity has no boundaries.
            <br />
            And every idea has room to grow.
          </motion.p>
        </div>
      </div>
    </section>
  )
}
