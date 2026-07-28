# Project Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one shared `/work/:slug` page template, reused for every project, with a media hero, credits bar, an opposite-direction auto-scrolling gallery, and a next-project footer link — then point the existing project cards at it.

**Architecture:** A single new page component (`src/pages/ProjectPage.tsx`) looks up its project from the existing `PROJECTS` array by slug and renders four stacked sections. Placeholder media (Picsum-seeded images, one video demo) is derived at the component's module scope, never stored in the data file, matching the codebase's existing placeholder-photography convention. No test framework exists in this project — verification is `npx tsc -b` (typecheck), `npm run lint` (oxlint), and live checks against the Vite dev server.

**Tech Stack:** React 19, TypeScript, React Router 7, Framer Motion (`Reveal`/`RevealGroup`/`RevealItem` from `src/components/motion/Reveal.tsx`), Tailwind v4 + hand-written CSS in `src/index.css`, Lucide icons.

## Global Constraints

- No test framework in this project — every task's "run the tests" step is `npx tsc -b` + `npm run lint`, plus a manual check against the dev server (`npm run dev`, already running at `http://localhost:5173` in this environment via the Browser pane's `preview_start`/`preview_list` tools — reuse the existing `pixellwave-dev` server, don't start a second one).
- Placeholder media URLs are derived via `.map()` at the consuming component's own module scope, never stored in `src/data/work.ts` — see `src/components/sections/Work.tsx`'s `GALLERY_ITEMS` and `src/components/sections/StudioTeam.tsx`'s `TEAM_WITH_PHOTOS` for the exact established pattern.
- `.wrap` (defined in `src/index.css`) has no `max-width` — it's full-bleed with just responsive side padding (`clamp(1.25rem, 2.5vw, 4rem)` each side). Combining it with another class on the same element (e.g. `className="project-next wrap"`) is the established way to get "full-width bar, padded content" in one element — see `Header.tsx`'s `"wrap nav__inner"`.
- Marquee/auto-scroll rows for the gallery are hand-written CSS keyframes local to this feature, not a reuse of `src/components/motion/Marquee.tsx` (that component drives its animation via Framer Motion's `animate` prop with no hover-pause and no `prefers-reduced-motion` handling — both of which this feature requires, per the approved spec).
- Dark-page convention: `data-theme="dark"` on the page's `<main>`, matching `StudioPage.tsx`/`ContactPage.tsx`.
- Use `EASE_WAVE` from `@/lib/motion` for any new Framer Motion transitions (none needed here beyond the existing `Reveal`/`RevealGroup`/`RevealItem` primitives, which already use it internally).
- Spec: `docs/superpowers/specs/2026-07-21-project-detail-page-design.md`.

---

## Task 1: Data model — slug, client, year

**Files:**
- Modify: `src/data/work.ts` (entire file — every one of the 10 `PROJECTS` entries gets two new fields, plus the `Project` interface)

**Interfaces:**
- Produces: `Project` interface gains `slug: string`, `client: string`, `year: number`. These three fields are consumed by Task 2's `ProjectPage.tsx` (via `PROJECTS`) and Task 5's `Work.tsx`/`WorkPage.tsx` (via `slug` only, for the `href`).

- [ ] **Step 1: Add the new fields to the `Project` interface and all 10 entries**

Replace the full contents of `src/data/work.ts` with:

```ts
export type TagVariant = "orange" | ""

export interface Project {
  id: string
  idx: string
  slug: string
  title: string
  desc: string
  client: string
  year: number
  tags: [TagVariant, string][]
}

// Temporary placeholder roster — swap in real client work as it's ready.
export const PROJECTS: Project[] = [
  {
    id: "pw-w1",
    idx: "01",
    slug: "northwind",
    title: "Northwind",
    desc: "Identity and site for a renewable-energy startup.",
    client: "Northwind Energy",
    year: 2025,
    tags: [
      ["orange", "Featured"],
      ["", "Web"],
      ["", "Brand"],
    ],
  },
  {
    id: "pw-w2",
    idx: "02",
    slug: "tidal-commerce",
    title: "Tidal Commerce",
    desc: "A storefront that moves — fluid product reveals.",
    client: "Tidal Commerce",
    year: 2025,
    tags: [
      ["", "Motion"],
      ["", "Dev"],
    ],
  },
  {
    id: "pw-w3",
    idx: "03",
    slug: "solstice",
    title: "Solstice",
    desc: "Editorial platform for a culture magazine.",
    client: "Solstice Magazine",
    year: 2024,
    tags: [
      ["", "Web"],
      ["", "CMS"],
    ],
  },
  {
    id: "pw-w4",
    idx: "04",
    slug: "meridian-bank",
    title: "Meridian Bank",
    desc: "Digital banking platform redesigned for clarity and trust.",
    client: "Meridian Bank",
    year: 2024,
    tags: [
      ["", "Web"],
      ["", "UX"],
    ],
  },
  {
    id: "pw-w5",
    idx: "05",
    slug: "glasswing",
    title: "Glasswing",
    desc: "Brand system and packaging for a specialty coffee roaster.",
    client: "Glasswing Coffee",
    year: 2023,
    tags: [
      ["orange", "Featured"],
      ["", "Brand"],
      ["", "Packaging"],
    ],
  },
  {
    id: "pw-w6",
    idx: "06",
    slug: "nightfall-records",
    title: "Nightfall Records",
    desc: "Motion-first site for an independent record label.",
    client: "Nightfall Records",
    year: 2023,
    tags: [
      ["", "Motion"],
      ["", "Web"],
    ],
  },
  {
    id: "pw-w7",
    idx: "07",
    slug: "arclight-studios",
    title: "Arclight Studios",
    desc: "Portfolio and booking platform for a film production house.",
    client: "Arclight Studios",
    year: 2022,
    tags: [
      ["", "Web"],
      ["", "Dev"],
    ],
  },
  {
    id: "pw-w8",
    idx: "08",
    slug: "halcyon-health",
    title: "Halcyon Health",
    desc: "Telehealth product design and front-end build.",
    client: "Halcyon Health",
    year: 2022,
    tags: [
      ["", "UX"],
      ["", "Dev"],
    ],
  },
  {
    id: "pw-w9",
    idx: "09",
    slug: "driftwood-market",
    title: "Driftwood Market",
    desc: "E-commerce experience for a coastal home goods brand.",
    client: "Driftwood Market",
    year: 2021,
    tags: [
      ["orange", "Featured"],
      ["", "Web"],
      ["", "CMS"],
    ],
  },
  {
    id: "pw-w10",
    idx: "10",
    slug: "vantage-analytics",
    title: "Vantage Analytics",
    desc: "Data dashboard design system for an enterprise SaaS.",
    client: "Vantage Analytics",
    year: 2021,
    tags: [
      ["", "UX"],
      ["", "Design System"],
    ],
  },
]
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors. (`Work.tsx`/`WorkPage.tsx` don't reference the new fields yet, so nothing else can break here.)

- [ ] **Step 3: Confirm all 10 slugs are unique**

Run: `grep -o 'slug: "[a-z-]*"' src/data/work.ts | sort | uniq -d`
Expected: no output (empty = no duplicates). If anything prints, two projects share a slug — fix before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/data/work.ts
git commit -m "Add slug, client, and year fields to project data"
```

---

## Task 2: ProjectPage — routing, media derivation, hero, title, credits bar, intro

**Files:**
- Create: `src/pages/ProjectPage.tsx`
- Modify: `src/App.tsx` (add the route)
- Modify: `src/index.css` (append new rules — exact insertion point given in Step 3)

**Interfaces:**
- Consumes: `PROJECTS` and `Project` from `@/data/work` (Task 1's shape); `Reveal` from `@/components/motion/Reveal`; `SectionLabel` from `@/components/pw/SectionLabel`; `Footer` from `@/components/sections/Footer`.
- Produces: `ProjectPage` (default export from the page, named export `ProjectPage` used in `App.tsx`); the module-scope `MediaItem` type (`{ type: "image" | "video"; src: string }`) and `PROJECTS_WITH_MEDIA` array, both consumed by Task 3 and Task 4 (same file, so no import needed — just don't rename them).

- [ ] **Step 1: Create the page**

Create `src/pages/ProjectPage.tsx`:

```tsx
import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { Reveal } from "@/components/motion/Reveal"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Footer } from "@/components/sections/Footer"
import { PROJECTS, type Project } from "@/data/work"

interface MediaItem {
  type: "image" | "video"
  src: string
}

interface ProjectWithMedia extends Project {
  hero: MediaItem
  gallery: MediaItem[]
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
}))

// Northwind demos the video-hero path with the existing studio.mp4 asset —
// every other project stays image-only until real footage exists.
const northwindEntry = PROJECTS_WITH_MEDIA.find((p) => p.slug === "northwind")
if (northwindEntry) northwindEntry.hero = { type: "video", src: "/video/studio.mp4" }

// "Featured" is a highlight badge, not a service — excluded from the credits
// bar's Role column, same exclusion WorkPage.tsx applies to its filter row.
function roleFor(project: ProjectWithMedia): string {
  return project.tags
    .filter(([, label]) => label !== "Featured")
    .map(([, label]) => label)
    .join(", ")
}

function HeroMedia({ media, title }: { media: MediaItem; title: string }) {
  if (media.type === "video") {
    return <video className="project-hero__media" src={media.src} autoPlay loop muted playsInline />
  }
  return <img className="project-hero__media" src={media.src} alt={title} />
}

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

  if (!project || !nextProject) {
    return (
      <main className="project-page" data-theme="dark">
        <div className="wrap" style={{ paddingBlock: "8rem" }}>
          <p className="lead">Project not found.</p>
          <Link to="/work">Back to all projects →</Link>
        </div>
      </main>
    )
  }

  return (
    <>
      <main className="project-page" data-theme="dark">
        <div className="project-hero" data-screen-label="Project Hero">
          <HeroMedia media={project.hero} title={project.title} />
        </div>

        <div className="wrap">
          <Reveal>
            <SectionLabel number={project.idx}>{roleFor(project)}</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="project-page__title">{project.title}</h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="secbody">{project.desc}</p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="project-credits">
              <div className="project-credits__item">
                <span className="project-credits__label">Client</span>
                {project.client}
              </div>
              <div className="project-credits__item">
                <span className="project-credits__label">Year</span>
                {project.year}
              </div>
              <div className="project-credits__item">
                <span className="project-credits__label">Role</span>
                {roleFor(project)}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="secbody">{project.desc}</p>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  )
}
```

(The gallery and next-project sections are added inside `<main>`, after the `.wrap` div and before `</main>`, in Tasks 3 and 4 — this step intentionally builds and verifies the page without them first.)

- [ ] **Step 2: Wire the route**

In `src/App.tsx`, add the import and route:

```tsx
import { Route, Routes } from "react-router-dom"
import { ScrollProgress } from "@/components/ScrollProgress"
import { ScrollToTop } from "@/components/ScrollToTop"
import { CustomCursor } from "@/components/motion/CustomCursor"
import { Header } from "@/components/sections/Header"
import { HomePage } from "@/pages/HomePage"
import { WorkPage } from "@/pages/WorkPage"
import { ProjectPage } from "@/pages/ProjectPage"
import { StudioPage } from "@/pages/StudioPage"
import { ContactPage } from "@/pages/ContactPage"

function App() {
  return (
    <>
      <ScrollToTop />
      <CustomCursor />
      <ScrollProgress />
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/work" element={<WorkPage />} />
        <Route path="/work/:slug" element={<ProjectPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </>
  )
}

export default App
```

- [ ] **Step 3: Add CSS**

In `src/index.css`, find this existing rule (the last one in the Work-page/work-grid section):

```css
.work-grid .work__view {
  margin-top: 0; background: var(--pw-black); color: var(--pw-white);
  padding: 0.5rem 0.9rem;
}
```

It's immediately followed by a blank line and then a comment starting `/* video-scrub+carousel pin`. Insert the new rules below on that blank line, before the `/* video-scrub+carousel pin` comment:

```css
/* project detail page */
.project-page { padding-top: 0; }
.project-hero { position: relative; height: 50svh; overflow: hidden; background: var(--pw-neutral-10); }
.project-hero__media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

.project-page__title {
  font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em;
  font-size: clamp(2.5rem, 5vw, 5rem); line-height: 1.05; margin: 0.5rem 0 0;
}

.project-credits {
  display: flex; flex-wrap: wrap; gap: clamp(2rem, 4vw, 3.5rem);
  padding: clamp(1.25rem, 2vw, 1.75rem) 0; margin-top: clamp(2rem, 3vw, 3rem);
  border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);
  font-size: 0.95rem;
}
.project-credits__label {
  display: block; font-family: var(--font-mono-accent); font-size: 0.7rem;
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 0.35rem;
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Verify live in the browser**

The dev server is already running (`pixellwave-dev`, port 5173 — check with the Browser pane's `preview_list` tool; if it's not running, start it with `preview_start` using `{name: "pixellwave-dev"}`).

1. Navigate to `http://localhost:5173/work/northwind` (use a full reload / `window.location.href` assignment rather than the `navigate` tool's path-based nav, which is flaky for same-origin SPA routes in this environment — or click through the real UI: open the menu → Work → click a project card, once Task 5 wires real hrefs. For now, since cards still point at the placeholder, use a direct reload.)
2. Confirm: a video is playing in the hero area (Northwind is the video-hero project), the title "Northwind" appears below it, the one-liner description appears once, then a credits bar reading Client "Northwind Energy" / Year "2025" / Role "Web, Brand", then the description again.
3. Reload at `http://localhost:5173/work/tidal-commerce` — confirm the hero shows a static placeholder image (not video) this time, and credits show "Tidal Commerce" / 2025 / "Motion, Dev".
4. Reload at `http://localhost:5173/work/not-a-real-slug` — confirm the "Project not found." fallback renders instead of a crash.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProjectPage.tsx src/App.tsx src/index.css
git commit -m "Add project detail page: routing, hero, title, credits bar"
```

---

## Task 3: Gallery — opposite-direction auto-scrolling marquee

**Files:**
- Modify: `src/pages/ProjectPage.tsx` (add the `GalleryRow` helper component and render it in the page)
- Modify: `src/index.css` (append gallery rules)

**Interfaces:**
- Consumes: `MediaItem`, `ProjectWithMedia`, `project.gallery` — all from Task 2, same file.
- Produces: nothing new consumed by later tasks (Task 4 doesn't touch the gallery).

- [ ] **Step 1: Add the `GalleryRow` helper and imports**

In `src/pages/ProjectPage.tsx`, change the top import line:

```tsx
import { Reveal } from "@/components/motion/Reveal"
```

to:

```tsx
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
```

Then add this new function, placed right after `HeroMedia` (before `export function ProjectPage()`):

```tsx
function GalleryRow({ items, reverse }: { items: MediaItem[]; reverse: boolean }) {
  // Duplicated once so the CSS animation can translate exactly -50% and loop
  // seamlessly — same technique as Marquee.tsx, just plain CSS here so we can
  // add hover-pause and a prefers-reduced-motion override (see index.css).
  const looped = [...items, ...items]
  return (
    <div className="project-gallery__row">
      <div className={`project-gallery__track${reverse ? " project-gallery__track--ltr" : ""}`}>
        {looped.map((item, i) => (
          <div className="project-gallery__item" key={i}>
            {item.type === "video" ? (
              <video src={item.src} autoPlay loop muted playsInline />
            ) : (
              <img src={item.src} alt="" loading="lazy" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Render the gallery**

In `src/pages/ProjectPage.tsx`, find the `</div>` that closes the `.wrap` div (right after the second `<Reveal delay={0.2}>` block), and insert the gallery immediately after it, still inside `<main>`:

```tsx
        </div>

        <RevealGroup className="project-gallery" stagger={0.1}>
          <RevealItem>
            <GalleryRow items={project.gallery.slice(0, 4)} reverse={false} />
          </RevealItem>
          <RevealItem>
            <GalleryRow items={project.gallery.slice(4, 8)} reverse={true} />
          </RevealItem>
        </RevealGroup>
      </main>
```

(The `</main>` here replaces whatever previously immediately followed the closing `.wrap` div's `</div>` — Task 2 left `</main>` right after it, so this just inserts the new block between them.)

- [ ] **Step 3: Add CSS**

In `src/index.css`, immediately after the `.project-credits__label` rule added in Task 2, append:

```css
.project-gallery { padding: clamp(2.5rem, 4vw, 4rem) 0; }
.project-gallery__row { overflow: hidden; margin-bottom: 0.875rem; }
.project-gallery__row:last-child { margin-bottom: 0; }
.project-gallery__track {
  display: flex; gap: 0.875rem; width: max-content;
  animation: project-gallery-rtl 34s linear infinite;
}
.project-gallery__track--ltr { animation-name: project-gallery-ltr; }
.project-gallery__track:hover { animation-play-state: paused; }
.project-gallery__item {
  height: clamp(180px, 22vw, 260px); width: clamp(260px, 30vw, 380px);
  flex-shrink: 0; border-radius: 2px; overflow: hidden;
}
.project-gallery__item img, .project-gallery__item video {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
@keyframes project-gallery-rtl { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes project-gallery-ltr { from { transform: translateX(-50%); } to { transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) {
  .project-gallery__track { animation: none; }
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Verify live in the browser**

Reload `http://localhost:5173/work/northwind`.

1. Confirm two rows of gallery images appear below the credits/intro, each showing 4 unique images repeating (8 unique seeds total across both rows, since Task 2's derivation makes 8 gallery items and Task 3 splits them 4/4 between the two rows).
2. Confirm the top row visibly drifts right-to-left and the bottom row drifts left-to-right (opposite directions).
3. Hover over a row and confirm it pauses; move the mouse away and confirm it resumes.
4. In the browser's dev tools (or via the Browser pane's `javascript_tool`), emulate `prefers-reduced-motion: reduce` and confirm the tracks stop animating entirely (a static single-row-width strip of images, no motion).

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProjectPage.tsx src/index.css
git commit -m "Add opposite-direction gallery marquee to project page"
```

---

## Task 4: Next-project footer

**Files:**
- Modify: `src/pages/ProjectPage.tsx` (add the closing next-project block)
- Modify: `src/index.css` (append next-project rules)

**Interfaces:**
- Consumes: `nextProject` (already computed in Task 2's `useMemo`, same file).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the `ArrowUpRight` import**

In `src/pages/ProjectPage.tsx`, add to the top imports:

```tsx
import { ArrowUpRight } from "lucide-react"
```

- [ ] **Step 2: Render the next-project link**

Find the `</RevealGroup>` that closes the gallery (added in Task 3), and insert the next-project block immediately after it, still inside `<main>`, before `</main>`:

```tsx
        </RevealGroup>

        <Reveal>
          <Link to={`/work/${nextProject.slug}`} className="project-next wrap">
            <div>
              <span className="project-next__label">Next project</span>
              <span className="project-next__title">
                {nextProject.title} <ArrowUpRight size={28} />
              </span>
            </div>
            <img
              className="project-next__thumb"
              src={`https://picsum.photos/seed/pixellwave-${nextProject.id}-hero/400/300?grayscale`}
              alt=""
            />
          </Link>
        </Reveal>
      </main>
```

The thumbnail always uses this dedicated Picsum derivation (not `nextProject.hero.src`) — that keeps it a plain static image even when the next project's actual hero is a video (Northwind's), since thumbnails don't need to represent video content.

- [ ] **Step 3: Add CSS**

In `src/index.css`, immediately after the `prefers-reduced-motion` block added in Task 3, append:

```css
.project-next {
  display: flex; align-items: center; justify-content: space-between; gap: 2rem;
  padding-block: clamp(1.75rem, 3vw, 2.5rem); border-top: 1px solid var(--border-subtle);
  text-decoration: none; color: inherit;
}
.project-next__label {
  display: block; font-family: var(--font-mono-accent); font-size: 0.7rem;
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 0.5rem;
}
.project-next__title {
  font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em;
  font-size: clamp(1.5rem, 3vw, 2.25rem); display: inline-flex; align-items: center; gap: 0.75rem;
}
.project-next__thumb {
  width: clamp(70px, 8vw, 110px); aspect-ratio: 4/3; object-fit: cover;
  border-radius: 2px; flex-shrink: 0;
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Verify live in the browser**

1. Reload `http://localhost:5173/work/northwind`. Confirm a footer bar appears below the gallery reading "Next project" / "Tidal Commerce →" with a small thumbnail image, above the site `Footer`.
2. Click it (or check its `href`) and confirm it navigates to `/work/tidal-commerce`.
3. Reload `http://localhost:5173/work/vantage-analytics` (the last project, idx 10) — confirm its "next project" wraps around to Northwind (`/work/northwind`), not a broken link.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProjectPage.tsx src/index.css
git commit -m "Add next-project footer link to project page"
```

---

## Task 5: Wire real project links

**Files:**
- Modify: `src/components/sections/Work.tsx:87` (homepage carousel card)
- Modify: `src/pages/WorkPage.tsx:90` (`/work` listing card)

**Interfaces:**
- Consumes: `project.slug` (`w.slug` in `Work.tsx`, `p.slug` in `WorkPage.tsx`) — both already have `w`/`p` as the loop variable of type `Project`, from Task 1's shape.

- [ ] **Step 1: Update the homepage carousel card**

In `src/components/sections/Work.tsx`, inside `WorkTrack`, change:

```tsx
            title={w.title}
            description={w.desc}
            href="/work"
          >
```

to:

```tsx
            title={w.title}
            description={w.desc}
            href={`/work/${w.slug}`}
          >
```

- [ ] **Step 2: Update the `/work` listing card**

In `src/pages/WorkPage.tsx`, inside the `RevealGroup`/`RevealItem` map, change:

```tsx
                    title={p.title}
                    href="/work"
                  >
```

to:

```tsx
                    title={p.title}
                    href={`/work/${p.slug}`}
                  >
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Verify live in the browser**

1. Reload `http://localhost:5173/`, scroll to the homepage's Selected Work carousel, click a project card's "View project" — confirm it navigates to that project's real `/work/<slug>` detail page (not `/work`).
2. Reload `http://localhost:5173/work`, click a project card — confirm the same.
3. Click through the header menu → Work → a card, to confirm real client-side navigation (not just a direct URL load) lands correctly too, matching how this environment's `navigate` tool is known to be flaky for same-origin path changes.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Work.tsx src/pages/WorkPage.tsx
git commit -m "Point project cards at the real per-project detail page"
```

---

## Final Whole-Branch Review

After Task 5, do one pass over the full diff (`git diff main...HEAD` or equivalent) checking:

- Every one of the 10 projects has a working `/work/<slug>` page (spot-check at least 3, including the first and last for the next-project wraparound).
- The credits bar's Role column never shows "Featured" for the three projects that have it (Northwind, Glasswing, Driftwood Market).
- No leftover references to the old `href="/work"` placeholder in `Work.tsx` or `WorkPage.tsx`.
- `prefers-reduced-motion` genuinely stops the gallery animation (checked in Task 3, worth re-confirming once all pieces are in place).
