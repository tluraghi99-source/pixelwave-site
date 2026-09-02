# Project Pages Strapi Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `src/data/work.ts` with live data fetched from the running Strapi CMS across the homepage carousel, the `/work` listing page, and individual `/work/:slug` project pages.

**Architecture:** One small `fetch`-based API client (`src/lib/strapi.ts`) and one hook (`src/hooks/useProjects.ts`) sit underneath three independent consumer migrations (`WorkPage.tsx`; `Work.tsx`+`WorkReel.tsx`; `ProjectPage.tsx`, which also deletes `src/data/work.ts` once it's the last remaining importer). No new npm dependencies.

**Tech Stack:** React 19, TypeScript, Vite (plain `fetch`, no data-fetching library). Strapi 5.52.2 running locally at `http://localhost:1337` (separate repo at `/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms`), seeded with 10 published `api::project.project` entries (all with empty `heroMedia`/`galleryImages` today). No test framework in this repo — verification is `npx tsc -b`, `npm run lint` (oxlint), and live checks via the Claude Browser preview tools against the Vite dev server and the running local Strapi instance.

## Global Constraints

- No new npm dependencies — plain `fetch`, no React Query/SWR/axios.
- `VITE_STRAPI_URL` env var, defaulting to `http://localhost:1337` when unset.
- Where Strapi's `heroMedia`/`galleryImages` are empty for a project, each render site falls back to **its own existing Picsum placeholder URL pattern, unchanged** — the exact seeds/dimensions already in each file today, not a new unified pattern.
- No loading UI (nothing renders until the fetch resolves) and no error UI (a failed fetch resolves to an empty list, rendered the same as "no projects") — both per the approved spec.
- `src/data/work.ts` is deleted once nothing imports from it anymore (the last task in this plan).
- The `tags` shape changes from `[TagVariant, string][]` tuples to `{ label: string; highlighted: boolean }[]` objects everywhere — `t[0] || "outline"` becomes `t.highlighted ? "orange" : "outline"`, `t[1]` becomes `t.label`.
- `src/index.css` has a pre-existing UNRELATED uncommitted hunk (a `.work-page__*` title-wrapping fix) that must never be part of any commit in this plan — this plan doesn't touch `index.css` at all, so this should be a non-issue, but if any step's diff unexpectedly touches it, stop and re-check rather than committing it.

---

### Task 1: API client, hook, and environment config

**Files:**
- Create: `src/lib/strapi.ts`
- Create: `src/hooks/useProjects.ts`
- Create: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `STRAPI_URL: string`, `strapiMediaUrl(url: string): string`, `interface StrapiMedia { url: string; mime: string }`, `interface ProjectTag { label: string; highlighted: boolean }`, `interface Project { id: string; idx: string; slug: string; title: string; desc: string; client: string; year: number; tags: ProjectTag[]; heroMedia: StrapiMedia | null; galleryImages: StrapiMedia[] }`, `async function fetchProjects(): Promise<Project[]>` (all from `src/lib/strapi.ts`), and `function useProjects(): Project[]` (from `src/hooks/useProjects.ts`). Tasks 2-4 import all of these.

- [ ] **Step 1: Create `src/lib/strapi.ts`**

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
 *  Resolves to `[]` on any network/parse failure — callers render an
 *  empty state rather than an error message. */
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

- [ ] **Step 2: Create `src/hooks/useProjects.ts`**

```ts
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
```

- [ ] **Step 3: Create `.env.example`**

```
VITE_STRAPI_URL=http://localhost:1337
```

- [ ] **Step 4: Update `.gitignore`**

Read the current `.gitignore` first (`cat .gitignore`) to confirm it has no
existing `.env` entry (it doesn't, as of this plan's writing), then append:

```
.env
.env.local
.env.*.local
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc -b`
Expected: no output, exit code 0. (`import.meta.env.VITE_STRAPI_URL` type-checks
fine against this project's existing `tsconfig.app.json` `"types": ["vite/client"]`
setting — no additional `vite-env.d.ts` augmentation is needed.)

Run: `npm run lint`
Expected: no errors for `src/lib/strapi.ts` or `src/hooks/useProjects.ts`.

- [ ] **Step 6: Verify `fetchProjects()` actually works against the live local Strapi instance**

Confirm the local Strapi dev server is running (start it if not — from
`/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms`, `npm run develop`,
wait ~20s, confirm with `curl -sI http://localhost:1337/admin` returning
`200`).

Start this site's own dev server (`preview_start` with `{"name": "pixellwave-dev"}`),
navigate to `/`, then use `javascript_tool` to dynamically import and call
the new module directly — Vite's dev server transpiles `.ts` files
on-the-fly, so a browser-side dynamic import of the source file works
without any build step:

```js
const mod = await import("/src/lib/strapi.ts");
const projects = await mod.fetchProjects();
JSON.stringify({
  count: projects.length,
  first: projects[0],
});
```

Expected: `count` is `10`, and `first` (Northwind, since `order: 1` sorts
first) looks like:
```json
{
  "id": "of7tuh1pjns5ub58qi4aece4",
  "idx": "01",
  "slug": "northwind",
  "title": "Northwind",
  "desc": "Identity and site for a renewable-energy startup.",
  "client": "Inter",
  "year": 2025,
  "tags": [
    { "label": "Featured", "highlighted": true },
    { "label": "Web", "highlighted": false },
    { "label": "Brand", "highlighted": false }
  ],
  "heroMedia": null,
  "galleryImages": []
}
```
(The exact `id` is Strapi's `documentId` for that entry and may differ
if the seed was re-run — check that it's a non-empty string, not the
exact literal value above.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/strapi.ts src/hooks/useProjects.ts .env.example .gitignore
git commit -m "Add Strapi API client and useProjects hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Migrate `WorkPage.tsx` to fetched data

**Files:**
- Modify: `src/pages/WorkPage.tsx`

**Interfaces:**
- Consumes: `useProjects` (`@/hooks/useProjects`), `type Project` (`@/lib/strapi`).

- [ ] **Step 1: Read the current file to confirm it still matches this plan's assumption**

Run: `grep -n "PROJECTS\|FILTER_TAGS\|FILTER_CLIENTS\|t\[0\]\|t\[1\]" "src/pages/WorkPage.tsx"`

If the output looks substantially different from what's shown in the
diff below (beyond trivial reformatting), stop and re-read the whole file
before proceeding — something changed since this plan was written.

- [ ] **Step 2: Replace the static import and module-level filter constants**

Change:
```tsx
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { Card } from "@/components/pw/Card"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Footer } from "@/components/sections/Footer"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { EASE_WAVE } from "@/lib/motion"
import { PROJECTS } from "@/data/work"

// "Featured" is a highlight badge, not a category, so it's excluded from the filter row.
const FILTER_TAGS = Array.from(
  new Set(PROJECTS.flatMap((p) => p.tags.map(([, label]) => label)))
).filter((label) => label !== "Featured")

// Alphabetical (unlike FILTER_TAGS' insertion order) — categories are a
// small curated set where order doesn't matter; clients are the dimension
// expected to grow, so alphabetical keeps a long list scannable.
const FILTER_CLIENTS = Array.from(new Set(PROJECTS.map((p) => p.client))).sort()

export function WorkPage() {
```

to:

```tsx
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { Card } from "@/components/pw/Card"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Footer } from "@/components/sections/Footer"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { EASE_WAVE } from "@/lib/motion"
import { useProjects } from "@/hooks/useProjects"
import type { Project } from "@/lib/strapi"

/** Falls back to today's exact Picsum grid-thumbnail pattern when heroMedia
 *  is empty or is a video (a small grid card is never a sensible place to
 *  autoplay video). */
function gridThumbUrl(p: Project): string {
  if (p.heroMedia && !p.heroMedia.mime.startsWith("video/")) return p.heroMedia.url
  return `https://picsum.photos/seed/pixellwave-${p.id}/900/1200?grayscale`
}

export function WorkPage() {
  const projects = useProjects()

  // "Featured" is a highlight badge, not a category, so it's excluded from
  // the filter row. Can't be computed until the fetch resolves, so this
  // moves from a module-level constant to a memo derived from `projects`.
  const FILTER_TAGS = useMemo(
    () =>
      Array.from(new Set(projects.flatMap((p) => p.tags.map((t) => t.label)))).filter(
        (label) => label !== "Featured"
      ),
    [projects]
  )

  // Alphabetical (unlike FILTER_TAGS' insertion order) — categories are a
  // small curated set where order doesn't matter; clients are the dimension
  // expected to grow, so alphabetical keeps a long list scannable.
  const FILTER_CLIENTS = useMemo(
    () => Array.from(new Set(projects.map((p) => p.client))).sort(),
    [projects]
  )
```

- [ ] **Step 3: Update `visibleProjects` to use `projects` instead of the static `PROJECTS`, and fix the tag-tuple filter check**

Change:
```tsx
  const visibleProjects = useMemo(() => {
    if (mode === "category") {
      if (activeTags.size === 0) return PROJECTS
      return PROJECTS.filter((p) => p.tags.some(([, label]) => activeTags.has(label)))
    }
    if (!activeClient) return PROJECTS
    return PROJECTS.filter((p) => p.client === activeClient)
  }, [mode, activeTags, activeClient])
```

to:

```tsx
  const visibleProjects = useMemo(() => {
    if (mode === "category") {
      if (activeTags.size === 0) return projects
      return projects.filter((p) => p.tags.some((t) => activeTags.has(t.label)))
    }
    if (!activeClient) return projects
    return projects.filter((p) => p.client === activeClient)
  }, [projects, mode, activeTags, activeClient])
```

- [ ] **Step 4: Update the grid's image and tag rendering**

Change:
```tsx
                  <Card
                    index={p.idx}
                    titleFirst
                    media={
                      <img
                        src={`https://picsum.photos/seed/pixellwave-${p.id}/900/1200?grayscale`}
                        alt={p.title}
                      />
                    }
                    meta={p.tags.map((t, ti) => (
                      <Tag key={ti} variant={t[0] || "outline"}>
                        {t[1]}
                      </Tag>
                    ))}
```

to:

```tsx
                  <Card
                    index={p.idx}
                    titleFirst
                    media={<img src={gridThumbUrl(p)} alt={p.title} />}
                    meta={p.tags.map((t, ti) => (
                      <Tag key={ti} variant={t.highlighted ? "orange" : "outline"}>
                        {t.label}
                      </Tag>
                    ))}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc -b`
Expected: no output, exit code 0.

Run: `npm run lint`
Expected: no errors for `src/pages/WorkPage.tsx`.

- [ ] **Step 6: Live-verify on `/work`**

Confirm both dev servers are running (this site's Vite dev server, and
the local Strapi instance at `http://localhost:1337`). Navigate to
`/work`.

Check via `read_page`/`javascript_tool`:
- `document.querySelectorAll(".work-grid .pw-card, .work-grid [class*='card']").length` —
  adjust the selector if needed after inspecting the actual rendered DOM,
  but confirm **10** project cards render (one per seeded project).
- Click the "Client" tab, confirm the filter pill row shows real client
  names from the seeded data (`Inter`, `Red Bull`, `Isola del Gusto`,
  `Maserati` — the 4 distinct clients across the 10 seeded projects).
- Click one client pill (e.g. "Inter"), confirm the grid narrows to
  exactly the 3 projects whose `client` is "Inter" (Northwind, Glasswing,
  Driftwood Market, per the seeded data).
- Switch back to "Category", click a tag pill that should exist (e.g.
  "Web"), confirm the grid narrows and no "Featured" pill appears in the
  category filter row (it's deliberately excluded).
- Confirm no console errors (`read_console_messages` with
  `onlyErrors: true`).

- [ ] **Step 7: Commit**

```bash
git add src/pages/WorkPage.tsx
git commit -m "Wire WorkPage.tsx to fetch projects from Strapi

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Migrate `Work.tsx` and `WorkReel.tsx` to fetched data

**Files:**
- Modify: `src/components/sections/Work.tsx`
- Modify: `src/components/sections/WorkReel.tsx`

**Interfaces:**
- Consumes: `useProjects` (`@/hooks/useProjects`), `type Project` (`@/lib/strapi`).
- Produces: `WorkGallery`, `WorkAmbient` (from `Work.tsx`) now take a `projects: Project[]` prop instead of reading a module-level constant — `WorkReel.tsx` (Task 3's own second file) is the only consumer and is updated in the same task, so this interface change never needs to be "discovered" by a later task.

- [ ] **Step 1: Read both current files to confirm they still match this plan's assumptions**

Run:
```bash
grep -n "PROJECTS\|WORK\|CARDS\|GALLERY_ITEMS" "src/components/sections/Work.tsx"
grep -n "WorkGallery\|WorkAmbient\|WorkHeading" "src/components/sections/WorkReel.tsx"
```

If either output looks substantially different from this plan's diffs
below, stop and re-read the whole file before proceeding.

- [ ] **Step 2: Update `Work.tsx`'s import and module-level constants to take a `projects` prop**

Change:
```tsx
import { useRef, type PointerEvent, type ReactNode } from "react"
import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Card } from "@/components/pw/Card"
import { Tag } from "@/components/pw/Tag"
import { Reveal } from "@/components/motion/Reveal"
import { wrap } from "@/lib/motion"
import { CircularGallery, type CircularGalleryHandle } from "@/components/ui/circular-gallery"
import { PROJECTS } from "@/data/work"

// The homepage teases a curated few — the full roster lives on the /work page.
const WORK = PROJECTS.slice(0, 3)

const CARDS = [...WORK, ...WORK]

// Temporary stand-in photography (Lorem Picsum) until real project imagery is ready.
const GALLERY_ITEMS = WORK.map((w) => ({
  image: `https://picsum.photos/seed/pixellwave-${w.id}/1200/900?grayscale`,
  text: w.title,
  tags: w.tags.map(([variant, label]) => ({ variant: variant || ("outline" as const), label })),
}))
```

to:

```tsx
import { useRef, type PointerEvent, type ReactNode } from "react"
import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Card } from "@/components/pw/Card"
import { Tag } from "@/components/pw/Tag"
import { Reveal } from "@/components/motion/Reveal"
import { wrap } from "@/lib/motion"
import { CircularGallery, type CircularGalleryHandle } from "@/components/ui/circular-gallery"
import type { Project } from "@/lib/strapi"

/** Falls back to today's exact Picsum pattern when heroMedia is empty or is
 *  a video (this gallery only ever shows static images). */
function galleryImageUrl(p: Project): string {
  if (p.heroMedia && !p.heroMedia.mime.startsWith("video/")) return p.heroMedia.url
  return `https://picsum.photos/seed/pixellwave-${p.id}/1200/900?grayscale`
}
```

- [ ] **Step 3: Update `WorkTrack` to take `projects` and derive `WORK`/`CARDS` locally**

Change:
```tsx
function WorkTrack({ x }: { x: MotionValue<string> }) {
  return (
    <motion.div className="work__track" style={{ x }}>
      {CARDS.map((w, i) => (
        <div className="work__card-wrap" key={`${w.id}-${i}`}>
          <Card
            index={w.idx}
            media={<WorkMedia index={w.idx} />}
            meta={w.tags.map((t, ti) => (
              <Tag key={ti} variant={t[0] || "outline"}>
                {t[1]}
              </Tag>
            ))}
            title={w.title}
            description={w.desc}
            href={`/work/${w.slug}`}
          >
            <span className="work__view">
              View project <ArrowUpRight size={15} />
            </span>
          </Card>
        </div>
      ))}
    </motion.div>
  )
}
```

to:

```tsx
function WorkTrack({ projects, x }: { projects: Project[]; x: MotionValue<string> }) {
  // The homepage teases a curated few — the full roster lives on the /work
  // page. Doubled so the marquee track can translate exactly -50% and loop
  // seamlessly.
  const work = projects.slice(0, 3)
  const cards = [...work, ...work]

  return (
    <motion.div className="work__track" style={{ x }}>
      {cards.map((w, i) => (
        <div className="work__card-wrap" key={`${w.id}-${i}`}>
          <Card
            index={w.idx}
            media={<WorkMedia index={w.idx} />}
            meta={w.tags.map((t, ti) => (
              <Tag key={ti} variant={t.highlighted ? "orange" : "outline"}>
                {t.label}
              </Tag>
            ))}
            title={w.title}
            description={w.desc}
            href={`/work/${w.slug}`}
          >
            <span className="work__view">
              View project <ArrowUpRight size={15} />
            </span>
          </Card>
        </div>
      ))}
    </motion.div>
  )
}
```

- [ ] **Step 4: Update `WorkGallery` to take `projects` and derive `GALLERY_ITEMS` locally**

Change:
```tsx
export function WorkGallery({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const galleryRef = useRef<CircularGalleryHandle>(null)

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    galleryRef.current?.setProgress(latest)
  })

  return (
    <CircularGallery
      ref={galleryRef}
      items={GALLERY_ITEMS}
      bend={2}
      borderRadius={0}
      className="work__gallery"
    />
  )
}
```

to:

```tsx
export function WorkGallery({
  projects,
  scrollYProgress,
}: {
  projects: Project[]
  scrollYProgress: MotionValue<number>
}) {
  const galleryRef = useRef<CircularGalleryHandle>(null)

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    galleryRef.current?.setProgress(latest)
  })

  const galleryItems = projects.slice(0, 3).map((w) => ({
    image: galleryImageUrl(w),
    text: w.title,
    tags: w.tags.map((t) => ({ variant: t.highlighted ? ("orange" as const) : ("outline" as const), label: t.label })),
  }))

  return (
    <CircularGallery
      ref={galleryRef}
      items={galleryItems}
      bend={2}
      borderRadius={0}
      className="work__gallery"
    />
  )
}
```

- [ ] **Step 5: Update `WorkAmbient` to take `projects` and pass it through to `WorkTrack`**

Change:
```tsx
/** Mobile/tablet: ambient scroll-linked drift, no pinning (revisit later). */
export function WorkAmbient() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })
  const rawX = useTransform(scrollYProgress, [0, 1], [0, -300])
  const x = useTransform(rawX, (v) => `${wrap(-50, 0, v)}%`)

  return (
    <section
      id="work"
      className="sec work-ambient"
      data-theme="dark"
      data-screen-label="Selected Work"
      ref={sectionRef}
    >
      <div className="wrap">
        <WorkHeading />
      </div>
      <Reveal delay={0.2} className="work__carousel">
        <WorkTrack x={x} />
      </Reveal>
    </section>
  )
}
```

to:

```tsx
/** Mobile/tablet: ambient scroll-linked drift, no pinning (revisit later). */
export function WorkAmbient({ projects }: { projects: Project[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })
  const rawX = useTransform(scrollYProgress, [0, 1], [0, -300])
  const x = useTransform(rawX, (v) => `${wrap(-50, 0, v)}%`)

  return (
    <section
      id="work"
      className="sec work-ambient"
      data-theme="dark"
      data-screen-label="Selected Work"
      ref={sectionRef}
    >
      <div className="wrap">
        <WorkHeading />
      </div>
      <Reveal delay={0.2} className="work__carousel">
        <WorkTrack projects={projects} x={x} />
      </Reveal>
    </section>
  )
}
```

(`WorkHeading` is unchanged — it doesn't use project data.)

- [ ] **Step 6: Update `WorkReel.tsx` to fetch once and pass `projects` down**

Change:
```tsx
import { useRef } from "react"
import { cubicBezier, motion, useMotionValue, useScroll, useTransform } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { EASE_WAVE, HERO_REVEAL_END, HERO_REVEAL_START } from "@/lib/motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { VideoScrubbed, VideoScrubAmbient } from "@/components/sections/VideoScrub"
import { WorkHeading, WorkGallery, WorkAmbient } from "@/components/sections/Work"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Button } from "@/components/pw/Button"
import { CtaBand } from "@/components/sections/CtaBand"
```

to:

```tsx
import { useRef } from "react"
import { cubicBezier, motion, useMotionValue, useScroll, useTransform } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { EASE_WAVE, HERO_REVEAL_END, HERO_REVEAL_START } from "@/lib/motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { useProjects } from "@/hooks/useProjects"
import type { Project } from "@/lib/strapi"
import { VideoScrubbed, VideoScrubAmbient } from "@/components/sections/VideoScrub"
import { WorkHeading, WorkGallery, WorkAmbient } from "@/components/sections/Work"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Button } from "@/components/pw/Button"
import { CtaBand } from "@/components/sections/CtaBand"
```

Change `WorkReelPinned`'s signature and its `WorkGallery` usage:
```tsx
function WorkReelPinned({ ctaHeadline }: { ctaHeadline: string }) {
```
to:
```tsx
function WorkReelPinned({ ctaHeadline, projects }: { ctaHeadline: string; projects: Project[] }) {
```

and:
```tsx
            <motion.div className="work__gallery-wrap" style={{ opacity: contentOpacity, y: galleryY }}>
              <WorkGallery scrollYProgress={carouselProgress} />
            </motion.div>
```
to:
```tsx
            <motion.div className="work__gallery-wrap" style={{ opacity: contentOpacity, y: galleryY }}>
              <WorkGallery projects={projects} scrollYProgress={carouselProgress} />
            </motion.div>
```

Change `WorkReelAmbient`'s signature and its `WorkAmbient` usage:
```tsx
function WorkReelAmbient({ ctaHeadline }: { ctaHeadline: string }) {
  return (
    <>
      <VideoScrubAmbient />
      <WorkAmbient />
      <CtaBand headline={ctaHeadline} />
    </>
  )
}
```
to:
```tsx
function WorkReelAmbient({ ctaHeadline, projects }: { ctaHeadline: string; projects: Project[] }) {
  return (
    <>
      <VideoScrubAmbient />
      <WorkAmbient projects={projects} />
      <CtaBand headline={ctaHeadline} />
    </>
  )
}
```

Change the exported `WorkReel` to fetch once and pass down:
```tsx
export function WorkReel({ ctaHeadline }: { ctaHeadline: string }) {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")

  return isDesktop ? (
    <WorkReelPinned ctaHeadline={ctaHeadline} />
  ) : (
    <WorkReelAmbient ctaHeadline={ctaHeadline} />
  )
}
```
to:
```tsx
export function WorkReel({ ctaHeadline }: { ctaHeadline: string }) {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  const projects = useProjects()

  return isDesktop ? (
    <WorkReelPinned ctaHeadline={ctaHeadline} projects={projects} />
  ) : (
    <WorkReelAmbient ctaHeadline={ctaHeadline} projects={projects} />
  )
}
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc -b`
Expected: no output, exit code 0.

Run: `npm run lint`
Expected: no errors for `src/components/sections/Work.tsx` or `src/components/sections/WorkReel.tsx`.

- [ ] **Step 8: Live-verify the homepage carousel, both desktop and mobile**

Navigate to `/`. On desktop, scroll into the pinned work-reel section
until the carousel is visible (roughly 45-55% through `.reel`'s own
height — see the note on `scroll-behavior: smooth` below). Check via
`javascript_tool`:
```js
document.documentElement.style.scrollBehavior = 'auto'
```
before scrolling, then scroll and read in separate calls (this site sets
`scroll-behavior: smooth` globally; reading immediately after a
synchronous scroll in the same script sees stale pre-scroll state).

Confirm:
- `document.querySelectorAll(".work__gallery-wrap canvas").length` is `1`
  (the WebGL canvas still mounts).
- Hovering a card shows a caption with one of the first 3 seeded
  projects' titles (Northwind, Tidal Commerce, or Solstice) — same
  mechanism already covered by earlier work on this component, just now
  fed by live data instead of the static array.

Then `resize_window` to `preset: "mobile"`, reload `/`, scroll to the
mobile ambient work section. Confirm:
```js
document.querySelectorAll(".work__card-wrap").length
```
is `6` (3 unique projects × 2, doubled for the seamless marquee loop —
same pattern as before), and the visible card titles are the first 3
seeded projects by `order`. Reset the viewport afterward
(`resize_window` with `preset: "desktop"`).

Confirm no console errors on both passes.

- [ ] **Step 9: Commit**

```bash
git add src/components/sections/Work.tsx src/components/sections/WorkReel.tsx
git commit -m "Wire Work.tsx/WorkReel.tsx's homepage carousel to fetch from Strapi

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Migrate `ProjectPage.tsx` to fetched data, then delete `src/data/work.ts`

**Files:**
- Modify: `src/pages/ProjectPage.tsx`
- Delete: `src/data/work.ts`

**Interfaces:**
- Consumes: `useProjects` (`@/hooks/useProjects`), `type Project` (`@/lib/strapi`).

- [ ] **Step 1: Confirm this is the last remaining importer of `@/data/work` before touching it**

Run: `grep -rln "data/work" src/`
Expected: only `src/pages/ProjectPage.tsx` (Tasks 2 and 3 already removed
the other two importers). If anything else still appears, stop — this
plan's task order assumed Tasks 2 and 3 already landed.

- [ ] **Step 2: Read the current file to confirm it still matches this plan's assumptions**

Run: `grep -n "PROJECTS\|northwindEntry\|PROJECTS_WITH_MEDIA" "src/pages/ProjectPage.tsx"`

If the output looks substantially different from this plan's diff below,
stop and re-read the whole file before proceeding.

- [ ] **Step 3: Replace the import and the module-level `PROJECTS_WITH_MEDIA`/Northwind-override block**

Change:
```tsx
import { useMemo, useRef } from "react"
import { Link, useParams } from "react-router-dom"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { ArrowUpRight } from "lucide-react"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { Footer } from "@/components/sections/Footer"
import { PROJECTS, type Project } from "@/data/work"

interface MediaItem {
  type: "image" | "video"
  src: string
}

interface ProjectWithMedia extends Project {
  hero: MediaItem
  gallery: MediaItem[]
  thumb: string
}

// Temporary stand-in photography (Lorem Picsum) until real project imagery is
// ready — same posture as Work.tsx's GALLERY_ITEMS and StudioTeam's
// TEAM_WITH_PHOTOS. Media URLs never live in data/work.ts itself.
const PROJECTS_WITH_MEDIA: ProjectWithMedia[] = PROJECTS.map((p) => ({
  ...p,
  hero: { type: "image", src: `https://picsum.photos/seed/pixellwave-${p.id}-hero/1600/900?grayscale` },
  gallery: Array.from({ length: 8 }, (_, i) => ({
    type: "image" as const,
    src: `https://picsum.photos/seed/pixellwave-${p.id}-g${i}/900/700?grayscale`,
  })),
  thumb: `https://picsum.photos/seed/pixellwave-${p.id}-hero/400/300?grayscale`,
}))

// Northwind demos the video-media path with the existing studio.mp4 asset —
// every other project stays image-only until real footage exists.
const northwindEntry = PROJECTS_WITH_MEDIA.find((p) => p.slug === "northwind")
if (northwindEntry) northwindEntry.hero = { type: "video", src: "/video/studio.mp4" }
```

to:

```tsx
import { useMemo, useRef } from "react"
import { Link, useParams } from "react-router-dom"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { ArrowUpRight } from "lucide-react"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { Footer } from "@/components/sections/Footer"
import { useProjects } from "@/hooks/useProjects"
import type { Project } from "@/lib/strapi"

interface MediaItem {
  type: "image" | "video"
  src: string
}

interface ProjectWithMedia extends Project {
  hero: MediaItem
  gallery: MediaItem[]
  thumb: string
}

/** Builds the hero/gallery/thumb media fields for one project, falling back
 *  to today's exact Picsum placeholder patterns wherever Strapi's media
 *  fields are empty. Real heroMedia can be an image or a video (decided by
 *  mime type); the placeholder fallback is always a static image. */
function withMedia(p: Project): ProjectWithMedia {
  const hero: MediaItem = p.heroMedia
    ? { type: p.heroMedia.mime.startsWith("video/") ? "video" : "image", src: p.heroMedia.url }
    : { type: "image", src: `https://picsum.photos/seed/pixellwave-${p.id}-hero/1600/900?grayscale` }

  const gallery: MediaItem[] =
    p.galleryImages.length > 0
      ? p.galleryImages.map((m) => ({
          type: m.mime.startsWith("video/") ? ("video" as const) : ("image" as const),
          src: m.url,
        }))
      : Array.from({ length: 8 }, (_, i) => ({
          type: "image" as const,
          src: `https://picsum.photos/seed/pixellwave-${p.id}-g${i}/900/700?grayscale`,
        }))

  // Used only as a static <img> "next project" teaser — a video heroMedia
  // still falls back to the Picsum thumb here, same reasoning as the grid
  // thumbnail in WorkPage.tsx.
  const thumb =
    p.heroMedia && !p.heroMedia.mime.startsWith("video/")
      ? p.heroMedia.url
      : `https://picsum.photos/seed/pixellwave-${p.id}-hero/400/300?grayscale`

  return { ...p, hero, gallery, thumb }
}
```

- [ ] **Step 4: Replace the `useMemo` that finds `project`/`nextProject`**

Change:
```tsx
export function ProjectPage() {
  const { slug } = useParams<{ slug: string }>()

  const { project, nextProject } = useMemo(() => {
    const index = PROJECTS_WITH_MEDIA.findIndex((p) => p.slug === slug)
    if (index === -1) return { project: undefined, nextProject: undefined }
    return {
      project: PROJECTS_WITH_MEDIA[index],
      nextProject: PROJECTS_WITH_MEDIA[(index + 1) % PROJECTS_WITH_MEDIA.length],
    }
  }, [slug])
```

to:

```tsx
export function ProjectPage() {
  const { slug } = useParams<{ slug: string }>()
  const projects = useProjects()

  const { project, nextProject } = useMemo(() => {
    const index = projects.findIndex((p) => p.slug === slug)
    if (index === -1) return { project: undefined, nextProject: undefined }
    return {
      project: withMedia(projects[index]),
      nextProject: withMedia(projects[(index + 1) % projects.length]),
    }
  }, [projects, slug])
```

Nothing else in the function body changes — `project`/`nextProject` keep
the exact same `ProjectWithMedia` shape (`title`, `desc`, `year`, `slug`,
`hero`, `gallery`, `thumb`) the rest of the component (the pinned video
section, the gallery marquee, the next-project card, the "not found"
state) already consumes.

- [ ] **Step 5: Delete `src/data/work.ts`**

```bash
rm src/data/work.ts
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc -b`
Expected: no output, exit code 0. (This also confirms nothing else in the
codebase still references `@/data/work` — a stale import would fail here.)

Run: `npm run lint`
Expected: no errors for `src/pages/ProjectPage.tsx`.

Run: `grep -rln "data/work" src/`
Expected: no output (the file and every reference to it are gone).

- [ ] **Step 7: Live-verify a project detail page**

Navigate to `/work/northwind` (the first seeded project by `order`).

Check via `read_page`/`javascript_tool`:
- `document.querySelector(".project-page__title")?.textContent` → `"Northwind"`.
- `document.querySelector(".secbody")?.textContent` → `"Identity and site for a renewable-energy startup."`.
- The hero renders as an `<img>` (not `<video>`) — confirms the
  hardcoded Northwind-video override is really gone and the Picsum
  fallback is in effect, since Strapi's `heroMedia` for Northwind is
  still empty at this point:
  ```js
  document.querySelector(".project-video-media")?.tagName
  ```
  Expected: `"IMG"`.
- `document.querySelectorAll(".project-gallery__item img").length` is
  `16` (8 unique Picsum fallback images × 2, doubled for the marquee loop
  — same as today).
- The "next project" link at the bottom points at `/work/tidal-commerce`
  (the second seeded project by `order`):
  ```js
  document.querySelector(".project-next")?.getAttribute("href")
  ```

Then navigate to a nonsense slug, e.g. `/work/does-not-exist`, and
confirm the "Project not found" state still renders (`document.querySelector(".project-page__not-found")`
exists, or check for the "Project not found." text) once the fetch
resolves — allow a brief wait after navigation before checking, since
this state is now reached after an async fetch rather than
synchronously.

Confirm no console errors on both pages.

- [ ] **Step 8: Commit**

```bash
git add src/pages/ProjectPage.tsx
git rm src/data/work.ts
git commit -m "Wire ProjectPage.tsx to fetch from Strapi; delete src/data/work.ts

Northwind's hardcoded video-hero override is removed — hero media now
comes entirely from Strapi's heroMedia field, which is currently empty
for every project (including Northwind), so /work/northwind temporarily
shows the same Picsum fallback as every other project until a real video
is uploaded to its heroMedia in Strapi. This is expected, not a
regression — see the approved design spec.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
