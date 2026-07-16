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
