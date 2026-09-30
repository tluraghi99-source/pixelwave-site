import { useEffect, useState } from "react"

export type VideoFramesState =
  | { status: "idle" | "loading" | "failed"; frames: string[] }
  | { status: "ready"; frames: string[] }

const FRAME_WIDTH = 900

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("error", onError)
      resolve()
    }
    const onError = () => {
      video.removeEventListener("seeked", onSeeked)
      reject(new Error("seek failed"))
    }
    video.addEventListener("seeked", onSeeked, { once: true })
    video.addEventListener("error", onError, { once: true })
    video.currentTime = time
  })
}

// Safety net for the iOS quirk below: if extraction hasn't finished by
// this point, something's stuck (or just very slow) — fail out to the
// caller's fallback rather than leaving the gallery section blank forever.
const EXTRACT_TIMEOUT_MS = 12_000

/** Grabs `count` evenly spaced still frames from a video, client-side, as
 *  object URLs. Needs the video host to send CORS headers (Strapi's uploads
 *  do) — a tainted canvas can't be read back, in which case this reports
 *  "failed" so the caller can fall back to something else. Pass null to
 *  stay idle. */
export function useVideoFrames(src: string | null, count: number): VideoFramesState {
  const [state, setState] = useState<VideoFramesState>({ status: "idle", frames: [] })

  useEffect(() => {
    if (!src) {
      setState({ status: "idle", frames: [] })
      return
    }

    let cancelled = false
    const urls: string[] = []
    setState({ status: "loading", frames: [] })

    const video = document.createElement("video")
    video.crossOrigin = "anonymous"
    video.muted = true
    video.playsInline = true
    video.preload = "auto"
    video.src = src
    // iOS Safari never reliably decodes frames — sometimes never even
    // fires the events this hook waits on — for a <video> that's neither
    // in the document nor ever played (this element was previously kept
    // fully detached). Both matter: attached-but-unplayed still hangs on a
    // real iPhone, same as the scroll-scrubbed hero video did (see
    // VideoScrub.tsx) before its own muted play()+pause() kick-start.
    // Zero-size and out of flow, so it never affects layout or paints
    // anything visible.
    video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;"
    document.body.appendChild(video)

    async function extract() {
      await new Promise<void>((resolve, reject) => {
        video.addEventListener("loadeddata", () => resolve(), { once: true })
        video.addEventListener("error", () => reject(new Error("video load failed")), { once: true })
      })
      // Silent kick-start (allowed without a user gesture: muted + playsInline)
      // — unblocks every seek below, exactly like VideoScrub.tsx's video.
      await video.play().then(
        () => video.pause(),
        () => {}
      )
      const { duration, videoWidth, videoHeight } = video
      if (!Number.isFinite(duration) || duration <= 0 || !videoWidth || !videoHeight) {
        throw new Error("video has no usable dimensions/duration")
      }

      const canvas = document.createElement("canvas")
      canvas.width = FRAME_WIDTH
      canvas.height = Math.round((FRAME_WIDTH * videoHeight) / videoWidth)
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("no 2d context")

      for (let i = 0; i < count; i++) {
        if (cancelled) return
        await seekTo(video, (duration * (i + 0.5)) / count)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85))
        if (!blob) throw new Error("canvas is tainted or empty")
        urls.push(URL.createObjectURL(blob))
      }
      if (!cancelled) setState({ status: "ready", frames: urls.slice() })
    }

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("frame extraction timed out")), EXTRACT_TIMEOUT_MS)
    })

    Promise.race([extract(), timeout]).catch(() => {
      if (!cancelled) setState({ status: "failed", frames: [] })
    })

    return () => {
      cancelled = true
      video.removeAttribute("src")
      video.load()
      video.remove()
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [src, count])

  return state
}
