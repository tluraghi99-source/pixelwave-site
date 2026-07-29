# Project detail page redesign — design

## Context

The project detail page (`src/pages/ProjectPage.tsx`, shipped at `/work/:slug`) is being reworked based on a reference screenshot the user provided. This replaces the current hero-first / credits-bar / auto-scrolling-marquee-only structure with a title-first layout built around a scroll-pinned full-screen video moment.

## Page structure (top to bottom)

1. **Title.** `<h1>{project.title}</h1>` — no index/tags eyebrow line above it (the current `SectionLabel` "01 — Web, Brand" treatment is removed from this page).
2. **Meta + description (first appearance).** A small label line reading "OVERVIEW" paired with the project's `year`, followed by `project.desc`.
3. **Pinned full-screen video.** As the user scrolls into this section, the video locks to fill the viewport, holds there through a fixed scroll distance (plain autoplay/loop — no scroll-scrubbing), then releases into the rest of the page. A "Skip" button overlaid on the video jumps the scroll straight past the pinned section.
4. **Meta + description (second appearance).** The same label style, but just "OVERVIEW" (no year this time), followed by `project.desc` again — one conceptual "overview" that the video visually interrupts, not two different pieces of copy. (There's no separate long-form body-copy field yet — same limitation already noted as out-of-scope in the original project-page spec.)
5. **Gallery.** The existing two-row, opposite-direction auto-scrolling marquee stays, resized: tiles go from today's ~380×260px to roughly ⅓ of the viewport width each (about 3 visible on screen at once), at a squarer `1:1` aspect ratio instead of the current landscape crop.
6. **Next-project footer bar.** Unchanged — kept as already built (wraps from the last project back to the first).
7. **Site `Footer`.** Unchanged.

Dropped from the current page entirely: the bordered Client/Year/Role credits bar, and the index/tags eyebrow line above the title. `client` and `tags` stay in the `Project` data model (still used by `/work`'s listing and filters) — they're just not displayed on this page anymore.

## The pinned video section

Reuses this site's existing pinned-scroll-scrub pattern (same shape as `WorkReel`'s hero pin and `StudioFloorPlan`'s floor crossfade): a `position: relative` wrapper with a fixed `height` in `vh`, containing a `position: sticky; top: 0; height: 100svh` inner that holds the video full-bleed.

- `HOLD_VH = 120` — the actual scroll-through distance the pin holds for, once the sticky inner has taken over the viewport.
- `PIN_HEIGHT_VH = HOLD_VH + 100 = 220` — the wrapper's own CSS `height`, kept in sync by hand with `HOLD_VH` (matching this site's established convention/comment for every other pinned section).
- Progress is computed via `useScroll({ target: pinRef, offset: ["start start", "end end"] })`, same as the established pattern; the video's own play/loop is independent of scroll (plain `autoPlay loop muted playsInline`, not scroll-scrubbed).
- Once local scroll progress reaches 1 (the hold distance is exhausted), the wrapper's height naturally runs out and the sticky inner un-sticks, and the page continues into the second meta/description block below it.

**Skip button:** a small pill button (matching the site's existing small-button visual language, e.g. `InteractiveHoverButton`-style) positioned bottom-right over the video, always visible while the section is in view. On click: compute the pin wrapper's absolute document offset (`wrapper.getBoundingClientRect().top + window.scrollY`) plus its own height, and `window.scrollTo` that position — jumping straight past the hold, into the second meta/description block.

**Mobile/tablet:** matching this site's established convention that pinned/scrubbed scroll reads as janky at small sizes, mobile/tablet gets a plain, non-pinned variant — the video renders as a normal full-width block in the document's regular flow (no pin, no hold, no Skip button, since there's nothing to skip). Split via the existing `useScreenSize().greaterThanOrEqual("lg")` convention, matching every other pinned/ambient split already on this site.

## Gallery resize

`.project-gallery__item`'s `width`/`height` clamp values change from the current `clamp(260px, 30vw, 380px)` / `clamp(180px, 22vw, 260px)` to a single `width: clamp(320px, 32vw, 520px)` paired with `aspect-ratio: 1/1` (replacing the fixed-height clamp) — roughly ⅓-viewport-wide square tiles, about 3 visible on screen at once on desktop. No change to the marquee mechanic itself (two rows, opposite directions, hover-pause, `prefers-reduced-motion`, the seamless-loop fix already in place).

## Data model

No changes needed to `src/data/work.ts` — `client`, `year`, and `tags` all continue to exist and are still used elsewhere (`year` is still shown on this page, just via the simpler meta line instead of the credits bar; `client`/`tags` remain used by `/work`'s listing/filters, just no longer displayed on this page).

## Out of scope

- No new long-form body-copy field — both "OVERVIEW" text blocks continue to reuse the existing short `desc`, per the user's explicit choice ("one overview, split by the video").
- No scroll-scrubbing of the video's own timeline — plain autoplay/loop only.
- No changes to the next-project footer bar or the site's global `Footer`.

## Files touched

- `src/pages/ProjectPage.tsx` — remove the `SectionLabel` eyebrow and credits-bar JSX; add the meta-line component (used twice), the pinned video section (`*Pinned`/`*Ambient` split), and update the gallery's item-size CSS class usage if needed.
- `src/index.css` — remove `.project-credits`/`.project-credits__label`/`.project-credits__item` rules (confirmed unused anywhere else in `src/`); add `.project-meta`/`.project-meta__label` rules; add the pinned-video section's CSS (wrapper/inner/video/skip button) and its ambient-variant CSS; update `.project-gallery__item`'s sizing rule.
