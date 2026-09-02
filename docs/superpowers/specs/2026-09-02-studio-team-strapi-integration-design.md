# Studio team photos Strapi integration — design spec

**Date:** 2026-09-02
**Status:** Approved, pending implementation

## Summary

This is sub-project 3 of 3 (see `2026-09-01-strapi-cms-scaffold-design.md`
for sub-project 1 and `2026-09-02-project-pages-strapi-integration-design.md`
for sub-project 2, both shipped). It wires the Studio page's team grid
(`StudioTeam.tsx`) — and the Studio stats section's "People" count
(`StudioStats.tsx`, an additional consumer of `src/data/team.ts` found
while exploring this task) — to fetch from the running Strapi CMS's
`Team Member` content-type, instead of the static `src/data/team.ts`
file, which is deleted entirely once both consumers move off it.

This closely parallels sub-project 2's approach (same fail-silent fetch
pattern, same per-field media fallback principle, same "nothing until
loaded" loading design) applied to a different content-type. Carried-over
decisions are noted as such below, not re-litigated.

## Decisions (carried over from sub-project 2, confirmed to still apply)

- No new npm dependencies — plain `fetch`, extending the existing
  `src/lib/strapi.ts`/hook pattern.
- No loading UI (nothing renders until the fetch resolves), no error UI
  (a failed fetch renders as an empty result, same as "no team members").
- Where Strapi's `photo`/`photoHover` are empty, fall back to the
  existing exact Picsum placeholder pattern — each field checks its own
  emptiness independently (an editor could set `photo` before
  `photoHover`; each falls back or uses real media on its own, not as an
  all-or-nothing pair).
- No cross-page cache — each consumer calls its own hook independently.
- `src/data/team.ts` is deleted once nothing imports from it.
- New: the sort query includes a tie-breaker from the start
  (`order:asc,documentId:asc`) — sub-project 2's final review caught this
  missing on `fetchProjects()` and had to add it after the fact;
  `fetchTeamMembers()` includes it from day one.

## Architecture

### Extend `src/lib/strapi.ts`

Adds a `TeamMember` type and `fetchTeamMembers()`, parallel to the
existing `Project`/`fetchProjects()`:

```ts
export interface TeamMember {
  id: string
  order: number
  name: string
  role: string
  photo: StrapiMedia | null
  photoHover: StrapiMedia | null
}

interface StrapiTeamMemberRaw {
  documentId: string
  name: string
  role: string
  order: number
  photo: StrapiMediaRaw | null
  photoHover: StrapiMediaRaw | null
}

function mapTeamMember(raw: StrapiTeamMemberRaw): TeamMember {
  return {
    id: raw.documentId,
    order: raw.order,
    name: raw.name,
    role: raw.role,
    photo: raw.photo ? { url: strapiMediaUrl(raw.photo.url), mime: raw.photo.mime } : null,
    photoHover: raw.photoHover
      ? { url: strapiMediaUrl(raw.photoHover.url), mime: raw.photoHover.mime }
      : null,
  }
}

/** Fetches all published team members, sorted by their editorial `order`.
 *  Resolves to `[]` on any network/parse failure — callers render an
 *  empty state rather than an error message. */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/team-members?populate=photo,photoHover&sort=order:asc,documentId:asc&pagination[pageSize]=100`
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.data as StrapiTeamMemberRaw[]).map(mapTeamMember)
  } catch {
    return []
  }
}
```

(`StrapiMedia`/`strapiMediaUrl`/`StrapiMediaRaw` are already defined in
this file from sub-project 2 — reused as-is, not redefined.)

### New: `src/hooks/useTeamMembers.ts`

Identical shape to `useProjects()`:

```ts
import { useEffect, useState } from "react"
import { fetchTeamMembers, type TeamMember } from "@/lib/strapi"

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
```

## `StudioTeam.tsx`

- `TEAM` import replaced with `useTeamMembers()`.
- `TEAM_WITH_PHOTOS`'s per-field Picsum generation is replaced by a
  helper that falls back only for whichever of `photo`/`photoHover` is
  actually empty on each member, using real Strapi media otherwise.
- `GRID_ITEMS = buildGrid()` (today: a module-level constant, computed
  once from static data with a random Fisher–Yates shuffle) becomes a
  `useMemo(() => buildGrid(members), [members])` inside the component —
  it still only reshuffles when the fetched array's reference changes
  (i.e. once, when the fetch resolves from `[]` to real data), not on
  every render, preserving today's "fixed-but-random per page load"
  behavior.
- `BLANK_COUNT` (today: derived from the static array's length at module
  load) moves inside `buildGrid`, computed from the live member count
  passed in.
- The color-block cycling (`CARD_COLORS`) and blank-padding logic are
  unchanged — they're frontend-only visual rhythm, independent of the
  data source, per sub-project 1's original decision.

## `StudioStats.tsx`

`TEAM.length` becomes `useTeamMembers().length` — the "People" stat now
reflects the live count of published team members in Strapi at any given
time (today: 10, after some editorial experimentation already visible in
the CMS).

## Out of scope

- Project pages (sub-project 2, already shipped).
- Any change to the color-block/blank-padding visual logic itself, or to
  `StudioGallery.tsx`/`StudioIntro.tsx`-adjacent sections — untouched.
- Strapi Cloud/production deployment — unaffected by this piece, same as
  sub-project 2.
