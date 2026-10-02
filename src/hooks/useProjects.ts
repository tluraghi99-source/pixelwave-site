import { useEffect, useState } from "react"
import { fetchProjects, type Project } from "@/lib/strapi"

/** Fetches the full project list once on mount. No cross-component cache
 *  — with only a handful of projects, a redundant fetch per page visit
 *  is cheap and this avoids introducing a new state-management
 *  dependency for a 10-item catalog.
 *
 *  `loaded` flips to true once the fetch has settled (even if it returned
 *  nothing), so a page can tell "still loading" from "genuinely empty". */
export function useProjectsStatus(): { projects: Project[]; loaded: boolean } {
  const [state, setState] = useState<{ projects: Project[]; loaded: boolean }>({ projects: [], loaded: false })

  useEffect(() => {
    let cancelled = false
    fetchProjects().then((data) => {
      if (!cancelled) setState({ projects: data, loaded: true })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

export function useProjects(): Project[] {
  return useProjectsStatus().projects
}
