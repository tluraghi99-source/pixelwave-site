# Site-Wide Dot-Grid Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing `CursorGlow` ambient dot-grid (currently Contact-page-only) across every other page as a shared background layer, and remove the `PixelTrail` hover effect from the homepage Hero and `/work` page hero, per `docs/superpowers/specs/2026-07-31-site-wide-dot-grid-background-design.md`.

**Architecture:** One shared CSS class (`.cursor-glow`) positions every new `CursorGlow` instance identically (absolute, full-bleed, `z-index: -1` so it sits between its nearest positioned ancestor's own background and that ancestor's normal-flow content — no per-section content re-layering needed). `CursorGlow` itself gains two props (`variant`, `glow`) controlling color and whether it tracks the cursor at all. Each section gets exactly one instance, wired directly into that section's own component file.

**Tech Stack:** React 19 + TypeScript + Vite, plain CSS custom-property tokens in `src/index.css`, no test framework (verification is `npx tsc -b` + live browser checks via the Claude Browser preview tools).

## Global Constraints

- No test runner exists in this project. Every task's "test" step is `npx tsc -b` plus manual verification in the running dev server via the browser preview tools (`preview_start` with `{ name: "pixellwave-dev" }`, then `computer`/`read_page`/`javascript_tool`). Do not invent a test framework.
- Every commit must use an explicit file pathspec naming only the files that task modified — never `git add -A`, never `git add .`, never a bare `git commit -m` with no pathspec. This repo's working tree always has substantial unrelated pre-existing uncommitted work sitting in it (an in-progress "brutalist tech visual refresh" feature touching `CustomCursor.tsx`, `VideoScrub.tsx`, `logo-wordmark.svg`, and modifications to some files this plan also touches, like `Hero.tsx` and `Logo.tsx`). Run `git status` and `git diff -- <file>` before every commit to confirm only the intended hunks are staged.
- `tsconfig.app.json` has `noUnusedLocals: true` and `noUnusedParameters: true` — removing `PixelTrail` from `Hero.tsx`/`WorkPage.tsx` also makes their `screenSize`/`useScreenSize` unused in both files (each file's only other use of `screenSize` was `PixelTrail`'s `pixelSize` prop) — both the import and the variable must be removed too, or the build fails.
- `Header.tsx`'s own `PixelTrail` usage (the Menu button's hover-glow) is explicitly out of scope — do not touch `Header.tsx` or `src/components/ui/pixel-trail.tsx` in this plan.
- `ContactPage.tsx` and its existing `.contact-page__glow` CSS rule need zero changes — confirmed to stay exactly as already shipped.
- Every new `CursorGlow` instance keeps the component's own built-in `aria-hidden="true"`; the shared `.cursor-glow` class must include `pointer-events: none` so nothing here ever intercepts clicks.
- `WorkReel.tsx` (the homepage's pinned video/gallery reel) and `ProjectPage.tsx`'s pinned video section (`ProjectVideoPinned`/`ProjectVideoAmbient`) get **no** `CursorGlow` instance at all — both already have their own full-bleed video/gallery content, so a dot grid there would be invisible underneath it. Do not add one to "complete" the pattern; these are deliberate exclusions, not gaps.

---

## Task 1: Extend `CursorGlow` with `variant` and `glow` props

**Files:**
- Modify: `src/components/motion/CursorGlow.tsx`

**Interfaces:**
- Produces: `CursorGlow({ className, variant = "dark", glow = true }: CursorGlowProps)`. `variant: "dark" | "light"` controls only the baseline (non-brightened) dot color. `glow: boolean` — when `false`, skips all cursor-tracking (`mousemove`/`mouseleave`) and the `requestAnimationFrame` loop entirely, drawing the static baseline grid once and redrawing only on `resize`. Consumed by every task below.

- [ ] **Step 1: Replace the file's contents**

```tsx
import { useEffect, useRef } from "react"

interface CursorGlowProps {
  className?: string
  /** Baseline (non-brightened) dot color — "dark" (default) is a faint
   *  white, for use on dark-background sections; "light" is an
   *  equivalent-weight faint black, for light-background sections. The
   *  cursor-brightened dots stay the same brand orange in both variants. */
  variant?: "dark" | "light"
  /** Whether this instance tracks the cursor at all. Default true, matching
   *  the original (Contact-page) behavior. When false, skips all
   *  mousemove/mouseleave listeners and the requestAnimationFrame loop —
   *  just draws the static baseline grid once, redrawn only on resize. Used
   *  for sections that want the ambient dot texture without an interactive
   *  cursor highlight (everywhere except each page's hero-equivalent). */
  glow?: boolean
}

const CELL = 26
const RADIUS = 190

/** Ambient background layer — a faint dot grid, optionally glowing the
 *  site's accent orange near the cursor. Purely decorative (aria-hidden, no
 *  pointer events of its own) and static under prefers-reduced-motion (or
 *  whenever glow={false}) — a single frame is drawn and the animation loop
 *  never starts. */
export function CursorGlow({ className, variant = "dark", glow = true }: CursorGlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const mouse = { x: -9999, y: -9999 }
    let raf = 0
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const baseline = variant === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"
    // Skipping cursor tracking entirely (glow={false}) is functionally the
    // same static-single-draw path as prefers-reduced-motion — both just
    // never start the loop below.
    const trackCursor = glow && !reduceMotion

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = rect.width
      canvas!.height = rect.height
      // Resizing the canvas clears its bitmap. The RAF loop repaints the
      // next frame on the cursor-tracking path, but there is no loop when
      // trackCursor is false — without this, any resize after mount (window
      // resize, orientation change, mobile URL-bar show/hide) leaves the
      // grid permanently blank.
      if (!trackCursor) draw()
    }

    function draw() {
      const w = canvas!.width
      const h = canvas!.height
      ctx!.clearRect(0, 0, w, h)
      const cols = Math.ceil(w / CELL)
      const rows = Math.ceil(h / CELL)
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const cx = i * CELL + CELL / 2
          const cy = j * CELL + CELL / 2
          const dx = cx - mouse.x
          const dy = cy - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const t = Math.max(0, 1 - dist / RADIUS)
          const size = 2 + t * 3
          ctx!.fillStyle = t > 0.02 ? `rgba(255,91,0,${(0.08 + t * 0.85).toFixed(3)})` : baseline
          ctx!.fillRect(cx - size / 2, cy - size / 2, size, size)
        }
      }
    }

    function handleMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    function handleLeave() {
      mouse.x = -9999
      mouse.y = -9999
    }

    resize()
    if (trackCursor) {
      const loop = () => {
        draw()
        raf = requestAnimationFrame(loop)
      }
      loop()
      window.addEventListener("mousemove", handleMove)
      document.documentElement.addEventListener("mouseleave", handleLeave)
    }
    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMove)
      document.documentElement.removeEventListener("mouseleave", handleLeave)
    }
  }, [variant, glow])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors. (`ContactPage.tsx` calls `<CursorGlow className="contact-page__glow" />` with no `variant`/`glow` props — both default to `"dark"`/`true`, identical to its current behavior, so this alone doesn't change Contact's rendered output.)

- [ ] **Step 3: Commit**

```bash
git add src/components/motion/CursorGlow.tsx
git commit src/components/motion/CursorGlow.tsx -m "Add variant and glow props to CursorGlow"
```

---

## Task 2: Shared `.cursor-glow` CSS class + replace PixelTrail in the two heroes

**Files:**
- Modify: `src/index.css` (add `.cursor-glow`; remove the now-dead `.hero__trail-pixel` rule at line 595)
- Modify: `src/components/sections/Hero.tsx`
- Modify: `src/pages/WorkPage.tsx`

**Interfaces:**
- Consumes: `CursorGlow` from Task 1.
- Produces: the `.cursor-glow` CSS class, reused by every later task in this plan (not by Contact, which keeps its own dedicated `.contact-page__glow`).

- [ ] **Step 1: Add the shared CSS class**

In `src/index.css`, find `.grain-overlay { ... }` (currently starts around line 1159) and add this immediately after its closing brace:

```css
/* Shared positioning for every CursorGlow usage outside the Contact page
   (which keeps its own dedicated .contact-page__glow, predating this
   class). Negative z-index means it paints between its nearest positioned
   ancestor's own background and that ancestor's normal in-flow content —
   ordinary static content above it needs no z-index of its own to stay on
   top, so this composes into any section without further layering work. */
.cursor-glow { position: absolute; inset: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; }
```

- [ ] **Step 2: Remove the dead `.hero__trail-pixel` rule**

In `src/index.css`, delete this line (currently line 595):

```css
.hero__trail-pixel { background: var(--pw-grey); }
```

- [ ] **Step 3: Replace PixelTrail in `Hero.tsx`**

In `src/components/sections/Hero.tsx`, remove these two imports:

```tsx
import { PixelTrail } from "@/components/ui/pixel-trail"
import { useScreenSize } from "@/components/hooks/use-screen-size"
```

Add instead:

```tsx
import { CursorGlow } from "@/components/motion/CursorGlow"
```

Remove this line from inside `export function Hero({ introDone }: HeroProps) {`:

```tsx
  const screenSize = useScreenSize()
```

Replace:

```tsx
      <PixelTrail
        pixelSize={screenSize.lessThan("md") ? 20 : 32}
        fadeDuration={1500}
        delay={0}
        className="z-0"
        pixelClassName="hero__trail-pixel"
      />
```

with:

```tsx
      <CursorGlow className="cursor-glow" variant="light" glow />
```

- [ ] **Step 4: Replace PixelTrail in `WorkPage.tsx`**

In `src/pages/WorkPage.tsx`, remove these two imports:

```tsx
import { PixelTrail } from "@/components/ui/pixel-trail"
import { useScreenSize } from "@/components/hooks/use-screen-size"
```

Add instead:

```tsx
import { CursorGlow } from "@/components/motion/CursorGlow"
```

Remove this line from inside `export function WorkPage() {`:

```tsx
  const screenSize = useScreenSize()
```

Replace:

```tsx
          <div className="work-hero" data-screen-label="Work Hero">
            <PixelTrail
              pixelSize={screenSize.lessThan("md") ? 20 : 32}
              fadeDuration={1500}
              delay={0}
              className="z-0"
              pixelClassName="hero__trail-pixel"
            />
          </div>
```

with:

```tsx
          <div className="work-hero" data-screen-label="Work Hero">
            <CursorGlow className="cursor-glow" variant="light" glow />
          </div>
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors — in particular, no "declared but never read" errors for `screenSize`/`useScreenSize` in either file (confirming the cleanup in Steps 3-4 was complete).

- [ ] **Step 6: Verify live**

Start the dev preview (`preview_start` with `{ name: "pixellwave-dev" }`), navigate to `http://localhost:5173/`, screenshot the hero, then move the mouse across it and screenshot again — the orange cursor-glow should be visible following the pointer, on a grid of faint dark dots (the hero has a white background, so `variant="light"` should render dark, not white, baseline dots). Repeat at `http://localhost:5173/work` for the `.work-hero` band. Confirm via `read_page` or a `grep`-style DOM check that no `PixelTrail`/`hero__trail-pixel` markup remains on either page.

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/components/sections/Hero.tsx src/pages/WorkPage.tsx
git commit src/index.css src/components/sections/Hero.tsx src/pages/WorkPage.tsx -m "Replace hero PixelTrail effect with CursorGlow"
```

---

## Task 3: Background layers for TickerStrip, Services, Footer

**Files:**
- Modify: `src/components/sections/TickerStrip.tsx`
- Modify: `src/components/sections/Services.tsx`
- Modify: `src/components/sections/Footer.tsx`
- Modify: `src/index.css` (add `position: relative` to the `footer` rule — `.ticker` and `.sec--dark` already have it)

**Interfaces:**
- Consumes: `CursorGlow` and `.cursor-glow` from Tasks 1-2.

- [ ] **Step 1: `TickerStrip.tsx`**

Add the import:

```tsx
import { CursorGlow } from "@/components/motion/CursorGlow"
```

Change:

```tsx
    <div className="ticker" data-theme="dark" aria-hidden="true">
      <Marquee speed={34}>
```

to:

```tsx
    <div className="ticker" data-theme="dark" aria-hidden="true">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <Marquee speed={34}>
```

- [ ] **Step 2: `Services.tsx`**

Add the import:

```tsx
import { CursorGlow } from "@/components/motion/CursorGlow"
```

Change:

```tsx
    <section id="services" className="sec sec--dark" data-theme="dark" data-screen-label="Services">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="wrap">
```

to:

```tsx
    <section id="services" className="sec sec--dark" data-theme="dark" data-screen-label="Services">
      <div className="grain-overlay" aria-hidden="true" />
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
```

- [ ] **Step 3: `Footer.tsx`**

Add the import:

```tsx
import { CursorGlow } from "@/components/motion/CursorGlow"
```

Change:

```tsx
  return (
    <footer data-screen-label="Footer" ref={footerRef}>
      <div className="wrap foot__row">
```

to:

```tsx
  return (
    <footer data-screen-label="Footer" ref={footerRef}>
      <CursorGlow className="cursor-glow" variant="light" glow={false} />
      <div className="wrap foot__row">
```

- [ ] **Step 4: Give `footer` a positioning context**

In `src/index.css`, find the `footer { ... }` rule (`background: var(--surface-subtle); color: var(--pw-black); overflow-x: hidden;`) and add `position: relative;` to it:

```css
footer { position: relative; background: var(--surface-subtle); color: var(--pw-black); overflow-x: hidden; }
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Verify live**

On `http://localhost:5173/`, scroll to the ticker strip, Services section, and footer. Screenshot each. Confirm faint dots are visible in each (dark dots on the ticker/Services dark backgrounds, dark-tinted dots on the light footer — i.e. `variant="dark"` renders faint white and `variant="light"` renders faint black, matching each section's own background). Move the mouse over each — none of them should show the orange cursor-glow (only the two hero instances from Task 2 do).

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/components/sections/TickerStrip.tsx src/components/sections/Services.tsx src/components/sections/Footer.tsx
git commit src/index.css src/components/sections/TickerStrip.tsx src/components/sections/Services.tsx src/components/sections/Footer.tsx -m "Add ambient dot-grid background to TickerStrip, Services, and Footer"
```

---

## Task 4: Studio page — intro (glow), team + floor plan (no glow)

**Files:**
- Modify: `src/components/sections/StudioIntro.tsx`
- Modify: `src/components/sections/StudioTeam.tsx`
- Modify: `src/components/sections/StudioFloorPlan.tsx`
- Modify: `src/index.css` (add `position: relative` to `.studio-intro`, `.studio-team`, `.studio-floor-ambient` — `.floor-pin__inner` already has `position: sticky`)

**Interfaces:**
- Consumes: `CursorGlow` and `.cursor-glow` from Tasks 1-2.

- [ ] **Step 1: `StudioIntro.tsx`**

Add the import:

```tsx
import { CursorGlow } from "@/components/motion/CursorGlow"
```

`StudioIntroScrubbed` and `StudioIntroAmbient` both render the identical opening markup — add the same line to both, right after each's `<div className="grain-overlay" aria-hidden="true" />`:

In `StudioIntroScrubbed`, change:

```tsx
    <section className="studio-intro" data-theme="dark" data-screen-label="Studio Intro" ref={sectionRef}>
      <div className="grain-overlay" aria-hidden="true" />
      <div className="studio-intro__hero" aria-hidden="true" />
```

to:

```tsx
    <section className="studio-intro" data-theme="dark" data-screen-label="Studio Intro" ref={sectionRef}>
      <div className="grain-overlay" aria-hidden="true" />
      <CursorGlow className="cursor-glow" variant="dark" glow />
      <div className="studio-intro__hero" aria-hidden="true" />
```

In `StudioIntroAmbient`, change:

```tsx
    <section className="studio-intro" data-theme="dark" data-screen-label="Studio Intro">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="studio-intro__hero" aria-hidden="true" />
```

to:

```tsx
    <section className="studio-intro" data-theme="dark" data-screen-label="Studio Intro">
      <div className="grain-overlay" aria-hidden="true" />
      <CursorGlow className="cursor-glow" variant="dark" glow />
      <div className="studio-intro__hero" aria-hidden="true" />
```

- [ ] **Step 2: `StudioTeam.tsx`**

Add the import:

```tsx
import { CursorGlow } from "@/components/motion/CursorGlow"
```

Change:

```tsx
    <section className="studio-team" data-theme="dark" data-screen-label="Studio Team">
      <div className="wrap">
```

to:

```tsx
    <section className="studio-team" data-theme="dark" data-screen-label="Studio Team">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
```

- [ ] **Step 3: `StudioFloorPlan.tsx`**

Add the import:

```tsx
import { CursorGlow } from "@/components/motion/CursorGlow"
```

In `StudioFloorPinned`, change:

```tsx
      <div className="floor-pin__inner">
        <div className="grain-overlay" aria-hidden="true" />
        <div className="wrap floor-plan">
```

to:

```tsx
      <div className="floor-pin__inner">
        <div className="grain-overlay" aria-hidden="true" />
        <CursorGlow className="cursor-glow" variant="dark" glow={false} />
        <div className="wrap floor-plan">
```

In `StudioFloorAmbient`, change:

```tsx
    <section className="studio-floor-ambient" data-theme="dark" data-screen-label="Studio Floor Plan">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="wrap">
```

to:

```tsx
    <section className="studio-floor-ambient" data-theme="dark" data-screen-label="Studio Floor Plan">
      <div className="grain-overlay" aria-hidden="true" />
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
```

- [ ] **Step 4: Positioning contexts in CSS**

In `src/index.css`:

Change `.studio-intro { padding-bottom: clamp(2rem, 4vw, 3rem); }` to:

```css
.studio-intro { position: relative; padding-bottom: clamp(2rem, 4vw, 3rem); }
```

Change `.studio-team { padding-block: clamp(3rem, 6vw, 6rem); }` to:

```css
.studio-team { position: relative; padding-block: clamp(3rem, 6vw, 6rem); }
```

Change `.studio-floor-ambient { padding-block: clamp(3rem, 6vw, 6rem); }` to:

```css
.studio-floor-ambient { position: relative; padding-block: clamp(3rem, 6vw, 6rem); }
```

(`.floor-pin__inner` already has `position: sticky` — no change needed there.)

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Verify live**

On `http://localhost:5173/studio`, screenshot the intro section while moving the mouse across it (orange glow should appear), then scroll to the team grid and floor plan sections and screenshot those (faint static dots, no glow on mouse movement there). Check both the desktop (pinned) and a resized-narrow (ambient) viewport for the floor plan section, since it has two separate code paths.

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/components/sections/StudioIntro.tsx src/components/sections/StudioTeam.tsx src/components/sections/StudioFloorPlan.tsx
git commit src/index.css src/components/sections/StudioIntro.tsx src/components/sections/StudioTeam.tsx src/components/sections/StudioFloorPlan.tsx -m "Add ambient dot-grid background to the Studio page"
```

---

## Task 5: Project page — title area (glow), gallery/remainder (no glow)

**Files:**
- Modify: `src/pages/ProjectPage.tsx`
- Modify: `src/index.css` (add two new wrapper classes)

**Interfaces:**
- Consumes: `CursorGlow` and `.cursor-glow` from Tasks 1-2.

`ProjectPage.tsx` currently renders its title block, the pinned video, the second overview block, the gallery, and the next-project link as flat siblings inside one `<main className="project-page">` — there's no existing wrapper scoped to just the title area or just "everything except the video." This task adds two new wrapper `div`s so each region can host its own correctly-sized `CursorGlow` (skipping the video section entirely, per the spec).

- [ ] **Step 1: Add the import**

```tsx
import { CursorGlow } from "@/components/motion/CursorGlow"
```

- [ ] **Step 2: Wrap the title block and the gallery/remainder in new divs**

Change:

```tsx
      <main className="project-page" data-theme="dark">
        <div className="wrap project-overview" data-screen-label="Project Info">
          <Reveal>
            <h1 className="project-page__title">{project.title}</h1>
          </Reveal>
          <Reveal delay={0.05}>
            <ProjectMeta year={project.year} />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="secbody">{project.desc}</p>
          </Reveal>
        </div>

        <ProjectVideo media={project.hero} />

        <div className="wrap project-overview" data-screen-label="Project Overview">
          <Reveal>
            <ProjectMeta />
          </Reveal>
          <Reveal delay={0.05}>
            <p className="secbody">{project.desc}</p>
          </Reveal>
        </div>

        <RevealGroup className="project-gallery" stagger={0.1} data-screen-label="Project Gallery">
          <RevealItem>
            <GalleryRow items={project.gallery.slice(0, Math.ceil(project.gallery.length / 2))} reverse={false} />
          </RevealItem>
          <RevealItem>
            <GalleryRow items={project.gallery.slice(Math.ceil(project.gallery.length / 2))} reverse={true} />
          </RevealItem>
        </RevealGroup>

        <Reveal>
          <Link to={`/work/${nextProject.slug}`} className="project-next wrap" data-screen-label="Next Project">
            <div>
              <span className="project-next__label">Next project</span>
              <span className="project-next__title">
                {nextProject.title} <ArrowUpRight size={28} />
              </span>
            </div>
            <img
              className="project-next__thumb"
              src={nextProject.thumb}
              alt=""
            />
          </Link>
        </Reveal>
      </main>
```

to:

```tsx
      <main className="project-page" data-theme="dark">
        <div className="project-page__hero-glow">
          <CursorGlow className="cursor-glow" variant="dark" glow />
          <div className="wrap project-overview" data-screen-label="Project Info">
            <Reveal>
              <h1 className="project-page__title">{project.title}</h1>
            </Reveal>
            <Reveal delay={0.05}>
              <ProjectMeta year={project.year} />
            </Reveal>
            <Reveal delay={0.1}>
              <p className="secbody">{project.desc}</p>
            </Reveal>
          </div>
        </div>

        <ProjectVideo media={project.hero} />

        <div className="project-page__body-glow">
          <CursorGlow className="cursor-glow" variant="dark" glow={false} />
          <div className="wrap project-overview" data-screen-label="Project Overview">
            <Reveal>
              <ProjectMeta />
            </Reveal>
            <Reveal delay={0.05}>
              <p className="secbody">{project.desc}</p>
            </Reveal>
          </div>

          <RevealGroup className="project-gallery" stagger={0.1} data-screen-label="Project Gallery">
            <RevealItem>
              <GalleryRow items={project.gallery.slice(0, Math.ceil(project.gallery.length / 2))} reverse={false} />
            </RevealItem>
            <RevealItem>
              <GalleryRow items={project.gallery.slice(Math.ceil(project.gallery.length / 2))} reverse={true} />
            </RevealItem>
          </RevealGroup>

          <Reveal>
            <Link to={`/work/${nextProject.slug}`} className="project-next wrap" data-screen-label="Next Project">
              <div>
                <span className="project-next__label">Next project</span>
                <span className="project-next__title">
                  {nextProject.title} <ArrowUpRight size={28} />
                </span>
              </div>
              <img
                className="project-next__thumb"
                src={nextProject.thumb}
                alt=""
              />
            </Link>
          </Reveal>
        </div>
      </main>
```

- [ ] **Step 3: Add the two wrapper classes**

In `src/index.css`, find `.project-page { padding-top: 50svh; background: var(--pw-black); color: var(--pw-white); }` (currently line 774) and add immediately after it:

```css
.project-page__hero-glow { position: relative; }
.project-page__body-glow { position: relative; }
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Verify live**

Navigate to `http://localhost:5173/work/northwind` (or any real project slug). Screenshot the title area while moving the mouse across it (orange glow should appear). Scroll past the pinned video and screenshot the gallery/next-project area (faint static dots, no glow). Confirm the pinned video section itself shows no dot grid at all. Also check the "project not found" fallback path (e.g. `/work/does-not-exist`) still renders correctly — it uses a separate, unmodified `<main className="project-page">` branch this task didn't touch.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/pages/ProjectPage.tsx
git commit src/index.css src/pages/ProjectPage.tsx -m "Add ambient dot-grid background to the Project page"
```

---

## Task 6: Final review pass

**Files:** none new — this task verifies Tasks 1-5's output and fixes anything it finds in the files those tasks touched.

**Interfaces:** none — this is a verification task.

- [ ] **Step 1: Full site sweep**

In the running preview, visit `/`, `/work`, `/work/<a-real-slug>`, `/studio`, and `/contact`. Screenshot each. Confirm: every former-PixelTrail hero (`Hero.tsx`, `.work-hero`) now shows the orange cursor-glow; every other new section shows only static faint dots; Contact is visually unchanged from before this plan.

- [ ] **Step 2: Mobile check**

Resize the preview to `390x844` and repeat the sweep from Step 1. Confirm no horizontal scrollbar appears on any page and the dot grids render at a sensible density (the `CELL`/`RADIUS` constants are fixed pixel values, not viewport-relative, so this just needs a visual sanity check, not a code change).

- [ ] **Step 3: Dead-code check**

```bash
grep -rn "PixelTrail\|hero__trail-pixel" src/components/sections/Hero.tsx src/pages/WorkPage.tsx src/index.css
```

Expected: no matches (both removed in Task 2).

```bash
grep -rn "PixelTrail" src --include="*.tsx"
```

Expected: exactly one remaining match, in `src/components/sections/Header.tsx` (untouched, out of scope).

- [ ] **Step 4: Accessibility spot-check**

```js
document.querySelectorAll('.cursor-glow, .contact-page__glow').length
```

Run this in the browser console (or via `javascript_tool`) on each page and confirm the count matches the plan's mapping (1 on Home's Hero + 3 more on TickerStrip/Services/Footer = 4 total on `/`; 1 on Work's hero; 2 on Project; 3 on Studio — StudioIntro + StudioTeam + StudioFloorPlan's active variant; 0 new instances on Contact, which keeps only its own `.contact-page__glow`). Confirm every one of these elements has `aria-hidden="true"` set.

- [ ] **Step 5: Lint and type-check clean**

Run: `npm run lint`
Expected: no errors.

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Fix anything found in Steps 1-5, then commit if any fixes were needed**

```bash
git add <only the specific files touched by any fix>
git commit <same files> -m "Fix issues found in site-wide dot-grid background review"
```

(Skip this commit entirely if Steps 1-5 found nothing to fix.)
