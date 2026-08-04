import { useEffect, useRef, useState } from "react"
import { useMotionValueEvent } from "framer-motion"
import type { MotionValue } from "framer-motion"

/** Scrubs /video/hero.mp4's playhead to match an externally-driven 0..1 progress value. */
export function VideoScrubbed({ progress }: { progress: MotionValue<number> }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = useState(0)

  // Scroll can fire "change" many times per frame; collapse those down to at
  // most one seek per animation frame, and skip seeks too small to matter —
  // each is a real decode cost, not just a property write.
  const pendingTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useMotionValueEvent(progress, "change", (latest) => {
    if (!duration) return
    pendingTimeRef.current = latest * duration
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const video = videoRef.current
      const target = pendingTimeRef.current
      if (video && target !== null && Math.abs(video.currentTime - target) > 0.016) {
        // fastSeek skips precise-frame decoding in browsers that support it —
        // fine here since every frame is already a keyframe (see re-encode notes).
        if (typeof video.fastSeek === "function") {
          video.fastSeek(target)
        } else {
          video.currentTime = target
        }
      }
    })
  })

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <>
      <video
        ref={videoRef}
        className="video-scrub__video"
        src="/video/hero.mp4"
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <div className="video-scrub__tint" />
    </>
  )
}

/** Mobile/tablet: no pin/scrub (too heavy on scroll + decode cost) — plays ambiently on loop. */
export function VideoScrubAmbient() {
  return (
    <section className="video-scrub video-scrub--ambient" data-screen-label="Studio Reel">
      <video
        className="video-scrub__video"
        src="/video/hero.mp4"
        muted
        playsInline
        loop
        autoPlay
        preload="metadata"
      />
      <div className="video-scrub__tint" />
    </section>
  )
}
