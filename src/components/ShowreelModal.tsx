import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Volume2, VolumeX, X } from "lucide-react"
import { EASE_WAVE } from "@/lib/motion"
import type { Showreel } from "@/lib/strapi"

const FULL_SCREEN = "polygon(0% 0%, 0% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 0%)"

interface ShowreelModalProps {
  showreel: Showreel
  /** Called once the closing animation is over. */
  onClose: () => void
  /** Where it opens from and sinks back into (the square, the menu entry).
   *  Without it, it opens from the middle of the screen. */
  origin?: { left: number; top: number; right: number; bottom: number }
  /** "logo": the origin box is the logo's square, so the shape is its L
   *  (the notch included) rather than a plain rectangle. */
  originShape?: "box" | "logo"
}

/** The studio's showreel, full screen over everything: close (X, top right,
 *  or Esc) and mute/unmute, same controls as the project videos. Starts
 *  muted like they do — the button turns the sound on.
 *
 *  It grows out of `origin` (a clip-path from that shape to the whole screen)
 *  and shrinks back into it on close, instead of just appearing. */
export function ShowreelModal({ showreel, onClose, origin, originShape = "box" }: ShowreelModalProps) {
  const [muted, setMuted] = useState(true)
  const [closing, setClosing] = useState(false)
  const reduceMotion = useReducedMotion()
  const requestClose = useCallback(() => setClosing(true), [])
  // The shape the clip-path starts from / returns to. Every shape is a 6-point
  // polygon in % of the viewport, so they interpolate with each other (and the
  // full-screen one stays right if the window is resized while it is open).
  const from = useMemo(() => {
    const w = document.documentElement.clientWidth
    const h = window.innerHeight
    const o = origin ?? { left: w / 2, top: h / 2, right: w / 2, bottom: h / 2 }
    const pt = (x: number, y: number) => `${((x / w) * 100).toFixed(3)}% ${((y / h) * 100).toFixed(3)}%`
    const { left: l, top: t, right: r, bottom: b } = o
    const mx = (l + r) / 2
    const my = (t + b) / 2
    const points =
      originShape === "logo"
        ? [pt(l, t), pt(l, b), pt(mx, b), pt(mx, my), pt(r, my), pt(r, t)]
        : [pt(l, t), pt(l, b), pt(r, b), pt(r, b), pt(r, b), pt(r, t)]
    return `polygon(${points.join(", ")})`
  }, [origin, originShape])
  const closeRef = useRef<HTMLButtonElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose()
    }
    window.addEventListener("keydown", onKey)
    // The page underneath must not scroll while the showreel is up.
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    closeRef.current?.focus()
    return () => {
      window.removeEventListener("keydown", onKey)
      document.documentElement.style.overflow = prev
    }
  }, [requestClose])

  // YouTube has no `muted` prop: with enablejsapi=1 the embedded player takes
  // mute/unMute commands by postMessage (same approach as the project videos).
  useEffect(() => {
    if (showreel.type !== "youtube") return
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: muted ? "mute" : "unMute", args: [] }),
      "*"
    )
  }, [showreel.type, muted])

  return (
    <motion.div
      className={`showreel${closing ? " showreel--closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Showreel di PixelWave"
      initial={{ clipPath: from }}
      animate={{ clipPath: closing ? from : FULL_SCREEN }}
      transition={{ duration: reduceMotion ? 0.01 : closing ? 0.55 : 0.85, ease: EASE_WAVE }}
      onAnimationComplete={() => {
        if (closing) onClose()
      }}
    >
      {showreel.type === "video" ? (
        <video className="showreel__media" src={showreel.src} autoPlay loop muted={muted} playsInline />
      ) : (
        <iframe
          ref={iframeRef}
          className="showreel__media showreel__media--embed"
          src={`https://www.youtube.com/embed/${showreel.videoId}?autoplay=1&mute=1&loop=1&playlist=${showreel.videoId}&controls=0&playsinline=1&enablejsapi=1&rel=0`}
          title="Showreel di PixelWave"
          allow="autoplay; fullscreen"
        />
      )}
      <button ref={closeRef} type="button" className="showreel__close" onClick={requestClose} aria-label="Chiudi lo showreel">
        <X size={20} aria-hidden="true" />
      </button>
      <div className="project-video-pin__controls">
        <button
          type="button"
          className="project-video-pin__mute showreel__mute"
          aria-pressed={!muted}
          aria-label={muted ? "Attiva audio" : "Disattiva audio"}
          title={muted ? "Unmute" : "Mute"}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
        </button>
      </div>
    </motion.div>
  )
}
