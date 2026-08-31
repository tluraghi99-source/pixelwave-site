# CTA band full-width redesign — design spec

**Date:** 2026-08-31
**Status:** Approved, pending implementation

## Summary

Redesign `CtaBand` (`src/components/sections/CtaBand.tsx`) from a narrow,
centered column (eyebrow, headline, button all stacked and centered) into a
full-width composition: headline anchored left, button anchored right on
the same row, both aligned to the headline's baseline. Established through
a round of visual mockups — the centered layout read as small and
under-designed next to the site's otherwise oversized, confident type
(Hero's wordmark, Footer's giant text, Services' huge numbers), and didn't
use the available width the way every other section on the page does.

## Visual hierarchy

Three elements, three clearly distinct weights — this was the specific
thing the centered version got wrong (nothing stood out as more important
than anything else):

1. **Headline — dominant.** The biggest, boldest thing in the section (the
   hook). Font-weight 800, tight letter-spacing (~-0.035em), tight
   line-height (~0.9).
2. **Button — clear second.** Compact, not competing with the headline in
   size — it stands out through color/contrast (solid orange on black),
   not through scale.
3. **Eyebrow label ("Let's talk") — quietest.** Smaller and lighter-weight
   than it currently is, muted gray instead of solid white, and a
   shorter/thinner accent rule — reads as a category tag, not a UI
   element competing for attention. **This treatment is scoped to
   `.cta-band` only** — the shared `SectionLabel` component's default
   look (solid white, `--rule` at 2.5rem/2px) is unchanged everywhere
   else it's used (Services, Work).

## Layout

**Desktop:** one row, `justify-content: space-between`, `align-items:
flex-end` — headline block on the left (flexible width, wraps within a
`ch`-based max-width so it doesn't stretch edge-to-edge on very wide
screens), button on the right (fixed to its own content width,
`flex-shrink: 0`), both bottom-aligned so the button sits on the
headline's baseline.

**Mobile:** doesn't attempt to fit headline + button side by side at the
headline's full size — stacks vertically instead (headline, then button
below it), both left-aligned. This carries the "not centered" decision
through to mobile too, not just desktop; it does **not** fall back to the
old centered treatment.

## Sizing

The mockup's 96px headline was measured in a fixed-width mockup frame, not
the real fluid site — the actual implementation uses a `clamp()` in the
same spirit as every other large headline in this codebase (e.g.
`.svc-row__num`'s `clamp(3rem, 6.5vw, 6.25rem)`), tuned against the live
browser preview during implementation so it holds up correctly across
viewport widths rather than copying 96px literally. Same approach for the
button and eyebrow sizes below — the exact numbers here are targets, not
literal values to paste in blind.

- **Headline:** roughly 4.5–7rem effective size at typical desktop
  widths (in the neighborhood of the mockup's 96px), scaling down at
  narrow viewports via the clamp's own minimum rather than a separate
  mobile override.
- **Button:** `<Button variant="primary" size="md" href={href}
  iconRight={<ArrowUpRight size={18} />}>` — drops from the current
  `size="lg"` to the existing `size="md"` token. No new one-off button
  size; the compact-#2 feel comes from the headline's much larger scale,
  not from shrinking the button below what the design system already
  offers. The `pill` prop is dropped — `--radius-pill` already resolves
  to `0` sitewide (this project zeroes every radius token), so it was
  already rendering square and the prop was dead/misleading.
- **Eyebrow:** smaller than `SectionLabel`'s current default, lighter
  font-weight (~500 vs. the shared default), muted color (`rgba(255,
  255, 255, 0.45)` rather than solid white), shorter/thinner rule
  (~1.5rem, 1px, `rgba(255, 91, 0, 0.6)` vs. the shared default's 2.5rem/
  2px solid `var(--accent-primary)`).

## Component changes

`CtaBand.tsx`: same props/interface (`label`, `headline`, `buttonLabel`,
`href`), same three children (`SectionLabel`, headline `<p>`, `Button`) —
only the wrapping markup and the button's `size` prop change. The current
structure:

```tsx
<div className="wrap cta-band__inner">
  <Reveal><SectionLabel>{label}</SectionLabel></Reveal>
  <Reveal delay={0.08}><p className="cta-band__headline">{headline}</p></Reveal>
  <Reveal delay={0.16}>
    <Button variant="primary" size="lg" pill href={href} iconRight={<ArrowUpRight size={18} />}>
      {buttonLabel}
    </Button>
  </Reveal>
</div>
```

becomes a row/column wrapper with the headline+label grouped on one side
and the button on the other:

```tsx
<div className="wrap cta-band__inner">
  <div className="cta-band__copy">
    <Reveal><SectionLabel>{label}</SectionLabel></Reveal>
    <Reveal delay={0.08}><p className="cta-band__headline">{headline}</p></Reveal>
  </div>
  <Reveal delay={0.16} className="cta-band__cta">
    <Button variant="primary" size="md" href={href} iconRight={<ArrowUpRight size={18} />}>
      {buttonLabel}
    </Button>
  </Reveal>
</div>
```

(`Reveal` already accepts a `className` prop and forwards it to its
`motion.div`, matching how it's used elsewhere in this same file — no
change needed to the shared component.)

## Styling

`src/index.css`, replacing the current `.cta-band`/`.cta-band__inner`/
`.cta-band__headline` block:

- `.cta-band__inner`: `display: flex; flex-direction: row;
  justify-content: space-between; align-items: flex-end; gap:` (a
  generous horizontal gap, tuned live); `text-align: left` (was
  `center`). Drops the current `flex-direction: column; align-items:
  center; text-align: center`.
- `.cta-band__copy`: no special layout rules needed beyond stacking its
  two children (default block flow already does this) — exists mainly as
  the left-side flex item / max-width container for the headline block.
- `.cta-band__headline`: font-size clamp increased from the current
  `clamp(2.75rem, 4.4vw, 6rem)` to roughly `clamp(3.5rem, 6.5vw, 7.5rem)`
  (tune live), `font-weight: 800` (was `700`), tighter `line-height`
  (~0.9, was `1.02`), `max-width` narrowed to a `ch` value that keeps the
  headline from stretching the full row width and crowding the button.
- `.cta-band__cta`: `flex-shrink: 0` so the button never gets squeezed as
  the headline grows.
- New, scoped to this section only: `.cta-band .pw-seclabel__text` (muted
  color/weight) and `.cta-band .pw-seclabel__rule` (shorter/thinner/
  dimmer) — overriding just this instance, not `SectionLabel`'s shared
  defaults.
- `@media (max-width: 767px)`: `.cta-band__inner { flex-direction:
  column; align-items: flex-start; }` — headline stacks above the
  button, both left-aligned, headline's clamp naturally shrinks at
  narrow widths via its own minimum.

## Out of scope

- Any change to the shared `SectionLabel`, `Button`, or `Reveal`
  components themselves — all three keep their existing APIs and
  defaults; only this one call site's props/scoped CSS change.
- Any change to where `CtaBand` is used or what copy it's given
  (`HomePage.tsx`'s `<CtaBand headline="Got a wave in mind?" />` call is
  untouched).
- The alternate "stacked, headline spans full width, button below on its
  own row with a rule filler" layout explored earlier in the mockup round
  — the row layout (headline left / button right, same row) was the
  chosen direction, not this one.
