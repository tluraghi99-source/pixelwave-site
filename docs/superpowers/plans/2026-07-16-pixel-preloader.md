# Pixel-Grid Preloader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Preloader's logo+progress-bar UI with a full-black square-pixel grid that resolves to white in sync with real webfont-loading progress, plus a centered percentage counter, per `docs/superpowers/specs/2026-07-16-pixel-preloader-design.md`.

**Architecture:** Two new small files (a presentational grid component, a data/timing hook) plus a rewrite of `Preloader.tsx` to compose them. The grid component takes a plain `progress: MotionValue<number>` prop and knows nothing about fonts or timing; the hook knows nothing about pixels and just produces a smoothed 0–100 value plus a reveal callback. This mirrors the existing `Counter` component's `useMotionValue` + `useSpring` pattern already used elsewhere in this codebase, and the existing `PixelTrail` component's real-DOM-per-tile approach (already proven performant in this exact codebase for a similarly-sized full-viewport grid).

**Tech Stack:** React 19 + TypeScript, Framer Motion v12 (`useMotionValue`, `useSpring`, `useMotionValueEvent`), plain CSS in `src/index.css`.

## Global Constraints

- No test runner exists in this project (confirmed: no vitest/jest/playwright in `package.json`). Verification is `npx tsc -b --noEmit` plus manual browser checks via the preview tools — never invent a test file.
- Square tiles, fixed 24px size (matches `PixelTrail`'s existing pixel scale).
- All tiles start solid black (`var(--pw-black)`); no logo mark shown during loading.
- Percentage counter is centered, plain white text, no blend-mode.
- One shared `progress` value (0–100) drives both the visible tile-resolve and the displayed percentage — never two independently-timed phases.
- Per-tile resolve threshold: `Math.pow(Math.random(), 0.5) * 100` — sparse near 0 (slow start), dense near 100 (rapid finish). No spatial pattern.
- Real signal: `document.fonts.ready` only. Max-wait fallback: 3500ms. Minimum display duration: 900ms (measured from Preloader mount). Settle delay after progress hits 100 before calling `onReveal`: 400ms (lets the last tiles' 0.35s transition actually finish before handoff).
- `prefers-reduced-motion: reduce`: tiles flip instantly (no CSS transition) and the progress spring is stiff/near-instant — the loading gate (waiting for fonts, respecting min/max duration) still applies, only the animated *look* of it is skipped.
- `sessionStorage` skip-if-already-seen (`pw-intro-seen`) behavior is unchanged.
- Out of scope: any hero photo, any scroll-driven reveal, changes to WorkReel's video or the WebGL gallery's own loading.

---

## Task 1: `PixelResolveGrid` component + Preloader rewiring (temporary linear driver)

**Files:**
- Create: `src/components/motion/PixelResolveGrid.tsx`
- Modify: `src/components/Preloader.tsx` (full rewrite)
- Modify: `src/index.css` (replace `.preloader__mark`/`.preloader__bar`/`.preloader__fill` rules with `.preloader__grid`/`.pixel-resolve-grid`/`.pixel-resolve-grid__tile`/`.preloader__pct`)

**Interfaces:**
- Produces: `PixelResolveGrid({ progress: MotionValue<number>, tileSize?: number, className?: string })` — a JSX component. `progress` is read 0–100; any internal tile whose own randomly-assigned threshold is `<= progress` flips from black to white.
- This task's `Preloader.tsx` drives `progress` with a **temporary** linear 0→100 ramp over 1.5s — purely to verify the grid's visual behavior. Task 2 replaces this with the real hook; nothing outside `Preloader.tsx` depends on the temporary driver.

- [ ] **Step 1: Add the CSS for the grid and percentage counter**

In `src/index.css`, find and replace the existing preloader rules:

```css
.preloader {
  position: fixed; inset: 0; z-index: var(--z-modal);
  background: var(--pw-black); color: var(--pw-white);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem;
}
.preloader__mark { filter: drop-shadow(0 0 24px rgba(255, 91, 0, 0.5)); }
.preloader__bar { width: 120px; height: 2px; background: rgba(255, 255, 255, 0.14); overflow: hidden; }
.preloader__fill { display: block; width: 100%; height: 100%; background: var(--pw-orange); transform-origin: 0% 50%; }
```

with:

```css
.preloader { position: fixed; inset: 0; z-index: var(--z-modal); background: var(--pw-black); overflow: hidden; }
.pixel-resolve-grid { position: absolute; inset: 0; display: grid; }
.pixel-resolve-grid__tile { background: var(--pw-black); }
.preloader__pct {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1;
  font-family: var(--font-mono-accent); font-weight: 600; font-size: clamp(1.75rem, 3vw, 2.5rem);
  color: var(--pw-white); letter-spacing: -0.02em;
}
```

- [ ] **Step 2: Create `PixelResolveGrid`**

```tsx
// src/components/motion/PixelResolveGrid.tsx
import { useEffect, useRef } from "react"
import { useMotionValueEvent } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { useDimensions } from "@/components/hooks/use-debounced-dimensions"

interface Tile {
  el: HTMLDivElement
  threshold: number
  resolved: boolean
}

interface PixelResolveGridProps {
  /** 0–100. Any tile whose own threshold is <= this value flips to white. */
  progress: MotionValue<number>
  /** Square tile size in px. @default 24 */
  tileSize?: number
  className?: string
}

/** Full-bleed grid of square pixels, all starting black, each independently
 *  flipping to white once `progress` crosses its own randomly-assigned
 *  threshold. Tiles are plain DOM nodes mutated directly (not React state)
 *  since a full-viewport 24px grid is thousands of nodes — same approach
 *  already used by PixelTrail for a similarly-sized grid in this codebase. */
export function PixelResolveGrid({ progress, tileSize = 24, className }: PixelResolveGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dimensions = useDimensions(containerRef)
  const tilesRef = useRef<Tile[]>([])
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const cols = Math.ceil((dimensions.width || 0) / tileSize)
  const rows = Math.ceil((dimensions.height || 0) / tileSize)

  useEffect(() => {
    const container = containerRef.current
    if (!container || cols === 0 || rows === 0) return
    container.innerHTML = ""
    container.style.gridTemplateColumns = `repeat(${cols}, ${tileSize}px)`
    container.style.gridTemplateRows = `repeat(${rows}, ${tileSize}px)`
    const tiles: Tile[] = []
    const count = cols * rows
    const current = progress.get()
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div")
      el.className = "pixel-resolve-grid__tile"
      // Square-root of a uniform sample — low thresholds are sparse (slow
      // start), thresholds bunch up near 100 (rapid finish), no spatial
      // pattern to which tile resolves when.
      const threshold = Math.pow(Math.random(), 0.5) * 100
      const resolved = threshold <= current
      if (resolved) el.style.background = "var(--pw-white)"
      container.appendChild(el)
      tiles.push({ el, threshold, resolved })
    }
    tilesRef.current = tiles
  }, [cols, rows, tileSize, progress])

  useMotionValueEvent(progress, "change", (latest) => {
    for (const tile of tilesRef.current) {
      if (!tile.resolved && tile.threshold <= latest) {
        tile.resolved = true
        if (!reducedMotion) tile.el.style.transition = "background-color .35s ease"
        tile.el.style.background = "var(--pw-white)"
      }
    }
  })

  return <div ref={containerRef} className={`pixel-resolve-grid ${className ?? ""}`.trim()} />
}
```

- [ ] **Step 3: Rewrite `Preloader.tsx` with a temporary linear progress driver**

```tsx
// src/components/Preloader.tsx
import { useEffect, useState } from "react"
import { useMotionValue } from "framer-motion"
import { PixelResolveGrid } from "@/components/motion/PixelResolveGrid"

const SEEN_KEY = "pw-intro-seen"

interface PreloaderProps {
  onReveal: () => void
}

/** Brief branded loading screen shown once per session — a full-black pixel
 *  grid that resolves to white in sync with page-load progress, then hands
 *  off to the Hero (already showing through, since the grid resolves to the
 *  same white the Hero's own background already is). */
export function Preloader({ onReveal }: PreloaderProps) {
  const [alreadySeen] = useState(() => {
    try {
      return sessionStorage.getItem(SEEN_KEY) === "1"
    } catch {
      return false
    }
  })
  const [hidden, setHidden] = useState(false)
  const progress = useMotionValue(0)
  const [displayPercent, setDisplayPercent] = useState(0)

  useEffect(() => {
    if (alreadySeen) {
      onReveal()
      return
    }
    // TEMPORARY: linear 0→100 over 1.5s, verifies the grid's visual
    // behavior only — replaced by real asset-loading progress in Task 2.
    const start = performance.now()
    const duration = 1500
    let raf: number
    function tick() {
      const elapsed = performance.now() - start
      const pct = Math.min(100, (elapsed / duration) * 100)
      progress.set(pct)
      setDisplayPercent(Math.round(pct))
      if (pct < 100) {
        raf = requestAnimationFrame(tick)
      } else {
        onReveal()
        try {
          sessionStorage.setItem(SEEN_KEY, "1")
        } catch {
          /* ignore */
        }
        setTimeout(() => setHidden(true), 400)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadySeen])

  if (alreadySeen || hidden) return null

  return (
    <div className="preloader">
      <PixelResolveGrid progress={progress} className="preloader__grid" />
      <span className="preloader__pct">{displayPercent}%</span>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify in browser**

Start the dev server. Clear the session flag and reload so the preloader actually shows:

```js
sessionStorage.removeItem('pw-intro-seen'); location.reload();
```

Confirm via screenshot/`javascript_tool`:
- Page starts as a solid black grid of square tiles (no logo mark visible).
- Tiles progressively flip to white, sparse at first then rapid, over ~1.5s.
- A percentage counter is centered, white, counting up, disappearing as the surrounding tiles turn white.
- After it finishes, the Hero's own entrance (big mark fade/scale-in) plays normally.
- Reload again without clearing `sessionStorage` — confirm the preloader is skipped entirely (existing behavior, unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/components/motion/PixelResolveGrid.tsx src/components/Preloader.tsx src/index.css
git commit -m "Add pixel-resolve grid preloader (temporary linear progress driver)"
```

---

## Task 2: `useLoadProgress` hook — real webfont-loading, min/max timing, reduced-motion

**Files:**
- Create: `src/components/hooks/use-load-progress.ts`
- Modify: `src/components/Preloader.tsx` (swap the temporary linear driver for the real hook)

**Interfaces:**
- Consumes: `PixelResolveGrid`'s `progress: MotionValue<number>` prop (Task 1) — this hook is what actually produces that value going forward.
- Produces: `useLoadProgress({ onReveal: () => void, minDurationMs?: number, maxWaitMs?: number, settleMs?: number }): { progress: MotionValue<number>, displayPercent: number }`.

- [ ] **Step 1: Create the hook**

```ts
// src/components/hooks/use-load-progress.ts
import { useEffect, useState } from "react"
import { useMotionValue, useSpring } from "framer-motion"
import type { MotionValue } from "framer-motion"

interface UseLoadProgressOptions {
  onReveal: () => void
  /** Preloader must stay visible at least this long, even if fonts resolve instantly (e.g. already cached). @default 900 */
  minDurationMs?: number
  /** Force-complete if fonts.ready hasn't resolved by then — must never hang. @default 3500 */
  maxWaitMs?: number
  /** Extra delay after progress hits 100 before calling onReveal, so the last tiles' own transition actually finishes before handoff. @default 400 */
  settleMs?: number
}

interface UseLoadProgressResult {
  /** Spring-smoothed 0–100 value — drives both the pixel grid and displayPercent. */
  progress: MotionValue<number>
  /** Rounded 0–100, for the on-screen counter. */
  displayPercent: number
}

/** Tracks real webfont-loading (document.fonts.ready) instead of a fixed
 *  timer, smoothed by a spring so the displayed percentage (and the pixel
 *  grid driven by the same value) read as continuous progress rather than
 *  a single binary jump — then calls onReveal once loading is done and the
 *  minimum display duration has elapsed. */
export function useLoadProgress({
  onReveal,
  minDurationMs = 900,
  maxWaitMs = 3500,
  settleMs = 400,
}: UseLoadProgressOptions): UseLoadProgressResult {
  const rawTarget = useMotionValue(0)
  const [reducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
  const spring = useSpring(rawTarget, reducedMotion ? { stiffness: 1000, damping: 100 } : { stiffness: 60, damping: 20 })
  const [displayPercent, setDisplayPercent] = useState(0)

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplayPercent(Math.round(Math.min(100, v))))
    return unsub
  }, [spring])

  useEffect(() => {
    const mountTime = performance.now()
    let done = false

    // Eases toward 90 while waiting, never reaching it on its own — real
    // completion (finish()) is what pushes the value the rest of the way
    // to 100, so the number never lies about being done before it is.
    const nudgeInterval = setInterval(() => {
      const current = rawTarget.get()
      rawTarget.set(current + (90 - current) * 0.15)
    }, 150)

    function finish() {
      if (done) return
      done = true
      clearInterval(nudgeInterval)
      clearTimeout(maxWaitTimer)
      const elapsed = performance.now() - mountTime
      const wait = Math.max(0, minDurationMs - elapsed)
      setTimeout(() => {
        rawTarget.set(100)
        setTimeout(onReveal, settleMs)
      }, wait)
    }

    const maxWaitTimer = setTimeout(finish, maxWaitMs)

    const fontSet = typeof document !== "undefined" ? document.fonts : undefined
    if (fontSet?.ready) {
      fontSet.ready.then(finish)
    } else {
      finish()
    }

    return () => {
      clearInterval(nudgeInterval)
      clearTimeout(maxWaitTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { progress: spring, displayPercent }
}
```

- [ ] **Step 2: Typecheck the hook in isolation**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Swap the temporary driver in `Preloader.tsx` for the real hook**

Replace the full contents of `src/components/Preloader.tsx`:

```tsx
import { useEffect, useState } from "react"
import { PixelResolveGrid } from "@/components/motion/PixelResolveGrid"
import { useLoadProgress } from "@/components/hooks/use-load-progress"

const SEEN_KEY = "pw-intro-seen"

interface PreloaderProps {
  onReveal: () => void
}

/** Brief branded loading screen shown once per session — a full-black pixel
 *  grid that resolves to white in sync with real page-load progress, then
 *  hands off to the Hero (already showing through, since the grid resolves
 *  to the same white the Hero's own background already is). */
export function Preloader({ onReveal }: PreloaderProps) {
  const [alreadySeen] = useState(() => {
    try {
      return sessionStorage.getItem(SEEN_KEY) === "1"
    } catch {
      return false
    }
  })
  const [hidden, setHidden] = useState(false)

  function handleReveal() {
    onReveal()
    try {
      sessionStorage.setItem(SEEN_KEY, "1")
    } catch {
      /* ignore */
    }
    setHidden(true)
  }

  const { progress, displayPercent } = useLoadProgress({ onReveal: handleReveal })

  useEffect(() => {
    if (alreadySeen) onReveal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadySeen])

  if (alreadySeen || hidden) return null

  return (
    <div className="preloader">
      <PixelResolveGrid progress={progress} className="preloader__grid" />
      <span className="preloader__pct">{displayPercent}%</span>
    </div>
  )
}
```

Note: `useLoadProgress` is called unconditionally (React hooks rules — it must run every render), but its internal timers are harmless no-ops if `alreadySeen` is true, since the component returns `null` before rendering anything driven by it, and `handleReveal`/`onReveal` being called an extra time in that path is already guarded by the `hidden`/`alreadySeen` early return in the parent (`HomePage`'s `introDone` is a one-way flip).

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify real-loading timing in the browser**

Start the dev server, clear the session flag, reload, and measure actual elapsed time from mount to the preloader disappearing:

```js
(async () => {
  sessionStorage.removeItem('pw-intro-seen');
  const start = performance.now();
  location.reload();
})();
```

After reload, poll for the preloader's removal and compute elapsed time:

```js
(async () => {
  const start = performance.now();
  await new Promise((resolve) => {
    const check = () => {
      if (!document.querySelector('.preloader')) return resolve();
      requestAnimationFrame(check);
    };
    check();
  });
  return JSON.stringify({ elapsedMs: performance.now() - start });
})();
```

Expected: elapsed time is at least ~900ms (the minimum display duration) — on a dev server with already-cached fonts this should land close to that floor, not the full 3500ms fallback (that path can't be easily forced from the browser tools available here — confirm its logic by re-reading Step 1's code instead: `maxWaitTimer` calls `finish()` the same way the fonts-ready path does, so it is exercised correctly by construction, just not independently reproducible in this environment).

- [ ] **Step 6: Verify `prefers-reduced-motion` fallback via code inspection**

There's no way to toggle OS-level `prefers-reduced-motion` from the browser tools available here. Re-read `PixelResolveGrid.tsx` and `use-load-progress.ts` and confirm: `reducedMotion` is computed synchronously via a lazy `useState` initializer (not a ref set inside an effect, which would be one render too late), the grid skips setting `transition` when true, and the spring config is stiff/near-instant when true — all three are read before first paint, not patched in afterward.

- [ ] **Step 7: Commit**

```bash
git add src/components/hooks/use-load-progress.ts src/components/Preloader.tsx
git commit -m "Drive preloader progress from real webfont loading instead of a fixed timer"
```

---

## Final verification

- [ ] Run `npx tsc -b --noEmit` once more from a clean state — expected: no errors.
- [ ] Run `npm run build` — expected: production build succeeds.
- [ ] Full reload cycle in the browser: clear `pw-intro-seen`, reload, watch the full pixel-resolve sequence complete and hand off cleanly into the Hero's own entrance; reload again and confirm the preloader is skipped (sessionStorage behavior unchanged); check `read_console_messages` for errors throughout.
