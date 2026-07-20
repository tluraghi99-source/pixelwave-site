# Studio Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage's in-page "Studio" section with a dedicated `/studio` page: a large intro statement, a 14-person placeholder team grid with hover photo-swap, and a two-floor isometric floor plan navigated by a pinned scroll-scrub.

**Architecture:** Three new focused section components (`StudioIntro`, `StudioTeam`, `StudioFloorPlan`), each following the codebase's existing one-file-per-homepage-section pattern (see `WorkReel.tsx`, `Services.tsx`), composed by a new `StudioPage.tsx`. The old `Studio.tsx` section, its dead CSS, and the now-unused `Counter.tsx` are removed. Built across 3 tasks: Task 1 does the routing/cleanup plumbing plus the intro block (produces a working, if partial, `/studio` page); Task 2 adds the team grid; Task 3 adds the floor plan and completes the page.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, Framer Motion (`useScroll`/`useTransform` for the floor-plan pin, `Reveal`/`RevealGroup`/`RevealItem` for viewport-triggered fades — no Framer Motion needed for the team grid's hover-swap, which is plain CSS `:hover`).

## Global Constraints

- Design authority: `docs/superpowers/specs/2026-07-18-studio-page-design.md` — read it if anything here is ambiguous.
- No test framework exists in this project (no vitest/jest/playwright in `package.json`). Verification is `npx tsc -b --noEmit` (must be clean) plus manual browser observation — do not invent test files.
- Dev server: `npm run dev` (Vite, default port 5173).
- Follow existing code style: no comments explaining *what* code does, only *why* when non-obvious.
- Dark theme throughout the new page (`data-theme="dark"`, background `var(--pw-black)`) — not `WorkPage`'s light default.
- `StudioPage` does **not** get a `SectionLabel` number — it's a standalone page like `WorkPage`/`ContactPage`, neither of which use the homepage's numbered-section convention.
- Placeholder photography follows `Work.tsx`'s existing convention: image URLs derived via `.map()` at the component level (`https://picsum.photos/seed/pixellwave-{id}/WxH?grayscale`), never stored in the data file itself.
- `prefers-reduced-motion` is already handled globally in `index.css` (`@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.001ms !important; animation-duration: 0.001ms !important; } }`) — every plain-CSS transition this plan adds is automatically covered. No extra reduced-motion handling needed.
- The established safe pattern for scroll-scrubbed values in this codebase is **callback-form `useTransform`** with a manually-clamped lerp/ease helper (`clampedProgress`/`lerp`), not array-range `useTransform` — array ranges have a known Framer Motion v12 bug in this codebase (see `WorkReel.tsx`'s comments). The floor-plan pin task follows this pattern.
- This plan touches: `src/components/sections/Header.tsx`, `src/pages/HomePage.tsx`, `src/components/sections/Services.tsx`, `src/App.tsx`, `src/index.css`, and creates `src/pages/StudioPage.tsx`, `src/components/sections/StudioIntro.tsx`, `src/components/sections/StudioTeam.tsx`, `src/components/sections/StudioFloorPlan.tsx`, `src/data/team.ts`. It deletes `src/components/sections/Studio.tsx` and `src/components/motion/Counter.tsx`.

---

### Task 1: Routing, cleanup, and the intro block

**Files:**
- Modify: `src/components/sections/Header.tsx:17` and `:35-36`
- Modify: `src/pages/HomePage.tsx` (remove `Studio` import + usage)
- Modify: `src/components/sections/Services.tsx:79` (`number="03"` → `number="02"`)
- Modify: `src/App.tsx` (add `/studio` route)
- Modify: `src/index.css` (remove the dead `.studio__*`/`.stat*`/`.accent-*` block; add `.studio-page`/`.studio-intro*` rules)
- Delete: `src/components/sections/Studio.tsx`
- Delete: `src/components/motion/Counter.tsx`
- Create: `src/components/sections/StudioIntro.tsx`
- Create: `src/pages/StudioPage.tsx`

**Interfaces:**
- Consumes: `Reveal` from `@/components/motion/Reveal` (`<Reveal delay={number}>{children}</Reveal>`), `Footer` from `@/components/sections/Footer` (`<Footer />`, no props).
- Produces: `export function StudioIntro()` (no props) and `export function StudioPage()` (no props) — Task 2 imports and renders `<StudioTeam />` inside `StudioPage`'s `<main className="studio-page">`, alongside the `<StudioIntro />` this task adds.

- [ ] **Step 1: Update the header nav's two "Studio" links**

In `src/components/sections/Header.tsx`, change line 17 from:

```tsx
  { label: "Studio", href: "#studio" },
```

to:

```tsx
  { label: "Studio", href: "/studio" },
```

And change lines 34-38 from:

```tsx
  {
    label: "Studio",
    href: "#studio",
    links: [] as { label: string; href: string }[],
  },
```

to:

```tsx
  {
    label: "Studio",
    href: "/studio",
    links: [] as { label: string; href: string }[],
  },
```

- [ ] **Step 2: Renumber Services' SectionLabel**

In `src/components/sections/Services.tsx:79`, change:

```tsx
          <SectionLabel number="03">Services</SectionLabel>
```

to:

```tsx
          <SectionLabel number="02">Services</SectionLabel>
```

- [ ] **Step 3: Remove the Studio section from the homepage**

In `src/pages/HomePage.tsx`, remove this import line:

```tsx
import { Studio } from "@/components/sections/Studio"
```

And remove this usage line (inside `<main>`, between `<TickerStrip />` and `<Services />`):

```tsx
          <Studio />
```

The file's final content:

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
          <WorkReel />
          <TickerStrip />
          <Services />
        </main>
        <Footer />
      </div>
    </>
  )
}
```

- [ ] **Step 4: Delete the old Studio section and the now-unused Counter component**

```bash
rm "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito/src/components/sections/Studio.tsx"
rm "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito/src/components/motion/Counter.tsx"
```

`Counter` has no other consumers anywhere in `src/` (confirmed by the design spec) — safe to delete outright, not just stop importing it.

- [ ] **Step 5: Remove the dead CSS block from `index.css`**

Find this block (currently lines 593-618 — search for the comment `/* studio */`):

```css
/* studio */
.studio__grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: clamp(2.5rem, 2.2vw, 6rem); align-items: start; }
@media (max-width: 900px){ .studio__grid { grid-template-columns: 1fr; gap: 2.5rem; } }
.studio__statement {
  font-family: var(--font-display); font-weight: 500; font-size: clamp(1.5rem, 0.94vw, 3rem);
  line-height: 1.3; letter-spacing: -0.01em; color: var(--text-primary); margin: 1.5rem 0 0; text-wrap: balance;
}
.accent-orange { color: var(--pw-orange); }
.accent-cyan { color: #008B8B; }
.studio__stats { display: flex; flex-direction: column; align-self: stretch; }
.stat { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; padding: 1.1rem 0; border-bottom: 1px solid var(--border-subtle); }
.studio__stats > .stat:first-child { border-top: 1px solid var(--border-subtle); }
.stat__label { font-family: var(--font-mono-accent); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
.stat__num { font-family: var(--font-display); font-weight: 700; font-size: clamp(1.5rem, 1.2vw, 2.25rem); letter-spacing: -0.02em; color: var(--pw-orange); }

/* Desktop scroll-scrubbed variant only (StudioScrubbed in Studio.tsx) — the
   static border-bottom/top rules above are replaced by an animated
   .stat__rule that draws in as scroll passes through the section, instead
   of always being fully visible. The mobile/tablet ambient variant never
   adds these modifier classes, so it keeps the plain static rules above. */
.stat--scrubbed { position: relative; border-bottom: none; overflow: hidden; }
.studio__stats > .stat--scrubbed:first-child { border-top: none; }
.studio__stats--scrubbed { position: relative; }
.studio__stats--scrubbed::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: var(--border-subtle); }
.stat__rule { position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: var(--border-subtle); transform-origin: left; }
```

Delete it entirely (all lines from `/* studio */` through the `.stat__rule` rule), leaving the blank line and the `.lead` rule right after it untouched. In its place, add:

```css
/* Studio page (src/pages/StudioPage.tsx) — dark throughout. */
.studio-page { background: var(--pw-black); }

.studio-intro { padding-top: clamp(6rem, 9vw, 8rem); padding-bottom: clamp(2rem, 4vw, 3rem); }
.studio-intro__line {
  font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em;
  font-size: clamp(1.75rem, 4vw, 3.5rem); line-height: 1.15; margin: 0;
}
.studio-intro__line--bright { color: var(--pw-white); }
.studio-intro__line--mid { color: var(--pw-neutral-70); }
.studio-intro__line--dim { color: var(--pw-neutral-50); }
```

- [ ] **Step 6: Wire the new route into `App.tsx`**

Replace the full contents of `src/App.tsx` with:

```tsx
import { Route, Routes } from "react-router-dom"
import { ScrollProgress } from "@/components/ScrollProgress"
import { ScrollToTop } from "@/components/ScrollToTop"
import { CustomCursor } from "@/components/motion/CustomCursor"
import { Header } from "@/components/sections/Header"
import { HomePage } from "@/pages/HomePage"
import { WorkPage } from "@/pages/WorkPage"
import { StudioPage } from "@/pages/StudioPage"
import { ContactPage } from "@/pages/ContactPage"

function App() {
  return (
    <>
      <ScrollToTop />
      <CustomCursor />
      <ScrollProgress />
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/work" element={<WorkPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </>
  )
}

export default App
```

- [ ] **Step 7: Create `StudioIntro.tsx`**

Create `src/components/sections/StudioIntro.tsx`:

```tsx
import { Reveal } from "@/components/motion/Reveal"

// Bright lines read as the primary statement; mid/dim lines are de-emphasized
// supporting copy — matches the wireframe's white-to-grey graduated look.
// Each line still fades/rises in on its own as the block scrolls into view
// (Reveal's per-element viewport trigger) — the two are independent: color
// weight is permanent, the reveal is a one-time entrance animation.
const INTRO_LINES = [
  { text: "We're fourteen people", tone: "bright" },
  { text: "working out of two floors —", tone: "bright" },
  { text: "no open-plan pretending, no ping-pong table.", tone: "mid" },
  { text: "Just a place built for the work.", tone: "dim" },
] as const

export function StudioIntro() {
  return (
    <section className="studio-intro" data-theme="dark" data-screen-label="Studio Intro">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="wrap">
        {INTRO_LINES.map((line, i) => (
          <Reveal key={line.text} delay={i * 0.08}>
            <p className={`studio-intro__line studio-intro__line--${line.tone}`}>{line.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 8: Create `StudioPage.tsx`**

Create `src/pages/StudioPage.tsx`:

```tsx
import { StudioIntro } from "@/components/sections/StudioIntro"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  return (
    <>
      <main className="studio-page" data-theme="dark">
        <StudioIntro />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 9: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no output (clean).

- [ ] **Step 10: Manual browser verification**

Run: `npm run dev`, open the printed localhost URL.

1. Navigate to `/studio` directly (type the URL). Expected: page loads, black background, the 4-line intro statement visible top-to-bottom with the first two lines bright white, the third a dimmer grey, the last dimmer still — then the Footer at the bottom (social links + "YourVisionOurWave").
2. From the homepage, open the header menu (both the top-bar link if visible, and the full menu panel) and click "Studio". Expected: navigates to `/studio` (not `#studio` on the homepage).
3. Scroll the homepage from top to bottom. Expected: no "Studio" section appears between the WorkReel/TickerStrip and Services sections anymore — Services immediately follows TickerStrip. Confirm Services' own section label now reads "02" not "03".
4. Confirm `document.querySelector('.studio__grid')` (or any `.stat`/`.accent-orange` element) returns `null` anywhere on the homepage — the old section's DOM is gone, not just hidden.

- [ ] **Step 11: Commit**

```bash
git add src/components/sections/Header.tsx src/pages/HomePage.tsx src/components/sections/Services.tsx src/App.tsx src/index.css src/components/sections/StudioIntro.tsx src/pages/StudioPage.tsx
git rm src/components/sections/Studio.tsx src/components/motion/Counter.tsx
git commit -m "Replace homepage Studio section with a dedicated /studio page (routing + intro)"
```

---

### Task 2: Team grid

**Files:**
- Create: `src/data/team.ts`
- Create: `src/components/sections/StudioTeam.tsx`
- Modify: `src/pages/StudioPage.tsx` (add `<StudioTeam />`)
- Modify: `src/index.css` (add `.studio-team`/`.team-grid`/`.team-card*` rules)

**Interfaces:**
- Consumes: `RevealGroup`/`RevealItem` from `@/components/motion/Reveal` (`<RevealGroup stagger={n} amount={n}>`, `<RevealItem>`), `TEAM` array this task defines.
- Produces: `export function StudioTeam()` (no props) — Task 3 doesn't depend on anything from this task besides `StudioPage.tsx` continuing to render it.

- [ ] **Step 1: Create the team roster data**

Create `src/data/team.ts`:

```ts
export const TEAM = [
  { id: "t01", name: "Mara Lindqvist", role: "Founder & Creative Director" },
  { id: "t02", name: "Theo Castellano", role: "Head of Design" },
  { id: "t03", name: "Priya Nandakumar", role: "Senior Product Designer" },
  { id: "t04", name: "Owen Fairweather", role: "UX Designer" },
  { id: "t05", name: "Ines Duarte", role: "Brand Designer" },
  { id: "t06", name: "Kai Sørensen", role: "Motion Designer" },
  { id: "t07", name: "Marcus Ade", role: "Lead Developer" },
  { id: "t08", name: "Lena Vogt", role: "Front-end Developer" },
  { id: "t09", name: "Diego Marín", role: "Front-end Developer" },
  { id: "t10", name: "Sasha Petrova", role: "Backend Developer" },
  { id: "t11", name: "Noor El-Amin", role: "Photographer" },
  { id: "t12", name: "Jonas Reyes", role: "Video Editor" },
  { id: "t13", name: "Freya Lindgren", role: "Project Manager" },
  { id: "t14", name: "Tomás Silveira", role: "Studio Manager" },
]
```

- [ ] **Step 2: Create `StudioTeam.tsx`**

Create `src/components/sections/StudioTeam.tsx`:

```tsx
import { RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { TEAM } from "@/data/team"

// Temporary stand-in photography (Lorem Picsum) until real team photos are
// ready — same posture as Work.tsx's GALLERY_ITEMS. Two seeds per person so
// the hover-swap has a second, different placeholder image to crossfade to.
const TEAM_WITH_PHOTOS = TEAM.map((m) => ({
  ...m,
  photo: `https://picsum.photos/seed/pixellwave-team-${m.id}/600/750?grayscale`,
  photoHover: `https://picsum.photos/seed/pixellwave-team-${m.id}-alt/600/750?grayscale`,
}))

function TeamCard({ member }: { member: (typeof TEAM_WITH_PHOTOS)[number] }) {
  return (
    <div className="team-card">
      <div className="team-card__media">
        <img
          className="team-card__photo team-card__photo--base"
          src={member.photo}
          alt={member.name}
          loading="lazy"
        />
        <img
          className="team-card__photo team-card__photo--hover"
          src={member.photoHover}
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
      </div>
      <div className="team-card__body">
        <span className="team-card__name">{member.name}</span>
        <span className="team-card__role">{member.role}</span>
      </div>
    </div>
  )
}

export function StudioTeam() {
  return (
    <section className="studio-team" data-theme="dark" data-screen-label="Studio Team">
      <div className="wrap">
        <RevealGroup className="team-grid" stagger={0.05} amount={0.05}>
          {TEAM_WITH_PHOTOS.map((m) => (
            <RevealItem key={m.id}>
              <TeamCard member={m} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Add the team grid CSS**

Append to `src/index.css` (after the `.studio-intro*` rules added in Task 1):

```css
.studio-team { padding-block: clamp(3rem, 6vw, 6rem); }
.team-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: clamp(1.25rem, 2vw, 2rem);
}
@media (max-width: 1024px) { .team-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .team-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .team-grid { grid-template-columns: 1fr; } }

.team-card__media {
  position: relative; aspect-ratio: 4 / 5; overflow: hidden;
  border-radius: 4px; background: var(--pw-neutral-10);
}
.team-card__photo {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; filter: grayscale(1); display: block;
  transition: opacity 0.4s var(--ease-wave);
}
.team-card__photo--base { opacity: 1; }
.team-card__photo--hover { opacity: 0; }
.team-card:hover .team-card__photo--hover { opacity: 1; }
.team-card__body { padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.15rem; }
.team-card__name { font-family: var(--font-display); font-weight: 700; font-size: 1rem; color: var(--pw-white); }
.team-card__role {
  font-family: var(--font-mono-accent); font-size: 0.7rem;
  text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary);
}
```

- [ ] **Step 4: Wire `StudioTeam` into the page**

Replace the full contents of `src/pages/StudioPage.tsx` with:

```tsx
import { StudioIntro } from "@/components/sections/StudioIntro"
import { StudioTeam } from "@/components/sections/StudioTeam"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  return (
    <>
      <main className="studio-page" data-theme="dark">
        <StudioIntro />
        <StudioTeam />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no output (clean).

- [ ] **Step 6: Manual browser verification**

Run: `npm run dev`, navigate to `/studio`.

1. Expected: below the intro statement, a grid of 14 photo cards appears, each with a name and role underneath (e.g. "Mara Lindqvist" / "Founder & Creative Director"). Grid is 4 columns on a desktop-width viewport.
2. Hover over a card's photo (desktop pointer). Expected: the photo crossfades to a *different* grayscale placeholder image over ~0.4s, and reverses when the pointer leaves.
3. Resize the browser narrower (or use `resize_window`) to below ~1024px, then ~768px, then ~480px. Expected: the grid drops to 3, then 2, then 1 column respectively.
4. Using devtools' touch/coarse-pointer emulation (or `matchMedia("(hover: hover)")` override), confirm no swap happens on a simulated touch device — the card should just always show the base photo.

- [ ] **Step 7: Commit**

```bash
git add src/data/team.ts src/components/sections/StudioTeam.tsx src/pages/StudioPage.tsx src/index.css
git commit -m "Add the Studio page's team grid with hover photo-swap"
```

---

### Task 3: Floor plan (isometric, pinned scroll-scrub)

**Files:**
- Create: `src/components/sections/StudioFloorPlan.tsx`
- Modify: `src/pages/StudioPage.tsx` (add `<StudioFloorPlan />`)
- Modify: `src/index.css` (add `.floor-pin*`/`.floor-plan*`/`.floor-block*`/`.studio-floor-ambient*` rules)

**Interfaces:**
- Consumes: `useScreenSize` from `@/components/hooks/use-screen-size` (`.greaterThanOrEqual("lg")`), `Reveal` from `@/components/motion/Reveal`, `EASE_WAVE` from `@/lib/motion`, `cubicBezier`/`motion`/`useScroll`/`useTransform` from `framer-motion`.
- Produces: `export function StudioFloorPlan()` (no props) — the final section `StudioPage.tsx` renders, immediately before `<Footer />`.

- [ ] **Step 1: Create `StudioFloorPlan.tsx`**

Create `src/components/sections/StudioFloorPlan.tsx`:

```tsx
import { useRef } from "react"
import { cubicBezier, motion, useScroll, useTransform } from "framer-motion"
import { EASE_WAVE } from "@/lib/motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { Reveal } from "@/components/motion/Reveal"

// How long each floor stays fully visible before/after the crossfade, and how
// long the crossfade itself takes, in the same vh-budget style as
// WorkReel.tsx's pin constants.
const FLOOR_HOLD_VH = 60
const CROSSFADE_VH = 80
const PIN_HEIGHT_VH = FLOOR_HOLD_VH * 2 + CROSSFADE_VH + 100
const PIN_SCROLL_VH = PIN_HEIGHT_VH / 100 - 1

const CROSSFADE_START_FRACTION = FLOOR_HOLD_VH / 100 / PIN_SCROLL_VH
const CROSSFADE_END_FRACTION = (FLOOR_HOLD_VH + CROSSFADE_VH) / 100 / PIN_SCROLL_VH

const FADE_EASE = cubicBezier(...EASE_WAVE)

/** Clamped 0→1 local progress of v within [start, end]. */
function clampedProgress(v: number, start: number, end: number) {
  if (end <= start) return v >= end ? 1 : 0
  return Math.min(1, Math.max(0, (v - start) / (end - start)))
}

const BLOCK_W = 200
const BLOCK_H = 100

interface Room {
  gridX: number
  gridY: number
  label: string
  accent?: boolean
}

/** One isometric room block: a diamond top face plus two side faces, placed
 *  on a standard 2:1 isometric grid (gridX/gridY are grid units, not pixels). */
function FloorBlock({ gridX, gridY, label, accent }: Room) {
  const x = (gridX - gridY) * (BLOCK_W / 2)
  const y = (gridX + gridY) * (BLOCK_H / 2)
  return (
    <g transform={`translate(${x}, ${y})`}>
      <polygon
        points={`0,${BLOCK_H / 2} ${BLOCK_W / 2},0 ${BLOCK_W},${BLOCK_H / 2} ${BLOCK_W / 2},${BLOCK_H}`}
        className={`floor-block__top${accent ? " floor-block__top--accent" : ""}`}
      />
      <polygon
        points={`0,${BLOCK_H / 2} ${BLOCK_W / 2},${BLOCK_H} ${BLOCK_W / 2},${BLOCK_H * 1.6} 0,${BLOCK_H * 1.1}`}
        className="floor-block__left"
      />
      <polygon
        points={`${BLOCK_W},${BLOCK_H / 2} ${BLOCK_W / 2},${BLOCK_H} ${BLOCK_W / 2},${BLOCK_H * 1.6} ${BLOCK_W},${BLOCK_H * 1.1}`}
        className="floor-block__right"
      />
      <text x={BLOCK_W / 2} y={BLOCK_H / 2 + 5} textAnchor="middle" className="floor-block__label">
        {label}
      </text>
    </g>
  )
}

const FLOOR_1_ROOMS: Room[] = [
  { gridX: 0, gridY: 0, label: "RECEPTION" },
  { gridX: 1, gridY: 0, label: "LOUNGE" },
  { gridX: 2, gridY: 0, label: "STUDIO FLOOR", accent: true },
  { gridX: 0, gridY: 1, label: "DESKS A" },
  { gridX: 1, gridY: 1, label: "MEETING ROOM" },
]

const FLOOR_2_ROOMS: Room[] = [
  { gridX: 0, gridY: 0, label: "DESKS B" },
  { gridX: 1, gridY: 0, label: "FOCUS ROOM" },
  { gridX: 2, gridY: 0, label: "ROOF TERRACE", accent: true },
  { gridX: 0, gridY: 1, label: "MEETING ROOM B" },
  { gridX: 1, gridY: 1, label: "ARCHIVE" },
]

function FloorSVG({ rooms }: { rooms: Room[] }) {
  return (
    <svg viewBox="-150 -50 550 400" className="floor-plan__svg">
      {rooms.map((r) => (
        <FloorBlock key={r.label} {...r} />
      ))}
    </svg>
  )
}

/** Desktop: pinned, same shape as WorkReel — scroll crosses through a hold on
 *  Floor 1, a crossfade, then a hold on Floor 2, before the section releases. */
function StudioFloorPinned() {
  const pinRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] })

  const floor1Opacity = useTransform(scrollYProgress, (v) =>
    1 - FADE_EASE(clampedProgress(v, CROSSFADE_START_FRACTION, CROSSFADE_END_FRACTION))
  )
  const floor2Opacity = useTransform(scrollYProgress, (v) =>
    FADE_EASE(clampedProgress(v, CROSSFADE_START_FRACTION, CROSSFADE_END_FRACTION))
  )

  return (
    <section
      id="floor-plan"
      className="floor-pin"
      data-theme="dark"
      data-screen-label="Studio Floor Plan"
      ref={pinRef}
    >
      <div className="floor-pin__inner">
        <div className="grain-overlay" aria-hidden="true" />
        <div className="wrap floor-plan">
          <motion.div className="floor-plan__layer" style={{ opacity: floor1Opacity }}>
            <span className="floor-plan__label">Ground Floor</span>
            <FloorSVG rooms={FLOOR_1_ROOMS} />
          </motion.div>
          <motion.div className="floor-plan__layer" style={{ opacity: floor2Opacity }}>
            <span className="floor-plan__label">Upper Floor</span>
            <FloorSVG rooms={FLOOR_2_ROOMS} />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/** Mobile/tablet: no pin — the two floors render as plain stacked blocks,
 *  each fading in once as it scrolls into view, same fallback shape WorkReel
 *  and Services already use for their own pinned desktop sections. */
function StudioFloorAmbient() {
  return (
    <section className="studio-floor-ambient" data-theme="dark" data-screen-label="Studio Floor Plan">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="wrap">
        <Reveal>
          <div className="floor-plan__layer floor-plan__layer--ambient">
            <span className="floor-plan__label">Ground Floor</span>
            <FloorSVG rooms={FLOOR_1_ROOMS} />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="floor-plan__layer floor-plan__layer--ambient">
            <span className="floor-plan__label">Upper Floor</span>
            <FloorSVG rooms={FLOOR_2_ROOMS} />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function StudioFloorPlan() {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  return isDesktop ? <StudioFloorPinned /> : <StudioFloorAmbient />
}
```

- [ ] **Step 2: Add the floor-plan CSS**

Append to `src/index.css` (after the `.team-card*` rules added in Task 2):

```css
/* Studio floor plan pin — 300vh = PIN_HEIGHT_VH in StudioFloorPlan.tsx, kept
   in sync by hand (60+60+80+100). Simpler than .reel: just two isometric
   illustrations crossfading in place, no video/carousel phases. */
.floor-pin { position: relative; height: 300vh; }
.floor-pin__inner {
  position: sticky; top: 0; height: 100svh; overflow: hidden;
  background: var(--pw-black);
  display: flex; align-items: center;
}
.floor-plan { position: relative; width: 100%; min-height: 60vh; padding-block: clamp(2.5rem, 5vw, 5rem); }
.floor-plan__layer {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem;
}
.floor-plan__label {
  font-family: var(--font-mono-accent); font-size: 0.8rem;
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary);
}
.floor-plan__svg { width: 100%; max-width: 700px; height: auto; }

.floor-block__top { fill: var(--pw-neutral-10); stroke: var(--pw-white); stroke-width: 1; }
.floor-block__top--accent { fill: var(--pw-orange); }
.floor-block__left { fill: #0d0d0d; stroke: var(--pw-white); stroke-width: 1; }
.floor-block__right { fill: var(--pw-neutral-10); stroke: var(--pw-white); stroke-width: 1; }
.floor-block__label { font-family: var(--font-mono-accent); font-size: 11px; fill: var(--text-secondary); }

.studio-floor-ambient { padding-block: clamp(3rem, 6vw, 6rem); }
.studio-floor-ambient .floor-plan__layer--ambient {
  position: static;
  display: flex; flex-direction: column; align-items: center; gap: 1.5rem;
  margin-bottom: clamp(3rem, 5vw, 5rem);
}
.studio-floor-ambient .floor-plan__layer--ambient:last-child { margin-bottom: 0; }
```

- [ ] **Step 3: Wire `StudioFloorPlan` into the page**

Replace the full contents of `src/pages/StudioPage.tsx` with:

```tsx
import { StudioIntro } from "@/components/sections/StudioIntro"
import { StudioTeam } from "@/components/sections/StudioTeam"
import { StudioFloorPlan } from "@/components/sections/StudioFloorPlan"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  return (
    <>
      <main className="studio-page" data-theme="dark">
        <StudioIntro />
        <StudioTeam />
        <StudioFloorPlan />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no output (clean).

- [ ] **Step 5: Manual browser verification (desktop)**

Run: `npm run dev`, navigate to `/studio` at a desktop-width viewport (≥1024px).

1. Scroll down past the team grid. Expected: the page "locks" (pins) and an isometric floor plan appears — 5 room blocks including one filled in orange ("STUDIO FLOOR"), labeled "Ground Floor" above/near the illustration.
2. Keep scrolling. Expected: nothing changes for a short stretch (the hold), then the Ground Floor illustration fades out while a different 5-room illustration (including an orange "ROOF TERRACE" block) fades in labeled "Upper Floor", in the same on-screen position — then another short hold, then the section releases and scrolling continues normally into the Footer.
3. Confirm via `window.scrollY` + the section's own bounding rect (or by scrolling slowly) that the crossfade genuinely happens *in place* — Ground Floor's opacity should reach exactly 0 and Upper Floor's exactly 1 by the time the hold resumes, not mid-fade.

- [ ] **Step 6: Manual browser verification (mobile/tablet fallback)**

Resize to below 1024px width (or use `resize_window`).

1. Navigate to `/studio` (or reload). Expected: no pin/scroll-lock at all — the Ground Floor illustration and the Upper Floor illustration appear as two plain stacked blocks, each fading up once as you scroll to it, in normal document flow.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/StudioFloorPlan.tsx src/pages/StudioPage.tsx src/index.css
git commit -m "Add the Studio page's isometric two-floor plan with pinned scroll-crossfade"
```
