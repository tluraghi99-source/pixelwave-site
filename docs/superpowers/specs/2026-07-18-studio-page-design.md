# Studio page — design

Date: 2026-07-18
Status: drafted, pending user review

## Problem

"Studio" in the header nav currently points to `#studio`, an in-page section on the
homepage (`src/components/sections/Studio.tsx`) that shows a short statement plus
three scroll-scrubbed stat rows (projects shipped, client satisfaction, disciplines).
It says nothing about *who* works here or *where* — no people, no space.

The user wants a proper, dedicated Studio page — the people and the physical space —
based on a rough wireframe they shared: a large descriptive text block, a grid of
team photo-cards, and a two-floor wireframe floor plan navigated by scrolling.

## Locked design (validated via clarifying questions + live mockup iteration)

### 1. Routing — replaces the homepage section, doesn't sit alongside it

- New route `/studio` → new `src/pages/StudioPage.tsx`, wired into `App.tsx`
  alongside `/work` and `/contact`. Ends in `<Footer />`, matching `WorkPage`'s
  shape (not `ContactPage`'s single-locked-viewport shape, since this page has
  real scrollable content).
- Header nav updated in both places "Studio" appears — the top-bar `links` array
  and the full-panel `MENU_COLUMNS` entry (`src/components/sections/Header.tsx`)
  — from `href: "#studio"` to `href: "/studio"`.
- The current homepage `Studio` section is removed entirely: `Studio.tsx` deleted,
  its import/usage removed from `src/pages/HomePage.tsx`, and its now-fully-dead
  CSS block removed from `index.css` (`.studio__grid`, `.studio__statement`,
  `.studio__stats`, `.studio__stats--scrubbed`, `.stat`, `.stat--scrubbed`,
  `.stat__rule`, `.stat__label`, `.stat__num` — confirmed nothing else references
  any of these). `src/components/motion/Counter.tsx` is also deleted — confirmed
  it has no other consumers.
- The homepage's `SectionLabel` numbering used `number="02"` for Studio and `"03"`
  for Services; since Studio.tsx is removed from the homepage, Services becomes
  the new `number="02"` (TickerStrip/WorkReel don't use numbered labels, so this
  is the only renumbering needed — verify no other section references `"02"` or
  `"03"` before landing this). `StudioPage.tsx` itself does **not** get a
  `SectionLabel` number — it's a standalone page like `WorkPage`/`ContactPage`,
  neither of which use the homepage's numbered-section convention at all.

### 2. Intro text block

A large, line-by-line statement about the people and the space (not a reuse of the
homepage's "precise craft/fluid momentum" copy — this page's whole point is the
people/space angle). Draft copy:

> We're fourteen people working out of two floors — no open-plan pretending, no
> ping-pong table. Just a place built for the work.

Styled large and bold, matching the wireframe's look: bold white first lines,
fading toward a dimmer grey on the later lines (a `Reveal`-driven per-line
fade/rise-in as the block scrolls into view, not a scroll-scrubbed effect — this
block is read once, not scrubbed through).

### 3. Team grid

14 placeholder people (name + role), each with two placeholder photos (Picsum,
grayscale — same convention as `Work.tsx`/Services' images, explicitly marked
temporary). On hover (desktop, `(hover: hover)` — same gate `Services.tsx`
already established for its own hover-vs-touch split), the card's photo
crossfades from the first to the second. On touch, no swap — the card always
shows the first photo; this is a decorative flourish, not information, so no
tap-to-toggle is needed (unlike the Services accordion, where tap-to-toggle was
necessary to reach real content).

Grid: responsive, following `WorkPage`'s existing `.work-grid` breakpoint pattern
(fewer columns as viewport shrinks). Lives in a new `src/data/team.ts`:

| # | Name | Role |
|---|---|---|
| 1 | Mara Lindqvist | Founder & Creative Director |
| 2 | Theo Castellano | Head of Design |
| 3 | Priya Nandakumar | Senior Product Designer |
| 4 | Owen Fairweather | UX Designer |
| 5 | Ines Duarte | Brand Designer |
| 6 | Kai Sørensen | Motion Designer |
| 7 | Marcus Ade | Lead Developer |
| 8 | Lena Vogt | Front-end Developer |
| 9 | Diego Marín | Front-end Developer |
| 10 | Sasha Petrova | Backend Developer |
| 11 | Noor El-Amin | Photographer |
| 12 | Jonas Reyes | Video Editor |
| 13 | Freya Lindgren | Project Manager |
| 14 | Tomás Silveira | Studio Manager |

Roles deliberately span the same six disciplines `Services.tsx` lists (web
design, brand identity, motion, development, photo, video), so the team reads as
staffing the studio's own stated capabilities.

### 4. Floor plan

**Style: isometric** (validated via live mockup — user picked this over a flat
technical-blueprint option and a bold color-blocked option). Simple 2.5D room
blocks (top face + two side faces per block, plain outline strokes, dark fills),
not photorealistic — still reads as a diagram, just with a sense of volume.

**Two floors, cross-fade in place** (validated — user picked this over a
vertical-pan/"climbing stairs" alternative specifically for build simplicity):
pinned scroll-scrub section, same established mechanism as `WorkReel.tsx` — the
section locks in place while scrolling; Floor 1's isometric room blocks fade out
while Floor 2's fade in at the same camera position/scale, then the section
releases and the page continues normally into the Footer.

Room content (draft, 5 rooms per floor, one accent room per floor using
`--pw-orange` to match the Services/WorkReel precedent of one highlighted
element per set):

- **Floor 1 (Ground):** Reception, Lounge, Desks A, Meeting Room, **Studio
  Floor** (accent — the photo/video shoot space)
- **Floor 2 (Upper):** Desks B, Focus Room, Meeting Room B, Archive, **Roof
  Terrace** (accent)

**Mobile/tablet fallback:** matches the established site-wide pattern for pinned
sections (`WorkReel`, and until recently `Services`) — no pin, no scrub. Floor
1's plan and Floor 2's plan render as two plain stacked (non-pinned,
viewport-triggered `Reveal`) blocks, one after another.

## Scope boundaries

- This adds one new page (`StudioPage.tsx`), one new data file (`team.ts`), and
  removes one existing section (`Studio.tsx`) plus its now-dead CSS and the
  now-unused `Counter.tsx` component. It touches `App.tsx` (new route),
  `Header.tsx` (nav href updates ×2), and `HomePage.tsx` (removes `<Studio />`).
- No other homepage section (`Hero`, `WorkReel`, `TickerStrip`, `Services`,
  `Footer`) changes, beyond the `SectionLabel` renumbering noted above.
- Real team photography and bios are out of scope — placeholder Picsum URLs and
  the drafted name/role table above, same posture as `Work.tsx`'s placeholder
  project roster.
- No click-into-room detail behavior on the floor plan — scrolling only moves
  between the two floors; there is no per-room modal/popover. Keeping this
  page's interaction surface to exactly what was requested (hover-swap on team
  cards, scroll-driven floor transition) rather than adding unrequested
  richness.
- `prefers-reduced-motion` is already handled globally in `index.css` (the same
  blanket rule the Services accordion relies on) — no extra handling needed for
  any transition this page adds.

## Open items for implementation planning (not decided here)

- Exact isometric room-block SVG geometry/positions per floor (the mockup
  validated the *style*, not final pixel-perfect room layout) — a reasonable
  default is fine, this is implementation-time polish, not a design decision.
- Exact pin-height/vh-budget math for the floor-plan section (mirroring
  `WorkReel.tsx`'s `*_VH`/`*_GLOBAL`/`*_FRACTION` constant pattern) — a planning
  detail, not a design one.
- Whether the intro text block's line-by-line fade uses one `Reveal` per line or
  a single `RevealGroup`/`RevealItem` stagger (both patterns already exist in the
  codebase) — implementation's choice, either satisfies "line-by-line" reveal.
