# Studio Team Strapi Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `src/data/team.ts` with live data fetched from the running Strapi CMS's `Team Member` content-type, across the Studio page's team grid and the Studio stats "People" count.

**Architecture:** Extends the existing `src/lib/strapi.ts`/hook pattern (already carrying `Project`/`fetchProjects`/`useProjects` from the prior sub-project) with a parallel `TeamMember`/`fetchTeamMembers`/`useTeamMembers`. Two independent consumers (`StudioTeam.tsx`, `StudioStats.tsx`) each call the new hook on their own — no shared cache, matching the established pattern for this site's small catalogs.

**Tech Stack:** React 19, TypeScript, Vite, plain `fetch` (no new dependencies). Strapi 5.52.2 running locally at `http://localhost:1337` (separate repo at `/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms`) — its `Team Member` content-type currently has 10 published entries (live-edited by hand since seeding; exact names/roles will vary from what's shown in this plan's examples — verify against the actual live API rather than assuming specific values). No test framework in this repo — verification is `npx tsc -b`, `npm run lint` (oxlint), and live checks via the Claude Browser preview tools.

## Global Constraints

- No new npm dependencies.
- Where Strapi's `photo`/`photoHover` are empty, fall back to the exact existing Picsum placeholder pattern (`https://picsum.photos/seed/pixellwave-team-${id}/600/750` and `...{id}-alt/600/750`) — each field checked independently, not as an all-or-nothing pair.
- No loading UI (nothing renders until the fetch resolves) and no error UI (a failed fetch resolves to an empty list, rendered the same as "no team members").
- `fetchTeamMembers()`'s sort includes a tie-breaker from the start: `order:asc,documentId:asc` (a fix that had to be added after the fact to `fetchProjects()` in the prior sub-project — do it right here from day one).
- The grid's Fisher–Yates shuffle must still only run once per page load (when the fetch resolves), never on every re-render.
- `src/data/team.ts` is deleted once nothing imports from it anymore (the last task in this plan).
- **Before committing any task, read the full diff of every file that task touches and confirm every line is something you actually intended.** Two tasks in the immediately prior sub-project accidentally swept in an unrelated pre-existing uncommitted line this way (once caught only at review) — the controller has already confirmed none of `src/lib/strapi.ts`, `src/components/sections/StudioTeam.tsx`, or `src/components/sections/StudioStats.tsx` have any pre-existing uncommitted changes as of this plan's writing, but re-confirm with your own `git diff` before you start, since state can change between plan-writing and execution.

---

### Task 1: Extend the API client and add the `useTeamMembers` hook

**Files:**
- Modify: `src/lib/strapi.ts`
- Create: `src/hooks/useTeamMembers.ts`

**Interfaces:**
- Produces: `interface TeamMember { id: string; order: number; name: string; role: string; photo: StrapiMedia | null; photoHover: StrapiMedia | null }` and `async function fetchTeamMembers(): Promise<TeamMember[]>` (from `src/lib/strapi.ts`), and `function useTeamMembers(): TeamMember[]` (from `src/hooks/useTeamMembers.ts`). Tasks 2-3 import these. Reuses `StrapiMedia`/`strapiMediaUrl` already defined in `strapi.ts` — does not redefine them.

- [ ] **Step 1: Read the current file to confirm it still matches this plan's assumption**

Run: `cat "src/lib/strapi.ts"`

Confirm it currently ends with the `fetchProjects` function (as of this
plan's writing, this file is exactly what's shown in Step 2's "before"
context below — if it looks substantially different, stop and re-read
before proceeding).

- [ ] **Step 2: Append the `TeamMember` type and `fetchTeamMembers` to `src/lib/strapi.ts`**

Add this to the end of the file (after the existing `fetchProjects` function):

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

- [ ] **Step 3: Create `src/hooks/useTeamMembers.ts`**

```ts
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
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc -b`
Expected: no output, exit code 0.

Run: `npm run lint`
Expected: no errors for `src/lib/strapi.ts` or `src/hooks/useTeamMembers.ts`.

- [ ] **Step 5: Verify `fetchTeamMembers()` against the live local Strapi instance**

Confirm Strapi is running (`curl -sI http://localhost:1337/admin` → `200`;
start it if not — `cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms" && npm run develop`
in the background, wait ~20s).

Start this site's dev server (`preview_start` with `{"name": "pixellwave-dev"}`),
navigate to `/`, then via `javascript_tool`:

```js
const mod = await import("/src/lib/strapi.ts");
const members = await mod.fetchTeamMembers();
JSON.stringify({
  count: members.length,
  first: members[0],
});
```

Expected: `count` matches whatever `curl -s "http://localhost:1337/api/team-members?pagination[pageSize]=100" | python3 -c "import json,sys; print(json.load(sys.stdin)['meta']['pagination']['total'])"` reports (do not assume a specific number — read it live), and `first` has the shape `{ id: string, order: number, name: string, role: string, photo: null | {...}, photoHover: null | {...} }` with real values matching whatever the first (lowest-`order`) live entry actually is.

- [ ] **Step 6: Commit**

```bash
git add src/lib/strapi.ts src/hooks/useTeamMembers.ts
git commit -m "Add fetchTeamMembers and useTeamMembers hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Migrate `StudioTeam.tsx` to fetched data

**Files:**
- Modify: `src/components/sections/StudioTeam.tsx`

**Interfaces:**
- Consumes: `useTeamMembers` (`@/hooks/useTeamMembers`), `type TeamMember` (`@/lib/strapi`).

- [ ] **Step 1: Read the current file to confirm it still matches this plan's assumption**

Run: `grep -n "TEAM\|buildGrid\|GRID_ITEMS\|TEAM_WITH_PHOTOS" "src/components/sections/StudioTeam.tsx"`

If the output looks substantially different from this plan's diff below,
stop and re-read the whole file before proceeding.

- [ ] **Step 2: Replace the file's data-handling portion (imports through `GRID_ITEMS`)**

Change:
```tsx
import { RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { TEAM } from "@/data/team"
import { CursorGlow } from "@/components/motion/CursorGlow"

// Temporary stand-in photography (Lorem Picsum) until real team photos are
// ready — same posture as Work.tsx's GALLERY_ITEMS. Two seeds per person so
// the hover-swap has a second, different placeholder image to crossfade to.
// No longer forced to grayscale: each card gets a color tint instead (see
// CARD_COLORS below), so the photo itself should carry its own color too.
const TEAM_WITH_PHOTOS = TEAM.map((m) => ({
  ...m,
  photo: `https://picsum.photos/seed/pixellwave-team-${m.id}/600/750`,
  photoHover: `https://picsum.photos/seed/pixellwave-team-${m.id}-alt/600/750`,
}))

// Every card sits on a flat color block, cycling through this sequence —
// mostly the brand orange, with a dark neutral and a rare white beat for
// variety, echoing the reference's per-person color-block team grid without
// spending the site's whole palette on it (still just orange/black/white).
const CARD_COLORS = ["orange", "neutral", "orange", "orange", "neutral", "white"] as const
type CardColor = (typeof CARD_COLORS)[number]

type GridItem =
  | { kind: "member"; member: (typeof TEAM_WITH_PHOTOS)[number]; color: CardColor }
  | { kind: "blank"; id: string }

// Padded to a multiple of 4 (the desktop column count) with plain blank
// cards so the grid never ends on a half-empty row, then those blanks are
// shuffled in among the real cards — not just tacked on the end — so they
// read as a deliberate rhythm-break, the way the reference's own grid
// leaves occasional cells empty, rather than a leftover gap.
const BLANK_COUNT = (4 - (TEAM_WITH_PHOTOS.length % 4)) % 4

/** Fisher–Yates, run once at module load — a fixed-but-random layout, not
 *  reshuffled on every render (which would make cards jump around). */
function buildGrid(): GridItem[] {
  const items: GridItem[] = TEAM_WITH_PHOTOS.map((m, i) => ({
    kind: "member",
    member: m,
    color: CARD_COLORS[i % CARD_COLORS.length],
  }))
  for (let i = 0; i < BLANK_COUNT; i++) items.push({ kind: "blank", id: `blank-${i}` })
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

const GRID_ITEMS = buildGrid()
```

to:

```tsx
import { useMemo } from "react"
import { RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { useTeamMembers } from "@/hooks/useTeamMembers"
import type { TeamMember } from "@/lib/strapi"
import { CursorGlow } from "@/components/motion/CursorGlow"

/** Falls back to today's exact Picsum placeholder pattern when Strapi's
 *  photo/photoHover are empty — each field checked independently, since an
 *  editor could set one before the other. */
function withPhotos(m: TeamMember) {
  return {
    ...m,
    photo: m.photo?.url ?? `https://picsum.photos/seed/pixellwave-team-${m.id}/600/750`,
    photoHover: m.photoHover?.url ?? `https://picsum.photos/seed/pixellwave-team-${m.id}-alt/600/750`,
  }
}

type TeamMemberWithPhotos = ReturnType<typeof withPhotos>

// Every card sits on a flat color block, cycling through this sequence —
// mostly the brand orange, with a dark neutral and a rare white beat for
// variety, echoing the reference's per-person color-block team grid without
// spending the site's whole palette on it (still just orange/black/white).
const CARD_COLORS = ["orange", "neutral", "orange", "orange", "neutral", "white"] as const
type CardColor = (typeof CARD_COLORS)[number]

type GridItem =
  | { kind: "member"; member: TeamMemberWithPhotos; color: CardColor }
  | { kind: "blank"; id: string }

/** Fisher–Yates — a fixed-but-random layout. Padded to a multiple of 4 (the
 *  desktop column count) with plain blank cards so the grid never ends on a
 *  half-empty row, then those blanks are shuffled in among the real cards —
 *  not just tacked on the end — so they read as a deliberate rhythm-break.
 *  Called from a useMemo below keyed on the fetched member list, so it only
 *  reshuffles once (when the fetch resolves), not on every render. */
function buildGrid(members: TeamMember[]): GridItem[] {
  const withPhotoMembers = members.map(withPhotos)
  const blankCount = (4 - (withPhotoMembers.length % 4)) % 4
  const items: GridItem[] = withPhotoMembers.map((m, i) => ({
    kind: "member",
    member: m,
    color: CARD_COLORS[i % CARD_COLORS.length],
  }))
  for (let i = 0; i < blankCount; i++) items.push({ kind: "blank", id: `blank-${i}` })
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}
```

- [ ] **Step 3: Update `TeamCard`'s prop type**

Change:
```tsx
function TeamCard({ member, color }: { member: (typeof TEAM_WITH_PHOTOS)[number]; color: CardColor }) {
```
to:
```tsx
function TeamCard({ member, color }: { member: TeamMemberWithPhotos; color: CardColor }) {
```

(The function body is unchanged — it already only reads `member.photo`,
`member.photoHover`, `member.name`, `member.role`, all of which
`TeamMemberWithPhotos` still provides with the same names/types.)

- [ ] **Step 4: Update `StudioTeam` to fetch and memoize the grid**

Change:
```tsx
export function StudioTeam() {
  return (
    <section className="studio-team" data-theme="dark" data-screen-label="Studio Team">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
        <RevealGroup className="team-grid" stagger={0.05} amount={0.05}>
          {GRID_ITEMS.map((item) =>
```
to:
```tsx
export function StudioTeam() {
  const members = useTeamMembers()
  const gridItems = useMemo(() => buildGrid(members), [members])

  return (
    <section className="studio-team" data-theme="dark" data-screen-label="Studio Team">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
        <RevealGroup className="team-grid" stagger={0.05} amount={0.05}>
          {gridItems.map((item) =>
```

(Everything else in the JSX below this — the `item.kind === "member" ? ... : ...`
ternary, the `RevealItem`/`TeamCard`/blank-card markup — is unchanged.)

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc -b`
Expected: no output, exit code 0.

Run: `npm run lint`
Expected: no errors for `src/components/sections/StudioTeam.tsx`.

- [ ] **Step 6: Live-verify on `/studio`**

Confirm both dev servers running. Navigate to `/studio`.

First, read the live member count and a couple of names/roles to know
what to expect (don't assume specific values):
```bash
curl -s "http://localhost:1337/api/team-members?pagination[pageSize]=100" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('total:', d['meta']['pagination']['total'])
print([m['name'] for m in d['data']])
"
```

Then check via `read_page`/`javascript_tool`:
- `document.querySelectorAll(".team-card:not(.team-card--blank)").length`
  equals the live `total` from the curl check above.
- The rendered names (`document.querySelectorAll(".team-card__name")`,
  mapped to `.textContent`) match the live names list from the curl
  check, as a set (order may differ page-to-page due to the shuffle, but
  the set of names must match exactly).
- Total card count (`document.querySelectorAll(".team-card").length`,
  including blanks) is a multiple of 4.
- Reload the page 2-3 times and confirm the grid's visual card order
  changes between reloads (confirms the shuffle still runs fresh per
  page load) while the set of names stays the same each time.
- No console errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/StudioTeam.tsx
git commit -m "Wire StudioTeam.tsx to fetch team members from Strapi

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Migrate `StudioStats.tsx`'s "People" count, then delete `src/data/team.ts`

**Files:**
- Modify: `src/components/sections/StudioStats.tsx`
- Delete: `src/data/team.ts`

**Interfaces:**
- Consumes: `useTeamMembers` (`@/hooks/useTeamMembers`).

- [ ] **Step 1: Confirm this is the last remaining importer of `@/data/team` before touching it**

Run: `grep -rln "data/team" src/`
Expected: only `src/components/sections/StudioStats.tsx` (Task 2 already
removed `StudioTeam.tsx`'s importer). If anything else still appears,
stop — this plan's task order assumed Task 2 already landed.

- [ ] **Step 2: Read the current file to confirm it still matches this plan's assumption**

Run: `grep -n "TEAM\b" "src/components/sections/StudioStats.tsx"`

Expected output (if different, stop and re-read the whole file):
```
8:import { TEAM } from "@/data/team"
74:          <StatBlock value={TEAM.length} label="People" delay={0.1} />
```

- [ ] **Step 3: Replace the import and the `StatBlock` usage**

Change:
```tsx
import { TEAM } from "@/data/team"
```
to:
```tsx
import { useTeamMembers } from "@/hooks/useTeamMembers"
```

Change:
```tsx
export function StudioStats() {
  return (
```
to:
```tsx
export function StudioStats() {
  const teamMembers = useTeamMembers()

  return (
```

Change:
```tsx
          <StatBlock value={TEAM.length} label="People" delay={0.1} />
```
to:
```tsx
          <StatBlock value={teamMembers.length} label="People" delay={0.1} />
```

- [ ] **Step 4: Delete `src/data/team.ts`**

```bash
rm src/data/team.ts
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc -b`
Expected: no output, exit code 0. (This also confirms nothing else in the
codebase still references `@/data/team`.)

Run: `npm run lint`
Expected: no errors for `src/components/sections/StudioStats.tsx`.

Run: `grep -rln "data/team" src/`
Expected: no output.

- [ ] **Step 6: Live-verify on `/studio`**

Navigate to `/studio`. Read the live count first:
```bash
curl -s "http://localhost:1337/api/team-members?pagination[pageSize]=100" | python3 -c "import json,sys; print(json.load(sys.stdin)['meta']['pagination']['total'])"
```

Scroll the stats section into view (this site sets `scroll-behavior: smooth`
globally — set `document.documentElement.style.scrollBehavior = 'auto'`
before scrolling, then scroll and read in a separate step or after a
short wait). Confirm the "People" stat's final settled value
(`document.querySelectorAll(".studio-stats__value")[0]`'s text content,
after waiting ~1.5s for the count-up animation to finish) equals the live
count from the curl check above — not a hardcoded `14` or any other
assumed number.

Confirm no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/StudioStats.tsx
git rm src/data/team.ts
git commit -m "Wire StudioStats.tsx's People count to Strapi; delete src/data/team.ts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
