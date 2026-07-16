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
