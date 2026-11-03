import { useEffect, useRef, useState } from "react"
import { Volume2, VolumeX, X } from "lucide-react"
import type { Showreel } from "@/lib/strapi"

interface ShowreelModalProps {
  showreel: Showreel
  onClose: () => void
}

/** The studio's showreel, full screen over everything: close (X, top right,
 *  or Esc) and mute/unmute, same controls as the project videos. Starts
 *  muted like they do — the button turns the sound on. */
export function ShowreelModal({ showreel, onClose }: ShowreelModalProps) {
  const [muted, setMuted] = useState(true)
  const closeRef = useRef<HTMLButtonElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
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
  }, [onClose])

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
    <div className="showreel" role="dialog" aria-modal="true" aria-label="Showreel di PixelWave">
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
      <button ref={closeRef} type="button" className="showreel__close" onClick={onClose} aria-label="Chiudi lo showreel">
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
    </div>
  )
}
