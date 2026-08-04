import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
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
    const target = document.querySelector('a[aria-label="PixellWave home"]')
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

  return (
    <section className="hero" data-screen-label="Hero">
      {/* Demo only — previewing the grain-effect spec's look on a light
          section before building the real site-wide version. */}
      <div className="grain-overlay" aria-hidden="true" />
      <CursorGlow className="cursor-glow" variant="light" glow />
      {introDone && <CursorHint text="Scroll" variant="bounce" autoHideMs={6000} dismissOnScroll />}

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
          alt="PixellWave"
          className="hero__bigmark-img"
          style={{ scale: bigScale, opacity: bigOpacity, x: bigX, y: bigY }}
        />
      </motion.div>
    </section>
  )
}
