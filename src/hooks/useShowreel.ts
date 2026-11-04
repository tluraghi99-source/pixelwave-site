import { useEffect, useState } from "react"
import { fetchShowreel, type Showreel } from "@/lib/strapi"

// Fetched once per page load and shared: the header's menu and the home hero
// both ask for it.
let showreelRequest: Promise<Showreel | null> | null = null

/** The showreel set in the CMS, or `null` while loading and when there isn't
 *  one (so callers just don't show anything until there's something to play). */
export function useShowreel(): Showreel | null {
  const [showreel, setShowreel] = useState<Showreel | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(showreelRequest ??= fetchShowreel()).then((data) => {
      if (!cancelled) setShowreel(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return showreel
}
