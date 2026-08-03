# Client logo wall — design spec

**Date:** 2026-08-03
**Status:** Approved, pending implementation

## Summary

Add a two-row, opposite-direction scrolling wall of client names between
`TickerStrip` and `Services` on the homepage, using placeholder text
wordmarks (no real logo assets exist yet) that can be swapped for real
logo files later without touching the component's structure.

## Placement

`src/pages/HomePage.tsx`, inserted between `<TickerStrip />` and
`<Services />`:

```tsx
<WorkReel />
<TickerStrip />
<ClientLogos />
<Services />
```

## Data

New file `src/data/clients.ts`:

```ts
export const CLIENTS: string[] = [
  "Northwind Energy",
  "Tidal Commerce",
  "Solstice Magazine",
  "Meridian Bank",
  "Glasswing Coffee",
  "Nightfall Records",
  "Arclight Studios",
  "Halcyon Health",
  "Driftwood Market",
  "Vantage Analytics",
]
```

Reuses the exact same fictional client roster already established in
`src/data/work.ts`, rather than inventing a second set of fake names —
one placeholder "brand universe" for the whole site. Marked with the
same "temporary placeholder roster, swap for real clients" comment
convention already used in `work.ts`.

The component splits this single list into two rows at render time
(first half / second half — 5 and 5), rather than hand-authoring two
separate arrays, so there's only one list to update when real clients
are swapped in later.

## Component

New file `src/components/sections/ClientLogos.tsx`:

- Dark section (`data-theme="dark"`), own `CursorGlow` instance
  (`variant="dark"`), matching `TickerStrip`'s existing pattern exactly.
- Unlike `TickerStrip` (decorative filler text, `aria-hidden="true"`),
  this is real content — who the studio has worked with — so the
  section is **not** `aria-hidden`. A visually-hidden `<h2>` ("Clients")
  precedes the two rows for screen-reader context, since the marquee
  duplication (each row's content repeated for the seamless loop) would
  otherwise read twice to assistive tech.
- Two rows, each a `<Marquee>` (existing component, unmodified):
  - Row 1: first 5 clients, default direction, `speed={38}`.
  - Row 2: last 5 clients, `reverse`, `speed={44}`.
  - Different speeds so the two rows drift out of phase with each
    other instead of reading as a mechanically identical mirror.
- Each item renders as a `<span className="client-logos__item">`
  wrapping the plain client name text — a typographic placeholder
  standing in for a future logo image. No icon/dot separators (unlike
  `TickerStrip`'s service dots) — logo walls read better as evenly
  spaced marks, not a punctuated list.

```tsx
import { Marquee } from "@/components/motion/Marquee"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CLIENTS } from "@/data/clients"

const MID = Math.ceil(CLIENTS.length / 2)
const ROW_ONE = CLIENTS.slice(0, MID)
const ROW_TWO = CLIENTS.slice(MID)

export function ClientLogos() {
  return (
    <div className="client-logos" data-theme="dark">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <h2 className="sr-only">Clients</h2>
      <Marquee speed={38} className="client-logos__row">
        {ROW_ONE.map((name) => (
          <span className="client-logos__item" key={name}>{name}</span>
        ))}
      </Marquee>
      <Marquee speed={44} reverse className="client-logos__row">
        {ROW_TWO.map((name) => (
          <span className="client-logos__item" key={name}>{name}</span>
        ))}
      </Marquee>
    </div>
  )
}
```

(`sr-only` is Tailwind's built-in utility class — no custom CSS needed,
the project already imports Tailwind in `index.css`.)

## Styling

New rules in `src/index.css`, alongside the existing `.ticker`/`.marquee`
rules:

- `.client-logos`: dark section wrapper. `position: relative; isolation:
  isolate; background: var(--pw-black);` (matches `.ticker`'s own
  background choice), own `padding-block` roughly
  `clamp(2.5rem, 3vw, 5rem)` — more than the single-row `.ticker`
  strip, less than a full `.sec` content section, since this hosts two
  rows but stays a lightweight visual beat rather than a heavy section.
- `.client-logos__row + .client-logos__row` (or similar): vertical gap
  between the two rows, roughly `1.5–2rem`.
- `.client-logos__item`: deliberately a distinct, moderate scale —
  `.ticker__item` reuses the display headline scale (`clamp(4rem, 4.7vw,
  8rem)`) because it *is* the section's giant type-driven content, but a
  logo wall reads as a wall of small marks, not another giant headline
  row. Roughly `font-size: clamp(1.1rem, 1.6vw, 1.5rem); font-weight:
  600; letter-spacing: 0.02em;` — closer to a wordmark chip than a
  headline. `color: var(--pw-neutral-60)` by default, `transition: color
  var(--dur-base) var(--ease-wave)` (matching `.ticker__item`'s own
  transition token), `:hover { color: var(--pw-white); }`.
  `.marquee__group` has no built-in item spacing (`.ticker__item` supplies
  its own via `gap` + `padding-right` on itself) — `.client-logos__item`
  needs the same self-supplied spacing, e.g. `padding-right: clamp(2rem,
  2.6vw, 4rem)`.

Exact padding numbers get tuned against the live browser preview during
implementation — those (not the color/transition values above, now
fixed) are starting points.

## Out of scope

- Real logo image assets — this ships as text placeholders only, swapped
  for real logos in a future pass once assets exist.
- Any change to the shared `Marquee` or `CursorGlow` components — both
  are used exactly as they already exist.
- Pausing the marquee on hover — matches `TickerStrip`'s existing
  precedent of a per-item color change only, no motion pause.
