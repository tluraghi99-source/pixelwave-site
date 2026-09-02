# Brutalist-tech visual refresh — design

Date: 2026-07-15
Status: drafted, pending user review

## Problem

The homepage's scroll choreography (hero dock, video reveal, pinned Services/gallery)
works well, but the underlying visual system reads as a generic agency template:
rounded white stat cards, soft cyan pill tags, a hover-arrow service list, one flat
grotesk doing every typographic job, and a Contact page with a large dead black area.
None of this is a content problem (stock photography is explicitly out of scope for
this pass) — it's the shared visual language.

## Goals

- Shift the visual language toward "bold / brutalist-tech": harder edges, a mono
  accent typeface for technical/label moments, color used more sparingly and
  deliberately, and a visible motion layer beyond scroll-triggered reveals.
- Because `Tag`, `Button`, and the shared design tokens are used across the whole
  site, changing them at the token/component level cascades consistently to every
  page (home, `/work`, `/contact`) rather than patching four sections in isolation.
- Preserve the existing scroll-scrub paradigm (Hero dock / WorkReel iris / Services
  pin) — this pass adds to that vocabulary, it doesn't replace it.

## Out of scope

- Real project photography (still Lorem Picsum placeholders) — explicitly deferred.
- Route/page transitions (home ↔ /work ↔ /contact) — considered, not selected.
- The `SERVICES` data's placeholder 7th row (`"altro"`, tags copy-pasted from row 6)
  and the mismatch with the "Six disciplines" copy. This is a content bug, not a
  visual-system issue — flagging it here so it doesn't get lost, but it should be
  fixed by replacing it with a real 6th service (or removing the row) before ship,
  independent of this redesign.

## 1. Type system

Add a second typeface used only for technical/label roles — eyebrows, section
numbers, tags, stat labels, and other UI chrome. Hanken Grotesk (the Halyard
substitute) keeps every display/body role unchanged.

- New family: **IBM Plex Mono** (weights 400/500/600), self-hosted the same way
  Hanken Grotesk is (`@font-face` + local woff2), not a Google Fonts runtime import.
- New token in `lib/motion.ts`-style shared constants or `index.css` `:root`:
  `--font-mono-accent: "IBM Plex Mono", ui-monospace, monospace;`
- Applies to: `.pw-eyebrow`, `.pw-section-number`, `.svc__num`, `.stat__label`
  (new spec-list version), `.pw-tag` (new underline version), nav labels where
  currently plain body text is used for chrome.
- Hanken Grotesk is untouched for `.pw-hero`, `.pw-h2`, `.pw-h3`, `.lead`, body copy.

## 2. Color application rules

Palette itself is unchanged (orange/cyan/black/white/grey) — this is a rule change
for *how* the existing tokens get used, not new colors.

- Cyan (`--pw-cyan` / `--accent-secondary`) stops appearing as a **resting fill**.
  No more solid cyan tag-pill backgrounds. It's reserved for hover/active states
  and small structural accents (e.g. row hover color, focus rings it already owns).
- Orange (`--pw-orange` / `--accent-primary`) stays the primary-action color and
  now also drives the idle breathing-glow on primary CTAs (see §7).
- No literal palette additions or swaps.

## 3. Radius tokens flatten (site-wide token cascade)

Every approved mockup used hard 0–2px edges. To avoid inconsistency (some
components sharp, others still soft-rounded), the shared radius scale in
`index.css` flattens:

| Token | Current | New |
|---|---|---|
| `--radius-xs` … `--radius-xl` | 4px – 24px | 0 (or 2px, TBD for inputs only) |
| `--radius-pill` | 999px | 0 |
| `--radius-control` | 20px | 0 |

**Consequence requiring explicit sign-off:** this also flattens the Work/gallery
`Card` component's corners (`--radius-lg`), even though Card wasn't one of the
four flagged patterns. Leaving Card rounded while every other surface goes
hard-edged would read as an inconsistency rather than a deliberate contrast, so
the recommendation is to flatten it too. If the user wants Card's rounded corners
kept as a deliberate soft/hard contrast, `Card` gets its own radius token instead
of inheriting the shared scale — call this out again before implementation.

## 4. Tag component

`.pw-tag` (currently a rounded pill with solid/cyan/orange/outline variants)
becomes an underline-only mono tag: no background, no border-radius, no container
— `IBM Plex Mono`, uppercase, small tracking, a 1.5–2px bottom rule in the
relevant accent color (orange by default, per §2 no resting cyan fill).

Cascades automatically to: Work/Card meta tags, Services row tags, `/work`
listing filters, and anywhere else `<Tag>` is used — this is the point of doing
it at the component level (Approach B from the earlier discussion).

## 5. Studio stats

Replace the three white rounded stat tiles with a "spec-sheet" list: stacked rows,
mono label left (uppercase, small), Hanken Grotesk number right (larger, in
`--accent-secondary`/cyan per the approved mockup), each row divided by a 1px
`--border-subtle` rule, no background/card container.

## 6. Services rows

Fuse of the two approved directions:

- Service name renders large (Hanken Grotesk, heavy weight, ~1.9rem+), with tags
  dropping to a second line below it (mono, underline style from §4) instead of
  sharing the row with the name.
- On hover: a full-row gradient swatch (orange → cyan, matching the approved
  mockup's diagonal gradient) wipes in from the left behind the row content;
  name/number/tag text flips to black for contrast against the fill; existing
  `padding-left` nudge-on-hover is kept.
- Desktop-pinned scroll-scrub behavior (current `ServicesPinned`) is unchanged —
  this only touches each row's own internal layout/hover, not the pin mechanism.

## 7. Contact page

The empty left column (currently just black space next to the small centered
form) becomes a giant reactive step title: current step name rendered at hero
scale (mirrors the Footer's existing giant-wordmark typographic move), swapping
per step (`Detail` → `Project type` → `When`) instead of the static step-list
labels sitting alone in empty space. Mobile keeps the existing stacked layout
(no giant-title real estate at that width).

## 8. Micro-interactions

Buttons and interactive text links get a text-scramble/decode hover: on
`mouseenter`, the label cycles through random mono glyphs before resolving back
to the real text ("hacker terminal" decode effect), replacing the current
plain color-swap hover states. Applies to `.pw-btn` variants and standalone
text links (nav, "View project," "All projects").

Service row names are explicitly **excluded** — they already get the gradient
swatch + color-flip treatment on hover (§6), and stacking a second hover effect
(scramble) on top of that would compete with it rather than add to it.

## 9. Ambient motion

Two additions, both selected explicitly (a third option — drifting background
gradients — was considered and rejected as too busy):

- **Film-grain/noise overlay** on dark sections (Services, Contact, WorkReel's
  dark content overlay) — a subtle animated grain texture, always-on, low
  opacity. Needs a `prefers-reduced-motion` fallback (static grain or none).
- **Breathing glow on primary CTAs** — primary buttons get a slow (multi-second)
  idle pulse on their existing `--glow-orange` box-shadow, independent of hover/
  focus state. Also needs a `prefers-reduced-motion` fallback (no pulse, static
  glow or none).

## 10. Entrance choreography

Confirmed: new entrance moments below are **scroll-scrubbed** — progress driven
continuously by scroll position, consistent with the site's existing dominant
motion paradigm (Hero dock, WorkReel iris, Services pin) — not simple
trigger-once-on-viewport-entry animations like the current `Reveal` component.

Scroll-scrubbing here does **not** require full pin/sticky mechanics like
WorkReel/Services — it can use a local, non-pinned `useScroll({ target, offset:
[...] })` per section (same pattern already used by `WorkAmbient`'s mobile drift)
so progress is tied to the section's own position passing through the viewport,
without occupying extra scroll-height the way a true pin does.

- **Studio spec-list rows** (§5): each row's divider rule draws in left-to-right
  as the section scrolls through, instead of fading in — echoes the row's own
  rule-divider styling rather than a generic fade/rise.
- **Footer giant wordmark**: gets a `clip-path` wipe reveal driven by scroll
  progress through the footer, instead of the current fade.
- Everything else (Hero, WorkReel, Services pin, Work gallery ambient drift)
  already has bespoke or intentionally-simple choreography and is unchanged.

Desktop-vs-mobile split follows the existing site-wide pattern
(`useScreenSize().greaterThanOrEqual("lg")`): these new scroll-scrubbed
entrances are desktop-only; mobile/tablet keep a simple trigger-once
fade/rise (same as today) since pinned/scrubbed scroll reads as janky at
that viewport size — this mirrors the existing `WorkReelPinned` vs
`WorkReelAmbient` and `ServicesPinned` vs `ServicesAmbient` split.

## Accessibility

- `prefers-reduced-motion: reduce` currently zeroes all CSS
  animation/transition durations globally (`index.css` media query). The new
  scroll-scrubbed transforms and the grain/breathing-glow ambient motion are
  driven by JS (Framer Motion values / rAF / CSS keyframe animations), which
  the existing blanket CSS rule does **not** reach — each new motion addition
  needs its own explicit reduced-motion check at implementation time. Flagging
  here as a build-time requirement, not deciding the exact mechanism now.
- Text-scramble hover (§8) should also respect reduced-motion — fall back to
  the current plain color-swap hover instead of the character-cycle animation.

## Open items for implementation planning (not decided here)

- Exact grain-overlay technique (CSS `background` noise SVG/PNG tile vs canvas) —
  a pure implementation detail, left for the planning step.
- Whether input radius stays at a small 2px (touch-friendliness) vs going fully
  to 0 — minor visual call, left for the planning step.

Two design-level decisions are **not yet confirmed by the user** and need an
explicit answer before this spec is considered final (see §3):

- Card component radius: flatten with everything else (recommended, for
  consistency with every other now-hard-edged surface), or keep as a
  deliberate soft exception.
