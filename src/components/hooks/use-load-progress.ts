import { useEffect, useState } from "react"
import { useMotionValue, useSpring } from "framer-motion"
import type { MotionValue } from "framer-motion"

interface UseLoadProgressOptions {
  onReveal: () => void
  /** Set false to skip the internal loading-timer/font-tracking entirely
   *  (e.g. the sessionStorage-skip path, where the preloader never
   *  renders) — avoids redundant background work and a second onReveal
   *  call. @default true */
  enabled?: boolean
  /** Preloader must stay visible at least this long, even if fonts resolve instantly (e.g. already cached). @default 900 */
  minDurationMs?: number
  /** Force-complete if fonts.ready hasn't resolved by then — must never hang. @default 3500 */
  maxWaitMs?: number
  /** Extra delay after the spring's own value (not just its target) reaches ~100, so the last tiles' own transition actually finishes before handoff. @default 400 */
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
 *  a single binary jump — then calls onReveal once loading is done, the
 *  minimum display duration has elapsed, and the spring has actually
 *  finished animating to 100 (not just been told to). */
export function useLoadProgress({
  onReveal,
  enabled = true,
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
    if (!enabled) return

    const mountTime = performance.now()
    let done = false
    let waitTimer: ReturnType<typeof setTimeout> | undefined
    let settleTimer: ReturnType<typeof setTimeout> | undefined
    let unsubSpring: (() => void) | undefined

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
      waitTimer = setTimeout(() => {
        rawTarget.set(100)
        // Wait for the spring's own value (what's actually visible,
        // driving the tile grid) to reach ~100, not just the instant its
        // target is set — the spring takes real time to converge under
        // its own physics, and starting the settle countdown before that
        // would cut tiles off mid-transition.
        unsubSpring = spring.on("change", (v) => {
          if (v >= 99.5) {
            unsubSpring?.()
            settleTimer = setTimeout(onReveal, settleMs)
          }
        })
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
      clearTimeout(waitTimer)
      clearTimeout(settleTimer)
      unsubSpring?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return { progress: spring, displayPercent }
}
