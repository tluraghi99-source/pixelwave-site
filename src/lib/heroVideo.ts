import { HERO_VIDEO_SRC } from "@/lib/motion"

let pending: Promise<string> | null = null

/** The scroll-scrub video as a local blob URL, downloaded once for the whole
 *  page. Every <video> that scrubs it (the hero's reveal, the pinned reel, the
 *  phone version) uses the same copy: before, the preloader fetched the file
 *  and each <video> then asked the server for it again (the server sends no
 *  cache headers) — 3 MB twice, which on a phone is slow and expensive — and a
 *  scrubbed video that is not fully buffered stalls on every seek.
 *
 *  Never rejects: if the download fails the plain URL is returned and the
 *  <video> element tries on its own. */
export function loadHeroVideo(): Promise<string> {
  if (!pending) {
    pending = fetch(HERO_VIDEO_SRC)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.blob()
      })
      .then((blob) => URL.createObjectURL(blob))
      .catch(() => {
        pending = null // the next caller may try again
        return HERO_VIDEO_SRC
      })
  }
  return pending
}
