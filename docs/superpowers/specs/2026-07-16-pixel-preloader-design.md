# Pixel-grid preloader — design

Date: 2026-07-16
Status: drafted, pending user review

## Problem

The current `Preloader` (`src/components/Preloader.tsx`) shows a branded logo mark
and a progress bar that fills over a fixed, hardcoded 1050ms — it has no relationship
to whether the page's actual critical assets (webfonts, in particular) are ready.
It can reveal the page before fonts have loaded (flash of fallback font) or, on a
fast connection, hold the page hostage for no reason.

Separately, the user saw a checkerboard/mosaic tile-dissolve effect on an external
site (voltlites.com) and wanted an equivalent effect — built from scratch, our own
implementation, our own palette — for PixellWave. Through live iteration in the
visual companion, this settled into a *loading-screen* effect rather than a
scroll-driven one: it replaces the current Preloader's visual entirely.

## Goal

Replace the Preloader's logo+bar UI with a full-black grid of square pixels that
resolves to solid white as the page's real critical assets finish loading, with a
centered percentage counter — both driven by the same underlying progress value.
Once resolved, the page is already showing the Hero's own white background, so the
handoff to the Hero's existing entrance animation (big mark fade/scale-in) is
seamless, exactly as the current exit already achieves it.

## Locked design (validated via live visual-companion iteration)

1. **Full-bleed square pixel grid**, fixed tile size (24px, matching the scale of
   the Hero's existing `PixelTrail` cursor effect for a consistent "pixel" identity
   across the site), computed at mount to exactly cover the viewport (`cols =
   ceil(width / 24)`, `rows = ceil(height / 24)`).
2. **All tiles start solid black.** No initial random black/white pattern, no logo
   mark shown during loading.
3. **Each tile is assigned a random resolve-threshold in [0, 100) up front**, biased
   via `Math.pow(Math.random(), 0.5) * 100` (square-root of a uniform sample). This
   is what produces "starts slowly, becomes rapid": low-threshold tiles are sparse,
   so early progress resolves few tiles; the density of thresholds increases toward
   100, so late progress resolves many tiles in quick succession. No spatial
   pattern (not distance-from-center, not row/column order) — purely random which
   tile resolves when, only *when* is shaped by the threshold distribution.
4. **One shared progress value drives everything.** As real progress advances, any
   tile whose threshold is `<= progress` immediately flips from black to white (own
   `background-color` transition, ~0.35s ease) — tiles are visibly resolving well
   before progress reaches 100, not held back for a separate post-100% reveal pass.
5. **Centered percentage counter**, plain white text (no blend-mode trick), same
   text the whole time — it reads clearly against the still-mostly-black grid early
   on, and optically disappears as the surrounding tiles turn white and match its
   own color, rather than being explicitly faded out.
6. No hero photo is introduced by this work. The grid resolves to a plain white
   field — visually indistinguishable from the Hero's own white background — and
   the existing Hero entrance (big mark fade/scale-in, cursor pixel-trail) takes
   over from there, unchanged.

## Real asset-loading (replaces the fixed 1050ms timer)

Progress is driven by actual loading state instead of a guessed timer:

- **Tracked resource: webfonts only** (`document.fonts.ready`) — Hanken Grotesk and
  IBM Plex Mono are the only above-the-fold assets that can visibly flash/shift on
  slow load (FOUT). The Hero itself has no images; the heavier assets further down
  the page (WorkReel's video, the WebGL gallery's textures) are below the fold and
  load lazily as the user scrolls — blocking the preloader on those would hold the
  page hostage for content the user hasn't reached yet, so they're explicitly *not*
  tracked here.
- **Max-wait fallback: 3500ms.** If `document.fonts.ready` hasn't resolved by then
  (slow network, unsupported API), progress is forced to 100 anyway — the
  preloader must never hang indefinitely.
- **Minimum display duration: 900ms.** `document.fonts.ready` can resolve almost
  instantly if the fonts are already in the browser's HTTP cache from an earlier
  visit (this is independent of the `sessionStorage` skip, which only covers
  *repeat visits within the same session* — a new session can still have cached
  fonts). Without a floor, the tile-resolve animation would flash by incomplete.
  This keeps the original Preloader's intent as a deliberate ~1s branded moment
  intact, while still letting it extend further (up to the 3500ms cap) on a
  genuinely slow load — i.e. reveal fires at `max(900ms, time fonts actually took)`,
  capped at 3500ms.
- **Displayed percentage is a smoothed approximation, not raw binary state.**
  `document.fonts.ready` is a single promise (0% or 100%, no intermediate ticks) —
  displaying a literal binary jump would look broken next to the tile-resolve
  animation's implied continuous progress. The displayed number animates from 0
  toward a target using the same spring-based approach already used by the site's
  `Counter` component (`useMotionValue` + `useSpring`), where the target is nudged
  upward on a short interval while waiting (so it reads as "still working") and
  snapped to 100 the moment the real signal (or the timeout) resolves.

## Scope boundaries

- This replaces `Preloader.tsx`'s internal UI and exit mechanics only. The
  `onReveal` callback contract (`HomePage` flips `introDone` once, which drives the
  Hero's existing big-mark entrance) is unchanged — no other component needs to
  know the preloader looks different internally.
- `sessionStorage` skip-if-already-seen behavior (`pw-intro-seen`) is unchanged —
  repeat visits within a session still skip the preloader entirely.
- `prefers-reduced-motion`: the tile-resolve transitions and the counter's spring
  animation both need to respect it — fall back to an instant/near-instant reveal
  rather than skipping the loading gate entirely (fonts still need to be ready).
- Out of scope: any hero photo, any scroll-driven reveal, any change to the video
  or WebGL gallery's own loading behavior.

## Open items for implementation planning (not decided here)

- Exact spring/tween constants for the displayed percentage's smoothing — a
  reasonable default, tunable at build time, not a design-level decision.
- Whether the grid should rebuild on window resize while still visible (edge case:
  the preloader is only visible for up to ~3.5s on load, a mid-load resize is rare
  enough not to need special handling beyond "don't crash").
