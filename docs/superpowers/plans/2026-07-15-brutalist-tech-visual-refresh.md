# Brutalist-Tech Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shift PixellWave's homepage/site visual language from "generic agency template" to "bold/brutalist-tech" — mono accent typography, flattened hard-edged surfaces, restrained/sparing color, and a visible motion layer — by editing shared tokens/components so the change cascades consistently across every page, per `docs/superpowers/specs/2026-07-15-brutalist-tech-visual-refresh-design.md`.

**Architecture:** This is a CSS-token + shared-component refactor, not a new subsystem. Nearly every task edits `src/index.css` (the single source of design tokens and most component styles) plus the one or two `.tsx` files whose markup structure needs to change to support the new CSS. Because `Tag`, `Button`, and `Card` are shared primitives, token/component-level edits automatically cascade to every page that uses them (home, `/work`, `/contact`) — this is deliberate (Approach B from the design spec), not accidental scope creep.

**Tech Stack:** React 19 + TypeScript + Vite, Tailwind v4 (used only by `InteractiveHoverButton`), Framer Motion v12, plain CSS custom-property tokens in `src/index.css` for everything else.

## Global Constraints

- No test runner exists in this project (`package.json` has no `vitest`/`jest`/`playwright` — confirmed). Every task's "test" step is therefore: `npx tsc -b --noEmit` for type safety, then manual verification in the running dev server via the browser preview tools (screenshot, `read_page`, hover via `computer`, `getComputedStyle` via `javascript_tool`). This replaces the unit-test cycle described in the general planning process — do not invent a test framework or fake test files.
- Start the dev server with the browser preview tool (`preview_start` with name from `.claude/launch.json`, or equivalent) before verification steps — never `npm run dev` via plain Bash.
- `prefers-reduced-motion: reduce` must be respected by every new animation (grain overlay, breathing glow, scroll-scrubbed entrances, text-scramble). The existing blanket CSS rule at the bottom of `index.css` (`@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; } }`) already neutralizes plain CSS `animation`/`transition` properties — it does **not** reach JS-driven effects (Framer Motion values, `setInterval`), so those need their own explicit check via `window.matchMedia("(prefers-reduced-motion: reduce)").matches`.
- Follow the existing desktop/mobile split pattern already used by `WorkReelPinned`/`WorkReelAmbient` and `ServicesPinned`/`ServicesAmbient` (`useScreenSize().greaterThanOrEqual("lg")`) for any new scroll-scrubbed behavior — pinned/scrubbed motion is desktop-only sitewide.
- Never commit `.superpowers/` (already gitignored) or unrelated pre-existing staged changes — each task's commit must `git add` only the exact files that task modified, never `git add -A` or `git add .`.
- Out of scope (do not touch as part of this plan): real project photography, the `SERVICES` data's placeholder `"altro"` 7th row, route/page transitions.

---

## Task 1: Foundation tokens — mono accent font + flattened radius scale

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `src/main.tsx`
- Modify: `src/index.css:192-198` (radius tokens), `:229-235` (Tailwind bridge), `:311-325` (eyebrow/section-number), `:377` (ghost-hover redundant radius), `:555` (`.hero__trail-pixel`), `:694` (`.gallery-caption`), `:659` (`.work__view` pill), `:762` (`.contact-page .pw-input`), `:819` (`.preloader__bar`), `:716` (`.svc__num`)

**Interfaces:**
- Produces: CSS custom property `--font-mono-accent` (usable by every later task), Tailwind utility `font-mono` resolves to the same family, all `--radius-*` tokens are `0`.

- [ ] **Step 1: Install the mono accent font package**

```bash
npm install @fontsource/ibm-plex-mono
```

- [ ] **Step 2: Import the weights used (400/500/600) in `src/main.tsx`**

Add after the existing `import './index.css'` line:

```ts
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
```

- [ ] **Step 3: Add the `--font-mono-accent` token**

In `src/index.css`, inside the `:root` typography block (right after `--font-mono: ui-monospace, ...` on line 131), add:

```css
  --font-mono-accent: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
```

- [ ] **Step 4: Bridge it into Tailwind's `font-mono` utility**

In the `@theme inline` block (around line 229-235), add:

```css
  --font-mono: var(--font-mono-accent);
```

- [ ] **Step 5: Apply the mono accent to existing label/eyebrow/number elements**

In `src/index.css`, edit these three rules to use the new token (replacing `var(--font-text)` / `var(--font-display)` on each):

```css
.pw-eyebrow {
  font-family: var(--font-mono-accent);
  font-size: var(--fs-caption);
  font-weight: var(--fw-medium);
  letter-spacing: var(--ls-caption);
  text-transform: uppercase;
  color: var(--text-secondary);
}
```

```css
.pw-seclabel__num{
  font-family:var(--font-mono-accent);font-weight:var(--fw-medium);
  font-size:var(--fs-caption);letter-spacing:var(--ls-caption);
  color:var(--accent-primary);font-variant-numeric:tabular-nums;
}
```

```css
.pw-seclabel__text{
  font-family:var(--font-mono-accent);
  font-size:var(--fs-caption);font-weight:var(--fw-medium);
  letter-spacing:var(--ls-caption);text-transform:uppercase;color:var(--text-secondary);
}
```

And the Services row number (line 716):

```css
.svc__num { font-family: var(--font-mono-accent); font-size: 14px; letter-spacing: 0.12em; color: var(--pw-orange); }
```

- [ ] **Step 6: Flatten the radius token scale**

Replace lines 192-198 in `src/index.css`:

```css
  --radius-xs:   0;
  --radius-sm:   0;
  --radius-md:   0;
  --radius-lg:   0;
  --radius-xl:   0;
  --radius-pill: 0;
  --radius-control: 0;
```

- [ ] **Step 7: Flatten the remaining hardcoded (non-token) radius declarations**

In `src/index.css`:

- Line 377, remove the now-redundant explicit override (base is already 0):
  `.pw-btn--ghost:hover{color:var(--accent-secondary);box-shadow:inset 0 -2px 0 0 var(--accent-secondary);}` (drop `border-radius:0;`)
- Line 555: `.hero__trail-pixel { background: var(--pw-grey); }` (drop `border-radius: 5px;` — pixels should read as hard squares)
- Line 659: `.work-grid .work__view { margin-top: 0; background: var(--pw-black); color: var(--pw-white); padding: 0.5rem 0.9rem; }` (drop `border-radius: 999px;`)
- Line 694: `.gallery-caption { position: absolute; pointer-events: none; transform-origin: 50% 50%; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; gap: 0.6rem; padding: clamp(1rem, 1.4vw, 1.75rem); overflow: hidden; background: linear-gradient(to top, rgba(0,0,0,.6), rgba(0,0,0,0) 60%); transition: opacity 0.25s ease; }` (drop `border-radius: 14px;`)
- Line 762: `.contact-page .pw-input { background: var(--surface-raised); border-color: transparent; }` (drop `border-radius: 999px;`)
- Line 819: `.preloader__bar { width: 120px; height: 2px; background: rgba(255, 255, 255, 0.14); overflow: hidden; }` (drop `border-radius: 2px;`)

Leave `.pw-tag__dot`, `.ticker__dot`, `.cursor-dot` untouched — these are small circular status/bullet indicators (iconography), not "soft card" surfaces, and are not part of the flagged pattern.

- [ ] **Step 8: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 9: Verify in browser**

Start the dev server, load the homepage, and confirm:
- Buttons (`.pw-btn`), the nav menu panel, inputs, and the Work/gallery `Card` component all now render with square (0-radius) corners.
- The "01 — Selected Work" / "02 — Studio" / "03 — Services" eyebrow labels render in a visibly different (monospace) typeface than the surrounding body text.
- Via `javascript_tool`, run `getComputedStyle(document.querySelector('.pw-seclabel__text')).fontFamily` and confirm it includes `"IBM Plex Mono"`.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/main.tsx src/index.css
git commit -m "Add IBM Plex Mono accent typeface and flatten radius token scale"
```

---

## Task 2: Tag component — underline-only mono style

**Files:**
- Modify: `src/index.css:385-402` (`.pw-tag*` rules)

**Interfaces:**
- Consumes: `--font-mono-accent` (Task 1), `--accent-primary`, `--accent-secondary`, `--text-primary`, `--border-strong`.
- Produces: no change to `Tag`'s public props (`variant: "outline" | "solid" | "orange" | "cyan" | "outline-accent"`, `dot`, `interactive`) — this is a pure CSS restyle, `src/components/pw/Tag.tsx` is not modified.

- [ ] **Step 1: Replace the tag CSS block**

Replace lines 385-402 in `src/index.css` (from `.pw-tag{` through `.pw-tag--interactive:hover{...}`) with:

```css
.pw-tag{
  display:inline-flex;align-items:center;gap:.4em;
  font-family:var(--font-mono-accent);font-size:var(--fs-caption);
  font-weight:var(--fw-medium);letter-spacing:var(--ls-caption);
  text-transform:uppercase;line-height:1;
  padding-bottom:.35em;
  border-bottom:1.5px solid var(--border-strong);
  color:var(--text-primary);background:transparent;
  transition:color var(--dur-base) var(--ease-wave),border-color var(--dur-base) var(--ease-wave);
}
.pw-tag--solid{border-bottom-width:3px;border-color:var(--accent-primary);}
.pw-tag--orange{border-color:var(--accent-primary);}
.pw-tag--cyan{border-color:var(--accent-secondary);}
.pw-tag--outline-accent{border-color:var(--accent-primary);color:var(--accent-primary);}
.pw-tag__dot{width:.5em;height:.5em;border-radius:50%;background:currentColor;}
.pw-tag--interactive{cursor:pointer;}
.pw-tag--interactive:hover{border-color:var(--accent-primary);color:var(--accent-primary);}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors (no `.tsx` files changed, this step confirms nothing else broke).

- [ ] **Step 3: Verify in browser**

Start the dev server and check three call sites (this component cascades everywhere, so spot-check the extremes):
- Homepage Work section (scroll to the video-reveal gallery): card tags render as underlined mono text, no pill background.
- Homepage Services section: row tags (currently `variant="cyan"`) render with a cyan underline, no filled background.
- `/contact` page, step 2 ("What are we building?"): click a chip and confirm the selected one shows an orange underline (via `variant="orange"`) instead of a filled pill.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "Replace pill Tag component with underline-only mono style"
```

---

## Task 3: Studio stats — spec-sheet list

**Files:**
- Modify: `src/index.css:593-600` (`.studio__stats`, `.stat`, `.stat__num`, `.stat__label`)
- Modify: `src/components/sections/Studio.tsx:29-38`

**Interfaces:**
- Consumes: `--font-mono-accent` (Task 1).
- No change to `Studio`'s exports or the `STATS` data shape.

- [ ] **Step 1: Replace the stats CSS**

Replace lines 593-600 in `src/index.css`:

```css
.studio__stats { display: flex; flex-direction: column; align-self: stretch; }
.stat { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; padding: 1.1rem 0; border-bottom: 1px solid var(--border-subtle); }
.studio__stats > .stat:first-child { border-top: 1px solid var(--border-subtle); }
.stat__label { font-family: var(--font-mono-accent); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
.stat__num { font-family: var(--font-display); font-weight: 700; font-size: clamp(1.5rem, 1.2vw, 2.25rem); letter-spacing: -0.02em; color: var(--pw-orange); }
```

(Note: `.studio__stats { grid-template-columns... }` and its `@media (max-width: 640px)` override are removed entirely — replaced by the single-column flex list above, which needs no responsive variant.)

- [ ] **Step 2: Reorder the stat markup (label before number)**

In `src/components/sections/Studio.tsx`, replace the `RevealGroup` block:

```tsx
        <RevealGroup className="studio__stats">
          {STATS.map((s) => (
            <RevealItem className="stat" key={s.label}>
              <span className="stat__label">{s.label}</span>
              <span className="stat__num">
                <Counter value={s.value} suffix={s.suffix} />
              </span>
            </RevealItem>
          ))}
        </RevealGroup>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify in browser**

Scroll to the Studio section and confirm: three stats now render as a vertical list of rows (mono label left, orange number right), divided by 1px rules, no white card backgrounds. Screen-reader order (via `read_page`) should read label before number for each row.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/sections/Studio.tsx
git commit -m "Replace Studio stat tiles with a spec-sheet list"
```

---

## Task 4: Services rows — oversized name + hover gradient swatch

**Files:**
- Modify: `src/index.css:713-725` (`.svc*` rules)
- Modify: `src/components/sections/Services.tsx`

**Interfaces:**
- Consumes: `--font-mono-accent` (Task 1), underline `Tag` styling (Task 2).
- Produces: no change to `Services`' exports.

- [ ] **Step 1: Replace the services row CSS**

Replace lines 713-725 in `src/index.css` (from `.svc { border-top...` through the closing `@media (max-width: 640px)` block) with:

```css
.svc { border-top: 1px solid var(--border-subtle); }
.svc__row {
  position: relative; overflow: hidden;
  padding: 1.5rem 0; border-bottom: 1px solid var(--border-subtle);
  transition: padding-left .3s var(--ease-wave);
  cursor: pointer;
}
.svc__row:hover { padding-left: 1.25rem; }
.svc__swatch {
  position: absolute; inset: 0; z-index: 0;
  background: linear-gradient(100deg, var(--pw-orange), var(--pw-cyan));
  transform: scaleX(0); transform-origin: left;
  transition: transform var(--dur-slow) var(--ease-wave);
}
.svc__row:hover .svc__swatch { transform: scaleX(1); }
.svc__top { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: baseline; }
.svc__name { font-family: var(--font-display); font-weight: 700; font-size: clamp(1.75rem, 2vw, 3.5rem); letter-spacing: -0.02em; transition: color var(--dur-base) var(--ease-wave); }
.svc__row:hover .svc__name { color: var(--pw-black); }
.svc__num { font-family: var(--font-mono-accent); font-size: 0.72rem; letter-spacing: 0.08em; color: var(--pw-orange); transition: color var(--dur-base) var(--ease-wave); }
.svc__row:hover .svc__num { color: var(--pw-black); }
.svc__tags { position: relative; z-index: 1; display: flex; gap: 1rem; flex-wrap: wrap; margin-top: .6rem; }
.svc__row:hover .svc__tags .pw-tag { color: var(--pw-black); border-color: var(--pw-black); }
```

- [ ] **Step 2: Restructure `ServiceRow`'s markup**

In `src/components/sections/Services.tsx`, remove the now-unused import:

```tsx
import { ArrowUpRight } from "lucide-react"
```

Replace the `ServiceRow` component's return statement:

```tsx
  return (
    <motion.div className="svc__row" style={{ opacity, y }}>
      <div className="svc__swatch" />
      <div className="svc__top">
        <span className="svc__name">{service.name}</span>
        <span className="svc__num">{service.num}</span>
      </div>
      <span className="svc__tags">
        {service.tags.map((t) => (
          <Tag key={t} variant="cyan">
            {t}
          </Tag>
        ))}
      </span>
    </motion.div>
  )
```

- [ ] **Step 3: Restructure `ServicesAmbient`'s inline duplicate markup**

In the same file, replace the `RevealItem` block inside `ServicesAmbient`:

```tsx
          {SERVICES.map((s) => (
            <RevealItem key={s.num}>
              <div className="svc__row">
                <div className="svc__swatch" />
                <div className="svc__top">
                  <span className="svc__name">{s.name}</span>
                  <span className="svc__num">{s.num}</span>
                </div>
                <span className="svc__tags">
                  {s.tags.map((t) => (
                    <Tag key={t} variant="cyan">
                      {t}
                    </Tag>
                  ))}
                </span>
              </div>
            </RevealItem>
          ))}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors (confirms the removed `ArrowUpRight` import isn't referenced anywhere else in the file).

- [ ] **Step 5: Verify in browser**

Scroll to Services (desktop viewport, so the pinned variant renders). Hover over a row and confirm, via `computer` hover + screenshot: the gradient swatch fills the row from the left, the name/number/tags flip to black, and the row nudges right. Then resize to a mobile width (`resize_window` preset `mobile`) and confirm the `ServicesAmbient` rows show the same hover treatment (or at minimum render correctly without the removed arrow icon / without layout breakage).

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/components/sections/Services.tsx
git commit -m "Redesign Services rows with oversized names and hover gradient swatch"
```

---

## Task 5: Contact page — giant reactive step title

**Files:**
- Modify: `src/index.css:742-753` (`.contact-page__steps` region), `:773-776` (mobile media query)
- Modify: `src/pages/ContactPage.tsx`

**Interfaces:**
- Consumes: `--font-mono-accent`, `--font-display`, `EASE_WAVE` (already imported in `ContactPage.tsx`).
- Produces: no change to `ContactPage`'s exports or internal state (`stepIndex`, `STEPS`).

- [ ] **Step 1: Add CSS for the left column wrapper and giant title**

In `src/index.css`, right after the existing `.contact-page__steps` / `.contact-page__step` / `.contact-page__step--active` / `.contact-page__step--done` rules (after line 752), add:

```css
.contact-page__left { display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
.contact-page__step-giant { overflow: hidden; }
.contact-page__step-giant-num {
  font-family: var(--font-mono-accent); font-size: 0.75rem; letter-spacing: 0.1em;
  color: var(--pw-orange); margin-bottom: 0.75rem; display: block;
}
.contact-page__step-giant-title {
  font-family: var(--font-display); font-weight: 800;
  font-size: clamp(3rem, 5vw, 6rem); line-height: 0.9; letter-spacing: -0.03em;
  color: var(--pw-white); margin: 0;
}
```

- [ ] **Step 2: Hide the giant title on mobile**

In the existing `@media (max-width: 820px)` block (around line 773), add `.contact-page__step-giant { display: none; }` alongside the existing rules:

```css
@media (max-width: 820px) {
  .contact-page { height: auto; overflow: visible; padding-block: clamp(6rem, 12vw, 8rem) 3rem; }
  .contact-page__body { grid-template-columns: 1fr; gap: 2.5rem; padding-top: 0; }
  .contact-page__step-giant { display: none; }
}
```

- [ ] **Step 3: Wire up the JSX**

In `src/pages/ContactPage.tsx`, add the import:

```tsx
import { AnimatePresence, motion } from "framer-motion"
```

(This import already exists — no change needed there. Just wrap the existing `<nav className="contact-page__steps">` block.)

Replace:

```tsx
          <nav className="contact-page__steps" aria-label="Contact form steps">
            {STEPS.map((s, i) => {
              const state = i === stepIndex ? "active" : i < stepIndex ? "done" : "upcoming"
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`contact-page__step contact-page__step--${state}`}
                  disabled={i > stepIndex || sent}
                  onClick={() => setStepIndex(i)}
                >
                  {s.label}
                </button>
              )
            })}
          </nav>
```

with:

```tsx
          <div className="contact-page__left">
            <nav className="contact-page__steps" aria-label="Contact form steps">
              {STEPS.map((s, i) => {
                const state = i === stepIndex ? "active" : i < stepIndex ? "done" : "upcoming"
                return (
                  <button
                    key={s.key}
                    type="button"
                    className={`contact-page__step contact-page__step--${state}`}
                    disabled={i > stepIndex || sent}
                    onClick={() => setStepIndex(i)}
                  >
                    {s.label}
                  </button>
                )
              })}
            </nav>

            <AnimatePresence mode="wait">
              <motion.div
                key={sent ? "sent" : step.key}
                className="contact-page__step-giant"
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                exit={{ clipPath: "inset(0 0 0 100%)" }}
                transition={{ duration: 0.5, ease: EASE_WAVE }}
              >
                <span className="contact-page__step-giant-num">
                  {sent ? "Sent" : `Step ${stepIndex + 1} / ${STEPS.length}`}
                </span>
                <h2 className="contact-page__step-giant-title">{sent ? "Thanks!" : step.label}</h2>
              </motion.div>
            </AnimatePresence>
          </div>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify in browser**

Navigate to `/contact`. Confirm the left column now shows the small step nav on top and a giant "Detail" title below it. Click "Next" (after filling name/email) and confirm the giant title wipes to "Project type", then "When", then "Thanks!" after submitting. Resize to `mobile` preset and confirm the giant title is hidden while the rest of the form still works.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/pages/ContactPage.tsx
git commit -m "Add giant reactive step title to Contact page"
```

---

## Task 6: Micro-interactions — text-scramble hover + flatten InteractiveHoverButton

**Files:**
- Create: `src/components/motion/ScrambleText.tsx`
- Modify: `src/components/pw/Button.tsx`
- Modify: `src/components/pw/InteractiveHoverButton.tsx`
- Modify: `src/components/sections/Header.tsx` (`renderLink`)
- Modify: `src/components/sections/Work.tsx` (`"View project"` label)
- Modify: `src/pages/WorkPage.tsx` (`"View project"` label)

**Interfaces:**
- Produces: `ScrambleText({ text: string, className?: string })` — a `<span>` that scrambles its own text on `mouseenter`/resolves on `mouseleave`, self-contained (no external state needed).
- Consumes (in `Button.tsx`/`InteractiveHoverButton.tsx`): `ScrambleText` from `@/components/motion/ScrambleText`.

- [ ] **Step 1: Create the `ScrambleText` component**

```tsx
// src/components/motion/ScrambleText.tsx
import { useEffect, useRef, useState } from "react"

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ01#$%"

interface ScrambleTextProps {
  text: string
  className?: string
}

/** Cycles through random mono glyphs on hover before resolving back to the real text. */
export function ScrambleText({ text, className }: ScrambleTextProps) {
  const [display, setDisplay] = useState(text)
  const intervalRef = useRef<number | null>(null)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  useEffect(() => {
    setDisplay(text)
  }, [text])

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    }
  }, [])

  function handleEnter() {
    if (reducedMotionRef.current) return
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    let iteration = 0
    intervalRef.current = window.setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " "
            if (i < iteration) return text[i]
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
          })
          .join("")
      )
      if (iteration >= text.length && intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      iteration += 0.5
    }, 30)
  }

  function handleLeave() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setDisplay(text)
  }

  return (
    <span className={className} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {display}
    </span>
  )
}
```

- [ ] **Step 2: Typecheck the new file in isolation**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Wire `ScrambleText` into `Button`**

In `src/components/pw/Button.tsx`, add the import:

```tsx
import { ScrambleText } from "@/components/motion/ScrambleText"
```

Replace the `content` block:

```tsx
  const content = (
    <>
      {iconLeft ? <span className="pw-btn__icon">{iconLeft}</span> : null}
      {typeof children === "string" ? <ScrambleText text={children} /> : children}
      {iconRight ? <span className="pw-btn__icon">{iconRight}</span> : null}
    </>
  )
```

- [ ] **Step 4: Wire `ScrambleText` into nav links**

In `src/components/sections/Header.tsx`, add the import:

```tsx
import { ScrambleText } from "@/components/motion/ScrambleText"
```

In the `renderLink` function, replace both `{label}` render sites:

```tsx
  const renderLink = (href: string, label: string, key: string, className: string, onClick: () => void) => {
    if (href.startsWith("/")) {
      return (
        <Link key={key} className={className} to={href} onClick={onClick}>
          <ScrambleText text={label} />
        </Link>
      )
    }
    return (
      <a key={key} className={className} href={href === "#" ? href : homeHref(href)} onClick={onClick}>
        <ScrambleText text={label} />
      </a>
    )
  }
```

- [ ] **Step 5: Wire `ScrambleText` into "View project" labels**

In `src/components/sections/Work.tsx`, add the import and replace the label (around line 88-89):

```tsx
import { ScrambleText } from "@/components/motion/ScrambleText"
```

```tsx
            <span className="work__view">
              <ScrambleText text="View project" /> <ArrowUpRight size={15} />
            </span>
```

In `src/pages/WorkPage.tsx`, same import and same replacement (around line 91-92):

```tsx
                    <span className="work__view">
                      <ScrambleText text="View project" /> <ArrowUpRight size={15} />
                    </span>
```

- [ ] **Step 6: Flatten and simplify `InteractiveHoverButton`**

Replace the full contents of `src/components/pw/InteractiveHoverButton.tsx`:

```tsx
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { ScrambleText } from "@/components/motion/ScrambleText"

type CommonProps = {
  text: string
  /** Shown next to the text, slides in on hover. @default <ArrowRight /> */
  icon?: ReactNode
  className?: string
}

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined
  }

type LinkProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
  }

export type InteractiveHoverButtonProps = ButtonProps | LinkProps

export function InteractiveHoverButton(props: InteractiveHoverButtonProps) {
  const { text, icon = <ArrowRight size={16} />, className, ...rest } = props

  const classes = cn(
    "group cta-breathe relative inline-flex w-fit cursor-pointer items-center justify-center gap-2 border border-foreground bg-transparent px-6 py-2.5 text-center text-sm font-semibold uppercase tracking-wide font-mono text-foreground transition-colors duration-300 hover:border-primary hover:text-primary",
    className
  )

  const content = (
    <>
      <ScrambleText text={text} />
      <span className="inline-flex -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        {icon}
      </span>
    </>
  )

  if ("href" in rest && rest.href && !("disabled" in rest && rest.disabled)) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
    if (href.startsWith("/") && !href.includes("#")) {
      return (
        <Link to={href} className={classes} {...anchorRest}>
          {content}
        </Link>
      )
    }
    return (
      <a href={href} className={classes} {...anchorRest}>
        {content}
      </a>
    )
  }

  const { disabled, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button className={classes} disabled={disabled} aria-disabled={disabled} {...buttonRest}>
      {content}
    </button>
  )
}
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 8: Verify in browser**

Check both contexts InteractiveHoverButton renders in:
- Homepage footer (light `.foot__row` background): "Let's chat" renders as a square-cornered outlined button, correct dark text/border on the light background.
- `/contact` page (dark background): the "Next"/"Send it our way" button renders correctly on dark (light text/border).
- Hover over "Let's chat", a nav link, and a "View project" label; confirm via screenshot that the text visibly scrambles through mono glyphs before resolving back to the original label.
- Via `javascript_tool`, confirm `getComputedStyle(document.querySelector('a[aria-label="PixellWave home"] + * .pw-btn, .contact-page__next')).borderRadius` (or equivalent selector for a visible button) reports `"0px"`.

- [ ] **Step 9: Commit**

```bash
git add src/components/motion/ScrambleText.tsx src/components/pw/Button.tsx src/components/pw/InteractiveHoverButton.tsx src/components/sections/Header.tsx src/components/sections/Work.tsx src/pages/WorkPage.tsx
git commit -m "Add text-scramble hover micro-interaction and flatten InteractiveHoverButton"
```

---

## Task 7: Ambient motion — grain overlay + breathing CTA glow

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/sections/Services.tsx` (both `ServicesPinned` and `ServicesAmbient`)
- Modify: `src/pages/ContactPage.tsx`
- Modify: `src/components/sections/WorkReel.tsx`

**Interfaces:**
- Produces: CSS class `.grain-overlay` (a self-contained `<div aria-hidden="true" className="grain-overlay" />` — no props, no JS logic, purely CSS-driven).

- [ ] **Step 1: Add the grain overlay and CTA breathing-glow CSS**

In `src/index.css`, add near the bottom of the "motion primitives" section (after `.cursor-dot` rules, before `.split-text__mask`):

```css
.grain-overlay {
  position: absolute; inset: 0; z-index: 5; pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 180px 180px;
  animation: grain-shift 8s steps(8) infinite;
  mix-blend-mode: overlay;
}
@keyframes grain-shift {
  0%   { transform: translate(0, 0); }
  20%  { transform: translate(-3%, 2%); }
  40%  { transform: translate(2%, -4%); }
  60%  { transform: translate(-2%, 3%); }
  80%  { transform: translate(3%, -2%); }
  100% { transform: translate(0, 0); }
}
@keyframes cta-breathe {
  0%, 100% { box-shadow: 0 4px 16px rgba(255, 91, 0, 0.2); }
  50%      { box-shadow: 0 6px 28px rgba(255, 91, 0, 0.55); }
}
.pw-btn--primary { animation: cta-breathe 3.2s ease-in-out infinite; }
.pw-btn--primary:hover { animation: none; }
.cta-breathe { animation: cta-breathe 3.2s ease-in-out infinite; }
.cta-breathe:hover { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .grain-overlay { animation: none; }
  .pw-btn--primary, .cta-breathe { animation: none; }
}
```

- [ ] **Step 2: Add the grain overlay to dark sections**

In `src/components/sections/Services.tsx`, add `<div className="grain-overlay" aria-hidden="true" />` as the first child inside `.svc-pin__inner` (in `ServicesPinned`, right after `<div className="svc-pin__inner sec--dark" data-theme="dark">`) and as the first child of the `<section>` in `ServicesAmbient` (right after `<section id="services" className="sec sec--dark" data-theme="dark" data-screen-label="Services">`).

`ServicesPinned`:
```tsx
      <div className="svc-pin__inner sec--dark" data-theme="dark">
        <div className="grain-overlay" aria-hidden="true" />
        <div className="wrap">
```

`ServicesAmbient`:
```tsx
    <section id="services" className="sec sec--dark" data-theme="dark" data-screen-label="Services">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="wrap">
```

In `src/pages/ContactPage.tsx`, add it as the first child of `.contact-page`:

```tsx
      <section className="contact-page" data-theme="dark" data-screen-label="Contact">
        <div className="grain-overlay" aria-hidden="true" />
        <div className="wrap contact-page__body">
```

In `src/components/sections/WorkReel.tsx`, add it inside `.reel__content` (which is already `position: absolute` and dark) as the first child, right after `<motion.div className="reel__content" data-theme="dark" style={{ pointerEvents }}>`:

```tsx
              <motion.div className="reel__content" data-theme="dark" style={{ pointerEvents }}>
                <div className="grain-overlay" aria-hidden="true" />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify in browser**

Load the homepage, scroll to Services (dark section) and check via screenshot that a subtle grain texture is visible over the dark background (may be subtle — zoom into a screenshot region with `computer` `zoom` action on a flat dark area to confirm). Navigate to `/contact` and confirm the same. Scroll through WorkReel's dark content overlay and confirm grain is visible there too. Then check any visible `.pw-btn--primary` or the `InteractiveHoverButton` CTAs for a slow pulsing glow at rest (compare two screenshots taken ~1.5s apart — the box-shadow spread/opacity should differ).

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/sections/Services.tsx src/pages/ContactPage.tsx src/components/sections/WorkReel.tsx
git commit -m "Add ambient grain overlay to dark sections and breathing glow to primary CTAs"
```

---

## Task 8: Scroll-scrubbed entrance choreography — Studio rows + Footer wordmark

**Files:**
- Modify: `src/components/sections/Studio.tsx`
- Modify: `src/index.css` (`.stat` and `.studio__stats` rules from Task 3)
- Modify: `src/components/sections/Footer.tsx`

**Interfaces:**
- Consumes: `useScreenSize` (existing hook), `useScroll`/`useTransform` from `framer-motion` (already used elsewhere in the codebase, e.g. `WorkAmbient` in `src/components/sections/Work.tsx:139-144`, for the same "local, non-pinned scroll-scrub" pattern this task reuses).

- [ ] **Step 1: Give Studio a desktop-scrubbed variant, matching the existing `WorkReel`/`Services` split pattern**

Replace the full contents of `src/components/sections/Studio.tsx`:

```tsx
import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Counter } from "@/components/motion/Counter"
import { useScreenSize } from "@/components/hooks/use-screen-size"

const STATS = [
  { value: 40, suffix: "+", label: "Projects shipped" },
  { value: 98, suffix: "%", label: "Client satisfaction" },
  { value: 6, suffix: "", label: "Disciplines, one studio" },
]

function StatRow({
  stat,
  index,
  total,
  progress,
}: {
  stat: (typeof STATS)[number]
  index: number
  total: number
  progress: MotionValue<number>
}) {
  const start = index / total
  const end = (index + 0.7) / total
  // Callback-form useTransform, not the array-range form — matches the
  // established workaround for framer-motion v12's array-range
  // hardware-acceleration bug when several siblings derive different ranges
  // off the same shared progress value (see Services.tsx's ServiceRow).
  const scaleX = useTransform(progress, (v) => Math.min(1, Math.max(0, (v - start) / (end - start))))

  return (
    <div className="stat">
      <motion.span className="stat__rule" style={{ scaleX }} />
      <span className="stat__label">{stat.label}</span>
      <span className="stat__num">
        <Counter value={stat.value} suffix={stat.suffix} />
      </span>
    </div>
  )
}

/** Desktop: each stat row's divider rule draws in left-to-right, scrubbed by
 *  scroll position through the section — not a pinned section like WorkReel/
 *  Services, just a local (non-pinned) scroll-linked progress value, same
 *  mechanism as WorkAmbient's mobile drift in Work.tsx. */
function StudioScrubbed() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.75", "start 0.15"],
  })

  return (
    <section id="studio" className="sec sec--tint" data-screen-label="Studio" ref={sectionRef}>
      <div className="wrap studio__grid">
        <div>
          <Reveal>
            <SectionLabel number="02">Studio</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="studio__statement">
              We're a small team that treats every pixel like it matters — pairing{" "}
              <span className="accent-orange">precise craft</span> with{" "}
              <span className="accent-cyan">fluid momentum</span> to ship work that feels
              considered, not templated.
            </p>
          </Reveal>
        </div>

        <div className="studio__stats">
          {STATS.map((s, i) => (
            <StatRow key={s.label} stat={s} index={i} total={STATS.length} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  )
}

/** Mobile/tablet: plain trigger-once fade/rise, same as every other ambient
 *  variant on the site — pinned/scrubbed scroll reads as janky at that size. */
function StudioAmbient() {
  return (
    <section id="studio" className="sec sec--tint" data-screen-label="Studio">
      <div className="wrap studio__grid">
        <div>
          <Reveal>
            <SectionLabel number="02">Studio</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="studio__statement">
              We're a small team that treats every pixel like it matters — pairing{" "}
              <span className="accent-orange">precise craft</span> with{" "}
              <span className="accent-cyan">fluid momentum</span> to ship work that feels
              considered, not templated.
            </p>
          </Reveal>
        </div>

        <RevealGroup className="studio__stats">
          {STATS.map((s) => (
            <RevealItem className="stat" key={s.label}>
              <span className="stat__label">{s.label}</span>
              <span className="stat__num">
                <Counter value={s.value} suffix={s.suffix} />
              </span>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

export function Studio() {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")

  return isDesktop ? <StudioScrubbed /> : <StudioAmbient />
}
```

- [ ] **Step 2: Add the `.stat__rule` CSS**

In `src/index.css`, update the `.stat` rule (from Task 3) to `position: relative` and add the new rule element, replacing:

```css
.stat { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; padding: 1.1rem 0; border-bottom: 1px solid var(--border-subtle); }
```

with:

```css
.stat { position: relative; display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; padding: 1.1rem 0; overflow: hidden; }
.stat__rule { position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: var(--border-subtle); transform-origin: left; }
```

(`.studio__stats > .stat:first-child { border-top: ... }` from Task 3 also needs its `border-top` swapped for a static top rule element, since `.stat` no longer draws its own border — add directly below the `.stat__rule` line:)

```css
.studio__stats { position: relative; }
.studio__stats::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: var(--border-subtle); }
```

And remove the old `.studio__stats > .stat:first-child { border-top: 1px solid var(--border-subtle); }` line.

- [ ] **Step 3: Give the Footer's giant wordmark a scroll-scrubbed clip-path wipe (desktop only)**

In `src/components/sections/Footer.tsx`, replace the full file contents:

```tsx
import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { FitText } from "@/components/motion/FitText"
import { InteractiveHoverButton } from "@/components/pw/InteractiveHoverButton"
import { useScreenSize } from "@/components/hooks/use-screen-size"

const SOCIALS = [
  { label: "Instagram", href: "#" },
  { label: "Tiktok", href: "#" },
  { label: "LinkedIn", href: "#" },
]

export function Footer() {
  const footerRef = useRef<HTMLElement>(null)
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start 0.9", "start 0.3"],
  })
  const clipRight = useTransform(scrollYProgress, [0, 1], ["100%", "0%"])
  const clipPath = useTransform(clipRight, (v) => `inset(0 ${v} 0 0)`)

  return (
    <footer data-screen-label="Footer" ref={footerRef}>
      <div className="wrap foot__row">
        <Reveal className="foot__addr">
          <span>Milano, Italia</span>
        </Reveal>

        <RevealGroup className="foot__social" stagger={0.06}>
          {SOCIALS.map((s) => (
            <RevealItem key={s.label}>
              <a className="foot__social-link" href={s.href}>
                {s.label}
              </a>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal className="foot__cta-wrap" delay={0.1}>
          <InteractiveHoverButton text="Let's chat" href="/contact" />
        </Reveal>
      </div>

      {isDesktop ? (
        <motion.div style={{ clipPath }}>
          <FitText
            text="YourVisionOurWave"
            className="foot__giant"
            textClassName="foot__giant-text"
            aria-hidden="true"
          />
        </motion.div>
      ) : (
        <FitText
          text="YourVisionOurWave"
          className="foot__giant"
          textClassName="foot__giant-text"
          aria-hidden="true"
        />
      )}
    </footer>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify in browser**

Scroll slowly through the Studio section on a desktop viewport and confirm, via a sequence of screenshots at different scroll positions, that each stat row's bottom rule visibly draws in left-to-right rather than just appearing. Scroll to the Footer and confirm the giant "YourVisionOurWave" wordmark wipes in from the left as the footer enters view, rather than being instantly fully visible. Resize to `mobile` and confirm both sections still render correctly (Studio falls back to plain fade-in rows, Footer's wordmark is fully visible without needing scroll — no `clipPath` wrapper applied).

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/Studio.tsx src/index.css src/components/sections/Footer.tsx
git commit -m "Add scroll-scrubbed entrance choreography to Studio rows and Footer wordmark"
```

---

## Final verification

After all 8 tasks:

- [ ] Run `npx tsc -b --noEmit` once more from a clean state — expected: no errors.
- [ ] Run `npm run build` — expected: production build succeeds (catches any Vite-specific issue the dev server didn't surface, e.g. the new `@fontsource` import).
- [ ] Full click-through in the browser: homepage top to bottom, `/work`, `/contact` through all 3 steps, resized to `mobile` and back to `desktop` — no console errors (`read_console_messages`), no visually broken layout.
