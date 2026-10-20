import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"
import logoWordmark from "@/assets/logo-wordmark.svg"
import { EASE_WAVE, HERO_CROSSFADE_RATIO, HERO_REVEAL_END, HERO_REVEAL_START } from "@/lib/motion"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CursorHint } from "@/components/motion/CursorHint"

interface HeroProps {
  introDone: boolean
}

interface DockTarget {
  scale: number
  x: number
  y: number
}

export function Hero({ introDone }: HeroProps) {
  // The hero is pinned (position: fixed) behind the page, so its own rect never
  // moves — drive the big mark's scroll-linked motion off absolute scroll position.
  const { scrollY } = useScroll()
  const vh = typeof window !== "undefined" ? window.innerHeight : 900
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // Where the big mark needs to land (relative to its own rest position) so it
  // visually docks exactly onto the header's logo — measured, not guessed, since
  // both are the same asset just rendered at very different sizes.
  const [dock, setDock] = useState<DockTarget>({ scale: 0.32, x: -40, y: -140 })

  const measure = useCallback(() => {
    const source = wrapRef.current
    const target = document.querySelector('a[aria-label="PixelWave, vai alla home"]')
    if (!source || !target) return
    const sourceRect = source.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    if (sourceRect.height === 0 || targetRect.height === 0) return
    // The header slides off-screen (translateY -100%) while auto-hidden on
    // scroll-down; skip measuring while it's up there or the dock math breaks.
    if (targetRect.top < 0) return
    // Both anchor on their bottom-left corner (the img's transform-origin), so
    // the translate needed is just the delta between those two corners.
    setDock({
      scale: targetRect.height / sourceRect.height,
      x: targetRect.left - sourceRect.left,
      y: targetRect.bottom - sourceRect.bottom,
    })
  }, [])

  useEffect(() => {
    // The wrapper itself is still mid entrance-animation (scale 0.94 → 1) at
    // mount, so this first pass is a rough placeholder — onAnimationComplete
    // below re-measures once that settles and is the one that actually sticks.
    measure()
    window.addEventListener("resize", measure)
    const img = imgRef.current
    img?.addEventListener("load", measure)
    return () => {
      window.removeEventListener("resize", measure)
      img?.removeEventListener("load", measure)
    }
  }, [measure])

  // Shared with Header's own heroLogoOpacity and WorkReel's video iris reveal —
  // all three derive this same 0→1 value from the same HERO_REVEAL_START/END
  // window, so the dock and the video's reveal move in exact lockstep.
  const revealProgress = useTransform(scrollY, [vh * HERO_REVEAL_START, vh * HERO_REVEAL_END], [0, 1])

  // The mark finishes its whole shrink+slide journey — arriving exactly on the
  // header logo's spot — before any fading starts. Only once it's already sitting
  // there, fully opaque and pixel-aligned, does the brief crossfade happen; since
  // both logos are in the identical position/size by then, the swap is invisible
  // instead of showing two logos at two different spots at once.
  const bigScale = useTransform(revealProgress, [0, 1], [1, dock.scale])
  const bigX = useTransform(revealProgress, [0, 1], [0, dock.x])
  const bigY = useTransform(revealProgress, [0, 1], [0, dock.y])
  const bigOpacity = useTransform(revealProgress, [HERO_CROSSFADE_RATIO, 1], [1, 0])

  // Small bobbing arrow in the bottom-right corner: a visual cue to scroll.
  // Gone within the first ~10% of a viewport of scrolling, since by then the
  // visitor clearly already has.
  const reducedMotion = useReducedMotion()
  const arrowOpacity = useTransform(scrollY, [0, vh * 0.1], [1, 0])

  return (
    <section className="hero" data-screen-label="Hero">
      <CursorGlow className="cursor-glow" variant="light" glow ambient />
      {introDone && <CursorHint text="Scroll" variant="bounce" idleReappear />}

      <motion.div
        ref={wrapRef}
        className="hero__bigmark"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: introDone ? 1 : 0, scale: introDone ? 1 : 0.94 }}
        transition={{ duration: 0.9, ease: EASE_WAVE }}
        onAnimationComplete={measure}
      >
        <motion.img
          ref={imgRef}
          src={logoWordmark}
          alt="PixelWave"
          className="hero__bigmark-img"
          // Intrinsic size from the SVG's own viewBox (0 0 7075.3 1826.47,
          // rounded) — logo-wordmark.svg carries no width/height of its own,
          // so without these the <img> has no aspect ratio until the SVG
          // actually loads, and CSS's width:75vw;height:auto only resolves
          // a real height at that point too. The browser turns width/height
          // attributes into a default aspect-ratio, reserving this element's
          // box immediately instead of collapsing it to 0 height and then
          // snapping open on load — that snap was this page's single
          // largest layout shift (a Lighthouse CLS score of ~1, effectively
          // all of it, traced to exactly this element).
          width={7075}
          height={1826}
          style={{ scale: bigScale, opacity: bigOpacity, x: bigX, y: bigY }}
        />
      </motion.div>

      {introDone && (
        <motion.div className="hero__scroll-arrow" style={{ opacity: arrowOpacity }} aria-hidden="true">
          <motion.span
            className="hero__scroll-arrow-icon"
            animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* A thin stem with a sharp V head, square ends — same hard-edged
                language as the rest of the site, not a rounded icon. */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
              <line x1="8" y1="2" x2="8" y2="13" />
              <polyline points="3,8 8,13 13,8" />
            </svg>
          </motion.span>
        </motion.div>
      )}
    </section>
  )
}
