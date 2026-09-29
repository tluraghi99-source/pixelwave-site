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
        onLoadedMetadata={(e) => {
          const video = e.currentTarget
          setDuration(video.duration)
          // iOS Safari never decodes/paints a frame for a video.currentTime
          // seek until the video has actually played at least once — a
          // scrubbed-but-never-played video just stays black there (this is
          // desktop-only-tested code, so the bug only shows up on a real
          // phone). muted + playsInline means this silent kick — play,
          // then immediately pause — is allowed without a user gesture, and
          // unblocks every seek after it. Harmless on browsers that don't
          // need it (Chrome/Android already paint from a cold seek).
          video.play()?.then(() => video.pause())?.catch(() => {})
        }}
      />
      <div className="video-scrub__tint" />
    </>
  )
}

/** Mobile/tablet: the video pins full-screen (see .video-scrub--ambient) and
 *  scrubs with scroll, same as desktop — just driven by a progress value the
 *  caller derives from how far the section that slides over it has risen,
 *  since this section itself is sticky and its own rect never moves. */
export function VideoScrubAmbient({ progress }: { progress: MotionValue<number> }) {
  return (
    <section className="video-scrub video-scrub--ambient" data-screen-label="Studio Reel">
      <VideoScrubbed progress={progress} />
    </section>
  )
}
