import { useEffect, useState } from "react"
import { useProjectsStatus } from "@/hooks/useProjects"
import { HERO_VIDEO_SRC } from "@/lib/motion"
import { projectThumbUrl } from "@/lib/strapi"

/** Downloads the scrubbed reel video completely, so it sits in the browser
 *  cache (the <video> elements in WorkReel ask for the same URL). Never
 *  rejects: a failed download must not hold the site closed. */
function warmVideo(): Promise<void> {
  return fetch(HERO_VIDEO_SRC, { cache: "force-cache" })
    .then((res) => (res.ok ? res.blob() : undefined))
    .then(() => undefined, () => undefined)
}

/** Loads (and decodes) the project cover thumbnails the home page shows — the
 *  work carousel and the services rows use these exact URLs, so once they are
 *  in the browser cache nothing pops in after the intro — and the scroll-scrub
 *  video. Returns true once every one has settled (loaded or failed — a broken
 *  asset must never hold the site closed) or there is nothing to load.
 *
 *  `enabled` false skips all of it (the intro already played this session). */
export function usePreloadHomeAssets(enabled: boolean): boolean {
  const { projects, loaded } = useProjectsStatus()
  const [imagesReady, setImagesReady] = useState(!enabled)
  const [videoReady, setVideoReady] = useState(!enabled)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    warmVideo().then(() => {
      if (!cancelled) setVideoReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || !loaded) return
    const urls = Array.from(new Set(projects.map((p) => projectThumbUrl(p, "")).filter(Boolean)))
    if (urls.length === 0) {
      setImagesReady(true)
      return
    }
    let cancelled = false
    Promise.all(
      urls.map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              // decode() so the first paint doesn't stall on it; ignore its failures.
              if (img.decode) img.decode().then(() => resolve(), () => resolve())
              else resolve()
            }
            img.onerror = () => resolve()
            img.src = url
          })
      )
    ).then(() => {
      if (!cancelled) setImagesReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, loaded, projects])

  return imagesReady && videoReady
}
