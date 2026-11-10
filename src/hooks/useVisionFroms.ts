import { useEffect, useState } from "react"
import { fetchVisionFroms, type VisionFrom } from "@/lib/strapi"

/** Every published "Vision from", fetched once on mount. `[]` while loading
 *  and when there are none. */
export function useVisionFroms(): VisionFrom[] {
  const [items, setItems] = useState<VisionFrom[]>([])

  useEffect(() => {
    let cancelled = false
    fetchVisionFroms().then((data) => {
      if (!cancelled) setItems(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return items
}
