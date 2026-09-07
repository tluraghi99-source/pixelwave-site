import { useEffect, useState } from "react"
import { fetchWorkCategories, type WorkCategory } from "@/lib/strapi"

/** Fetches the fixed Work Category list once on mount. No cross-component
 *  cache — same rationale as useProjects: a redundant fetch per page visit
 *  is cheap for a catalog this size. */
export function useWorkCategories(): WorkCategory[] {
  const [categories, setCategories] = useState<WorkCategory[]>([])

  useEffect(() => {
    let cancelled = false
    fetchWorkCategories().then((data) => {
      if (!cancelled) setCategories(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return categories
}
