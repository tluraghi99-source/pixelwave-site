import { useEffect, useState } from "react"
import { fetchShowreel, type Showreel } from "@/lib/strapi"

/** The showreel set in the CMS, or `null` while loading and when there isn't
 *  one (so callers just don't show anything until there's something to play). */
export function useShowreel(): Showreel | null {
  const [showreel, setShowreel] = useState<Showreel | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchShowreel().then((data) => {
      if (!cancelled) setShowreel(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return showreel
}
