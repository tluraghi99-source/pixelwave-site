# Site-wide grain effect — design

## Context

A subtle animated grain texture (`.grain-overlay`) already exists in this codebase, hand-added as a per-section `<div>` inside 7 call sites: `WorkReel`, `Services`, `StudioIntro` (both desktop/mobile variants), `StudioFloorPlan` (both variants), and `ContactPage`. All of these are dark (`data-theme="dark"`) sections. It's missing from `Hero`, `TickerStrip`, `WorkPage`, `StudioTeam`, `Footer`, `Header`, and every light-background section.

The user asked for the grain to cover the whole site — light and dark sections alike — rather than just the current dark-section subset.

## Decisions

**Scope:** Every section and page gets the grain, regardless of background lightness.

**Look on light vs. dark:** Reuse the existing technique unchanged — `mix-blend-mode: overlay`, 5% opacity, animated fractal-noise SVG background. Verified via the blend-mode math (not just a visual mockup, since screenshot compression flattens fine noise unreliably):

- Overlay's formula is `HardLight(noise, base)`: if `noise <= 0.5`, result = `2 * base * noise`; else result = `1 - 2*(1-base)*(1-noise)`.
- Against a white base (`base=1`): only the darker half of the noise (`noise <= 0.5`) produces visible variation (result ranges 0→1 across that half); the brighter half clips to white.
- Against a black base (`base=0`): the mirror image — only the brighter half of the noise (`noise > 0.5`) produces visible variation; the darker half clips to black.
- After compositing at 5% opacity, both cases land in a `±0.05` delta from their base. The effect is therefore already symmetric in strength between light and dark backgrounds — no new blend mode, opacity change, or per-theme variant is needed.

**Implementation approach:** Consolidate to a single global overlay rather than continuing the per-section duplication pattern.

- One `body::after` pseudo-element, `position: fixed; inset: 0`, defined once in `src/index.css`. No new `<div>`, no new component, no `App.tsx` change — the layer isn't a real DOM node at all, so there's nothing to mount or forget.
- Covers every page and section automatically, including any added in the future — no risk of a new section forgetting to include it.
- Removes the 7 existing per-section `<div className="grain-overlay" aria-hidden="true" />` instances and the JSX lines that render them. Nothing else in those files changes: the `position: relative` those sections have comes from unrelated existing rules (e.g. `.sec--dark`, `.studio-intro`, `.floor-plan`), not from hosting the grain div, so no CSS cleanup is needed there beyond removing the div itself.

**Stacking order:** New CSS custom property `--z-grain: 50`, inserted into the existing z-index scale between `--z-base: 0` and `--z-sticky: 100`. The grain sits above all normal page content but below the sticky/header (`--z-header: 200`), overlay/modal, and toast layers, so it never visually competes with UI chrome.

**Motion:** Same 8s `steps(8)` drift keyframe animation as the current per-section version, and the same `@media (prefers-reduced-motion: reduce)` override that disables the animation (grain remains as a static texture, not removed entirely).

## Out of scope

- No opacity/intensity tuning beyond the existing 5% value — if it needs adjusting after seeing it live, that's a fast follow-up, not part of this change.
- No per-section opt-out mechanism. If a future section needs the grain suppressed, that's handled if/when it comes up.

## Files touched

- `src/index.css` — replace the `.grain-overlay` class rule with a `body::after` rule carrying the same noise background/animation, now `position: fixed; inset: 0` instead of per-section `absolute`; add the `--z-grain` token.
- `src/components/sections/WorkReel.tsx`, `Services.tsx`, `StudioIntro.tsx`, `StudioFloorPlan.tsx`, `src/pages/ContactPage.tsx` — remove the now-redundant per-section `<div className="grain-overlay" ...>` lines (7 total across these 5 files).
