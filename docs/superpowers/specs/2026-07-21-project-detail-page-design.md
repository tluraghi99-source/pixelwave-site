# Project detail page — design

## Context

Every project card on the site — the homepage carousel (`Work.tsx`) and the `/work` listing (`WorkPage.tsx`) — has a "View project" link that currently points at the hardcoded placeholder `href="/work"`. There is no actual project detail page yet. The user wants one shared template, reused for every project in `PROJECTS`, showing photo/video media and text content.

Design was refined through several rounds of a live HTML mockup in the visual companion before settling on the layout below.

## Routing & data model

One new route, `/work/:slug`, rendering a single shared `ProjectPage.tsx` looked up from `PROJECTS` by slug.

`src/data/work.ts` gains three new fields per project (structural data only — no media URLs; see "Media" below for why):

```ts
export interface Project {
  id: string
  idx: string
  slug: string     // new — e.g. "northwind"; used in the URL instead of `id`
  title: string
  desc: string
  client: string    // new — credits bar
  year: number      // new — credits bar
  tags: [TagVariant, string][]
}
```

`slug` is a kebab-case version of each project's title, added by hand for all 10 existing entries (not derived at runtime — keeps URLs stable even if a title changes later).

## Media

Per the codebase's existing placeholder-photography convention (image URLs are never stored in a data file; they're derived via `.map()` at the consuming component's own module scope — see `Work.tsx`'s `GALLERY_ITEMS`, `StudioTeam.tsx`'s `TEAM_WITH_PHOTOS`), `ProjectPage.tsx` derives a `hero` and `gallery` for each project rather than storing them in `work.ts`:

```ts
interface MediaItem { type: "image" | "video"; src: string }

const PROJECTS_WITH_MEDIA = PROJECTS.map((p) => ({
  ...p,
  hero: { type: "image", src: `https://picsum.photos/seed/pixellwave-${p.id}-hero/1600/900?grayscale` } as MediaItem,
  gallery: Array.from({ length: 8 }, (_, i) => ({
    type: "image",
    src: `https://picsum.photos/seed/pixellwave-${p.id}-g${i}/900/700?grayscale`,
  })) as MediaItem[],
}))
// Northwind demos the video-hero path with the existing studio.mp4 asset —
// every other project stays image-only until real footage exists.
const northwind = PROJECTS_WITH_MEDIA.find((p) => p.slug === "northwind")
if (northwind) northwind.hero = { type: "video", src: "/video/studio.mp4" }
```

`ProjectPage`'s hero renders `<img>` or `<video autoPlay loop muted playsInline>` based on `hero.type`.

## Page layout

Four sections, top to bottom, all inside a `data-theme="dark"` page (matching Studio/Contact):

**1. Hero.** A plain full-bleed media block, `height: 50svh` — structurally identical to `WorkPage`'s `.work-hero` (same "content starts at the vertical midpoint" convention already used there and on `StudioIntro`), except the block is filled by the project's `hero` media instead of a `PixelTrail` effect. No text is overlaid on it.

Immediately below, starting right where the hero ends: the tag/index line (e.g. "01 — Web, Brand"), the project title (large display type, matching `.lead`/`StudioIntro` weight), and the one-line `desc`.

**2. Credits bar.** A bordered strip (top + bottom `1px solid` divider, matching the site's existing subtle-border convention) with three columns: Client, Year, Role — Role reuses the project's existing `tags`, excluding the `"Featured"` badge (same exclusion `WorkPage.tsx` already applies when building its filter list — `"Featured"` is a highlight, not a service). Below it, a short intro paragraph (reuses `desc` for now — there's no separate long-form body copy field; adding one is out of scope, see below).

**3. Gallery.** Two stacked rows of the `gallery` media items, each row an infinitely-looping, auto-scrolling horizontal marquee (own CSS keyframes, not a reuse of `TickerStrip`'s — that one only runs a single direction). The top row drifts right-to-left, the bottom row left-to-right, both at the same slow pace (~34s per loop cycle). `animation-play-state: paused` on `:hover`. Respects `prefers-reduced-motion` (animation disabled, same pattern as `.grain-overlay`).

**4. Next project.** A footer bar (top border) linking to the next project in `PROJECTS` array order (wrapping from the last project back to the first) — an uppercase "Next project" label, the next project's title in large bold type with an arrow, and a small thumbnail. The thumbnail always renders as a static placeholder image (same Picsum-seed derivation as the gallery), regardless of whether that project's actual hero is a video — thumbnails don't need to represent video content.

## Motion

Title/credits/intro/gallery/next-project all use the existing `Reveal`/`RevealGroup` viewport-trigger primitives for their entrance (this page isn't pinned or scroll-scrubbed — it's normal document flow, so no scroll-scrub machinery is needed here). The gallery's own perpetual auto-scroll is independent of that one-time reveal.

No separate mobile/desktop variant is needed — the marquee rows are a plain CSS animation that works the same at any viewport width, unlike the site's pinned scroll-scrub sections which need a `*Ambient` fallback.

## Integration changes

- `src/components/sections/Work.tsx` (homepage carousel) and `src/pages/WorkPage.tsx` (`/work` listing): change each card's hardcoded `href="/work"` to `` href={`/work/${project.slug}`} ``.
- `src/App.tsx`: add `<Route path="/work/:slug" element={<ProjectPage />} />`.

## Out of scope

- No separate long-form body-copy field — the intro paragraph reuses the existing short `desc`. Adding a dedicated case-study body field is a fast follow once real project write-ups exist.
- No "previous project" link, only "next" (wrapping) — matches what was actually discussed.
- No drag/swipe interaction on the gallery — it's a passive auto-scrolling marquee, not an interactive carousel like the homepage's `CircularGallery`.
- Live-URL credits field was considered and dropped (not selected during clarification).

## Files touched

- `src/data/work.ts` — add `slug`, `client`, `year` to all 10 projects.
- `src/pages/ProjectPage.tsx` — new. The shared template.
- `src/App.tsx` — add the `/work/:slug` route.
- `src/components/sections/Work.tsx`, `src/pages/WorkPage.tsx` — point card hrefs at the real slug-based URL.
- `src/index.css` — new rules for the hero block, credits bar, gallery marquee (rtl/ltr keyframes + reduced-motion override), and next-project footer.
