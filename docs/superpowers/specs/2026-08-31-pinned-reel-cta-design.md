# Pinned reel CTA — design spec

**Date:** 2026-08-31
**Status:** Approved, pending implementation

## Summary

Move the homepage's CTA nudge ("Let's talk / Got a wave in mind? / Start a
project") out of its own standalone section and into the tail end of
`WorkReel`'s existing desktop scroll-pin sequence — it fades in centered,
directly beneath the work carousel, once the carousel has finished cycling
through its items, and both stay visible together until the pin releases
into the normal black Services section. The carousel itself (its entrance,
its own scroll-driven item cycling) is completely unchanged — this adds a
new trailing beat, it doesn't alter or replace anything that already
exists. Mobile is unaffected: it never had a pin to begin with, and keeps
showing the CTA as a plain section right after the work carousel, exactly
as today.

Worked out via a round of interactive scroll-scrubbing mockups — an
earlier "carousel cross-fades into CTA" direction was tried and rejected in
favor of this simpler "carousel stays, CTA appears underneath it" approach.

## What does NOT change

- `CtaBand.tsx`'s own full-width row layout (headline left, button right,
  shipped and reviewed earlier) — untouched. It's still exactly what
  renders on mobile.
- The carousel's entrance timing, its own scroll-driven item cycling
  mechanics, `WorkHeading`, `VideoScrubbed`, the video-iris reveal overlay,
  the blackout fade — none of this is touched. This spec only *adds* a new
  trailing scroll segment and a new piece of content within it.
- `Button`, `SectionLabel`, `Reveal` — no shared-component changes.

## Data flow — single source of truth for the copy

Today, `HomePage.tsx` owns the CTA copy directly:

```tsx
<WorkReel />
<CtaBand headline="Got a wave in mind?" />
```

That becomes:

```tsx
<WorkReel ctaHeadline="Got a wave in mind?" />
```

`WorkReel` (the exported component that already branches on screen size
between `WorkReelPinned` and `WorkReelAmbient`) takes a new `ctaHeadline:
string` prop and forwards it to whichever inner component actually renders:

- `WorkReelAmbient` (mobile): renders `<CtaBand headline={ctaHeadline} />`
  right after `<WorkAmbient />` — this is exactly where it visually sits
  today, just relocated one level down so `HomePage.tsx` no longer needs
  its own separate `<CtaBand>` line. No visual change on mobile.
- `WorkReelPinned` (desktop): uses `ctaHeadline` for a new, different,
  reel-local rendering of the same message (see below) — not a `<CtaBand>`
  call, since the pinned context needs a different layout and a different
  reveal mechanism (externally scroll-driven opacity, not `Reveal`'s
  `whileInView`, for the same reason `WorkHeading`/`WorkGallery` already
  don't use `Reveal` inside this pin).

`buttonLabel`/`href` stay at their existing defaults ("Start a project" /
"/contact") in both paths — only `headline` varies today, so only
`headline` needs to be threaded through as a prop.

## Desktop: scroll math

`WorkReel.tsx` already computes the pin's total scroll budget from a chain
of `*_VH` constants (`VIDEO_VH`, `FROZEN_HOLD_VH`, `BLACK_FADE_VH`,
`CAROUSEL_VH`) feeding `PIN_HEIGHT_VH`/`PIN_SCROLL_VH`, and maps local
scroll fractions for each phase (`VIDEO_START_FRACTION`,
`CAROUSEL_SCROLL_START`, `ENTRANCE_END_FRACTION`, etc.) off of those. This
adds one more constant and one more phase, following the exact same
pattern:

```ts
/** Extra scroll, appended after the carousel's own cycling range, spent on
 *  fading the CTA in and then simply holding on it before the pin
 *  releases. */
const CTA_VH = 120
/** How much of CTA_VH is spent fading in vs. just holding once visible. */
const CTA_FADE_VH = 50
```

`PIN_HEIGHT_VH`/`PIN_SCROLL_VH` extend to include `CTA_VH` (today:
`(CAROUSEL_END_GLOBAL - HERO_REVEAL_END + 1) * 100`; becomes the same
formula with `CTA_VH` added to the numerator in vh terms).

**The carousel's own cycling has to finish at the same *place* it does
today, not later** — extending the total scroll range without adjusting
this would spread the carousel's existing cycling across a
longer scroll distance instead of leaving it exactly as-is. So
`carouselProgress`'s mapping changes from:

```ts
const carouselProgress = useTransform(scrollYProgress, [CAROUSEL_SCROLL_START, 1], [0, 1])
```

to mapping onto the *old* local end-fraction re-expressed against the
*new*, larger total (a new constant, `CAROUSEL_CYCLE_END_FRACTION =
oldPinScrollVh / newPinScrollVh`, computed the same way the file's
existing fraction constants are — as a ratio of vh amounts, not a guessed
number):

```ts
const carouselProgress = useTransform(scrollYProgress, [CAROUSEL_SCROLL_START, CAROUSEL_CYCLE_END_FRACTION], [0, 1])
```

The new CTA opacity fades in right after that point, using the same
`clampedProgress`/`FADE_EASE` callback-form pattern already used for
`blackoutOpacity`/`contentOpacity` (array-range `useTransform` has a known
v12 bug in this codebase when domains overlap on a shared
`scrollYProgress` — see the existing comment above `blackoutOpacity` —
so this reuses the callback form deliberately, not by oversight):

```ts
const CTA_FADE_END_FRACTION = CAROUSEL_CYCLE_END_FRACTION + (CTA_FADE_VH / 100) / PIN_SCROLL_VH
const ctaOpacity = useTransform(scrollYProgress, (v) =>
  FADE_EASE(clampedProgress(v, CAROUSEL_CYCLE_END_FRACTION, CTA_FADE_END_FRACTION))
)
```

Past `CTA_FADE_END_FRACTION`, `ctaOpacity` simply stays at `1` (that's
what `clampedProgress` already does past its `end` argument) all the way
to local progress `1.0`, where the pin releases — this is the "hold"
portion of `CTA_VH`.

## Desktop: markup and layout

`.reel__content` (inside `WorkReelPinned`'s JSX) currently has two flex
children: the heading `motion.div.wrap` and `motion.div.work__gallery-wrap`
(which has `flex: 1 1 0%`, so it already grows/shrinks to fill whatever
space its sibling doesn't take). A third child is added after it:

```tsx
<motion.div className="reel__cta" style={{ opacity: ctaOpacity }}>
  <SectionLabel>Let's talk</SectionLabel>
  <p className="reel__cta-headline">{ctaHeadline}</p>
  <Button variant="secondary" href="/contact" iconRight={<ArrowUpRight size={16} />} className="reel__cta-btn">
    Start a project
  </Button>
</motion.div>
```

Because `.work__gallery-wrap` already has `flex: 1 1 0%` (grow *and*
shrink) and `.reel__cta` gets `flex-shrink: 0`, the gallery automatically
gives up exactly the space `.reel__cta` needs once it's occupying any —
no manual height math required, this falls out of the existing flex setup.

**Open verification point, not a guess to resolve blind:** `WorkGallery`
wraps `CircularGallery` (a canvas/WebGL component per
`src/components/ui/circular-gallery.tsx`) — confirm live during
implementation whether that component reflows smoothly when its
container's height changes as `.reel__cta` claims space, or whether it
needs an explicit resize handler triggered off the same scroll value.
This is exactly the kind of thing that has to be checked against the real
running app, not decided on paper.

CSS additions (`src/index.css`, near the existing `.reel__content`/
`.work__gallery-wrap` rules):

```css
.reel__cta { display: flex; flex-direction: column; align-items: center; text-align: center; flex-shrink: 0; gap: clamp(0.5rem, 1vw, 0.75rem); padding-top: clamp(1rem, 2vw, 1.5rem); }
.reel__cta-headline { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.02em; font-size: clamp(1.5rem, 2.6vw, 2.75rem); margin: 0; }
```

(Deliberately smaller than `CtaBand`'s own full-width headline — this sits
*underneath* an already-visible carousel inside a fixed 100svh frame, not
in its own dedicated section, so it reads as a closing note, not a second
hero moment. Exact sizing tuned live.)

## Desktop: button — outline by default, fills orange on hover

Distinct from `CtaBand`'s existing button (solid orange by default) — this
one starts as an outline against the reel's dark backdrop and fills solid
orange only on hover, scoped to this one instance via a descendant
selector (same scoping technique already used for `.cta-band
.pw-seclabel__text`, not a new shared `Button` variant, since this
treatment isn't requested anywhere else):

```css
.reel__cta-btn.pw-btn--secondary {
  background: transparent; color: var(--pw-white); border-color: rgba(255, 255, 255, 0.6);
}
.reel__cta-btn.pw-btn--secondary:hover {
  background: var(--pw-orange); border-color: var(--pw-orange); color: var(--pw-white);
}
```

(Text stays white in both states — white-on-orange already matches how
every other primary button on this site behaves on hover/rest, so the
fill-in doesn't require a text-color flip.)

## Out of scope

- Any change to `CtaBand.tsx`'s own markup, props, or styling — it's
  reused as-is for the mobile path, unmodified.
- A new shared `Button` variant for the outline-fills-orange treatment —
  scoped CSS override only, per above.
- Changing the video/blackout/carousel entrance timing or visuals in any
  way — only a new trailing phase is added after everything that exists
  today.
