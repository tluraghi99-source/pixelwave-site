# Contact page reactive redesign — design

## Context

The current `/contact` page (`src/pages/ContactPage.tsx`) is a two-column step wizard: a left column with a text list of steps (Detail/Project type/When) plus a giant static step-title, a right column with the actual form panel (heading + inputs/chips + Next button), and a static "Let's chat!" giant heading pinned at the bottom. The user's complaint: it isn't engaging — flat visually, and static/lifeless motion-wise.

This redesign was validated live via an interactive HTML mockup before being written up here (giant reactive headline, minimal control strip, cursor-reactive background), reviewed and iterated on directly with the user (weight/margin/header-accuracy passes). This doc captures the approved result for implementation in the real codebase.

Kept unchanged: the underlying step state machine (`name`/`email`/`projectType`/`timeline`/`sent`, `canAdvance`/`handleNext` logic), the absence of the shared `Footer` on this page (confirmed intentional earlier), and the page's "single non-scrolling desktop screen, `data-theme=\"dark\"`, `grain-overlay`" treatment.

## Page structure

A single full-bleed stage (`.contact-page`, unchanged outer treatment: `height:100svh`, dark, `grain-overlay`) containing, top to bottom:

1. **Real site header** — unchanged, already renders above every page via the app shell; no page-specific change needed.
2. **Cursor-reactive background grid** — a new ambient canvas layer spanning the full stage (see below), sitting behind everything else.
3. **Small progress indicator** — three short dashes (replacing the current `.contact-page__steps` text list), reflecting done/active/upcoming per step, top-right below the header.
4. **Eyebrow heading** — a small, real, visible `<h2>` per phase ("Tell us who you are" / "What are we building" / "When are you starting" / "Sent") — this is the page's actual accessible heading for the current step, just restyled small instead of removed. Directly replaces the current `.contact-page__heading`.
5. **Giant reactive headline** — a `FitText` instance (`aria-hidden="true"`, purely decorative — same convention as the existing `.foot__giant` "YourVisionOurWave" and the old `.contact-page__giant`), filling most of the stage's width, right above the control strip. Its text prop:
   - Phase `detail`: the name input's live value, updating on every keystroke; `"Your name"` placeholder styling (dimmed) while empty.
   - Phase `type`: the selected chip's label once picked; a placeholder prompt (dimmed) until one is picked.
   - Phase `when`: same pattern with the timeline chips.
   - Phase `sent`: `"Thanks, {firstName}!"`.
   Because `FitText` re-fits on every `text` prop change, this "just works" for the letter-by-letter typing case with no extra debouncing.
6. **Minimal control strip** — anchored at the stage's bottom, holding only the current phase's real, accessible controls:
   - `detail`: the existing `Input` (Name) + `Input` (Email) pair, plus a "Next" `InteractiveHoverButton` (disabled until both are non-empty, same `canAdvance` rule as today).
   - `type`: the existing `Tag` chips (Web Design/Brand Identity/Motion/Development) + "Next" button.
   - `when`: the existing `Tag` chips (ASAP/1–3 months/3–6 months/Not sure yet) + "Send it our way" button.
   - `sent`: a check icon + "We'll be in touch shortly." line (unchanged copy/icon from today's sent state).

Removed entirely: the two-column grid layout, `.contact-page__left`/`.contact-page__steps`/`.contact-page__step-giant` (the old static step list + giant step-title), `.contact-page__panel`'s heading-above-fields treatment (the heading moves to the small eyebrow instead), and the static bottom `.contact-page__giant` "Let's chat!" heading (the reactive headline now permanently occupies that visual/structural role).

## Cursor-reactive background grid

A new small component (`src/components/motion/CursorGlow.tsx` or similar) — not a reuse of `PixelTrail` (which follows real content sizing well for other components but implements a discrete cell-lights-then-fades trail, a different visual than the smooth radial falloff validated in the mockup). Renders a `<canvas>` absolutely filling its container:

- A grid of small squares (~24–28px cells) redrawn every frame, each cell's opacity a function of its distance from the last known cursor position (soft falloff over roughly a 180–200px radius), tinted the site's accent orange (`var(--pw-orange)`), fading to a faint white baseline (`rgba(255,255,255,0.06)`) far from the cursor.
- Cursor position tracked via a `mousemove` listener on the stage; resets to off-screen on `mouseleave`.
- Respects `prefers-reduced-motion`: renders one static frame (no `requestAnimationFrame` loop) when reduced motion is preferred.
- Purely decorative (`aria-hidden="true"`), `pointer-events: none` so it never intercepts clicks on the real controls above it.

## Semantics & accessibility

- The giant `FitText` mirror stays `aria-hidden="true"` — it's a visual echo of state that's already accessibly represented by the real, labeled `Input`/`Tag` controls in the strip below it. No live region needed; a screen reader announcing every keystroke of a giant decorative mirror would be noise, not signal.
- The small eyebrow becomes the page's real semantic heading per step (`<h2>`), same wording the current `.contact-page__heading` already uses — nothing new to write, just relocated/restyled.
- The progress dashes get a visually-hidden text equivalent (e.g. "Step 2 of 3") for screen readers, replacing the accessible information the old clickable step-list provided. (The old list's "click to jump back to a completed step" affordance is dropped — the dashes are indicator-only, not interactive; stepping back via chip/field re-entry isn't part of this redesign.)

## Mobile behavior

The current code hides `.contact-page__step-giant` under 820px and falls back to a stacked, scrollable, two-column-collapsed-to-one layout — a workaround for cramming the old two-column wizard into a small screen. That workaround goes away entirely: this redesign's stage was single-column/full-bleed by construction, so the same layout works down to mobile widths unchanged. `FitText` already resizes fluidly with container width, and the control strip's fields/chips already wrap via `flex-wrap`. No separate mobile CSS branch is needed beyond minor `clamp()` tuning already present in the giant text's sizing.

## Data flow

No changes to `ContactPage`'s state shape or transition logic (`stepIndex`/`sent`/`canAdvance`/`handleNext`). The only additions are: (a) computing what string the giant headline should currently show (a small derived value per phase, reusing the same state), and (b) the background canvas's own internal animation-frame state (self-contained inside the new component, not lifted into `ContactPage`).

## Out of scope

- No backend/real submission wiring — `sent` is still just a local state flip, as today.
- No "jump back to a previous completed step" interaction (the old step-list supported this via `disabled={i > stepIndex || sent}`; the new dash indicator is display-only). If this is missed later, revisit as a follow-up.
- No changes to the real site header or to the fact that this page has no shared `Footer`.

## Files touched

- `src/pages/ContactPage.tsx` — restructure JSX per "Page structure" above; add the per-phase giant-text derivation; render the new background component.
- `src/index.css` — remove `.contact-page__steps`/`.contact-page__step`/`.contact-page__step--*`/`.contact-page__left`/`.contact-page__step-giant*`/`.contact-page__panel`/`.contact-page__giant` and the now-unnecessary mobile override; add `.contact-page__eyebrow`, `.contact-page__reactive` (the `FitText` wrapper), `.contact-page__progress`/`.contact-page__progress-dash`, `.contact-page__strip` and its field/chip-row layout (largely reusing `.contact-page__fields`/`.contact-page__chips` as-is).
- New: `src/components/motion/CursorGlow.tsx` — the canvas background component described above.
