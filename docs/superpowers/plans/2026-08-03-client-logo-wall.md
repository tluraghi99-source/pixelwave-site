# Client Logo Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-row, opposite-direction scrolling wall of client-name placeholders between `TickerStrip` and `Services` on the homepage.

**Architecture:** A new dark section component (`ClientLogos`) renders two instances of the existing `Marquee` component (one default-direction, one `reverse`) over a shared list of placeholder client names split in half, with its own `CursorGlow` instance matching `TickerStrip`'s existing pattern. No changes to `Marquee` or `CursorGlow` themselves.

**Tech Stack:** React 19 + TypeScript, Framer Motion (via the existing `Marquee` component), plain CSS in `src/index.css` (Tailwind v4 project, but this component's layout/color rules are hand-written CSS matching the rest of the site's section styles).

## Global Constraints

- No automated test framework exists in this project. "Test" steps below mean: `npx tsc -b` (typecheck), `npm run lint` (oxlint), and live verification via the browser preview tools (`mcp__Claude_Browser__*`) — this is the established verification method used throughout this codebase.
- Spec source of truth: `docs/superpowers/specs/2026-08-03-client-logo-wall-design.md`.
- Any element using the shared `.cursor-glow` class MUST have `isolation: isolate` on its own host element, or the canvas's `z-index: -1` silently paints behind the host's own background (a previously-found critical bug in this codebase). The `.client-logos` rule below includes this.
- Client name placeholder list is the existing fictional roster from `src/data/work.ts`'s `client` fields — do not invent new fake names.

---

### Task 1: Client logo wall section

**Files:**
- Create: `src/data/clients.ts`
- Create: `src/components/sections/ClientLogos.tsx`
- Modify: `src/index.css` (insert new rules after line 634, the `.ticker__dot--orange` rule, before the `/* Studio page */` comment block)
- Modify: `src/pages/HomePage.tsx:1-27`

**Interfaces:**
- Consumes: `Marquee` from `@/components/motion/Marquee` (props: `children: ReactNode`, `speed?: number`, `reverse?: boolean`, `className?: string` — unchanged, already exists). `CursorGlow` from `@/components/motion/CursorGlow` (props: `className?: string`, `variant?: "dark" | "light"`, `glow?: boolean` — unchanged, already exists).
- Produces: `CLIENTS: string[]` (named export of `src/data/clients.ts`). `ClientLogos` (named export, no props) rendered as `<ClientLogos />` in `HomePage.tsx`.

- [ ] **Step 1: Create the placeholder client data file**

Create `src/data/clients.ts`:

```ts
// Temporary placeholder roster — swap in real clients as they're ready.
// Reuses the same fictional client names already established in work.ts's
// `client` fields, rather than inventing a second set of fake names.
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

- [ ] **Step 2: Verify the data file typechecks**

Run: `cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && npx tsc -b`
Expected: no output (clean pass). `src/data/clients.ts` isn't imported anywhere yet, so this only confirms the file itself is syntactically valid TypeScript.

- [ ] **Step 3: Create the ClientLogos component**

Create `src/components/sections/ClientLogos.tsx`:

```tsx
import { Marquee } from "@/components/motion/Marquee"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CLIENTS } from "@/data/clients"

const MID = Math.ceil(CLIENTS.length / 2)
const ROW_ONE = CLIENTS.slice(0, MID)
const ROW_TWO = CLIENTS.slice(MID)

// Unlike TickerStrip (decorative filler text, aria-hidden), this is real
// content — who the studio has worked with — so it stays in the
// accessibility tree. The sr-only heading gives screen readers context
// before the two marquee rows, whose own content is each duplicated once
// per row for the seamless-loop effect.
export function ClientLogos() {
  return (
    <div className="client-logos" data-theme="dark">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <h2 className="sr-only">Clients</h2>
      <Marquee speed={38} className="client-logos__row">
        {ROW_ONE.map((name) => (
          <span className="client-logos__item" key={name}>
            {name}
          </span>
        ))}
      </Marquee>
      <Marquee speed={44} reverse className="client-logos__row">
        {ROW_TWO.map((name) => (
          <span className="client-logos__item" key={name}>
            {name}
          </span>
        ))}
      </Marquee>
    </div>
  )
}
```

- [ ] **Step 4: Add the section's CSS rules**

In `src/index.css`, insert immediately after line 634 (`.ticker__dot--orange { background: var(--pw-orange); }`) and before the `/* Studio page */` comment block:

```css

/* client logo wall — two Marquee rows scrolling opposite directions,
   between .ticker and Services. Dark like both neighbors; isolation:
   isolate is required here because .cursor-glow relies on z-index: -1,
   which only works if this element establishes its own stacking context. */
.client-logos {
  position: relative; isolation: isolate;
  background: var(--pw-black);
  padding-block: clamp(2.5rem, 3vw, 5rem);
}
.client-logos__row + .client-logos__row { margin-top: clamp(1.5rem, 2vw, 2rem); }
.client-logos__item {
  display: inline-block;
  font-family: var(--font-display); font-weight: 600; letter-spacing: 0.02em;
  font-size: clamp(1.1rem, 1.6vw, 1.5rem);
  color: var(--pw-neutral-60);
  padding-right: clamp(2rem, 2.6vw, 4rem); white-space: nowrap;
  transition: color var(--dur-base) var(--ease-wave);
}
.client-logos__item:hover { color: var(--pw-white); }
```

- [ ] **Step 5: Wire the section into the homepage**

In `src/pages/HomePage.tsx`, add the import and insert `<ClientLogos />` between `<TickerStrip />` and `<Services />`:

```tsx
import { useState } from "react"
import { Preloader } from "@/components/Preloader"
import { Hero } from "@/components/sections/Hero"
import { TickerStrip } from "@/components/sections/TickerStrip"
import { ClientLogos } from "@/components/sections/ClientLogos"
import { WorkReel } from "@/components/sections/WorkReel"
import { Services } from "@/components/sections/Services"
import { Footer } from "@/components/sections/Footer"

export function HomePage() {
  const [introDone, setIntroDone] = useState(false)

  return (
    <>
      <Preloader onReveal={() => setIntroDone(true)} />
      <div id="top" />
      <Hero introDone={introDone} />
      <div className="page-content">
        <main>
          <WorkReel />
          <TickerStrip />
          <ClientLogos />
          <Services />
        </main>
        <Footer />
      </div>
    </>
  )
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && npx tsc -b && npm run lint`
Expected: both commands produce no errors (oxlint prints only its own invocation line on a clean pass, matching this project's established pattern).

- [ ] **Step 7: Live-verify in the browser**

Using the browser preview tools against the running `pixellwave-dev` server (`mcp__Claude_Browser__preview_start` with `name: "pixellwave-dev"`, then `navigate` to `http://localhost:5173/`):

1. Confirm `.client-logos` renders between the ticker strip and the Services section (query `document.querySelectorAll('.ticker, .client-logos, #services')` and check DOM order).
2. Confirm two rows exist (`document.querySelectorAll('.client-logos .marquee').length === 2`) and that the two `.marquee__track` elements are animating in opposite directions (read each track's `style.transform` at two points in time and confirm one's translateX is increasing while the other's is decreasing, or check the `reverse` row's computed animation direction differs from the first).
3. Confirm `.client-logos` has `isolation: isolate` via computed style, and that `.cursor-glow`'s canvas is actually painting in front of `.client-logos`'s own background (use the established `pointer-events: auto` + `document.elementsFromPoint()` paint-order check from this project's prior dot-grid verification — do NOT rely on a screenshot alone for this, since canvas stacking bugs don't show up in `getImageData()` sampling).
4. Hover a `.client-logos__item` and confirm its computed `color` changes from the `--pw-neutral-60` value to `--pw-white` (via `getComputedStyle`).
5. Take a screenshot confirming the two rows visually read as a logo wall (small wordmark-scale text, not giant ticker-scale type).

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito"
git add src/data/clients.ts src/components/sections/ClientLogos.tsx src/index.css src/pages/HomePage.tsx
git commit -m "$(cat <<'EOF'
Add two-row client logo wall between TickerStrip and Services

Placeholder text wordmarks (same fictional client roster as work.ts)
in two Marquee rows scrolling opposite directions, standing in for
real client logo assets until they exist.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
