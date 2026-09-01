# Studio stats section — design spec

**Date:** 2026-09-01
**Status:** Approved, pending implementation

## Summary

Replace the Studio page's opening section — currently a single centered
sentence (`StudioIntro.tsx`) — with an animated stats section: a numbered
eyebrow label, two count-up numbers (**14 People**, **2 Floors**), and the
punchier remnant of the old copy as a smaller trailing line. The numbers
animate from 0 to their value once scrolled into view. This replaces the
section's whole concept, not just its typography — worked out via an
interactive mockup (a live, working count-up demo) that the user approved
as "final word, no changes."

## What does NOT change

- The section's position on the page: still the first section on `/studio`,
  right after the header, before `StudioTeam`.
- The empty spacer above it (today `.studio-intro__hero`, height `50svh`)
  that centers the section at the viewport's vertical midpoint — same role
  as `WorkPage`'s own hero spacer, kept as-is (not part of the complaint).
- The ambient `CursorGlow` dot-grid background.
- `StudioTeam.tsx`, `StudioGallery.tsx` — untouched.

## File changes

- **Delete:** `src/components/sections/StudioIntro.tsx`
- **Create:** `src/components/sections/StudioStats.tsx`
- **Modify:** `src/pages/StudioPage.tsx` (swap the import/usage)
- **Modify:** `src/index.css` (remove `.studio-intro*` rules, add
  `.studio-stats*` rules)

## Component: `StudioStats.tsx`

```tsx
import { useState } from "react"
import { animate, motion, useMotionValue, useMotionValueEvent } from "framer-motion"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Reveal } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { EASE_WAVE } from "@/lib/motion"
import { TEAM } from "@/data/team"

// Set once at module load, not per-render — matches the codebase's existing
// window.matchMedia usage (e.g. Work.tsx's "(pointer: coarse)" check).
const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

interface StatBlockProps {
  value: number
  label: string
  accent?: boolean
  delay: number
}

/** Counts up from 0 to `value` once scrolled into view, staggered by `delay`.
 *  Skips straight to the final value under prefers-reduced-motion instead of
 *  forcing the count-up on people who've asked their OS to reduce motion. */
function StatBlock({ value, label, accent, delay }: StatBlockProps) {
  const count = useMotionValue(PREFERS_REDUCED_MOTION ? value : 0)
  const [display, setDisplay] = useState(count.get())
  useMotionValueEvent(count, "change", (v) => setDisplay(Math.round(v)))

  return (
    <motion.div
      className="studio-stats__stat"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, delay, ease: EASE_WAVE }}
      onViewportEnter={() => {
        if (PREFERS_REDUCED_MOTION) return
        animate(count, value, { duration: 0.9, delay, ease: [0.16, 0.84, 0.44, 1] })
      }}
    >
      <span className={accent ? "studio-stats__value studio-stats__value--accent" : "studio-stats__value"}>
        {display}
      </span>
      <span className="studio-stats__caption">{label}</span>
    </motion.div>
  )
}

export function StudioStats() {
  return (
    <section className="studio-stats" data-theme="dark" data-screen-label="Studio Stats">
      <CursorGlow className="cursor-glow" variant="dark" glow />
      <div className="studio-stats__hero" aria-hidden="true" />
      <div className="wrap">
        <Reveal>
          <SectionLabel number="01">The studio</SectionLabel>
        </Reveal>
        <div className="studio-stats__row">
          <StatBlock value={TEAM.length} label="People" delay={0.1} />
          <StatBlock value={2} label="Floors" accent delay={0.35} />
          <motion.p
            className="studio-stats__tail"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.9, ease: EASE_WAVE }}
          >
            No open-plan pretending, no ping-pong table. Just a place built for the work.
          </motion.p>
        </div>
      </div>
    </section>
  )
}
```

Notes on specific choices:

- **`value={TEAM.length}` for "People", not a hardcoded `14`.** `StudioTeam.tsx`
  already renders one card per `TEAM` entry — deriving the stat from the same
  array means it can never drift out of sync with the team grid immediately
  below it. "Floors" has no equivalent data source (it's a physical fact
  about the studio, not derived data), so it stays a literal `2`.
- **The accent (orange) stat is "Floors", not "People"** — matches the
  approved mockup exactly.
- **The eyebrow gets its own `<Reveal>`**, matching the pattern every other
  section's `SectionLabel` already uses (`WorkHeading`, `StudioGalleryHeading`)
  rather than appearing instantly on mount with no transition.
- **`animate()` is framer-motion's imperative API** (`import { animate } from
  "framer-motion"`) — not used anywhere else in this codebase yet, but it's a
  standard, stable part of the installed `framer-motion@^12.42.2`, and this
  is the simplest correct way to drive a numeric tween from an
  `onViewportEnter` callback (no need for a `useEffect` + cleanup timer).

## CSS changes (`src/index.css`)

Remove the existing `.studio-intro`, `.studio-intro__hero`,
`.studio-intro__line`, `.studio-intro__word`, `.studio-intro__word:hover`
rules. Add:

```css
.studio-stats { position: relative; isolation: isolate; padding-bottom: clamp(2rem, 4vw, 3rem); color: var(--pw-white); }
.studio-stats__hero { height: 50svh; }
.studio-stats__row { display: flex; align-items: flex-end; flex-wrap: wrap; gap: clamp(2.5rem, 5vw, 4rem); margin-top: 2rem; }
.studio-stats__stat { display: flex; flex-direction: column; }
.studio-stats__value { font-family: var(--font-display); font-weight: var(--fw-black); font-size: clamp(3.5rem, 7vw, 6rem); line-height: 1; letter-spacing: -0.03em; }
.studio-stats__value--accent { color: var(--pw-orange); }
.studio-stats__caption { font-family: var(--font-mono-accent); font-size: 0.85rem; letter-spacing: 0.04em; text-transform: uppercase; color: rgba(255, 255, 255, 0.55); margin-top: 0.75rem; }
.studio-stats__tail { font-family: var(--font-display); font-size: 1.1rem; line-height: 1.5; color: rgba(255, 255, 255, 0.55); max-width: 32ch; margin: 0 0 0 auto; }
@media (max-width: 767px) {
  .studio-stats__tail { margin-left: 0; }
}
```

`color: var(--pw-white)` on `.studio-stats` is required, not optional: a
prior bug on this exact page (`.studio-gallery`, fixed in commit `768ba8c`)
showed that `[data-theme="dark"]` only redefines the `--text-primary`
custom property — it does not redeclare `color` itself — so any text
without its own explicit `color` would otherwise inherit the light-theme
root's concrete black and render invisible against this section's black
background. `.studio-stats__value`/`__tail` have no color of their own, so
this container-level declaration is what makes them visible.

## `StudioPage.tsx`

```tsx
import { StudioStats } from "@/components/sections/StudioStats"
import { StudioTeam } from "@/components/sections/StudioTeam"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  return (
    <>
      <main className="studio-page" data-theme="dark">
        <StudioStats />
        <StudioTeam />
      </main>
      <Footer />
    </>
  )
}
```

(Read the file first to confirm it still matches this shape before editing —
it may have changed since this spec was written.)

## Out of scope

- Any change to `StudioTeam.tsx`, `StudioGallery.tsx`, or their data.
- A third stat (e.g. project count, client count) — only the two facts the
  original sentence stated are carried over.
- Changing the `50svh` spacer's height or removing it.
- A shared/reusable "AnimatedStat" component elsewhere on the site — this
  is scoped to the Studio page's own section only; nothing else on the site
  currently needs a count-up stat.
