import { useEffect, useState } from "react"
import { fetchProjects, type Project } from "@/lib/strapi"

/** Fetches the full project list once on mount. No cross-component cache
 *  — with only a handful of projects, a redundant fetch per page visit
 *  is cheap and this avoids introducing a new state-management
 *  dependency for a 10-item catalog. */
export function useProjects(): Project[] {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    let cancelled = false
    fetchProjects().then((data) => {
      if (!cancelled) setProjects(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return projects
}
