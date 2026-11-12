import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { EASE_WAVE } from "@/lib/motion"

export type LightboxItem = { type: "image" | "video"; src: string }

interface PhotoLightboxProps {
  items: LightboxItem[]
  /** Index of the item to open on. */
  start: number
  /** Called once the closing fade is over. */
  onClose: () => void
  label?: string
}

/** A gallery photo (or clip) full screen, on black: close (X, Esc, or a click
 *  outside the picture) and previous / next (arrows on screen, or the keyboard
 *  arrows). Same look as the showreel (see `.showreel` in index.css). */
export function PhotoLightbox({ items, start, onClose, label = "Galleria del progetto" }: PhotoLightboxProps) {
  const [index, setIndex] = useState(() => Math.min(Math.max(0, start), items.length - 1))
  const [closing, setClosing] = useState(false)
  const reduceMotion = useReducedMotion()
  const closeRef = useRef<HTMLButtonElement>(null)
  const requestClose = useCallback(() => setClosing(true), [])
  const many = items.length > 1
  const step = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + items.length) % items.length),
    [items.length]
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose()
      else if (e.key === "ArrowRight") step(1)
      else if (e.key === "ArrowLeft") step(-1)
    }
    window.addEventListener("keydown", onKey)
    // The page underneath must not scroll while it is up; the cursor dot turns
    // white on this black screen (see `html.showreel-open` in index.css).
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    document.documentElement.classList.add("showreel-open")
    closeRef.current?.focus()
    return () => {
      window.removeEventListener("keydown", onKey)
      document.documentElement.classList.remove("showreel-open")
      document.documentElement.style.overflow = prev
    }
  }, [requestClose, step])

  const item = items[index]
  if (!item) return null

  return (
    <motion.div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0.01 : closing ? 0.22 : 0.35, ease: EASE_WAVE }}
      onAnimationComplete={() => {
        if (closing) onClose()
      }}
      onClick={requestClose}
    >
      {item.type === "video" ? (
        <video
          key={item.src}
          className="lightbox__media"
          src={item.src}
          autoPlay
          loop
          muted
          playsInline
          controls
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img key={item.src} className="lightbox__media" src={item.src} alt="" onClick={(e) => e.stopPropagation()} />
      )}
      <button
        ref={closeRef}
        type="button"
        className="showreel__close lightbox__close"
        onClick={(e) => {
          e.stopPropagation()
          requestClose()
        }}
        aria-label="Chiudi"
      >
        <X size={20} aria-hidden="true" />
      </button>
      {many && (
        <>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation()
              step(-1)
            }}
            aria-label="Foto precedente"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation()
              step(1)
            }}
            aria-label="Foto successiva"
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
          <span className="lightbox__count" aria-live="polite">
            {index + 1} / {items.length}
          </span>
        </>
      )}
    </motion.div>
  )
}
