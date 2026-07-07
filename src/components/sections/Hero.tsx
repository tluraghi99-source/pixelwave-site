import { motion, useScroll, useTransform } from "framer-motion"
import logoShortWhite from "@/assets/logo-short-white.png"
import { EASE_WAVE } from "@/lib/motion"
import { PixelTrail } from "@/components/ui/pixel-trail"
import { useScreenSize } from "@/components/hooks/use-screen-size"

interface HeroProps {
  introDone: boolean
}

export function Hero({ introDone }: HeroProps) {
  // The hero is pinned (position: fixed) behind the page, so its own rect never
  // moves — drive the big mark's scroll-linked motion off absolute scroll position.
  const { scrollY } = useScroll()
  const vh = typeof window !== "undefined" ? window.innerHeight : 900
  const screenSize = useScreenSize()

  // As you scroll through the hero, the big mark shrinks, drifts toward the
  // top-left, and fades — handing off to the small logo fading in in the header.
  const bigScale = useTransform(scrollY, [0, vh * 0.6], [1, 0.32])
  const bigOpacity = useTransform(scrollY, [vh * 0.1, vh * 0.6], [1, 0])
  const bigX = useTransform(scrollY, [0, vh * 0.6], [0, -40])
  const bigY = useTransform(scrollY, [0, vh * 0.6], [0, -140])

  return (
    <section className="hero" data-screen-label="Hero">
      <PixelTrail
        pixelSize={screenSize.lessThan("md") ? 60 : 96}
        fadeDuration={1500}
        delay={0}
        className="z-0"
        pixelClassName="hero__trail-pixel"
      />

      <motion.div
        className="hero__bigmark"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: introDone ? 1 : 0, scale: introDone ? 1 : 0.94 }}
        transition={{ duration: 0.9, ease: EASE_WAVE }}
      >
        <motion.img
          src={logoShortWhite}
          alt="PixellWave"
          className="hero__bigmark-img"
          style={{ scale: bigScale, opacity: bigOpacity, x: bigX, y: bigY }}
        />
      </motion.div>
    </section>
  )
}
