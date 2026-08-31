# Studio gallery carousel — design spec

**Date:** 2026-08-31
**Status:** Approved, pending implementation

## Summary

Add a new section to the Studio page, right after the team grid (`StudioTeam`),
showing a carousel of studio photos. Desktop reuses the homepage's WebGL
`CircularGallery` component (drag-to-spin, plus a light scroll-linked nudge);
mobile/tablet gets a simpler horizontal drifting track, mirroring the exact
desktop/mobile split `Work.tsx`/`WorkReel.tsx` already use for the homepage's
own carousel. This is a new, independent section — it does not touch the
homepage's carousel, `WorkReel`'s pinned scroll sequence, or any existing
Studio page section.

## What does NOT change

- `Work.tsx`, `WorkReel.tsx`, `Card`, `Tag` — untouched.
- `StudioIntro.tsx`, `StudioTeam.tsx` — untouched, just get a new sibling
  section after them.
- No pinning/scroll-hijacking is introduced anywhere. `WorkReel`'s pin exists
  to choreograph a video-reveal → blackout → carousel narrative; this section
  has no such narrative, so it stays a plain in-flow section like every other
  Studio page section.

## New file: `src/components/sections/StudioGallery.tsx`

One section per file, matching `StudioIntro.tsx`/`StudioTeam.tsx`. Exports a
single `StudioGallery` component that switches between a desktop and a
mobile/tablet render, using the same breakpoint check already used elsewhere
(`ProjectVideo` in `ProjectPage.tsx`, `WorkReel`):

```tsx
import { useRef } from "react"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { useScroll, useTransform, useMotionValueEvent, motion } from "framer-motion"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Reveal } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CircularGallery, type CircularGalleryHandle } from "@/components/ui/circular-gallery"
import { wrap } from "@/lib/motion"

// Temporary stand-in photography (Lorem Picsum) until real studio photos are
// ready — same posture as Work.tsx's GALLERY_ITEMS and StudioTeam's
// TEAM_WITH_PHOTOS.
const STUDIO_PHOTOS = Array.from({ length: 8 }, (_, i) => ({
  image: `https://picsum.photos/seed/pixellwave-studio-${i}/1200/900?grayscale`,
  // No caption for these — pure atmosphere shots, not cataloged items (see
  // circular-gallery.tsx's onHover: an empty text suppresses the hover scrim).
  text: "",
}))

function StudioGalleryHeading() {
  return (
    <Reveal>
      <SectionLabel number="01">Inside the studio</SectionLabel>
      <p className="lead">Where it happens.</p>
    </Reveal>
  )
}

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
        <CircularGallery ref={galleryRef} items={STUDIO_PHOTOS} bend={2} borderRadius={0} className="studio-gallery__canvas" />
      </div>
    </section>
  )
}

function StudioGalleryTrack({ x }: { x: import("framer-motion").MotionValue<string> }) {
  return (
    <motion.div className="studio-gallery__track" style={{ x }}>
      {[...STUDIO_PHOTOS, ...STUDIO_PHOTOS].map((p, i) => (
        <div className="studio-gallery__item" key={i}>
          <img src={p.image} alt="" loading="lazy" />
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

(Exact code above is the reference implementation; the plan will break it into
tasks. `wrap` is the same modulo-wrap helper `WorkAmbient` already imports
from `src/lib/motion.ts`.)

## `StudioPage.tsx`

Add the import and render it after `<StudioTeam />`:

```tsx
import { StudioGallery } from "@/components/sections/StudioGallery"
// ...
<StudioIntro />
<StudioTeam />
<StudioGallery />
```

## CSS additions (`src/index.css`)

Near the existing `.studio-team`/`.work__carousel` rules:

```css
.studio-gallery { position: relative; isolation: isolate; padding-block: clamp(3rem, 6vw, 6rem); }
.studio-gallery__wrap { height: clamp(360px, 42vw, 640px); width: 100%; margin-top: 2rem; position: relative; }
.studio-gallery__canvas { display: block; }

/* Mobile/tablet ambient track — same structure as .work__carousel/.work__track/
   .work__card-wrap, just plain image tiles instead of full project Cards. */
.studio-gallery__carousel { overflow: hidden; width: 100%; margin-top: 3rem; cursor: grab; }
.studio-gallery__track { display: flex; gap: clamp(1.5rem, 0.94vw, 3rem); width: max-content; will-change: transform; padding-inline: clamp(1.25rem, 2.5vw, 4rem); }
.studio-gallery__item { flex: 0 0 clamp(280px, 9.4vw, 520px); aspect-ratio: 4 / 3; overflow: hidden; }
.studio-gallery__item img { width: 100%; height: 100%; object-fit: cover; display: block; }
```

`SectionLabel`'s `pw-seclabel`, `Reveal`'s classes, `.lead`, `.wrap` are all
shared and need no changes.

## Shared-component tweak: `src/components/ui/circular-gallery.tsx`

The `onHover` callback (around the `CircularGallery` component, inside the
`useEffect` that constructs `App`) currently always shows the caption scrim:

```tsx
onHover: (hover) => {
  const caption = captionRef.current
  if (!caption) return
  if (!hover) {
    caption.style.opacity = "0"
    // ...
    return
  }
  caption.style.opacity = "1"
  // ... positions the scrim, sets hovered content
},
```

Change: treat a hover with empty `text` the same as no hover — skip showing
the scrim entirely:

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
  // ... unchanged
},
```

This is additive and backward-compatible: `Work.tsx`'s `GALLERY_ITEMS` always
pass non-empty `text`, so its hover behavior is byte-for-byte unchanged.
Studio's photos pass `text: ""`, so they never trigger the scrim.

## Out of scope

- Any new `data/*.ts` file — the placeholder photo list lives inline in
  `StudioGallery.tsx` since there's no per-photo metadata to justify one.
- Real studio photography — picsum placeholders only, swapped later the same
  way `Work.tsx`/`StudioTeam.tsx` will be.
- Per-photo captions or links — plain images only, per the approved design.
- Any change to `WorkReel.tsx`'s pinned sequence, `Card`, or `Tag`.
