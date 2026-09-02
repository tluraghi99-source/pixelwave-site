# CTA Band Full-Width Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `CtaBand` from a centered column into a full-width row (headline left, button right, baseline-aligned) with an explicit visual hierarchy, per `docs/superpowers/specs/2026-08-31-cta-band-full-width-redesign-design.md`.

**Architecture:** All changes live in `src/components/sections/CtaBand.tsx` (markup) and `src/index.css` (styles, replacing the existing `.cta-band__inner`/`.cta-band__headline` rules and adding new scoped rules). No new files, no changes to `HomePage.tsx`'s call site, no changes to the shared `SectionLabel`, `Button`, or `Reveal` components.

**Tech Stack:** React 19 + TypeScript + Vite + Framer Motion (`Reveal`, unchanged). No test framework in this repo — verification is `npx tsc -b` + `npm run lint` (oxlint) + live checks via the Claude Browser preview tools.

## Global Constraints

- Quote the project root path in every shell command — it contains a space (`/Volumes/ups tl/02 pixelwave/00_pixel/000_sito`).
- Every commit uses explicit file pathspecs (`git add <exact files>`), never `git add -A`/`git add .` — the working tree carries unrelated pre-existing uncommitted files that must never be swept into these commits.
- Run `npx tsc -b && npm run lint` after every code change, before every commit. Both must be clean.
- No unit test framework exists — verification is `tsc`/`lint` plus explicit live-browser assertions via the Claude Browser tools (`preview_start`, `navigate`, `javascript_tool`, `computer`). Every verification step below gives the exact JS/commands to run and the exact expected output.
- The eyebrow label's muted styling is scoped to `.cta-band` only — the shared `SectionLabel` component and its use on Services/Work pages must render identically to before this change.
- `--radius-pill` resolves to `0` sitewide (every radius token in this project is zeroed) — dropping the `pill` prop from the button changes nothing visually, it's a dead-prop cleanup, not a risk.
- No comments explaining WHAT code does, only non-obvious WHY (match this codebase's existing convention).

---

### Task 1: Full-width row layout, hierarchy, and scoped eyebrow styling

**Files:**
- Modify: `src/components/sections/CtaBand.tsx` (the `return` block, lines 27–44)
- Modify: `src/index.css:669-677` (the `.cta-band`/`.cta-band__inner`/`.cta-band__headline` block)

**Interfaces:**
- Consumes: `SectionLabel`, `Button`, `Reveal` (all pre-existing, unmodified — `Reveal` already accepts and forwards a `className` prop per `src/components/motion/Reveal.tsx:17-31`).
- Produces: the complete redesigned `CtaBand`. Nothing downstream depends on this task; `HomePage.tsx`'s `<CtaBand headline="Got a wave in mind?" />` call site is unchanged and needs no edits.

- [ ] **Step 1: Read the current files to confirm they match**

Run: `sed -n '1,46p' "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito/src/components/sections/CtaBand.tsx"`

Expected output (exact):

```tsx
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/pw/Button"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Reveal } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"

interface CtaBandProps {
  /** No `number` — this is an interstitial nudge, not a numbered content
   *  section, so it doesn't compete with the page's real 01/02 sequence
   *  (Selected Work / Services). */
  label?: string
  headline: string
  buttonLabel?: string
  href?: string
}

/** Full-bleed dark banner: eyebrow, one bold headline, one button. Reusable
 *  between any two sections that need a breather with a nudge toward
 *  contact — first used on the homepage, between the work carousel and the
 *  Ticker/Services black block. */
export function CtaBand({
  label = "Let's talk",
  headline,
  buttonLabel = "Start a project",
  href = "/contact",
}: CtaBandProps) {
  return (
    <section className="sec sec--dark cta-band" data-theme="dark" data-screen-label="CTA">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap cta-band__inner">
        <Reveal>
          <SectionLabel>{label}</SectionLabel>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="cta-band__headline">{headline}</p>
        </Reveal>
        <Reveal delay={0.16}>
          <Button variant="primary" size="lg" pill href={href} iconRight={<ArrowUpRight size={18} />}>
            {buttonLabel}
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
```

Also run: `sed -n '665,678p' "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito/src/index.css"`

Expected output (exact):

```css
/* cta band — interstitial nudge, not a numbered content section (see
   CtaBand.tsx). Own padding-bottom is shorter than .sec's default — it
   hands off straight into .ticker's black background right after, so it
   doesn't need the same breathing room a section flanked by page bg would. */
.cta-band { padding-bottom: clamp(2.5rem, 3vw, 5rem); }
.cta-band__inner {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: clamp(1.5rem, 2vw, 2.25rem);
}
.cta-band__headline {
  font-family: var(--font-display); font-weight: 700; letter-spacing: -0.02em;
  font-size: clamp(2.75rem, 4.4vw, 6rem); line-height: 1.02; max-width: 20ch;
}
```

If either doesn't match exactly, stop and re-read the full file before continuing — later steps assume this exact starting content.

- [ ] **Step 2: Replace `CtaBand.tsx`'s markup**

Replace:

```tsx
      <div className="wrap cta-band__inner">
        <Reveal>
          <SectionLabel>{label}</SectionLabel>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="cta-band__headline">{headline}</p>
        </Reveal>
        <Reveal delay={0.16}>
          <Button variant="primary" size="lg" pill href={href} iconRight={<ArrowUpRight size={18} />}>
            {buttonLabel}
          </Button>
        </Reveal>
      </div>
```

with:

```tsx
      <div className="wrap cta-band__inner">
        <div className="cta-band__copy">
          <Reveal>
            <SectionLabel>{label}</SectionLabel>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="cta-band__headline">{headline}</p>
          </Reveal>
        </div>
        <Reveal delay={0.16} className="cta-band__cta">
          <Button variant="primary" size="md" href={href} iconRight={<ArrowUpRight size={18} />}>
            {buttonLabel}
          </Button>
        </Reveal>
      </div>
```

(This drops `pill` from the `Button` call and changes `size="lg"` to `size="md"` — both per the spec's Sizing section. Nothing else in the file changes; the `interface CtaBandProps` and the function signature stay exactly as they are.)

- [ ] **Step 3: Replace the CSS block**

Replace:

```css
.cta-band { padding-bottom: clamp(2.5rem, 3vw, 5rem); }
.cta-band__inner {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: clamp(1.5rem, 2vw, 2.25rem);
}
.cta-band__headline {
  font-family: var(--font-display); font-weight: 700; letter-spacing: -0.02em;
  font-size: clamp(2.75rem, 4.4vw, 6rem); line-height: 1.02; max-width: 20ch;
}
```

with:

```css
.cta-band { padding-bottom: clamp(2.5rem, 3vw, 5rem); }
.cta-band__inner {
  display: flex; flex-direction: row; justify-content: space-between; align-items: flex-end;
  gap: clamp(1.5rem, 3vw, 3rem); text-align: left;
}
.cta-band__copy { min-width: 0; }
.cta-band__headline {
  font-family: var(--font-display); font-weight: var(--fw-black); letter-spacing: -0.035em;
  font-size: clamp(2.5rem, 6vw, 7.5rem); line-height: 0.9; max-width: 12ch;
  margin-top: clamp(1rem, 1.5vw, 1.5rem);
}
.cta-band__cta { flex-shrink: 0; }
/* Muted/scoped to this section only — SectionLabel's shared default
   (solid text-secondary, 2.5rem/2px rule) is unchanged everywhere else
   it's used (Services, Work). This one reads as a quiet category tag,
   not a UI element competing with the headline/button for attention. */
.cta-band .pw-seclabel__text { color: rgba(255, 255, 255, 0.45); }
.cta-band .pw-seclabel__rule { width: 1.5rem; height: 1px; background: rgba(255, 91, 0, 0.6); }
@media (max-width: 767px) {
  .cta-band__inner { flex-direction: column; align-items: flex-start; gap: clamp(1.5rem, 4vw, 2rem); }
}
```

- [ ] **Step 4: Verify TypeScript and lint are clean**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && npx tsc -b && npm run lint
```
Expected: both clean, no errors.

- [ ] **Step 5: Verify the desktop layout live**

Ensure the dev server is running (`mcp__Claude_Browser__preview_list`; if nothing is running, `mcp__Claude_Browser__preview_start` with `{"name": "pixellwave-dev"}`), then:

```
mcp__Claude_Browser__navigate { "url": "http://localhost:5173/" }
```

Run via `mcp__Claude_Browser__javascript_tool`:

```js
(function() {
  const cta = document.querySelector('.cta-band');
  window.scrollTo(0, cta.getBoundingClientRect().top + window.scrollY - 20);
  const copy = document.querySelector('.cta-band__copy');
  const cta_ = document.querySelector('.cta-band__cta');
  const headline = document.querySelector('.cta-band__headline');
  const button = document.querySelector('.cta-band .pw-btn');
  const label = document.querySelector('.cta-band .pw-seclabel__text');
  return JSON.stringify({
    copyRect: copy.getBoundingClientRect(),
    ctaRect: cta_.getBoundingClientRect(),
    headlineBottom: headline.getBoundingClientRect().bottom,
    buttonBottom: button.getBoundingClientRect().bottom,
    labelColor: getComputedStyle(label).color,
    buttonPadding: getComputedStyle(button).padding,
  });
})();
```

Expected:
- `copyRect.left` is less than `ctaRect.left` (headline block sits to the left of the button, not stacked above it, at desktop widths).
- `headlineBottom` and `buttonBottom` are within ~2px of each other (baseline-aligned via `align-items: flex-end`).
- `labelColor` reports as `rgba(255, 255, 255, 0.45)` (the muted eyebrow color applied).
- `buttonPadding` matches `.pw-btn--md`'s padding (`0.7rem 1.3rem` per `src/index.css` — confirm this still resolves correctly now that `size="md"` replaces `size="lg"`, i.e. the button is visibly smaller than before).

If `copyRect.left` is NOT less than `ctaRect.left`, or the two aren't roughly side by side, stop — the row layout isn't taking effect, re-check Step 3's CSS was applied correctly before continuing.

- [ ] **Step 6: Verify the mobile stacked layout live**

```
mcp__Claude_Browser__resize_window { "preset": "mobile" }
```
```
mcp__Claude_Browser__navigate { "url": "http://localhost:5173/" }
```

Run via `mcp__Claude_Browser__javascript_tool`:

```js
(function() {
  const cta = document.querySelector('.cta-band');
  window.scrollTo(0, cta.getBoundingClientRect().top + window.scrollY - 20);
  const copy = document.querySelector('.cta-band__copy');
  const ctaEl = document.querySelector('.cta-band__cta');
  return JSON.stringify({
    copyRect: copy.getBoundingClientRect(),
    ctaRect: ctaEl.getBoundingClientRect(),
  });
})();
```

Expected: `ctaRect.top` is greater than `copyRect.bottom` (button sits below the headline block, stacked, not beside it), and `copyRect.left` equals `ctaRect.left` (both left-aligned to the same edge — no centering).

Take a screenshot to visually confirm: `mcp__Claude_Browser__computer { "action": "screenshot" }`. Confirm the headline reads as clearly the biggest/boldest element, the button is compact and orange, and the eyebrow label is small and muted gray — not competing with either.

Resize back afterward: `mcp__Claude_Browser__resize_window { "preset": "desktop" }`.

- [ ] **Step 7: Confirm `SectionLabel` is unaffected elsewhere**

Navigate to a page using the shared, unscoped `SectionLabel` style (e.g. the homepage's Services section, `#services`) and confirm its label still renders with the *original* (non-muted) styling:

```
mcp__Claude_Browser__navigate { "url": "http://localhost:5173/" }
```
```js
(function() {
  const label = document.querySelector('#services .pw-seclabel__text');
  return JSON.stringify({ color: getComputedStyle(label).color });
})();
```

Expected: `color` is **not** `rgba(255, 255, 255, 0.45)` — it resolves to whatever `var(--text-secondary)` computes to under `[data-theme="dark"]` (a solid color, not the muted rgba this task introduced). This confirms the `.cta-band .pw-seclabel__text` override in Step 3 is correctly scoped and hasn't leaked into the shared component's default appearance.

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && git add src/components/sections/CtaBand.tsx src/index.css && git commit -m "$(cat <<'EOF'
Redesign CtaBand as a full-width row instead of a centered column

Headline now anchors left and grows to be the clearly dominant
element (bigger, heavier, tighter tracking); the button anchors
right at a more modest size and stands out through orange/black
contrast rather than competing in scale; the eyebrow label drops to
a muted, scoped-to-this-section treatment so it reads as a quiet
category tag. Mobile stacks the two halves (still left-aligned, not
centered) instead of trying to fit them side by side.
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Full-width row (headline left, button right, baseline-aligned) → Step 3's `.cta-band__inner` (`flex-direction: row; justify-content: space-between; align-items: flex-end`), verified in Step 5.
- Visual hierarchy (headline dominant, button contrast-driven #2, eyebrow quietest/scoped) → Step 3's `.cta-band__headline` (bigger, `--fw-black`, tighter tracking/line-height), Step 2's `size="md"` button, Step 3's `.cta-band .pw-seclabel__text`/`.pw-seclabel__rule` overrides — verified in Steps 5 and 7.
- Mobile stacks, stays left-aligned (not centered) → Step 3's `@media (max-width: 767px)` block, verified in Step 6.
- Sizing as fluid `clamp()`, not literal mockup pixels → Step 3's `clamp(2.5rem, 6vw, 7.5rem)` headline (targets the spec's "roughly 4.5–7rem effective size... in the neighborhood of the mockup's 96px": at a 1600px viewport this evaluates to exactly 96px/6rem).
- `pill` prop dropped, `size` changed `lg` → `md` → Step 2.
- `SectionLabel`/`Button`/`Reveal` shared components untouched → confirmed by Step 1's baseline read (no modifications to those files anywhere in this plan) and Step 7's live check that the shared label style is unaffected elsewhere.
- `HomePage.tsx` call site untouched → confirmed by Step 1 (not in the Files list) — no task modifies it.

**Placeholder scan:** No TBD/TODO. All CSS values are concrete numbers, not "tune live" placeholders — the plan's exact clamp values are a specific, defensible choice (shown above to land at 96px at a realistic desktop width), satisfying the spec's "targets, not literal values" instruction while still giving the implementer something exact to type.

**Type consistency:** `CtaBandProps` interface is unchanged (not touched by any step) — `label`, `headline`, `buttonLabel`, `href` all keep their existing types and defaults. No new props, no new exported symbols, so there's nothing for a later task to consume — this is the only task in the plan.
