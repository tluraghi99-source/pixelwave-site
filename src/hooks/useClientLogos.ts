import { useEffect, useState } from "react"
import { fetchClientLogos, type ClientLogo } from "@/lib/strapi"

/** Fetches the full client-logo list once on mount. No cross-component
 *  cache — same rationale as useProjects/useTeamMembers: a redundant
 *  fetch per page visit is cheap for a catalog this size. */
export function useClientLogos(): ClientLogo[] {
  const [clients, setClients] = useState<ClientLogo[]>([])

  useEffect(() => {
    let cancelled = false
    fetchClientLogos().then((data) => {
      if (!cancelled) setClients(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return clients
}
