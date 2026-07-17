# Services accordion — design

Date: 2026-07-17
Status: drafted, pending user review

## Problem

The current `Services` section (`src/components/sections/Services.tsx`) is a
scroll-pinned reveal on desktop (`ServicesPinned`): the page locks in place for
`SERVICES.length * 60vh + 40vh` of scroll while all 6 rows (number, name, tags —
always fully visible) fade/rise in one after another, driven by
`useScroll`/`useTransform` against the pin's own local `scrollYProgress`. Mobile/
tablet gets a simpler `ServicesAmbient` variant — same content, plain
viewport-triggered fade via `RevealGroup`/`RevealItem`, no pin.

The user shared a reference (a studio site, "Redondo") whose services section is a
plain in-flow **accordion**: each row collapses to just a number + name + a `+`
icon; interacting with a row expands it to reveal a description, columns of tag
pills, and an image, then the `+` becomes an `×`. This is a fundamentally different
interaction (expand/collapse) from the current one (everything-visible, scroll-
scrubbed), not just a restyle.

## Locked design (validated via live mockup iteration in the visual companion)

1. **Drop the scroll-pin entirely.** `ServicesPinned`/`ServicesAmbient` and all
   their pin-height/scroll-scrub math (`PIN_VH_PER_ROW`, `PIN_TAIL_VH`,
   `ServiceRow`'s per-row `useTransform`) are removed. Services becomes a single,
   plain in-flow component — no more desktop/mobile branch needed for the section's
   own mechanics (the accordion works identically at any width; only the
   hover-vs-tap trigger differs, handled by a media query, not a component split).
2. **Section intro copy removed.** The "What we make." lead and the "Six
   disciplines, one studio…" body paragraph are gone (already done directly on the
   live site, ahead of this spec — see commit "Remove the 'What we make.' lead and
   intro body copy from Services"). The section now opens straight from the
   `SectionLabel` into the row list.
3. **Full-bleed rows.** The row list is NOT constrained to a narrower centered
   column — it spans the section's normal `.wrap` page margins edge to edge, same
   as everything else on the site (rejected an earlier draft that capped it at
   1100px and centered it).
4. **Number + name are one visual unit**, not a small muted index next to a big
   name: same font-size, weight, and color. Both scale up together —
   `clamp(3rem, 6.5vw, 6.25rem)` (~100px at typical desktop widths), weight 800,
   `letter-spacing: -0.02em` — matching the reference's proportions where the
   numeral reads at the same visual weight as the service name.
5. **Interaction trigger:** hover-to-open on pointers that support real hovering
   (`(hover: hover)`), tap-to-toggle on touch. Hovering a row opens it and closes
   whichever was open; moving the pointer to empty space (off the whole row list)
   closes everything. On touch, tapping an open row's header closes it; tapping a
   different row's header switches to it.
6. **One row open at a time** (true accordion, not independent toggles).
7. **Expand/collapse mechanics:** CSS grid-template-rows `0fr` → `1fr` trick (no JS
   height measurement), `0.4s` with the site's existing wave-ease curve
   (`EASE_WAVE` from `lib/motion.ts`, matching the `cubicBezier` already used
   elsewhere for consistency — the mockup used the equivalent raw bezier values).
   Revealed content additionally fades and rises in (`opacity`/`translateY`),
   slightly delayed after the row starts expanding, not simultaneous with it.
8. **`+` → `×`:** a 28px icon built from two bars (a plain CSS construct, not an
   icon-font glyph), rotates the whole icon 135° on open — not a scale/collapse of
   just one bar.
9. **On open, number + name both**: transition to `--pw-orange`, and nudge
   `translateX(10px)` — a small rightward shift, not a jump.
10. **Revealed content is a two-column layout:**
    - Left: description paragraph (`max-width: 44ch`), then tag columns below it —
      tags grouped into 2 columns of pill tags (existing `Tag` component, outline
      variant), each pill staggering in (~50ms increment per pill, starting at
      100ms after the row starts opening) rather than all appearing at once.
    - Right: a fixed-width (280px) image, `aspect-ratio: 4/3`, `object-fit: cover`,
      grayscale, `border-radius: 4px`. Starts scaled to `1.12`, settles to `1.0`
      over `0.6s` as the row opens (a subtle zoom-settle, not a flat fade) —
      **fixed width was a deliberate correction**: an earlier draft let the image
      stretch to fill a grid fraction of the now-full-width row, which made it
      enormous; 280px keeps it modest regardless of row width.
    - No background-wash/highlight effect on the row itself — tried and explicitly
      rejected during mockup iteration.
11. **Data shape changes** (`src/data/services.ts`): `SERVICES` currently has
    `{ num, name, tags: string[] }`. This becomes `{ num, name, desc: string,
    tagCols: string[][], image: string }` — `desc` is a short (1–2 sentence)
    description per service, `tagCols` groups the existing tags into 2 columns
    (splitting today's 2-tag lists roughly in half, one tag per column, matching
    the mockup), `image` is a placeholder photo URL. Real copy for `desc` is
    drafted below (placeholder, swap for real copy when available — same posture
    as `Work.tsx`'s placeholder project descriptions).
12. **Placeholder imagery**, matching the existing convention in `Work.tsx`
    (`https://picsum.photos/seed/pixellwave-{id}/1200/900?grayscale`, explicitly
    commented as "Temporary stand-in photography… until real project imagery is
    ready"): `https://picsum.photos/seed/pixellwave-svc-{num}/800/600?grayscale`,
    same explicit "temporary" comment.
13. **Section-level entrance animation is kept, just decoupled from the pin:** the
    row list still fades/rises in as the section scrolls into view, via the same
    `RevealGroup`/`RevealItem` viewport-trigger pattern `ServicesAmbient` already
    uses today — this is independent of, and unrelated to, the accordion's own
    hover/tap open-close behavior. (This detail wasn't explicitly discussed during
    mockup iteration; flagging it here as the proposed default — dropping the pin
    doesn't mean dropping every scroll-triggered reveal, just the scroll-*locked*
    one. Speak up in spec review if you'd rather the list appear with no
    scroll-triggered entrance at all.)

### Placeholder copy (drafted during mockup iteration)

| # | Service | Description | Tag columns |
|---|---|---|---|
| 01 | Web Design | Interfaces that feel considered from the first click — structure, motion, and detail working together instead of fighting each other. | [UX/UI, Design Systems] / [Prototyping, Accessibility] |
| 02 | Brand Identity | A visual language built to hold up across every surface it touches, from a business card to a billboard. | [Logo, Guidelines] / [Naming, Art Direction] |
| 03 | Motion | Interaction and animation that explain themselves — every transition earns its place, nothing moves just to move. | [Interaction, Video] / [Storyboarding, 3D] |
| 04 | Development | Fast, resilient front-ends built directly from the design system — no gap between what's designed and what ships. | [Front-end, Headless] / [Performance, CMS] |
| 05 | Photo | Editorial and product photography shot to match the brand's own tone, not bolted on after the fact. | [Editorial, Retouching] / [Product, Art Direction] |
| 06 | Video & Editing | From concept to final grade — short-form, brand film, and everything a launch needs to move. | [Production, Color Grade] / [Editing, Sound Design] |

## Scope boundaries

- This replaces `Services.tsx`'s internal structure and `services.ts`'s data shape
  only. `SectionLabel`, `Tag`, and the section's outer `id="services"` /
  `data-screen-label` hooks (used by header nav + the scroll-label system
  elsewhere) are unchanged.
- No change to any other section (`WorkReel`, `Studio`, `TickerStrip`, `Footer`).
- `index.css`'s existing `.svc*` rules (`.svc-pin`, `.svc-pin__inner`, `.svc__row`,
  `.svc__swatch`, `.svc__top`, `.svc__name`, `.svc__num`, `.svc__tags`) are dead
  once the pin is removed and need cleanup/replacement with new rules for the
  accordion (new class names to avoid confusion with the removed pin-era ones,
  e.g. `.svc-row`, `.svc-row__head`, `.svc-row__num`, `.svc-row__name`,
  `.svc-row__plus`, `.svc-row__body`, `.svc-row__content`, `.svc-row__desc`,
  `.svc-row__tags`, `.svc-row__image` — matching the mockup's own naming).
- Real project/service photography is out of scope — placeholder Picsum URLs only,
  same posture as `Work.tsx` today.
- `prefers-reduced-motion`: the expand/collapse and image zoom-settle should
  probably skip/shorten their transitions, matching the pattern already
  established elsewhere on the site (e.g. the pixel-preloader's spring, `Card`'s
  hover transforms) — exact handling is an implementation detail, not decided here.

## Open items for implementation planning (not decided here)

- Exact px/rem values for row vertical padding, gaps, and border color beyond what
  the mockup already fixed (`1.25rem 0` row padding, `1rem` num/name gap, `#262626`
  row divider) — these came from mockup tuning and should carry over directly
  rather than being re-derived, but any final polish pass is a normal
  implementation-time judgment call.
- Whether `desc`/`tagCols`/`image` should live inline in `services.ts` (as the
  mockup and this spec assume) or move to a separate constants file — inline is
  the existing pattern (`work.ts` keeps `desc`/`tags`/derived `image` together per
  project) and should just be followed, but not a hard requirement.
- Exact touch/tap close behavior nuance: does tapping *outside* the row list (not
  just tapping the currently-open row's own header) also close it on touch? The
  mockup only wires up tap-toggle on each row's own header; outside-tap-to-close on
  touch is a reasonable nice-to-have, not required by the mockup as validated.
