# Pinned Reel CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the homepage CTA from its own standalone section into a new trailing beat of `WorkReel`'s desktop scroll-pin sequence — it fades in centered beneath the work carousel once the carousel finishes cycling, per `docs/superpowers/specs/2026-08-31-pinned-reel-cta-design.md`.

**Architecture:** All changes live in `src/components/sections/WorkReel.tsx` (scroll math + new JSX), `src/pages/HomePage.tsx` (prop threading, removes its own `<CtaBand>` call), and `src/index.css` (new `.reel__cta*` rules + one updated value, `.reel`'s height). `CtaBand.tsx` itself is not modified — it's reused as-is for the mobile path.

**Tech Stack:** React 19 + TypeScript + Vite + Framer Motion (`useScroll`/`useTransform`, matching the existing scroll-pin patterns in `WorkReel.tsx`). No test framework — verification is `npx tsc -b` + `npm run lint` (oxlint) + live checks via the Claude Browser preview tools, including manually scrolling to specific pixel offsets to sample the pin's local scroll fractions.

## Global Constraints

- Quote the project root path in every shell command — it contains a space (`/Volumes/ups tl/02 pixelwave/00_pixel/000_sito`).
- Every commit uses explicit file pathspecs, never `git add -A`/`git add .` — the working tree carries unrelated pre-existing uncommitted files (including, as of this writing, an uncommitted fix to `.work-page__*` CSS and `src/data/work.ts`/other files) that must never be swept into this commit.
- Run `npx tsc -b && npm run lint` after every code change, before every commit. Both must be clean.
- The carousel's own entrance timing and its own scroll-driven item-cycling must land at the exact same real scroll positions as before this change — only a new trailing segment is added after everything that exists today. Verify this explicitly (Step 6 below), don't just assume the math is right.
- `CtaBand.tsx`, `Button.tsx`, `SectionLabel.tsx`, `Reveal.tsx` are not modified by this plan.
- The new button (`.reel__cta-btn`) starts as an outline (transparent background, white border/text) and fills solid orange (white text stays white) on hover — scoped to this one instance via a class selector, not a new shared `Button` variant.
- No comments explaining WHAT code does, only non-obvious WHY (match this codebase's existing convention — `WorkReel.tsx` is full of exactly this style of comment already).

---

### Task 1: Pinned reel CTA — scroll math, markup, styling, prop threading

**Files:**
- Modify: `src/components/sections/WorkReel.tsx` (constants near the top, `WorkReelPinned`, `WorkReelAmbient`, `WorkReel`)
- Modify: `src/pages/HomePage.tsx` (lines 1-29, full file)
- Modify: `src/index.css:1116` (`.reel`'s height) and the block starting at `src/index.css:1127` (`.reel__content`/`.work__gallery-wrap`)

**Interfaces:**
- Consumes: `CtaBand` (`src/components/sections/CtaBand.tsx`, unmodified — `{ headline: string }` prop, others default), `SectionLabel`, `Button`, `ArrowUpRight` (from `lucide-react`, already imported elsewhere in this codebase the same way).
- Produces: `WorkReel({ ctaHeadline }: { ctaHeadline: string })` — the new required prop. Nothing downstream depends on this task; it's the only task in this plan.

- [ ] **Step 1: Read the current files to confirm they match**

Run: `sed -n '1,30p' "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito/src/components/sections/WorkReel.tsx"`

Expected output (exact):

```tsx
import { useRef } from "react"
import { cubicBezier, motion, useMotionValue, useScroll, useTransform } from "framer-motion"
import { EASE_WAVE, HERO_REVEAL_END, HERO_REVEAL_START } from "@/lib/motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { VideoScrubbed, VideoScrubAmbient } from "@/components/sections/VideoScrub"
import { WorkHeading, WorkGallery, WorkAmbient } from "@/components/sections/Work"

// The video's reveal is a fixed overlay, not part of the pin's own document
// flow (see reel__reveal-overlay below) — it rides the same global
// HERO_REVEAL_START/END window (see lib/motion) that drives the hero mark's
// dock, so the iris and the logo move in exact lockstep from scroll 0. Only
// the video-scrub and carousel phases live inside the pin's own local
// scrollYProgress, which starts right where the overlay hands off.
const VIDEO_VH = 250
/** Pure hold on the video's last (still undimmed) frame — scroll passes
 *  through this whole short span with nothing changing on screen, before
 *  the black fade-in below starts. */
const FROZEN_HOLD_VH = 30
/** The black background's own fade-in — deliberately long and slow, scrubbed
 *  1:1 with scroll rather than time. The carousel begins its own entrance at
 *  65% through this span (see CAROUSEL_ENTRANCE_START_GLOBAL below), not at
 *  its end, and keeps fading in on its own past that point. */
const BLACK_FADE_VH = 200
const CAROUSEL_START_FRACTION_OF_FADE = 0.65
const CAROUSEL_VH = 220
/** The blackout never goes fully opaque — it settles at a dimmed 60%, so the
 *  video's last frame stays faintly visible underneath rather than reading
 *  as pure black. */
const BLACKOUT_MAX_OPACITY = 0.6
```

Also run: `sed -n '30,181p' "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito/src/components/sections/WorkReel.tsx"` and confirm it matches the rest of the file shown in Steps 2-4 below (the "old" code blocks you're about to replace). If either doesn't match, stop and re-read the full file before continuing.

Also run: `sed -n '1,30p' "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito/src/pages/HomePage.tsx"`

Expected output (exact):

```tsx
import { useState } from "react"
import { Preloader } from "@/components/Preloader"
import { Hero } from "@/components/sections/Hero"
import { TickerStrip } from "@/components/sections/TickerStrip"
import { WorkReel } from "@/components/sections/WorkReel"
import { CtaBand } from "@/components/sections/CtaBand"
import { Services } from "@/components/sections/Services"
import { Footer } from "@/components/sections/Footer"

export function HomePage() {
  const [introDone, setIntroDone] = useState(false)

  return (
    <>
      <Preloader onReveal={() => setIntroDone(true)} />
      <div id="top" />
      <Hero introDone={introDone} />
      <div className="page-content">
        <main>
          <WorkReel />
          <CtaBand headline="Got a wave in mind?" />
          <TickerStrip />
          <Services />
        </main>
        <Footer />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Add the new scroll-timing constants and imports to `WorkReel.tsx`**

Replace:

```tsx
import { useRef } from "react"
import { cubicBezier, motion, useMotionValue, useScroll, useTransform } from "framer-motion"
import { EASE_WAVE, HERO_REVEAL_END, HERO_REVEAL_START } from "@/lib/motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { VideoScrubbed, VideoScrubAmbient } from "@/components/sections/VideoScrub"
import { WorkHeading, WorkGallery, WorkAmbient } from "@/components/sections/Work"
```

with:

```tsx
import { useRef } from "react"
import { cubicBezier, motion, useMotionValue, useScroll, useTransform } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { EASE_WAVE, HERO_REVEAL_END, HERO_REVEAL_START } from "@/lib/motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { VideoScrubbed, VideoScrubAmbient } from "@/components/sections/VideoScrub"
import { WorkHeading, WorkGallery, WorkAmbient } from "@/components/sections/Work"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Button } from "@/components/pw/Button"
import { CtaBand } from "@/components/sections/CtaBand"
```

Replace:

```tsx
const BLACK_FADE_VH = 200
const CAROUSEL_START_FRACTION_OF_FADE = 0.65
const CAROUSEL_VH = 220
/** The blackout never goes fully opaque — it settles at a dimmed 60%, so the
 *  video's last frame stays faintly visible underneath rather than reading
 *  as pure black. */
const BLACKOUT_MAX_OPACITY = 0.6
```

with:

```tsx
const BLACK_FADE_VH = 200
const CAROUSEL_START_FRACTION_OF_FADE = 0.65
const CAROUSEL_VH = 220
/** The blackout never goes fully opaque — it settles at a dimmed 60%, so the
 *  video's last frame stays faintly visible underneath rather than reading
 *  as pure black. */
const BLACKOUT_MAX_OPACITY = 0.6
/** Extra scroll, appended after the carousel's own cycling range, spent on
 *  fading the CTA in and then simply holding on it before the pin
 *  releases. The carousel's own entrance/cycling timing above is
 *  completely untouched by this — this only extends what comes after it. */
const CTA_VH = 120
/** How much of CTA_VH is spent fading in vs. just holding once visible. */
const CTA_FADE_VH = 50
```

- [ ] **Step 3: Extend the pin's total scroll budget and add the new fraction constants**

Replace:

```tsx
const CAROUSEL_ENTRANCE_START_GLOBAL =
  FROZEN_HOLD_END_GLOBAL + (BLACK_FADE_VH * CAROUSEL_START_FRACTION_OF_FADE) / 100
const CAROUSEL_END_GLOBAL = CAROUSEL_ENTRANCE_START_GLOBAL + CAROUSEL_VH / 100
/** The pin starts sticking at HERO_REVEAL_END — exactly where the fixed
 *  reveal overlay finishes opening and hands off — and has to run through
 *  CAROUSEL_END_GLOBAL — its CSS height is that spread of extra scroll, plus
 *  the one viewport height the sticky inner itself occupies while pinned.
 *  Keep .reel's height and .page-content's margin-top in index.css in sync
 *  with this (PIN_HEIGHT_VH below / HERO_REVEAL_END respectively). */
const PIN_HEIGHT_VH = (CAROUSEL_END_GLOBAL - HERO_REVEAL_END + 1) * 100
const PIN_SCROLL_VH = PIN_HEIGHT_VH / 100 - 1
```

with:

```tsx
const CAROUSEL_ENTRANCE_START_GLOBAL =
  FROZEN_HOLD_END_GLOBAL + (BLACK_FADE_VH * CAROUSEL_START_FRACTION_OF_FADE) / 100
const CAROUSEL_END_GLOBAL = CAROUSEL_ENTRANCE_START_GLOBAL + CAROUSEL_VH / 100
/** Where the carousel's cycling range ends and the CTA's own trailing
 *  segment begins. */
const CTA_END_GLOBAL = CAROUSEL_END_GLOBAL + CTA_VH / 100
/** The pin starts sticking at HERO_REVEAL_END — exactly where the fixed
 *  reveal overlay finishes opening and hands off — and has to run through
 *  CTA_END_GLOBAL (carousel range + the new CTA range after it) — its CSS
 *  height is that spread of extra scroll, plus the one viewport height the
 *  sticky inner itself occupies while pinned. Keep .reel's height and
 *  .page-content's margin-top in index.css in sync with this (PIN_HEIGHT_VH
 *  below / HERO_REVEAL_END respectively). */
const PIN_HEIGHT_VH = (CTA_END_GLOBAL - HERO_REVEAL_END + 1) * 100
const PIN_SCROLL_VH = PIN_HEIGHT_VH / 100 - 1
```

- [ ] **Step 4: Add the carousel-cycle-end and CTA-fade fraction constants**

Replace:

```tsx
/** The carousel's own entrance starts once the black fade-in is 80% of the
 *  way through — it keeps fading/rising in on its own past that point,
 *  independent of when the blackout itself finishes. */
const CAROUSEL_SCROLL_START = (CAROUSEL_ENTRANCE_START_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
const ENTRANCE_END_FRACTION = CAROUSEL_SCROLL_START + (ENTRANCE_FADE_VH / 100) / PIN_SCROLL_VH
```

with:

```tsx
/** The carousel's own entrance starts once the black fade-in is 80% of the
 *  way through — it keeps fading/rising in on its own past that point,
 *  independent of when the blackout itself finishes. */
const CAROUSEL_SCROLL_START = (CAROUSEL_ENTRANCE_START_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
const ENTRANCE_END_FRACTION = CAROUSEL_SCROLL_START + (ENTRANCE_FADE_VH / 100) / PIN_SCROLL_VH
/** Where the carousel's own cycling range ends, re-expressed as a fraction
 *  of the pin's now-larger total (PIN_SCROLL_VH includes CTA_VH) — computed
 *  the same way every other fraction constant above is, off the same
 *  CAROUSEL_END_GLOBAL milestone, which itself hasn't changed. This is what
 *  carouselProgress maps to below instead of the literal "1" it used before
 *  CTA_VH existed — without it, the carousel's cycling would stretch across
 *  the newly-added CTA scroll range too, instead of finishing where it
 *  always has and leaving that range for the CTA. */
const CAROUSEL_CYCLE_END_FRACTION = (CAROUSEL_END_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
/** Where the CTA's own fade-in finishes (opacity reaches 1) — it just holds
 *  at full opacity for the remainder of the pin after this. */
const CTA_FADE_END_FRACTION = CAROUSEL_CYCLE_END_FRACTION + (CTA_FADE_VH / 100) / PIN_SCROLL_VH
```

- [ ] **Step 5: Wire the new fraction into `carouselProgress` and add `ctaOpacity`**

Replace:

```tsx
  const videoProgress = useTransform(scrollYProgress, [VIDEO_START_FRACTION, VIDEO_END_FRACTION], [0, 1])
  const carouselProgress = useTransform(scrollYProgress, [CAROUSEL_SCROLL_START, 1], [0, 1])
```

with:

```tsx
  const videoProgress = useTransform(scrollYProgress, [VIDEO_START_FRACTION, VIDEO_END_FRACTION], [0, 1])
  const carouselProgress = useTransform(scrollYProgress, [CAROUSEL_SCROLL_START, CAROUSEL_CYCLE_END_FRACTION], [0, 1])
```

Replace:

```tsx
  const galleryY = useTransform(scrollYProgress, (v) =>
    `${lerp(100, 0, FADE_EASE(clampedProgress(v, CAROUSEL_SCROLL_START, ENTRANCE_END_FRACTION)))}%`
  )
  const pointerEvents = useTransform(contentOpacity, (v) => (v > 0.05 ? "auto" : "none"))
```

with:

```tsx
  const galleryY = useTransform(scrollYProgress, (v) =>
    `${lerp(100, 0, FADE_EASE(clampedProgress(v, CAROUSEL_SCROLL_START, ENTRANCE_END_FRACTION)))}%`
  )
  const pointerEvents = useTransform(contentOpacity, (v) => (v > 0.05 ? "auto" : "none"))
  const ctaOpacity = useTransform(scrollYProgress, (v) =>
    FADE_EASE(clampedProgress(v, CAROUSEL_CYCLE_END_FRACTION, CTA_FADE_END_FRACTION))
  )
```

- [ ] **Step 6: Verify TypeScript and lint are clean, then confirm the math by hand**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && npx tsc -b && npm run lint
```
Expected: both clean, no errors.

By hand, with `HERO_REVEAL_END = 1.3` (from `src/lib/motion.ts`) and the constants above: `CAROUSEL_ENTRANCE_START_GLOBAL = 5.4`, `CAROUSEL_END_GLOBAL = 7.6`, `CTA_END_GLOBAL = 8.8`, new `PIN_HEIGHT_VH = 850`, new `PIN_SCROLL_VH = 7.5`, `CAROUSEL_CYCLE_END_FRACTION = 0.84`, `CTA_FADE_END_FRACTION ≈ 0.9067`. These exact numbers are used in Step 11's live verification below — if your arithmetic from the actual constants in the file doesn't match these, stop and find the discrepancy before continuing (a wrong constant here silently breaks the whole sequence).

- [ ] **Step 7: Add the CTA markup inside `WorkReelPinned`'s JSX**

Replace:

```tsx
            <motion.div className="work__gallery-wrap" style={{ opacity: contentOpacity, y: galleryY }}>
              <WorkGallery scrollYProgress={carouselProgress} />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>
    </>
  )
}
```

with:

```tsx
            <motion.div className="work__gallery-wrap" style={{ opacity: contentOpacity, y: galleryY }}>
              <WorkGallery scrollYProgress={carouselProgress} />
            </motion.div>
            <motion.div className="reel__cta" style={{ opacity: ctaOpacity }}>
              <SectionLabel>Let's talk</SectionLabel>
              <p className="reel__cta-headline">{ctaHeadline}</p>
              <Button
                variant="secondary"
                href="/contact"
                iconRight={<ArrowUpRight size={16} />}
                className="reel__cta-btn"
              >
                Start a project
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>
    </>
  )
}
```

- [ ] **Step 8: Thread `ctaHeadline` through `WorkReelPinned`, `WorkReelAmbient`, and `WorkReel`**

Replace:

```tsx
function WorkReelPinned() {
  const pinRef = useRef<HTMLElement>(null)
```

with:

```tsx
function WorkReelPinned({ ctaHeadline }: { ctaHeadline: string }) {
  const pinRef = useRef<HTMLElement>(null)
```

Replace:

```tsx
/** Mobile/tablet: the two pieces stay separate ambient sections, in the same order. */
function WorkReelAmbient() {
  return (
    <>
      <VideoScrubAmbient />
      <WorkAmbient />
    </>
  )
}

export function WorkReel() {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")

  return isDesktop ? <WorkReelPinned /> : <WorkReelAmbient />
}
```

with:

```tsx
/** Mobile/tablet: the two pieces stay separate ambient sections, in the same
 *  order, with the CTA as its own standalone section right after — same
 *  place it's always been, just relocated here from HomePage.tsx so
 *  WorkReel owns "show the CTA" for both paths. */
function WorkReelAmbient({ ctaHeadline }: { ctaHeadline: string }) {
  return (
    <>
      <VideoScrubAmbient />
      <WorkAmbient />
      <CtaBand headline={ctaHeadline} />
    </>
  )
}

export function WorkReel({ ctaHeadline }: { ctaHeadline: string }) {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")

  return isDesktop ? (
    <WorkReelPinned ctaHeadline={ctaHeadline} />
  ) : (
    <WorkReelAmbient ctaHeadline={ctaHeadline} />
  )
}
```

- [ ] **Step 9: Update `HomePage.tsx`**

Replace the full file content:

```tsx
import { useState } from "react"
import { Preloader } from "@/components/Preloader"
import { Hero } from "@/components/sections/Hero"
import { TickerStrip } from "@/components/sections/TickerStrip"
import { WorkReel } from "@/components/sections/WorkReel"
import { CtaBand } from "@/components/sections/CtaBand"
import { Services } from "@/components/sections/Services"
import { Footer } from "@/components/sections/Footer"

export function HomePage() {
  const [introDone, setIntroDone] = useState(false)

  return (
    <>
      <Preloader onReveal={() => setIntroDone(true)} />
      <div id="top" />
      <Hero introDone={introDone} />
      <div className="page-content">
        <main>
          <WorkReel />
          <CtaBand headline="Got a wave in mind?" />
          <TickerStrip />
          <Services />
        </main>
        <Footer />
      </div>
    </>
  )
}
```

with:

```tsx
import { useState } from "react"
import { Preloader } from "@/components/Preloader"
import { Hero } from "@/components/sections/Hero"
import { TickerStrip } from "@/components/sections/TickerStrip"
import { WorkReel } from "@/components/sections/WorkReel"
import { Services } from "@/components/sections/Services"
import { Footer } from "@/components/sections/Footer"

export function HomePage() {
  const [introDone, setIntroDone] = useState(false)

  return (
    <>
      <Preloader onReveal={() => setIntroDone(true)} />
      <div id="top" />
      <Hero introDone={introDone} />
      <div className="page-content">
        <main>
          <WorkReel ctaHeadline="Got a wave in mind?" />
          <TickerStrip />
          <Services />
        </main>
        <Footer />
      </div>
    </>
  )
}
```

- [ ] **Step 10: Update `index.css`**

Replace:

```css
.reel { position: relative; height: 730vh; }
```

with:

```css
.reel { position: relative; height: 850vh; }
```

Replace:

```css
.work__gallery-wrap { flex: 1 1 0%; width: 100%; position: relative; margin-top: 1rem; }
.work__gallery { display: block; }
```

with:

```css
.work__gallery-wrap { flex: 1 1 0%; width: 100%; position: relative; margin-top: 1rem; }
.work__gallery { display: block; }
/* flex-shrink: 0 (unlike .work__gallery-wrap above, which shrinks to make
   room) — this only ever holds a few lines of text, it should never be the
   thing that gives up space. */
.reel__cta { display: flex; flex-direction: column; align-items: center; text-align: center; flex-shrink: 0; gap: clamp(0.5rem, 1vw, 0.75rem); padding-top: clamp(1rem, 2vw, 1.5rem); }
.reel__cta-headline { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.02em; font-size: clamp(1.5rem, 2.6vw, 2.75rem); margin: 0; }
/* Outline by default, fills solid orange on hover — distinct from
   CtaBand's own always-solid-orange button (see cta-band__cta in this same
   file), scoped to this one instance since it isn't requested as a new
   shared Button variant. */
.reel__cta-btn.pw-btn--secondary {
  background: transparent; color: var(--pw-white); border-color: rgba(255, 255, 255, 0.6);
}
.reel__cta-btn.pw-btn--secondary:hover {
  background: var(--pw-orange); border-color: var(--pw-orange); color: var(--pw-white);
}
```

- [ ] **Step 11: Verify TypeScript and lint are clean**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && npx tsc -b && npm run lint
```
Expected: both clean, no errors.

- [ ] **Step 12: Verify the desktop pinned sequence live**

Ensure the dev server is running (`mcp__Claude_Browser__preview_list`; if nothing is running, `mcp__Claude_Browser__preview_start` with `{"name": "pixellwave-dev"}`), then navigate to the homepage at a desktop viewport width (≥1024px, the `lg` breakpoint `useScreenSize` checks):

```
mcp__Claude_Browser__navigate { "url": "http://localhost:5173/" }
```

The pin's local scroll starts at `HERO_REVEAL_END * innerHeight` (1.3 × viewport height) past the top of the document and runs for `PIN_SCROLL_VH * innerHeight` (7.5 × viewport height) after that. Run via `mcp__Claude_Browser__javascript_tool` to jump to a specific local fraction and read back what's actually rendered — this helper computes the absolute scroll position for a given local fraction `t` and reports the opacity of both the gallery wrap and the new CTA block:

```js
(function() {
  const vh = window.innerHeight;
  function scrollToLocalFraction(t) {
    const y = 1.3 * vh + t * 7.5 * vh;
    window.scrollTo(0, y);
  }
  function readState() {
    const gallery = document.querySelector('.work__gallery-wrap');
    const cta = document.querySelector('.reel__cta');
    return {
      scrollY: window.scrollY,
      galleryOpacity: gallery ? getComputedStyle(gallery).opacity : null,
      ctaOpacity: cta ? getComputedStyle(cta).opacity : null,
    };
  }
  const results = {};
  [0.5, 0.83, 0.84, 0.9, 0.907, 0.95].forEach((t) => {
    scrollToLocalFraction(t);
    results['t=' + t] = readState();
  });
  return JSON.stringify(results, null, 2);
})();
```

Expected:
- `t=0.5`: `galleryOpacity` close to `"1"` (mid-carousel-cycling, already fully faded in per the untouched `ENTRANCE_END_FRACTION ≈ 0.6`... actually at `t=0.5` entrance is still completing — accept anything > `"0"`, the key checks are the ones below), `ctaOpacity` is `"0"` (CTA hasn't started yet — `CAROUSEL_CYCLE_END_FRACTION` is `0.84`, well past `0.5`).
- `t=0.83`: `ctaOpacity` is still `"0"` (just before `CAROUSEL_CYCLE_END_FRACTION`).
- `t=0.84`: `ctaOpacity` is at or very close to `"0"` still (this is exactly `CAROUSEL_CYCLE_END_FRACTION`, where the fade *starts*, so it should read as 0 or a hair above).
- `t=0.9`: `ctaOpacity` is between `"0"` and `"1"` (mid-fade — `CTA_FADE_END_FRACTION` is `≈0.9067`, so `0.9` is just before it finishes).
- `t=0.907`: `ctaOpacity` is `"1"` or extremely close to it (fade complete).
- `t=0.95`: `ctaOpacity` is `"1"` (holding, well past the fade).

At every one of these checkpoints, `galleryOpacity` should stay at `"1"` (or whatever a stable rendered value is) — the carousel does not fade out; both are visible together once the CTA appears. If `galleryOpacity` drops as `ctaOpacity` rises, something reused the wrong opacity value — stop and check Step 7's JSX uses `ctaOpacity` (not `contentOpacity`) for `.reel__cta`.

Also take a screenshot at `t=0.95` (`mcp__Claude_Browser__computer { "action": "screenshot" }`) and visually confirm: the carousel gallery is still visible above, and below it the "Let's talk" label, "Got a wave in mind?" headline, and an outlined "Start a project" button are all present, centered.

- [ ] **Step 13: Verify the button's hover fill live**

While still on the `t=0.95` scroll position from Step 12, find the button and check its resting vs. hovered background:

```js
(function() {
  const btn = document.querySelector('.reel__cta-btn');
  const resting = getComputedStyle(btn).backgroundColor;
  return JSON.stringify({ resting });
})();
```

Expected: `resting` is `"rgba(0, 0, 0, 0)"` or `"transparent"` (no fill at rest).

Then hover it with the `computer` tool (get its on-screen coordinates first via `read_page` or a `getBoundingClientRect()` call, then `mcp__Claude_Browser__computer { "action": "hover", "coordinate": [x, y] }`), and re-check:

```js
(function() {
  const btn = document.querySelector('.reel__cta-btn');
  return JSON.stringify({ hovered: getComputedStyle(btn).backgroundColor });
})();
```

Expected: `hovered` is `"rgb(255, 91, 0)"` (the `--pw-orange` value, `#FF5B00`).

- [ ] **Step 14: Verify the carousel's own entrance/cycling timing is unaffected**

This checks the Global Constraint that the carousel's real-scroll-position timing didn't shift. Compare against the pre-existing, unchanged `WorkGallery`/`CircularGallery` behavior by sampling `carouselProgress`'s effect at a fraction well inside its old range — e.g. at local fraction `0.6` (which was inside the carousel's cycling range before this change too, since `CAROUSEL_SCROLL_START ≈ 0.547` and `ENTRANCE_END_FRACTION ≈ 0.6` recompute to the same *real* scroll positions as before, just smaller fractions of the new larger total):

```js
(function() {
  const vh = window.innerHeight;
  window.scrollTo(0, 1.3 * vh + 0.6 * 7.5 * vh);
  const gallery = document.querySelector('.work__gallery-wrap');
  return JSON.stringify({ opacity: getComputedStyle(gallery).opacity });
})();
```

Expected: `opacity` is `"1"` (fully entered — this matches the pre-existing `ENTRANCE_END_FRACTION` behavior, just confirming it still fires at the same real scroll position as before, not later).

**Known open item from the spec, check it now:** while at this scroll position (or scrubbing slowly through the carousel's cycling range from Step 12's `t=0.5` sample), visually confirm the `CircularGallery` canvas doesn't glitch, snap, or flicker once `.reel__cta` starts occupying space in Step 12's later checkpoints (`t=0.84` onward) and `.work__gallery-wrap` (which has `flex: 1 1 0%`) shrinks to make room for it. If it looks wrong (a hard jump in gallery size/position rather than a smooth shrink, or the canvas failing to redraw at its new size), report this as a concern in your report rather than silently accepting it — it may need `CircularGallery` to have a resize observer or an explicit re-layout call that isn't currently wired up. Take a screenshot at both `t=0.8` and `t=0.9` for comparison.

- [ ] **Step 15: Verify mobile is unaffected**

```
mcp__Claude_Browser__resize_window { "preset": "mobile" }
```
```
mcp__Claude_Browser__navigate { "url": "http://localhost:5173/" }
```

```js
(function() {
  const ctaSections = document.querySelectorAll('.cta-band');
  const reelCta = document.querySelector('.reel__cta');
  return JSON.stringify({
    ctaBandCount: ctaSections.length,
    reelCtaExists: !!reelCta,
  });
})();
```

Expected: `ctaBandCount: 1` (the standalone `CtaBand` still renders, now via `WorkReelAmbient` instead of `HomePage.tsx` directly, but visually in the same place — right after the work carousel), `reelCtaExists: false` (the pinned-only markup never renders on mobile, since `WorkReelAmbient` is what's mounted here, not `WorkReelPinned`).

Scroll to the CTA and screenshot to confirm it looks exactly as it did before this change (full-width row layout, unchanged).

Resize back afterward: `mcp__Claude_Browser__resize_window { "preset": "desktop" }`.

- [ ] **Step 16: Commit**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && git status --short
```

Confirm only `src/components/sections/WorkReel.tsx`, `src/pages/HomePage.tsx`, and `src/index.css` show as newly modified by your own edits — if `src/index.css` also shows unrelated pre-existing changes elsewhere in the file (e.g. in a `.work-page__*` area far from `.reel`/`.work__gallery-wrap`), stage only your own hunk(s) with `git add -p src/index.css` (confirm via `git diff --cached src/index.css` before committing that only the `.reel`/`.work__gallery-wrap`-area changes are staged), rather than the whole file.

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && git add src/components/sections/WorkReel.tsx src/pages/HomePage.tsx && git add -p src/index.css
```

(Answer `y` only to hunks touching `.reel`, `.work__gallery-wrap`, or the new `.reel__cta*` rules; `n` to anything else.)

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && git diff --cached --stat
```

Confirm the stat only shows the three intended files with reasonable line counts (no surprise inclusions), then commit:

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && git commit -m "$(cat <<'EOF'
Move the homepage CTA into the pinned reel's scroll sequence

Desktop: once the work carousel finishes cycling through its items,
a new trailing scroll segment fades the CTA in centered underneath
it — both stay visible together until the pin releases into the
normal black Services section. The carousel's own entrance and
cycling are untouched, just re-mapped to keep landing at the same
real scroll positions now that the pin's total range is longer.

Mobile is unaffected — it never had the pin to begin with, and
WorkReelAmbient now owns rendering the standalone CtaBand section
(relocated from HomePage.tsx, same visual result).

The button here starts outlined and fills solid orange on hover,
distinct from CtaBand's own always-solid button — scoped to this one
instance, not a new shared Button variant.
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Single source of truth for CTA copy (HomePage passes `ctaHeadline` to `WorkReel`) → Steps 8-9.
- Mobile path relocates `<CtaBand>` into `WorkReelAmbient`, unchanged visually → Step 8, verified in Step 15.
- Desktop scroll math: `CTA_VH`/`CTA_FADE_VH` constants, `PIN_HEIGHT_VH`/`PIN_SCROLL_VH` extended, `carouselProgress` re-mapped to `CAROUSEL_CYCLE_END_FRACTION` instead of literal `1`, new `ctaOpacity` → Steps 2-6, verified with exact hand-computed fractions in Steps 6 and 12.
- Carousel's own entrance/cycling unaffected in real scroll-position terms → Step 14 explicitly checks this against the Global Constraint.
- `.reel`'s CSS height kept in sync with the new `PIN_HEIGHT_VH` (730vh → 850vh) → Step 10.
- Markup: centered `.reel__cta` block with `SectionLabel`/headline/`Button`, `flex-shrink: 0` so it doesn't get squeezed, `.work__gallery-wrap`'s existing `flex: 1 1 0%` absorbs the space it needs → Step 7 (JSX) + Step 10 (CSS).
- Button: outline by default, orange fill on hover, scoped via `.reel__cta-btn.pw-btn--secondary` → Step 10, verified in Step 13.
- Open verification point (CircularGallery reflow smoothness) from the spec → Step 14 explicitly calls this out as something to check and report on, not silently assume.
- `CtaBand.tsx`/`Button.tsx`/`SectionLabel.tsx`/`Reveal.tsx` untouched → none of these files appear in this task's Files list, and Step 1's baseline read doesn't include them.

**Placeholder scan:** No TBD/TODO. Step 14's "report as a concern if it looks wrong" is a genuine open verification point already flagged in the spec (not a vague catch-all) — it names exactly what to look for (hard jumps vs. smooth shrink) and what to do about it (report, don't guess a fix).

**Type consistency:** `WorkReel({ ctaHeadline }: { ctaHeadline: string })` in Step 8 matches its call site in Step 9 (`<WorkReel ctaHeadline="Got a wave in mind?" />`) and its internal forwarding to `WorkReelPinned`/`WorkReelAmbient` (both typed `{ ctaHeadline: string }` in Step 8, consumed identically). `ctaOpacity` (defined in Step 5) is used only in Step 7's JSX, with the same name — no drift.
