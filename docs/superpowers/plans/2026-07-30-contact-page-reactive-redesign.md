# Contact Page Reactive Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Contact page's static two-column step wizard with a full-bleed page where a giant headline reacts live to what the visitor types/picks, backed by a cursor-reactive ambient grid — per `docs/superpowers/specs/2026-07-30-contact-page-reactive-redesign-design.md`.

**Architecture:** One new small canvas component (`CursorGlow`) plus a full rewrite of `ContactPage.tsx`'s JSX (same underlying state machine, new layout) and its matching CSS block in `index.css`. No other files change.

**Tech Stack:** React 19 + TypeScript + Vite, Framer Motion v12 (`AnimatePresence`/`motion.div`, unchanged usage), existing `FitText`/`Input`/`Tag`/`InteractiveHoverButton` components reused as-is, plain CSS custom-property tokens in `src/index.css`.

## Global Constraints

- No test runner exists in this project (`package.json` has no `vitest`/`jest`/`playwright`). Every task's "test" step is: `npx tsc -b` for type safety, then manual verification in the running dev server via the browser preview tools (screenshot, `read_page`, `computer` clicks, `getComputedStyle`/state checks via `javascript_tool`). Do not invent a test framework or fake test files.
- Start the dev server with the browser preview tool (`preview_start` with name `pixellwave-dev` from `.claude/launch.json`) before verification steps — never `npm run dev` via plain Bash.
- `prefers-reduced-motion: reduce` must be respected by the new `CursorGlow` component specifically (render one static frame, no animation loop) — this is a JS-driven `requestAnimationFrame` loop, so the site's blanket CSS transition/animation-duration override does not reach it; it needs its own `window.matchMedia("(prefers-reduced-motion: reduce)").matches` check.
- Never commit `.superpowers/` or unrelated pre-existing staged changes. This repo's working tree has substantial unrelated pre-existing uncommitted work at all times — every task's commit must `git add`/`git commit` only the exact files that task modified, never `git add -A` or a bare `git commit -m` with no pathspec.
- Out of scope (do not touch as part of this plan): real form submission/backend wiring, the site's global `Header`/`Footer`, any "jump back to a previous step" interaction (the new progress dashes are display-only, per the spec).

---

## Task 1: `CursorGlow` ambient background component

**Files:**
- Create: `src/components/motion/CursorGlow.tsx`
- Modify: `src/index.css` (add `.contact-page__glow` rule, in the same edit as Task 2's CSS block — see Task 2)

**Interfaces:**
- Produces: `CursorGlow({ className }: { className?: string })` — a `<canvas aria-hidden="true">` that fills its nearest positioned ancestor and paints a dot grid that glows `var(--pw-orange)` near the cursor. Consumed by `ContactPage.tsx` in Task 2.

- [ ] **Step 1: Create the component**

```tsx
import { useEffect, useRef } from "react"

interface CursorGlowProps {
  className?: string
}

const CELL = 26
const RADIUS = 190

/** Ambient background layer — a faint dot grid that glows the site's accent
 *  orange near the cursor. Purely decorative (aria-hidden, no pointer
 *  events of its own) and static under prefers-reduced-motion — a single
 *  frame is drawn and the animation loop never starts. */
export function CursorGlow({ className }: CursorGlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const mouse = { x: -9999, y: -9999 }
    let raf = 0

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = rect.width
      canvas!.height = rect.height
    }

    function draw() {
      const w = canvas!.width
      const h = canvas!.height
      ctx!.clearRect(0, 0, w, h)
      const cols = Math.ceil(w / CELL)
      const rows = Math.ceil(h / CELL)
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const cx = i * CELL + CELL / 2
          const cy = j * CELL + CELL / 2
          const dx = cx - mouse.x
          const dy = cy - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const t = Math.max(0, 1 - dist / RADIUS)
          const size = 2 + t * 3
          ctx!.fillStyle =
            t > 0.02 ? `rgba(255,91,0,${(0.08 + t * 0.85).toFixed(3)})` : "rgba(255,255,255,0.06)"
          ctx!.fillRect(cx - size / 2, cy - size / 2, size, size)
        }
      }
    }

    function handleMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    function handleLeave() {
      mouse.x = -9999
      mouse.y = -9999
    }

    resize()
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) {
      draw()
    } else {
      const loop = () => {
        draw()
        raf = requestAnimationFrame(loop)
      }
      loop()
      window.addEventListener("mousemove", handleMove)
      window.addEventListener("mouseleave", handleLeave)
    }
    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseleave", handleLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors (this file isn't imported anywhere yet, so this only checks the file itself is valid TypeScript).

- [ ] **Step 3: Commit**

```bash
git add src/components/motion/CursorGlow.tsx
git commit src/components/motion/CursorGlow.tsx -m "Add CursorGlow ambient background component"
```

(Deliberately not wired into any page yet — Task 2 both wires it in and adds its CSS, so it can be verified visually as part of that task rather than in isolation against a blank test page.)

---

## Task 2: Rebuild `ContactPage.tsx` and its CSS

**Files:**
- Modify: `src/pages/ContactPage.tsx` (full rewrite of the file's JSX/return; state/logic at the top stays)
- Modify: `src/index.css:1018-1080` (replace the whole `.contact-page*` block)

**Interfaces:**
- Consumes: `CursorGlow` from Task 1 (`src/components/motion/CursorGlow.tsx`), `FitText` (`src/components/motion/FitText.tsx`, already exists — `{ text, className, textClassName, "aria-hidden" }`).
- Produces: the rebuilt `/contact` page. Nothing else in the codebase imports from `ContactPage.tsx`, so this task's surface area is self-contained.

- [ ] **Step 1: Replace `src/pages/ContactPage.tsx` entirely**

```tsx
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"
import { Input } from "@/components/pw/Input"
import { Tag } from "@/components/pw/Tag"
import { InteractiveHoverButton } from "@/components/pw/InteractiveHoverButton"
import { FitText } from "@/components/motion/FitText"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { EASE_WAVE } from "@/lib/motion"

const STEPS = [
  { key: "detail", label: "Detail" },
  { key: "type", label: "Project type" },
  { key: "when", label: "When" },
] as const

const PROJECT_TYPES = ["Web Design", "Brand Identity", "Motion", "Development"]
const TIMELINES = ["ASAP", "1–3 months", "3–6 months", "Not sure yet"]

export function ContactPage() {
  const [stepIndex, setStepIndex] = useState(0)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [projectType, setProjectType] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const canAdvance =
    step.key === "detail"
      ? name.trim() !== "" && email.trim() !== ""
      : step.key === "type"
        ? projectType !== null
        : timeline !== null

  function handleNext() {
    if (!canAdvance) return
    if (isLastStep) {
      setSent(true)
      return
    }
    setStepIndex((i) => i + 1)
  }

  // The giant FitText mirror and its small eyebrow both derive from the same
  // state the real, accessible controls below already expose — there's
  // nothing here a screen reader needs that the labeled Input/Tag controls
  // don't already say, which is why the mirror stays aria-hidden.
  const firstName = name.trim().split(" ")[0] || "there"
  const reactive = sent
    ? { text: `Thanks, ${firstName}!`, isPlaceholder: false }
    : step.key === "detail"
      ? { text: name || "Your name", isPlaceholder: !name }
      : step.key === "type"
        ? { text: projectType ?? "Pick a project type", isPlaceholder: projectType === null }
        : { text: timeline ?? "Pick a timeline", isPlaceholder: timeline === null }

  const eyebrowText = sent
    ? "Sent"
    : step.key === "detail"
      ? "Tell us who you are"
      : step.key === "type"
        ? "What are we building"
        : "When are you starting"

  return (
    <main>
      <section className="contact-page" data-theme="dark" data-screen-label="Contact">
        <div className="grain-overlay" aria-hidden="true" />
        <CursorGlow className="contact-page__glow" />

        <div
          className="contact-page__progress"
          role="img"
          aria-label={sent ? "Sent" : `Step ${stepIndex + 1} of ${STEPS.length}`}
        >
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`contact-page__progress-dash ${
                sent || i < stepIndex ? "is-done" : i === stepIndex ? "is-active" : ""
              }`}
            />
          ))}
        </div>

        <h2 className="contact-page__eyebrow">{eyebrowText}</h2>

        <div className="contact-page__content">
          <FitText
            text={reactive.text}
            className={`contact-page__reactive ${reactive.isPlaceholder ? "is-placeholder" : ""}`}
            textClassName="contact-page__reactive-text"
            aria-hidden="true"
          />
        </div>

        <div className="contact-page__strip">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                className="contact-page__sent-row"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_WAVE }}
              >
                <Check className="contact-page__sent-icon" size={20} aria-hidden="true" />
                <p className="contact-page__sent-msg">We'll be in touch shortly.</p>
              </motion.div>
            ) : (
              <motion.div
                key={step.key}
                className="contact-page__strip-row"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: EASE_WAVE }}
              >
                {step.key === "detail" && (
                  <div className="contact-page__fields">
                    <Input
                      label="Name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="Mail address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                )}

                {step.key === "type" && (
                  <div className="contact-page__chips">
                    {PROJECT_TYPES.map((t) => (
                      <Tag
                        key={t}
                        interactive
                        variant={projectType === t ? "orange" : "outline"}
                        onClick={() => setProjectType(t)}
                      >
                        {t}
                      </Tag>
                    ))}
                  </div>
                )}

                {step.key === "when" && (
                  <div className="contact-page__chips">
                    {TIMELINES.map((t) => (
                      <Tag
                        key={t}
                        interactive
                        variant={timeline === t ? "orange" : "outline"}
                        onClick={() => setTimeline(t)}
                      >
                        {t}
                      </Tag>
                    ))}
                  </div>
                )}

                <InteractiveHoverButton
                  text={isLastStep ? "Send it our way" : "Next"}
                  icon={<ArrowRight size={16} />}
                  onClick={handleNext}
                  className={`contact-page__next ${canAdvance ? "" : "contact-page__next--disabled"}`}
                  aria-disabled={!canAdvance}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Replace the `.contact-page*` CSS block**

In `src/index.css`, the current block runs from the `/contact` comment (`/* /contact — a single, non-scrolling...`) through the `@media (max-width: 820px)` rule that follows it (currently lines 1018-1080 — confirm the exact range hasn't shifted before editing, since earlier edits this session touched nearby lines). Replace that whole block with:

```css
/* /contact — a single, non-scrolling full-viewport screen on desktop (the
   header floats transparently over it, same as the homepage hero); a giant
   FitText headline mirrors whatever the visitor is currently typing/picking
   (aria-hidden — purely decorative, the real accessible controls are the
   labeled Input/Tag elements in the strip below it), backed by an ambient
   cursor-reactive grid (CursorGlow). */
.contact-page {
  position: relative;
  height: 100svh; overflow: hidden;
  display: flex; flex-direction: column;
  background: var(--pw-black); color: var(--pw-white);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding-top: clamp(6rem, 9vw, 8rem);
}
.contact-page__glow { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }

.contact-page__progress {
  position: relative; z-index: 2;
  display: flex; justify-content: flex-end; gap: 6px;
  padding: 0 clamp(1rem, 1.2vw, 1.25rem);
}
.contact-page__progress-dash { width: 14px; height: 4px; background: rgba(255, 255, 255, 0.1); }
.contact-page__progress-dash.is-active { background: var(--pw-white); }
.contact-page__progress-dash.is-done { background: var(--pw-orange); }

.contact-page__eyebrow {
  position: relative; z-index: 2;
  margin: 1rem 0 0; padding: 0 clamp(1rem, 1.2vw, 1.25rem);
  font-family: var(--font-text); font-weight: 500;
  font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--text-secondary);
}

.contact-page__content {
  position: relative; z-index: 2;
  flex: 1 1 auto; min-height: 0;
  display: flex; flex-direction: column; justify-content: flex-end;
  padding: 0 clamp(1rem, 1.2vw, 1.25rem) 0.5rem;
}
.contact-page__reactive { overflow: hidden; }
.contact-page__reactive-text {
  font-family: var(--font-display); font-weight: 700;
  line-height: 0.94; letter-spacing: -0.02em;
  color: var(--pw-white);
}
.contact-page__reactive.is-placeholder .contact-page__reactive-text { color: var(--pw-neutral-30); }

.contact-page__strip {
  position: relative; z-index: 2;
  padding: 1.75rem clamp(1rem, 1.2vw, 1.25rem) 2.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.contact-page__strip-row { display: flex; align-items: flex-end; gap: 1.5rem; flex-wrap: wrap; }
.contact-page .pw-input { background: var(--surface-raised); border-color: transparent; }
.contact-page .pw-field__label { display: none; }
.contact-page__fields { display: flex; gap: 1rem; flex: 1 1 auto; flex-wrap: wrap; }
.contact-page__chips { display: flex; flex-wrap: wrap; gap: 0.6rem; flex: 1 1 auto; }
.contact-page__next--disabled { opacity: 0.4; pointer-events: none; }
.contact-page__sent-row { display: flex; align-items: center; gap: 0.6rem; }
.contact-page__sent-icon { color: var(--pw-orange); flex-shrink: 0; }
.contact-page__sent-msg { color: var(--text-secondary); margin: 0; }

@media (max-width: 640px) {
  .contact-page { padding-top: clamp(5rem, 14vw, 6rem); }
  .contact-page__strip-row { gap: 1rem; }
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Start the dev server preview and load `/contact`**

Use the browser preview tool: `preview_start` with `{ name: "pixellwave-dev" }`, then navigate to `http://localhost:5173/contact`.

- [ ] **Step 5: Verify the reactive headline updates live while typing**

Using `javascript_tool`, dispatch a real `input` event on the name field (same pattern as this session's earlier manual test of this page) and read back the giant text's content:

```js
(function(){
  const el = document.querySelector('input[placeholder="Your name"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, 'Ada');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return document.querySelector('.contact-page__reactive-text').textContent;
})()
```

Expected: returns `"Ada"`.

- [ ] **Step 6: Verify a chip pick updates the headline and advances the step**

Click "Next" (via a real dispatched click, per this session's established pattern for this page), pick "Web Design", and confirm:

```js
(function(){
  const opts = { bubbles: true, cancelable: true, view: window };
  const next = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next'));
  next.dispatchEvent(new PointerEvent('pointerdown', opts));
  next.dispatchEvent(new MouseEvent('click', opts));
  return document.querySelector('.contact-page__eyebrow').textContent;
})()
```

Expected: `"What are we building"`. Then click a chip labeled "Web Design" the same way and confirm `document.querySelector('.contact-page__reactive-text').textContent === "Web Design"`.

- [ ] **Step 7: Take a screenshot to visually confirm layout**

Use the `computer` tool's `screenshot` action. Expected: dark full-bleed page, small progress dashes top-right, small uppercase eyebrow, giant headline below it, minimal control strip at the bottom, faint orange-tinted grid visible behind everything.

- [ ] **Step 8: Commit**

```bash
git add src/pages/ContactPage.tsx src/index.css
git commit src/pages/ContactPage.tsx src/index.css -m "Rebuild Contact page around a live-reactive giant headline"
```

---

## Task 3: Final review pass

**Files:** none new — this task only verifies Tasks 1-2's output and fixes anything it finds in `src/pages/ContactPage.tsx` / `src/index.css` / `src/components/motion/CursorGlow.tsx`.

**Interfaces:** none — this is a verification task, not a new interface.

- [ ] **Step 1: Full flow test through to "Sent"**

In the running preview, drive the whole flow (fill name/email → Next → pick a project type → Next → pick a timeline → Send it our way), using dispatched events as in Task 2's verification steps. Confirm at the end: `document.querySelector('.contact-page__reactive-text').textContent` starts with `"Thanks, "` and `document.querySelector('.contact-page__sent-msg').textContent === "We'll be in touch shortly."`.

- [ ] **Step 2: Mobile check**

Resize the preview viewport to `390x844` (per this session's established pattern for mobile checks), reload `/contact`, and screenshot. Expected: same single-column layout, giant headline sized down responsively (via `FitText`'s own width-based fit — no separate mobile-specific giant-text CSS needed per the spec), strip's fields/chips wrapping via `flex-wrap`, no horizontal scrollbar.

- [ ] **Step 3: Reduced-motion check for `CursorGlow`**

```js
(function(){
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
})()
```

If the test environment can't force this media feature, instead read `src/components/motion/CursorGlow.tsx` and confirm by inspection that the `requestAnimationFrame` loop and its `mousemove`/`mouseleave` listeners are only attached inside the `else` branch (i.e. never run at all when `reduceMotion` is true) — re-confirm this matches the file exactly as written in Task 1.

- [ ] **Step 4: Accessibility check**

Confirm via `javascript_tool`:

```js
(function(){
  const reactive = document.querySelector('.contact-page__reactive');
  const progress = document.querySelector('.contact-page__progress');
  const glow = document.querySelector('.contact-page__glow');
  return JSON.stringify({
    reactiveHidden: reactive.getAttribute('aria-hidden'),
    glowHidden: glow.getAttribute('aria-hidden'),
    progressLabel: progress.getAttribute('aria-label'),
    eyebrowTag: document.querySelector('.contact-page__eyebrow').tagName,
  });
})()
```

Expected: `reactiveHidden: "true"`, `glowHidden: "true"`, `progressLabel` a non-empty string like `"Step 1 of 3"`, `eyebrowTag: "H2"`.

- [ ] **Step 5: Lint and type-check clean**

Run: `npm run lint`
Expected: no errors in `src/pages/ContactPage.tsx`, `src/index.css` (oxlint doesn't lint CSS, but confirm no new JS/TS errors), or `src/components/motion/CursorGlow.tsx`.

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Confirm no dead CSS remains**

```bash
grep -n "contact-page__panel\|contact-page__steps\|contact-page__step-giant\|contact-page__left\b" src/index.css src/pages/ContactPage.tsx
```

Expected: no matches (all removed as part of Task 2's rewrite).

- [ ] **Step 7: Fix anything found in Steps 1-6, then commit if any fixes were needed**

```bash
git add src/pages/ContactPage.tsx src/index.css src/components/motion/CursorGlow.tsx
git commit src/pages/ContactPage.tsx src/index.css src/components/motion/CursorGlow.tsx -m "Fix issues found in Contact page redesign review"
```

(Skip this commit entirely if Steps 1-6 found nothing to fix.)
