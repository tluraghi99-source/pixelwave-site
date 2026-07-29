# Project Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the project detail page (`src/pages/ProjectPage.tsx`, at `/work/:slug`) from its current hero-first/credits-bar/marquee-only layout into a title-first layout built around a scroll-pinned full-screen video moment (with a Skip control), a simplified Overview/Year meta line shown twice around that video, and a resized gallery.

**Architecture:** Same single-page-component architecture as before — no new files, no new routes, no data-model changes. Three sequential edits to the same two files (`src/pages/ProjectPage.tsx`, `src/index.css`): first strip the old eyebrow/credits-bar content down to a simple meta line (shown twice), then insert a new pinned-video section between the two meta appearances (reusing this site's established `WorkReel`/`StudioFloorPlan` pin pattern, but without any scroll-scrubbed transform since the video just autoplays/loops), then resize the gallery tiles.

**Tech Stack:** React 19, TypeScript, React Router 7 (already wired — no route changes), Framer Motion (`Reveal`/`RevealGroup`/`RevealItem`), `useScreenSize` for the desktop/mobile pin-vs-ambient split, hand-written CSS in `src/index.css`.

## Global Constraints

- No test framework in this project — every task's "run the tests" step is `npx tsc -b` + `npm run lint`, plus a manual check against the dev server (`pixellwave-dev`, already running at `http://localhost:5173` via the Browser pane's `preview_list`/`preview_start` tools — reuse it, don't start a second one).
- Prefer `javascript_tool` with `window.location.href = "..."` over the Browser pane's `navigate` tool for same-origin route changes in this environment (the `navigate` tool's path-based nav is known to be flaky here).
- Git commits must use an explicit pathspec (e.g. `git commit src/pages/ProjectPage.tsx src/index.css -m "..."`) — this repo has a lot of unrelated pre-existing uncommitted work sitting in the working tree, and a bare `git commit -m` or `git add -A` will sweep it into your commit. Verify with `git show --stat HEAD` after committing that only your intended files appear.
- Pinned-scroll pattern to match exactly (from `src/components/sections/StudioFloorPlan.tsx` and its CSS in `src/index.css:638-645`): a `position: relative` wrapper with a fixed `height` in `vh` (a hand-computed constant, documented with a comment naming the constant and the exact arithmetic so the CSS number and the JS constant stay in sync), containing a `position: sticky; top: 0; height: 100svh` inner element. This feature's pin does NOT need `useScroll`/`useTransform` at all (unlike `StudioFloorPlan`'s crossfade) — there's no scroll-scrubbed effect, just autoplay/loop video, so the sticky/height CSS alone produces the "locks while scrolling through, releases when the wrapper's extra height runs out" behavir.
- Desktop/mobile split convention: `useScreenSize().greaterThanOrEqual("lg")` from `@/components/hooks/use-screen-size`, rendering a `*Pinned` component on desktop and a plain non-pinned `*Ambient` component otherwise (see `StudioFloorPlan.tsx`'s `StudioFloorPinned`/`StudioFloorAmbient`/`StudioFloorPlan` three-function shape).
- Spec: `docs/superpowers/specs/2026-07-29-project-page-redesign.md`.

---

## Task 1: Simplify to a plain Overview/Year meta line, shown twice

**Files:**
- Modify: `src/pages/ProjectPage.tsx` (remove the `SectionLabel` eyebrow and the bordered credits bar; remove the top hero media block and the now-dead `HeroMedia` function; add a small `ProjectMeta` helper and use it twice, with the project's description repeated after each)
- Modify: `src/index.css` (remove `.project-hero`/`.project-hero__media`/`.project-credits`/`.project-credits__label`; add `.project-meta`/`.project-meta__label`/`.project-overview`)

**Interfaces:**
- Consumes: `PROJECTS_WITH_MEDIA`, `ProjectWithMedia` (unchanged from the existing file).
- Produces: `ProjectMeta({ year }: { year?: number })` — a small local component rendering an "Overview" label, plus the year if one is passed. Task 2 does not need this, but Task 2's new pinned-video section slots in between this task's two meta blocks, so the exact JSX structure below (two sibling `.wrap`-based blocks with a gap where the video goes) matters for Task 2's insertion point.

- [ ] **Step 1: Replace the full contents of `src/pages/ProjectPage.tsx`**

```tsx
import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Footer } from "@/components/sections/Footer"
import { PROJECTS, type Project } from "@/data/work"

interface MediaItem {
  type: "image" | "video"
  src: string
}

interface ProjectWithMedia extends Project {
  hero: MediaItem
  gallery: MediaItem[]
  thumb: string
}

// Temporary stand-in photography (Lorem Picsum) until real project imagery is
// ready — same posture as Work.tsx's GALLERY_ITEMS and StudioTeam's
// TEAM_WITH_PHOTOS. Media URLs never live in data/work.ts itself.
const PROJECTS_WITH_MEDIA: ProjectWithMedia[] = PROJECTS.map((p) => ({
  ...p,
  hero: { type: "image", src: `https://picsum.photos/seed/pixellwave-${p.id}-hero/1600/900?grayscale` },
  gallery: Array.from({ length: 8 }, (_, i) => ({
    type: "image" as const,
    src: `https://picsum.photos/seed/pixellwave-${p.id}-g${i}/900/700?grayscale`,
  })),
  thumb: `https://picsum.photos/seed/pixellwave-${p.id}-hero/400/300?grayscale`,
}))

// Northwind demos the video-hero path with the existing studio.mp4 asset —
// every other project stays image-only until real footage exists.
const northwindEntry = PROJECTS_WITH_MEDIA.find((p) => p.slug === "northwind")
if (northwindEntry) northwindEntry.hero = { type: "video", src: "/video/studio.mp4" }

/** Small "Overview" label, paired with the year on its first appearance only —
 *  this page shows the same overview text twice (split by the video section
 *  Task 2 inserts between them), so the second appearance omits the year. */
function ProjectMeta({ year }: { year?: number }) {
  return (
    <div className="project-meta">
      <span className="project-meta__label">Overview</span>
      {year ? <span className="project-meta__label">{year}</span> : null}
    </div>
  )
}

function GalleryRow({ items, reverse }: { items: MediaItem[]; reverse: boolean }) {
  // Duplicated once so the CSS animation can translate exactly -50% and loop
  // seamlessly — same technique as Marquee.tsx. Each half is wrapped in its
  // own flex group; the per-item gap lives in each item's own trailing
  // margin (see .project-gallery__item in index.css) rather than the track's
  // flex `gap`, so the two groups' rendered widths already include their own
  // connecting gap and a -50% translate lands exactly on one group's width.
  const renderItems = (keyPrefix: string) =>
    items.map((item, i) => (
      <div className="project-gallery__item" key={`${keyPrefix}-${i}`}>
        {item.type === "video" ? (
          <video src={item.src} autoPlay loop muted playsInline />
        ) : (
          <img src={item.src} alt="" loading="lazy" />
        )}
      </div>
    ))

  return (
    <div className="project-gallery__row">
      <div className={`project-gallery__track${reverse ? " project-gallery__track--ltr" : ""}`}>
        <div className="project-gallery__group">{renderItems("a")}</div>
        <div className="project-gallery__group" aria-hidden="true">{renderItems("b")}</div>
      </div>
    </div>
  )
}

export function ProjectPage() {
  const { slug } = useParams<{ slug: string }>()

  const { project, nextProject } = useMemo(() => {
    const index = PROJECTS_WITH_MEDIA.findIndex((p) => p.slug === slug)
    if (index === -1) return { project: undefined, nextProject: undefined }
    return {
      project: PROJECTS_WITH_MEDIA[index],
      nextProject: PROJECTS_WITH_MEDIA[(index + 1) % PROJECTS_WITH_MEDIA.length],
    }
  }, [slug])

  if (!project || !nextProject) {
    return (
      <>
        <main className="project-page" data-theme="dark">
          <div className="wrap project-page__not-found">
            <p className="lead">Project not found.</p>
            <Link to="/work">Back to all projects →</Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <main className="project-page" data-theme="dark">
        <div className="wrap" data-screen-label="Project Info">
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
      <Footer />
    </>
  )
}
```

(The gap between the two `.wrap` blocks above is exactly where Task 2 inserts the pinned video section. `project.hero` is unused by this file until Task 2 reads it again.)

- [ ] **Step 2: Update CSS**

In `src/index.css`, find this block:

```css
.project-page { padding-top: 0; background: var(--pw-black); color: var(--pw-white); }
.project-page__not-found { padding-block: 8rem; }
.project-hero { position: relative; height: 50svh; overflow: hidden; background: var(--pw-neutral-10); }
.project-hero__media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

.project-page__title {
  font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em;
  font-size: clamp(2.5rem, 5vw, 5rem); line-height: 1.05; margin: 0.5rem 0 0;
}

.project-credits {
  display: flex; flex-wrap: wrap; gap: clamp(2rem, 4vw, 3.5rem);
  padding: clamp(1.25rem, 2vw, 1.75rem) 0; margin-top: clamp(2rem, 3vw, 3rem);
  border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);
  font-size: 0.95rem;
}
.project-credits__label {
  display: block; font-family: var(--font-mono-accent); font-size: 0.7rem;
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 0.35rem;
}
```

Replace it with:

```css
.project-page { padding-top: 0; background: var(--pw-black); color: var(--pw-white); }
.project-page__not-found { padding-block: 8rem; }

.project-page__title {
  font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em;
  font-size: clamp(2.5rem, 5vw, 5rem); line-height: 1.05; margin: clamp(6rem, 9vw, 8rem) 0 0;
}

.project-meta { display: flex; gap: clamp(1.5rem, 3vw, 2.5rem); margin-top: clamp(1.5rem, 2.5vw, 2rem); }
.project-meta__label {
  font-family: var(--font-mono-accent); font-size: 0.75rem;
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary);
}

.project-overview { padding-block: clamp(2.5rem, 4vw, 4rem); }
```

(`.project-page__title`'s top margin changes from `0.5rem` — sized to sit right under the removed eyebrow line — to a real top offset, since the title is now the first thing in the page with no hero media above it and no eyebrow directly above it either.)

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Verify live in the browser**

The dev server is already running (`pixellwave-dev`, port 5173).

1. Navigate (full reload, e.g. `window.location.href = "http://localhost:5173/work/northwind"`) to a project page.
2. Confirm: the page starts directly with the title (no video/image above it, no small index/tags eyebrow line), followed by "OVERVIEW" + the year, then the description.
3. Scroll down — confirm a second block appears reading "OVERVIEW" (no year this time) followed by the same description text again, directly above the gallery.
4. Confirm no bordered credits bar (Client/Year/Role three-column strip) appears anywhere.
5. Confirm the gallery, next-project link, and footer still render as before (unaffected by this task).

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProjectPage.tsx src/index.css
git commit -m "Simplify project page to a plain Overview/Year meta line, shown twice"
```

---

## Task 2: Pinned full-screen video section with a Skip control

**Files:**
- Modify: `src/pages/ProjectPage.tsx` (add `useRef`/`useScreenSize` imports, a `HeroMedia` media-rendering helper, `ProjectVideoPinned`/`ProjectVideoAmbient`/`ProjectVideo` components, and render `<ProjectVideo media={project.hero} />` between the two `.wrap`/`.project-overview` blocks from Task 1)
- Modify: `src/index.css` (add `.project-video-pin`/`.project-video-pin__inner`/`.project-video-pin__skip`/`.project-video-ambient`/`.project-video-media`)

**Interfaces:**
- Consumes: `project.hero` (a `MediaItem`, from Task 1's unchanged data derivation); the two `.wrap` blocks Task 1 left with a gap between them.
- Produces: nothing consumed by Task 3 (Task 3 only touches `.project-gallery__item`, unrelated to this task's components).

- [ ] **Step 1: Add imports**

In `src/pages/ProjectPage.tsx`, change:

```tsx
import { useMemo } from "react"
```

to:

```tsx
import { useMemo, useRef } from "react"
```

and add, right after the `react-router-dom` import:

```tsx
import { useScreenSize } from "@/components/hooks/use-screen-size"
```

- [ ] **Step 2: Add the video-pin components**

Add this block right after the `ProjectMeta` function (before `GalleryRow`):

```tsx
function HeroMedia({ media }: { media: MediaItem }) {
  if (media.type === "video") {
    return <video className="project-video-media" src={media.src} autoPlay loop muted playsInline />
  }
  return <img className="project-video-media" src={media.src} alt="" />
}

// 220vh = VIDEO_PIN_HEIGHT_VH below, kept in sync by hand (120 hold + 100).
// Unlike StudioFloorPlan's pin, this one needs no useScroll/useTransform at
// all — there's no scroll-scrubbed opacity or crossfade, the video just
// autoplays and loops in place. The sticky+height combo alone produces the
// "locks while scrolling through, releases once the wrapper's extra height
// runs out" behavior.
const VIDEO_HOLD_VH = 120
const VIDEO_PIN_HEIGHT_VH = VIDEO_HOLD_VH + 100

function ProjectVideoPinned({ media }: { media: MediaItem }) {
  const pinRef = useRef<HTMLElement>(null)

  function handleSkip() {
    const el = pinRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight
    window.scrollTo({ top })
  }

  return (
    <section className="project-video-pin" data-screen-label="Project Video" ref={pinRef}>
      <div className="project-video-pin__inner">
        <HeroMedia media={media} />
        <button type="button" className="project-video-pin__skip" onClick={handleSkip}>
          Skip
        </button>
      </div>
    </section>
  )
}

/** Mobile/tablet: no pin — the video/image just renders as a plain full-width
 *  block in normal document flow, same fallback shape every other pinned
 *  desktop section on this site already uses (see StudioFloorPlan.tsx). */
function ProjectVideoAmbient({ media }: { media: MediaItem }) {
  return (
    <div className="project-video-ambient" data-screen-label="Project Video">
      <HeroMedia media={media} />
    </div>
  )
}

function ProjectVideo({ media }: { media: MediaItem }) {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  return isDesktop ? <ProjectVideoPinned media={media} /> : <ProjectVideoAmbient media={media} />
}
```

- [ ] **Step 3: Render it between the two overview blocks**

In `src/pages/ProjectPage.tsx`, find:

```tsx
        <div className="wrap project-overview" data-screen-label="Project Overview">
```

and insert this immediately above it (still inside `<main>`, right after the first `.wrap` block's closing `</div>`):

```tsx
        <ProjectVideo media={project.hero} />

```

- [ ] **Step 4: Add CSS**

In `src/index.css`, find the blank line between `.project-meta__label { ... }` and `.project-overview { ... }` (added in Task 1), and insert between them:

```css
.project-video-pin { position: relative; height: 220vh; }
.project-video-pin__inner { position: sticky; top: 0; height: 100svh; overflow: hidden; }
.project-video-pin__skip {
  position: absolute; z-index: 2; right: clamp(1.25rem, 2.5vw, 4rem); bottom: clamp(1.5rem, 3vw, 2.5rem);
  padding: 0.6rem 1.25rem; border: 1px solid rgba(255, 255, 255, 0.5); border-radius: 999px;
  background: rgba(0, 0, 0, 0.35); color: var(--pw-white); font-size: 0.8rem;
  text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer;
  transition: border-color var(--dur-base) var(--ease-wave), color var(--dur-base) var(--ease-wave);
}
.project-video-pin__skip:hover { border-color: var(--pw-orange); color: var(--pw-orange); }

.project-video-ambient { position: relative; height: 60vh; overflow: hidden; }
.project-video-media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Verify live in the browser**

1. Reload `http://localhost:5173/work/northwind` at a desktop viewport width (≥1024px — this project's `lg` breakpoint).
2. Scroll down past the first "OVERVIEW / 2025" block — confirm the video locks to fill the entire viewport once it's reached, and playing.
3. Keep scrolling — confirm the video stays pinned/full-screen for a noticeable extra stretch of scroll distance (it shouldn't release after just one screen's worth of scrolling), then releases into the second "OVERVIEW" block (no year) below it.
4. Confirm a "Skip" button is visible over the video (bottom-right); click it and confirm the page jumps straight to the second "OVERVIEW" block, skipping the rest of the hold.
5. Reload `http://localhost:5173/work/tidal-commerce` (an image-hero project, not video) — confirm the same pin/hold/skip behavior works with a static image filling the pinned section instead of a video.
6. Resize the browser to a mobile width (e.g. 500px) and reload `http://localhost:5173/work/northwind` — confirm the video/image now renders as a plain block in normal scroll (no pinning, no Skip button).

- [ ] **Step 7: Commit**

```bash
git add src/pages/ProjectPage.tsx src/index.css
git commit -m "Add pinned full-screen video section with a Skip control to the project page"
```

---

## Task 3: Resize gallery tiles

**Files:**
- Modify: `src/index.css` (`.project-gallery__item` sizing only)

**Interfaces:**
- Consumes: nothing from Tasks 1/2 beyond the existing `.project-gallery__item` selector.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Update the gallery item size**

In `src/index.css`, find:

```css
.project-gallery__item {
  height: clamp(180px, 22vw, 260px); width: clamp(260px, 30vw, 380px);
  flex-shrink: 0; border-radius: 2px; overflow: hidden; margin-right: 0.875rem;
}
```

Replace with:

```css
.project-gallery__item {
  width: clamp(320px, 32vw, 520px); aspect-ratio: 1 / 1;
  flex-shrink: 0; border-radius: 2px; overflow: hidden; margin-right: 0.875rem;
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Verify live in the browser**

1. Reload `http://localhost:5173/work/northwind` at a desktop viewport width and scroll to the gallery.
2. Confirm the tiles are noticeably larger and roughly square (not the previous smaller landscape-cropped thumbnails) — at a typical ~1400-1600px-wide viewport, about 3 tiles should be visible on screen at once per row.
3. Confirm the two-row, opposite-direction auto-scroll and hover-pause still work (unaffected by this task — only the tile dimensions changed).

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "Resize project page gallery tiles to roughly a third of the viewport width"
```

---

## Final Whole-Branch Review

After Task 3, do one pass over the full diff checking:

- The page reads correctly end-to-end on both a video-hero project (Northwind) and an image-hero project (any other slug), at both desktop and mobile widths.
- No leftover references to the removed `SectionLabel` import, `roleFor` function, `.project-hero`/`.project-credits*` CSS classes, or the old bordered credits bar anywhere in the diff.
- The pin's hand-synced `220vh` CSS height still matches `VIDEO_HOLD_VH + 100` in the JS constant (120 + 100) — re-check this wasn't drifted by any later edit.
- The Skip button is keyboard-focusable and has a visible focus state (it's a real `<button>`, not a styled `<div>`, so this should already hold — confirm by tabbing to it).
