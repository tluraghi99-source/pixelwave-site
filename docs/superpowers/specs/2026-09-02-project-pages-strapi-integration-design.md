# Project pages Strapi integration — design spec

**Date:** 2026-09-02
**Status:** Approved, pending implementation

## Summary

This is sub-project 2 of 3 (see `2026-09-01-strapi-cms-scaffold-design.md`
for sub-project 1, already shipped). It wires this site's Work/Project
pages to fetch from the running Strapi CMS instead of the static
`src/data/work.ts` file, which is deleted entirely. No new npm
dependencies — a small `fetch`-based client is all this needs.

## Decisions from brainstorming

- **Empty media fallback:** where Strapi's `heroMedia`/`galleryImages` are
  empty (true for all 10 seeded projects today), each render site falls
  back to its own existing Picsum placeholder URL pattern — pixel-for-pixel
  what renders today. Once a project's media is uploaded in Strapi, that
  media is used instead, exactly as uploaded (whatever image/video and
  however many gallery images).
- **API URL config:** `VITE_STRAPI_URL` env var, defaulting to
  `http://localhost:1337` when unset.
- **Loading state:** nothing renders until the fetch resolves — no
  skeletons.
- **Error state:** a failed/unreachable fetch renders as an empty result
  (no error banner) — indistinguishable from "no projects," matching
  today's total absence of any loading/error UI.
- **`src/data/work.ts` is deleted entirely** (text fields are Strapi's
  now, not just images — per sub-project 1's "everything" decision).

## Known, accepted side effect: Northwind's hardcoded video hero goes away

Today, `ProjectPage.tsx` hardcodes Northwind's hero to a real video
(`/video/studio.mp4`) regardless of any data source, specifically to demo
the video-hero code path. That hardcoding is removed — hero media now
comes entirely from Strapi's `heroMedia` field, which is currently empty
for every project, including Northwind. Until someone uploads a real video
to Northwind's `heroMedia` in Strapi, `/work/northwind` will show the same
Picsum image fallback as every other project. This is the correct,
expected behavior for a CMS-driven site — flagged here so it isn't
mistaken for a regression when it's noticed.

## Architecture

### New file: `src/lib/strapi.ts`

The API client and shared types. No new dependencies — plain `fetch`.

```ts
export const STRAPI_URL = import.meta.env.VITE_STRAPI_URL ?? "http://localhost:1337"

export interface StrapiMedia {
  url: string
  mime: string
}

export interface ProjectTag {
  label: string
  highlighted: boolean
}

export interface Project {
  id: string
  idx: string
  slug: string
  title: string
  desc: string
  client: string
  year: number
  tags: ProjectTag[]
  heroMedia: StrapiMedia | null
  galleryImages: StrapiMedia[]
}

/** Strapi returns relative URLs for locally-uploaded media (e.g.
 *  "/uploads/foo.jpg") — an already-absolute URL passes through unchanged. */
export function strapiMediaUrl(url: string): string {
  return url.startsWith("http") ? url : `${STRAPI_URL}${url}`
}

interface StrapiTagRaw {
  label: string
  highlighted: boolean
}
interface StrapiMediaRaw {
  url: string
  mime: string
}
interface StrapiProjectRaw {
  documentId: string
  slug: string
  title: string
  description: string
  client: string
  year: number
  order: number
  tags: StrapiTagRaw[]
  heroMedia: StrapiMediaRaw | null
  galleryImages: StrapiMediaRaw[]
}

function mapProject(raw: StrapiProjectRaw): Project {
  return {
    id: raw.documentId,
    idx: String(raw.order).padStart(2, "0"),
    slug: raw.slug,
    title: raw.title,
    desc: raw.description,
    client: raw.client,
    year: raw.year,
    tags: raw.tags.map((t) => ({ label: t.label, highlighted: t.highlighted })),
    heroMedia: raw.heroMedia
      ? { url: strapiMediaUrl(raw.heroMedia.url), mime: raw.heroMedia.mime }
      : null,
    galleryImages: raw.galleryImages.map((m) => ({ url: strapiMediaUrl(m.url), mime: m.mime })),
  }
}

/** Fetches all published projects, sorted by their editorial `order`.
 *  Resolves to `[]` on any network/parse failure — per the approved
 *  design, callers render an empty state rather than an error message. */
export async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/projects?populate=tags,heroMedia,galleryImages&sort=order:asc&pagination[pageSize]=100`
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.data as StrapiProjectRaw[]).map(mapProject)
  } catch {
    return []
  }
}
```

### New file: `src/hooks/useProjects.ts`

```ts
import { useEffect, useState } from "react"
import { fetchProjects, type Project } from "@/lib/strapi"

/** Fetches the full project list once on mount. No cross-component cache
 *  — with only a handful of projects, a redundant fetch per page visit
 *  is cheap and this avoids introducing any new state-management
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
```

### Deleted: `src/data/work.ts`

Its `TagVariant`/`Project` types are replaced by `strapi.ts`'s
`ProjectTag`/`Project`.

## Per-consumer changes

### `src/pages/WorkPage.tsx`

- `PROJECTS` import replaced with `const projects = useProjects()`.
- `FILTER_TAGS`/`FILTER_CLIENTS` move from module-level constants
  (computed once from static data) to `useMemo`s inside the component,
  derived from `projects` — they can't be computed before the fetch
  resolves.
- `visibleProjects`'s `useMemo` dependency array gains `projects`.
- Tag rendering: `variant={t[0] || "outline"}` (tuple) becomes
  `variant={t.highlighted ? "orange" : "outline"}` (object).
- Grid thumbnail: falls back to today's exact Picsum URL
  (`https://picsum.photos/seed/pixellwave-${p.id}/900/1200?grayscale`) only
  when `heroMedia` is null or is a video (a small grid card isn't a
  sensible place to autoplay video) — otherwise uses `heroMedia.url`.

### `src/components/sections/Work.tsx` (homepage carousel) + `src/components/sections/WorkReel.tsx`

- `Work.tsx`'s `WORK`/`CARDS`/`GALLERY_ITEMS` module-level constants
  (derived from static `PROJECTS.slice(0, 3)`) become derived from a
  `projects: Project[]` prop instead, threaded in from outside — `Work.tsx`
  itself does not call `useProjects()`, since its exported pieces
  (`WorkGallery`, `WorkAmbient`) are consumed by both `WorkReelPinned` and
  `WorkReelAmbient` in `WorkReel.tsx`, and only one of those two ever
  mounts at once (desktop vs. mobile) — fetching once in `WorkReel`'s
  top-level exported component and passing `projects` down avoids two
  separate fetch call sites for what's ultimately one page section.
- Tag mapping: `w.tags.map(([variant, label]) => ({ variant: variant || "outline", label }))`
  becomes `w.tags.map((t) => ({ variant: t.highlighted ? "orange" : "outline", label: t.label }))`.
- Gallery image fallback (`GALLERY_ITEMS`): same pattern as today
  (`https://picsum.photos/seed/pixellwave-${w.id}/1200/900?grayscale`) when
  `heroMedia` is null/video, else `heroMedia.url`.
- `WorkReel.tsx`'s exported `WorkReel` component calls `useProjects()` once
  and passes the result down through `WorkReelPinned`/`WorkReelAmbient` to
  `WorkGallery`/`WorkAmbient`.

### `src/pages/ProjectPage.tsx`

- `PROJECTS`/`Project` import from `@/data/work` replaced by
  `useProjects()` (returns `Project[]` from `@/lib/strapi`) and the
  `Project` type from the same module.
- `PROJECTS_WITH_MEDIA` (a module-level array built once from static data)
  becomes a `useMemo` inside the component, built from the fetched
  `projects` array — same shape (`hero`/`gallery`/`thumb` derived fields),
  same fallback Picsum URLs as today when Strapi media is empty:
  - `hero`: `heroMedia` if present (type `"video"` when
    `mime.startsWith("video/")`, else `"image"`), else today's exact
    fallback (`https://picsum.photos/seed/pixellwave-${p.id}-hero/1600/900?grayscale`,
    type `"image"`).
  - `gallery`: `galleryImages` mapped to `MediaItem[]` if non-empty
    (image or video per mime type), else today's exact 8-item Picsum
    fallback.
  - `thumb`: same Picsum fallback pattern as today
    (`.../pixellwave-${p.id}-hero/400/300?grayscale`) when `heroMedia` is
    null, else `heroMedia.url` (used only as a static `<img>` for the
    "next project" teaser, so a video `heroMedia` still falls back to
    Picsum here specifically, same reasoning as the grid thumbnail above).
  - The `northwindEntry`/hardcoded-video-override block is deleted (see
    "Known, accepted side effect" above).
- Everything else (the pinned video section, gallery marquee, next-project
  card, "not found" state) is unchanged — it already only depends on the
  derived `hero`/`gallery`/`thumb`/`title`/`desc`/`year`/`slug` fields,
  which keep the same shape.
- "Not found" now also covers the moment before the fetch resolves (an
  empty `projects` array looks the same as "no match for this slug") —
  acceptable per the approved "nothing until loaded" loading design; a
  real 404 and a not-yet-loaded page are visually identical for a
  fraction of a second, which is fine given the fetch is fast and local
  data was previously synchronous.

## Environment config

- New file `.env.example` (committed):
  ```
  VITE_STRAPI_URL=http://localhost:1337
  ```
- `.gitignore` gains:
  ```
  .env
  .env.local
  .env.*.local
  ```
  (This repo has never had env files before — this is their introduction.)

## Out of scope

- Studio team photos (sub-project 3, separate spec/plan).
- Strapi Cloud / production deployment — this integration targets
  whatever `VITE_STRAPI_URL` points at; switching to production once
  deployed is a one-line env change, not a code change.
- Any caching/state-management library — a redundant per-page-visit fetch
  is accepted as fine for a 10-project catalog.
- Uploading real photography to Strapi — out of this integration's hands;
  the fallback behavior means the site keeps looking exactly as it does
  today until that happens, independently, whenever it happens.
