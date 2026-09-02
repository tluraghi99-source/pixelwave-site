# Studio Stats Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Studio page's opening section (`StudioIntro`, a single centered sentence) with `StudioStats` — a numbered eyebrow label plus two count-up numbers (14 People, 2 Floors) that animate once scrolled into view, with a smaller trailing line carrying the old copy's punchier remnant.

**Architecture:** One new section component (`StudioStats.tsx`) replaces one deleted component (`StudioIntro.tsx`) in the same slot on `StudioPage.tsx`. Each stat is its own `motion.div` using framer-motion's `whileInView` (trigger-once, matching every other reveal on the site) combined with an `onViewportEnter` callback that starts an imperative `animate()` tween on a `useMotionValue`, rendered via React state kept in sync through `useMotionValueEvent`.

**Tech Stack:** React 19, TypeScript, Vite, `framer-motion@^12.42.2` (`motion`, `useMotionValue`, `useMotionValueEvent`, and the imperative `animate` function — first use of `animate` in this codebase, otherwise entirely standard APIs already used elsewhere here), Tailwind v4 (`src/index.css`). No test framework — verification is `npx tsc -b`, `npm run lint` (oxlint), and live checks via the Claude Browser preview tools against the Vite dev server (`.claude/launch.json`'s `pixellwave-dev` config, `/studio` route).

## Global Constraints

- The "People" stat's value is `TEAM.length` (from `@/data/team`), never a hardcoded `14` — it must never drift out of sync with the team grid rendered right below it in `StudioTeam`.
- The "Floors" stat is hardcoded `2` (no data source exists for it) and is the one rendered in the orange accent color — not "People".
- Numbers count up from 0 once the section scrolls into view; under `prefers-reduced-motion: reduce`, they must render at their final value immediately instead of animating.
- `.studio-stats` (the section's root) must have an explicit `color: var(--pw-white)` — `[data-theme="dark"]` only redefines the `--text-primary` custom property, it does not redeclare `color` itself, so text without its own explicit color would otherwise inherit the light-theme root's concrete black and render invisible (this exact bug was found and fixed on `.studio-gallery` in commit `768ba8c` — do not reintroduce it here).
- The section keeps its current position (first section on `/studio`, before `StudioTeam`), the existing `50svh` empty spacer above it, and the ambient `CursorGlow` background — none of that is part of this change.
- `src/index.css` has a large pre-existing UNRELATED uncommitted hunk (a `.work-page__*` title-wrapping fix, around line 854-903 in the current file) that must never be part of this task's commit.

---

### Task 1: Replace `StudioIntro` with `StudioStats`

**Files:**
- Delete: `src/components/sections/StudioIntro.tsx`
- Create: `src/components/sections/StudioStats.tsx`
- Modify: `src/pages/StudioPage.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `SectionLabel` (`@/components/pw/SectionLabel`, props `{ number?: string; children: ReactNode }`), `Reveal` (`@/components/motion/Reveal`, props `{ children; className?; delay?: number }`), `CursorGlow` (`@/components/motion/CursorGlow`, props `{ className?: string; variant?: "dark" | "light"; glow?: boolean }`), `EASE_WAVE` (`@/lib/motion`, an easing value usable as a framer-motion `transition.ease`), `TEAM` (`@/data/team`, an array — only `.length` is used here).
- Produces: `StudioStats` — a zero-prop named export (`export function StudioStats()`), matching `StudioIntro`/`StudioTeam`/`StudioGallery`'s style. `StudioPage.tsx` is the only consumer.

- [ ] **Step 1: Read `StudioPage.tsx` to confirm its current shape before editing**

Run: `grep -n "Studio" "src/pages/StudioPage.tsx"`

Expected output (if this doesn't match, stop and re-read the whole file —
something changed since this plan was written):
```
1:import { StudioIntro } from "@/components/sections/StudioIntro"
2:import { StudioTeam } from "@/components/sections/StudioTeam"
3:import { StudioGallery } from "@/components/sections/StudioGallery"
10:        <StudioIntro />
11:        <StudioTeam />
12:        <StudioGallery />
```

- [ ] **Step 2: Delete `StudioIntro.tsx`**

Run: `rm "src/components/sections/StudioIntro.tsx"`

- [ ] **Step 3: Create `src/components/sections/StudioStats.tsx`**

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

- [ ] **Step 4: Update `src/pages/StudioPage.tsx`**

Change:
```tsx
import { StudioIntro } from "@/components/sections/StudioIntro"
import { StudioTeam } from "@/components/sections/StudioTeam"
import { StudioGallery } from "@/components/sections/StudioGallery"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  return (
    <>
      <main className="studio-page" data-theme="dark">
        <StudioIntro />
        <StudioTeam />
        <StudioGallery />
      </main>
      <Footer />
    </>
  )
}
```

to:

```tsx
import { StudioStats } from "@/components/sections/StudioStats"
import { StudioTeam } from "@/components/sections/StudioTeam"
import { StudioGallery } from "@/components/sections/StudioGallery"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  return (
    <>
      <main className="studio-page" data-theme="dark">
        <StudioStats />
        <StudioTeam />
        <StudioGallery />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 5: Update `src/index.css`**

Remove this block (currently at lines 743-760):

```css
.studio-intro { position: relative; isolation: isolate; padding-bottom: clamp(2rem, 4vw, 3rem); }
/* Same role as WorkPage's .work-hero: an empty spacer pushing the real
   content down to start at the vertical midpoint of the viewport. */
.studio-intro__hero { height: 50svh; }
.studio-intro__line {
  font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em;
  font-size: clamp(2.5rem, 5.2vw, 5.5rem); line-height: 1.12; margin: 0;
  max-width: 46ch; margin-inline: auto; text-align: center;
  color: var(--pw-white);
}
/* Per-word hover instead of a static highlight — each word is its own
   inline span so :hover can target just that one, not the whole sentence. */
.studio-intro__word {
  transition: color 0.25s var(--ease-wave);
}
.studio-intro__word:hover {
  color: var(--pw-orange);
}
```

Replace it with:

```css
.studio-stats { position: relative; isolation: isolate; padding-bottom: clamp(2rem, 4vw, 3rem); color: var(--pw-white); }
/* Same role as WorkPage's .work-hero: an empty spacer pushing the real
   content down to start at the vertical midpoint of the viewport. */
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

Also update the stale cross-reference comment elsewhere in the same file
(near the project detail page rules, currently around line 946):

```css
/* project detail page */
/* Starts at the vertical midpoint of the viewport, same convention as
   .work-hero on /work and .studio-intro__hero on /studio. */
.project-page { padding-top: 50svh; background: var(--pw-black); color: var(--pw-white); }
```

to:

```css
/* project detail page */
/* Starts at the vertical midpoint of the viewport, same convention as
   .work-hero on /work and .studio-stats__hero on /studio. */
.project-page { padding-top: 50svh; background: var(--pw-black); color: var(--pw-white); }
```

**`src/index.css` has a pre-existing unrelated uncommitted hunk** (a
`.work-page__*` title-wrapping fix, around line 854-903 in the current
file) that must NOT be part of this commit. Before staging:

1. Do NOT run `git add src/index.css`, `git add -A`, or `git add .`.
2. Run `git diff -- src/index.css` and confirm you can see exactly two
   regions changed: your `.studio-intro*` → `.studio-stats*` block
   (around line 743) and the one-word comment fix (around line 946) — plus
   the pre-existing `.work-page__*` hunk you are NOT touching.
3. Use `git add -p src/index.css` and interactively stage only your two
   hunks, saying no to the `.work-page__*` hunk. (If `git add -p` isn't
   usable non-interactively, build a patch file containing just your
   hunks and apply it with `git apply --cached --check` then
   `git apply --cached`.)
4. Run `git diff --cached -- src/index.css` and confirm it shows ONLY
   your `.studio-stats*`/comment changes — nothing about
   `.work-page__head`/`.work-page__filters`/`.work-page__title`/
   `.work-page__mode-tab`.

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc -b`
Expected: no output, exit code 0.

Run: `npm run lint`
Expected: no errors reported for `src/components/sections/StudioStats.tsx`,
`src/pages/StudioPage.tsx`, or `src/index.css`. `StudioIntro.tsx` should no
longer appear anywhere (confirm with
`grep -rn "StudioIntro" src/` — expect no output).

- [ ] **Step 7: Live-verify on desktop**

Start the dev server (`preview_start` with `{"name": "pixellwave-dev"}`),
navigate to `/studio`.

Check via `read_page` or `javascript_tool`:
- The eyebrow reads "01" / "THE STUDIO" (rendered uppercase via
  `.pw-seclabel__text`'s CSS, source text is "The studio").
- Two stats are present: `document.querySelectorAll(".studio-stats__stat").length` → `2`.
- The "Floors" stat's value span has class `studio-stats__value--accent`;
  the "People" stat's does not.
- `getComputedStyle(document.querySelector(".studio-stats__value--accent")).color`
  → `rgb(255, 91, 0)` (the site's `--pw-orange`).
- `getComputedStyle(document.querySelector(".studio-stats__tail")).color` is
  a light/white-ish value, not black — confirms the container-level
  `color: var(--pw-white)` fix is in effect (this is the exact class of bug
  fixed in commit `768ba8c`; do not skip this check).

Check the count-up actually animates: reload the page (a fresh mount is
needed since `whileInView` with `once: true` only fires once), scroll the
`.studio-stats` section into view using the `computer` tool's real scroll
or `scrollIntoView` (disable `scroll-behavior: smooth` first — this site
sets it globally, and reading scroll-triggered state immediately after a
synchronous `scrollTo` in the same script sees stale pre-scroll values),
wait ~1 second for the ~0.9s tween plus stagger delay to finish, then read:
```js
[...document.querySelectorAll(".studio-stats__value")].map(el => el.textContent)
```
Expected: `["14", "2"]` once settled (immediately after scrolling into
view, before the animation finishes, at least one value should read
something less than its final number — confirm this with an earlier read
at ~200-300ms after scroll-into-view, to prove it's actually counting up
and not just snapping to the final value).

- [ ] **Step 8: Live-verify on mobile**

`resize_window` to `preset: "mobile"` (375×812), reload `/studio`.

Check via `read_page`/`javascript_tool`:
- The same eyebrow and two stats are present.
- `getComputedStyle(document.querySelector(".studio-stats__tail")).marginLeft`
  → `"0px"` (the mobile override is in effect, not the desktop `auto`).

Reset the viewport afterward: `resize_window` with `preset: "desktop"`.

- [ ] **Step 9: Note the one check that can't be done live**

`prefers-reduced-motion` is read once at module load
(`PREFERS_REDUCED_MOTION`), before any page script can toggle it — this
sandbox's browser tools have no way to emulate that media query before
initial script evaluation. Verify this constraint by code inspection
instead: confirm `StudioStats.tsx` reads `window.matchMedia("(prefers-reduced-motion: reduce)").matches`
once at module scope (not inside a component/effect) and both the
`useMotionValue`'s initial value and the `onViewportEnter` callback branch
on it correctly (skip `animate()` entirely when true, seed the motion
value at the final `value` instead of `0`). State this explicitly in your
report — this is a known, accepted verification gap, not something to
paper over.

- [ ] **Step 10: Commit**

```bash
git add src/pages/StudioPage.tsx src/components/sections/StudioStats.tsx
git rm src/components/sections/StudioIntro.tsx
```

(the `src/index.css` hunks were already staged carefully in Step 5 — do
not re-add the whole file here)

```bash
git commit -m "Replace the Studio page intro sentence with an animated stats section

StudioIntro.tsx (a single centered sentence) is replaced by StudioStats.tsx:
a numbered eyebrow, two count-up numbers (TEAM.length People, 2 Floors,
the latter in the orange accent), and the old copy's punchier remnant as a
smaller trailing line. Numbers animate from 0 on scroll-into-view via
framer-motion's animate() + useMotionValue, skipping the count-up under
prefers-reduced-motion.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
