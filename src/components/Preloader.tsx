import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BrandLogo } from "@/components/pw/Logo"
import { EASE_WAVE } from "@/lib/motion"

const SEEN_KEY = "pw-intro-seen"

interface PreloaderProps {
  onReveal: () => void
}

/** Brief branded curtain shown once per session; wipes up to reveal the hero underneath. */
export function Preloader({ onReveal }: PreloaderProps) {
  const [alreadySeen] = useState(() => {
    try {
      return sessionStorage.getItem(SEEN_KEY) === "1"
    } catch {
      return false
    }
  })
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (alreadySeen) {
      onReveal()
      return
    }
    const t = setTimeout(() => {
      setExiting(true)
      onReveal()
      try {
        sessionStorage.setItem(SEEN_KEY, "1")
      } catch {
        /* ignore */
      }
    }, 1050)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadySeen])

  if (alreadySeen) return null

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="preloader"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.75, ease: EASE_WAVE }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_WAVE }}
          >
            <BrandLogo variant="icon" height={40} className="preloader__mark" />
          </motion.div>
          <div className="preloader__bar">
            <motion.span
              className="preloader__fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, ease: EASE_WAVE }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
