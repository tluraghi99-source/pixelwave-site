# Studio Gallery Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Inside the studio" carousel section to the Studio page, right after the team grid, reusing the homepage's `CircularGallery` on desktop and a simpler drifting track on mobile/tablet.

**Architecture:** One new section component, `StudioGallery.tsx`, following the existing `StudioIntro.tsx`/`StudioTeam.tsx` one-section-per-file convention, switching on the same `useScreenSize().greaterThanOrEqual("lg")` breakpoint check `ProjectVideo`/`WorkReel` already use. Desktop renders `CircularGallery` (WebGL, drag-to-spin) with a light scroll-linked nudge; mobile/tablet renders a plain horizontal image track modeled on `WorkAmbient`'s `WorkTrack`. A small, backward-compatible tweak to the shared `circular-gallery.tsx` suppresses its hover caption scrim when an item's `text` is empty.

**Tech Stack:** React 19, TypeScript, Vite, Framer Motion, `ogl` (WebGL, inside the existing `circular-gallery.tsx`), Tailwind v4 (`src/index.css`). No test framework in this project — verification is `npx tsc -b`, `npm run lint` (oxlint), and live checks via the Claude Browser preview tools against the Vite dev server (`.claude/launch.json`'s `pixellwave-dev` config, `/studio` route).

## Global Constraints

- No new `data/*.ts` file — the placeholder photo list lives inline in `StudioGallery.tsx` (no per-photo metadata to justify a data file).
- Photos are Lorem Picsum placeholders, grayscale, seeded `pixellwave-studio-<i>`, matching the exact posture/comment style of `Work.tsx`'s `GALLERY_ITEMS` and `StudioTeam.tsx`'s `TEAM_WITH_PHOTOS`.
- No captions, tags, or links on studio photos — plain images only.
- No pinning/scroll-hijacking — this section stays in normal document flow like every other Studio page section.
- Section heading uses the site's existing eyebrow+headline pattern (`SectionLabel` + `.lead`), starting at number `"01"` (first numbered section on the Studio page). Eyebrow text: `"Inside the studio"`. Headline text: `"Where it happens."`
- The `circular-gallery.tsx` tweak must be additive/backward-compatible: `Work.tsx`'s existing captioned gallery behavior must be byte-for-byte unchanged (it always passes non-empty `text`).
- Desktop breakpoint check: `useScreenSize().greaterThanOrEqual("lg")` — identical to `ProjectVideo` (`src/pages/ProjectPage.tsx`) and `WorkReel` (`src/components/sections/WorkReel.tsx`).

---

### Task 1: Suppress the hover caption scrim for empty-text gallery items

**Files:**
- Modify: `src/components/ui/circular-gallery.tsx:618-639`

**Interfaces:**
- Consumes: nothing new — this only changes the body of the existing `onHover` callback passed into `new App(...)` inside `CircularGallery`'s `useEffect`.
- Produces: the caption scrim (`.gallery-caption`, opacity fade) no longer appears when the hovered item's `text` is an empty string. Callers passing non-empty `text` (i.e. `Work.tsx`'s `GALLERY_ITEMS`) see no behavior change. This is what Task 2's `StudioGallery` desktop variant relies on (it passes `text: ""` for every item).

- [ ] **Step 1: Read the current `onHover` callback to confirm line numbers before editing**

Run: `grep -n "onHover: (hover)" -A 20 "src/components/ui/circular-gallery.tsx"`

Expected output starts with:
```
      onHover: (hover) => {
        const caption = captionRef.current
        if (!caption) return
        if (!hover) {
```

- [ ] **Step 2: Change the empty-hover guard to also treat empty-text hovers as "no hover"**

In `src/components/ui/circular-gallery.tsx`, inside the `onHover` callback (the one passed as part of the `App` options object in the `CircularGallery` component's `useEffect`), change:

```tsx
      onHover: (hover) => {
        const caption = captionRef.current
        if (!caption) return
        if (!hover) {
          caption.style.opacity = "0"
          if (hoveredIndexRef.current !== null) {
            hoveredIndexRef.current = null
            setHoveredContent(null)
          }
          return
        }
        caption.style.opacity = "1"
```

to:

```tsx
      onHover: (hover) => {
        const caption = captionRef.current
        if (!caption) return
        if (!hover || !hover.text) {
          caption.style.opacity = "0"
          if (hoveredIndexRef.current !== null) {
            hoveredIndexRef.current = null
            setHoveredContent(null)
          }
          return
        }
        caption.style.opacity = "1"
```

The rest of the callback (the five lines setting `caption.style.left/top/width/height/transform` and the `setHoveredContent` block) is unchanged.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc -b`
Expected: no output, exit code 0.

Run: `npm run lint`
Expected: no errors reported for `src/components/ui/circular-gallery.tsx`.

- [ ] **Step 4: Live-verify the homepage gallery's existing captions are unaffected**

Start the dev server (`preview_start` with `{"name": "pixellwave-dev"}`), navigate to `/`, scroll into the pinned work-reel section until the carousel is visible, then hover over one of its cards.

Check via `read_page` or `javascript_tool`:
```js
document.querySelector(".gallery-caption").style.opacity
```
Expected: `"1"` while hovering a card, and the caption's `.gallery-caption__title` text is non-empty (matches one of the three homepage project titles).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/circular-gallery.tsx
git commit -m "Suppress gallery hover scrim for items with no caption text

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Add the StudioGallery section and wire it into the Studio page

**Files:**
- Create: `src/components/sections/StudioGallery.tsx`
- Modify: `src/pages/StudioPage.tsx`
- Modify: `src/index.css` (new rules appended near the existing `.studio-team`/`.work__carousel`/`.work__gallery-wrap` rules — exact insertion point doesn't matter, CSS has no import order dependency here)

**Interfaces:**
- Consumes: `useScreenSize` (`@/components/hooks/use-screen-size`, default export `useScreenSize`, returns an object with `.greaterThanOrEqual(size: ScreenSize): boolean`), `wrap` (`@/lib/motion`, `wrap(min: number, max: number, v: number): number`), `SectionLabel` (`@/components/pw/SectionLabel`, props `{ number?: string; children: ReactNode }`), `Reveal` (`@/components/motion/Reveal`, props `{ children; className?; delay?: number }`), `CursorGlow` (`@/components/motion/CursorGlow`, props `{ className?: string; variant?: "dark" | "light"; glow?: boolean }`), `CircularGallery`/`CircularGalleryHandle` (`@/components/ui/circular-gallery`, props `{ items: GalleryItem[]; bend?: number; borderRadius?: number; className?: string }`, ref exposes `{ setProgress(progress: number): void }`), `GalleryItem` type (`{ image: string; text: string; tags?: GalleryTag[] }`) — all consumed as-is, no changes needed from Task 1 beyond what's already in place.
- Produces: `StudioGallery` — a zero-prop component, default export not used (named export, matching `StudioIntro`/`StudioTeam`'s style: `export function StudioGallery()`). `StudioPage.tsx` is the only consumer.

- [ ] **Step 1: Create `src/components/sections/StudioGallery.tsx`**

```tsx
import { useRef } from "react"
import type { MotionValue } from "framer-motion"
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Reveal } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CircularGallery, type CircularGalleryHandle } from "@/components/ui/circular-gallery"
import { wrap } from "@/lib/motion"

// Temporary stand-in photography (Lorem Picsum) until real studio photos are
// ready — same posture as Work.tsx's GALLERY_ITEMS and StudioTeam's
// TEAM_WITH_PHOTOS. No caption text: these are atmosphere shots, not
// cataloged items — an empty `text` suppresses circular-gallery.tsx's hover
// scrim (see the onHover tweak there).
const STUDIO_PHOTOS = Array.from({ length: 8 }, (_, i) => ({
  image: `https://picsum.photos/seed/pixellwave-studio-${i}/1200/900?grayscale`,
  text: "",
}))

function StudioGalleryHeading() {
  return (
    <>
      <Reveal>
        <SectionLabel number="01">Inside the studio</SectionLabel>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="lead">Where it happens.</p>
      </Reveal>
    </>
  )
}

/** Desktop (lg+): the same WebGL CircularGallery the homepage carousel uses —
 *  drag-to-spin, plus a light scroll-linked nudge as the section scrolls
 *  through the viewport. No pinning: this section has no video/blackout
 *  narrative to choreograph, unlike WorkReel, so it stays in normal flow. */
function StudioGalleryDesktop() {
  const sectionRef = useRef<HTMLElement>(null)
  const galleryRef = useRef<CircularGalleryHandle>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    galleryRef.current?.setProgress(latest)
  })

  return (
    <section
      className="studio-gallery"
      data-theme="dark"
      data-screen-label="Studio Gallery"
      ref={sectionRef}
    >
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
        <StudioGalleryHeading />
      </div>
      <div className="studio-gallery__wrap">
        <CircularGallery
          ref={galleryRef}
          items={STUDIO_PHOTOS}
          bend={2}
          borderRadius={0}
          className="studio-gallery__canvas"
        />
      </div>
    </section>
  )
}

/** Mobile/tablet: no WebGL, no pinning — a plain horizontal track that
 *  drifts as the section scrolls through, structurally identical to
 *  WorkAmbient's WorkTrack (Work.tsx) but rendering plain <img> tiles
 *  instead of full project Cards (studio photos aren't clickable items). */
function StudioGalleryTrack({ x }: { x: MotionValue<string> }) {
  return (
    <motion.div className="studio-gallery__track" style={{ x }}>
      {[...STUDIO_PHOTOS, ...STUDIO_PHOTOS].map((photo, i) => (
        <div className="studio-gallery__item" key={i}>
          <img src={photo.image} alt="" loading="lazy" />
        </div>
      ))}
    </motion.div>
  )
}

function StudioGalleryAmbient() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })
  const rawX = useTransform(scrollYProgress, [0, 1], [0, -300])
  const x = useTransform(rawX, (v) => `${wrap(-50, 0, v)}%`)

  return (
    <section
      className="studio-gallery studio-gallery--ambient"
      data-theme="dark"
      data-screen-label="Studio Gallery"
      ref={sectionRef}
    >
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
        <StudioGalleryHeading />
      </div>
      <Reveal delay={0.2} className="studio-gallery__carousel">
        <StudioGalleryTrack x={x} />
      </Reveal>
    </section>
  )
}

export function StudioGallery() {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  return isDesktop ? <StudioGalleryDesktop /> : <StudioGalleryAmbient />
}
```

- [ ] **Step 2: Wire `StudioGallery` into the Studio page**

Read `src/pages/StudioPage.tsx` first to confirm it still matches this exact shape (it may have changed since this plan was written):

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

Change it to:

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

- [ ] **Step 3: Add the CSS rules**

Append to `src/index.css` (e.g. right after the `.gallery-caption__tags` rule at the end of the block shown below — the exact location doesn't matter, there's no cascade dependency):

```css
.studio-gallery { position: relative; isolation: isolate; padding-block: clamp(3rem, 6vw, 6rem); }
.studio-gallery__wrap { height: clamp(360px, 42vw, 640px); width: 100%; margin-top: 2rem; position: relative; }
.studio-gallery__canvas { display: block; }

/* Mobile/tablet ambient track — same structure as .work__carousel/.work__track/
   .work__card-wrap (Work.tsx's WorkAmbient), just plain image tiles instead
   of full project Cards, since studio photos aren't clickable items. */
.studio-gallery__carousel { overflow: hidden; width: 100%; margin-top: 3rem; cursor: grab; }
.studio-gallery__track { display: flex; gap: clamp(1.5rem, 0.94vw, 3rem); width: max-content; will-change: transform; padding-inline: clamp(1.25rem, 2.5vw, 4rem); }
.studio-gallery__item { flex: 0 0 clamp(280px, 9.4vw, 520px); aspect-ratio: 4 / 3; overflow: hidden; }
.studio-gallery__item img { width: 100%; height: 100%; object-fit: cover; display: block; }
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc -b`
Expected: no output, exit code 0.

Run: `npm run lint`
Expected: no errors reported for `src/components/sections/StudioGallery.tsx`, `src/pages/StudioPage.tsx`, or `src/index.css`.

- [ ] **Step 5: Live-verify the desktop variant**

Start the dev server (`preview_start` with `{"name": "pixellwave-dev"}` if not already running), open a tab sized to desktop width (`resize_window` with `preset: "desktop"` or a width ≥ 1024), navigate to `/studio`, and scroll down past the team grid.

Check via `read_page` or `get_page_text`:
- The heading "Inside the studio" / "Where it happens." appears after the team grid and before the footer.
- `document.querySelector(".studio-gallery__canvas canvas")` exists (the WebGL canvas mounted).

Check the scroll-linked nudge and hover-scrim suppression via `javascript_tool`:
```js
const wrap = document.querySelector(".studio-gallery__wrap")
wrap.scrollIntoView({ block: "center" })
await new Promise(r => setTimeout(r, 300))
document.querySelector(".gallery-caption")?.style.opacity
```
Expected: `"0"` (no caption visible even after the section has scrolled into view and the canvas has rendered — nothing has been hovered yet).

Then simulate a hover over the canvas (`computer` tool `hover` action at the canvas's center coordinates) and re-check:
```js
document.querySelector(".gallery-caption").style.opacity
```
Expected: `"0"` (still no scrim, since every studio photo has empty `text` — this is the Task 1 behavior applied to real empty-text items for the first time).

Also verify dragging spins the gallery: use `computer` `left_click_drag` from the canvas center to ~200px left, then screenshot or diff `canvas` pixel content isn't reused verbatim — a visual screenshot before/after the drag is sufficient evidence.

- [ ] **Step 6: Live-verify the mobile variant**

`resize_window` to `preset: "mobile"`, reload `/studio`, scroll past the team grid.

Check via `read_page`:
- The same heading text appears.
- `document.querySelectorAll(".studio-gallery__item img").length` is `16` (8 photos × 2, doubled for the seamless-loop track, matching `WorkTrack`'s `CARDS` doubling pattern).
- No `canvas` element exists inside `.studio-gallery` (confirms the WebGL path did not mount on mobile).

Reset the viewport afterward: `resize_window` with `preset: "desktop"`.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/StudioGallery.tsx src/pages/StudioPage.tsx src/index.css
git commit -m "Add studio photo carousel section to the Studio page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
