import { useEffect, useState } from "react"
import { motion, useTransform } from "framer-motion"
import { PixelResolveGrid } from "@/components/motion/PixelResolveGrid"
import { BrandLogo } from "@/components/pw/Logo"
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

  const { progress, displayPercent } = useLoadProgress({ onReveal: handleReveal, enabled: !alreadySeen })

  // The grid's own tiles provide full opaque coverage at the start (each one
  // still solid black), so the container itself only needs its own black
  // backdrop as a safety net for the brief window before the grid's tiles
  // mount — then it fades out in step with the tiles' own late dissolve, so
  // real page content shows through the gaps instead of this solid layer.
  const containerBg = useTransform(progress, [0, 80, 100], ["#000000", "#000000", "rgba(0,0,0,0)"])
  // Fades in once the grid is meaningfully filled in, matching the point in
  // the reference recording where its own center mark appears.
  const badgeOpacity = useTransform(progress, [35, 55], [0, 1])

  useEffect(() => {
    if (alreadySeen) onReveal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadySeen])

  if (alreadySeen || hidden) return null

  return (
    <motion.div className="preloader" style={{ backgroundColor: containerBg }}>
      <PixelResolveGrid progress={progress} />
      <motion.div className="preloader__badge" style={{ opacity: badgeOpacity }} aria-hidden="true">
        <BrandLogo variant="icon" height={28} />
      </motion.div>
      <span className="preloader__pct">{displayPercent}%</span>
    </motion.div>
  )
}
