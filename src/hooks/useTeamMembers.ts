import { useEffect, useState } from "react"
import { fetchTeamMembers, type TeamMember } from "@/lib/strapi"

/** Fetches the full team member list once on mount. No cross-component
 *  cache — same rationale as useProjects: a redundant fetch per page
 *  visit is cheap for a catalog this size. */
export function useTeamMembers(): TeamMember[] {
  const [members, setMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    let cancelled = false
    fetchTeamMembers().then((data) => {
      if (!cancelled) setMembers(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return members
}
