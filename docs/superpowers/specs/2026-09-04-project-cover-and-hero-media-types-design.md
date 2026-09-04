# Project Cover & Hero Media Types — Design

**Status:** Approved
**Builds on** the `Project` content-type from Project Pages Strapi
Integration (`docs/superpowers/specs/2026-09-02-project-pages-strapi-integration-design.md`).
Not a continuation of the four-part Strapi CMS integration effort that
concluded with Client Logos — that effort is done; this is a new,
independent enhancement to the existing `Project` content-type.

## Goal

Give editors two things the current `Project` content-type can't do:

1. A dedicated **cover/thumbnail image**, separate from `heroMedia`, so the
   `/work` grid card always has an editor-chosen still image to show — even
   when a project's hero is a video (today it falls back to a random
   Picsum placeholder in that case).
2. The ability to make a project's **hero media a YouTube video** instead of
   only an uploaded image or video file.

## Current state

- `Project`'s `heroMedia` is a single Strapi media field (images or videos
  allowed). `src/pages/ProjectPage.tsx`'s `withMedia()` builds a `MediaItem
  { type: "image" | "video"; src }` from it, inferring `type` from the
  upload's mime type.
- `ProjectMedia` (`src/pages/ProjectPage.tsx`) renders `<video autoPlay loop
  muted playsInline>` or `<img>` based on that `type`. It's used inside
  `ProjectVideoPinned` (desktop: a scroll-pinned section, sticky in place
  for `VIDEO_PIN_HEIGHT_VH` of scroll) and `ProjectVideoAmbient`
  (mobile/tablet: plain flow, no pin) — see `ProjectVideo`'s
  desktop/mobile switch.
- `src/pages/WorkPage.tsx`'s `gridThumbUrl(p)` shows `p.heroMedia.url` only
  if it's *not* a video (mime check), else a Picsum placeholder.
  `ProjectPage.tsx`'s own `thumb` field (the "next project" teaser image)
  uses the identical fallback.
- No YouTube support anywhere today.

## Decisions

1. **`cover` is a new, separate field** (media, images only) — not reused
   from `heroMedia` and not video/YouTube-capable, since it's only ever a
   static thumbnail.
2. **`heroMediaType`** (enum: `image` / `video` / `youtube`) is the single
   source of truth for how `heroMedia`/the new YouTube field are
   interpreted — not re-inferred from mime type once YouTube exists,
   since a YouTube entry has no upload to infer from.
3. **`heroMediaYoutubeUrl`** (plain text) holds a normal pasted YouTube URL
   (`youtube.com/watch?v=...`, `youtu.be/...`, or an embed URL) — parsed
   into a video ID on the frontend, not pre-formatted by the editor.
4. **YouTube hero media gets the same scroll-pin treatment** as image/video
   (`ProjectVideoPinned`/`Ambient` unchanged in structure) — rendered as a
   chromeless `<iframe>` with best-effort autoplay/loop/mute via YouTube's
   own embed parameters. This is *not* scroll-scrubbable the way a real
   `<video>` element is — accepted trade-off, disclosed and chosen over a
   simpler unpinned embed.
5. **Existing projects are backfilled**, not left blank: `heroMediaType` is
   set to match each project's current `heroMedia` mime type (`image` or
   `video`) so nothing changes visually for any project that exists today.
   `cover` is *not* backfilled — it doesn't need to be, since the fallback
   chain below already covers an empty `cover`.
6. **Grid-thumbnail fallback chain:** `cover` → `heroMedia` (only when
   `heroMediaType === "image"`) → Picsum placeholder. Same chain for
   `ProjectPage.tsx`'s `thumb` (next-project teaser).
7. **Malformed/unparseable YouTube URL fails soft** to the placeholder
   image, same convention as every other empty/broken Strapi media field
   on this site — no error UI.

## Content-type: `Project` (additions only)

| Field | Type | Notes |
|---|---|---|
| `cover` | media (single image) | New. Empty → falls back per decision 6. |
| `heroMediaType` | enumeration: `image`, `video`, `youtube` | New. Backfilled for existing projects (decision 5). |
| `heroMediaYoutubeUrl` | string | New. Only meaningful when `heroMediaType === "youtube"`. |

`heroMedia` and `galleryImages` are unchanged.

## Backend (`pixelwave-cms` repo)

- `src/api/project/content-types/project/schema.json` — add the three
  fields above to `attributes`.
- Regenerated `types/generated/contentTypes.d.ts` (automatic on Strapi's
  dev-server restart, as with every prior schema change this project has
  made).
- A temporary, uncommitted backfill script (same pattern as
  `bodyDescription`'s backfill earlier): for every existing project,
  `data.heroMediaType = heroMedia && heroMedia.mime.startsWith("video/") ?
  "video" : "image"`, via the document service, `status: 'published'`.
  Deleted once run.
- `scripts/seed.ts`'s `PROJECTS` array: add `heroMediaType: 'image'` (or
  `'video'` for entries that currently seed a video, if any do) to each
  entry, for future fresh seeds. `cover`/`heroMediaYoutubeUrl` are not
  seeded — no placeholder cover image is meaningfully better than falling
  back to the existing Picsum thumb, and no sample project needs to launch
  with a fake YouTube link.

## Frontend (`000_sito` repo)

- **`src/lib/strapi.ts`**:
  - `Project` interface: add `cover: StrapiMedia | null`, `heroMediaType:
    "image" | "video" | "youtube"`, `heroYoutubeUrl: string | null`.
  - `StrapiProjectRaw`: add matching raw fields (`cover`, `heroMediaType`,
    `heroMediaYoutubeUrl`).
  - `mapProject`: map the three through — `cover` and `heroMediaType`
    keep their names, `raw.heroMediaYoutubeUrl` maps to `heroYoutubeUrl`
    (shortened, same convention as `description`→`desc`). `heroMediaType`
    defaults to `"image"` if the field is ever unexpectedly empty (defensive — should
    not happen post-backfill).
  - `fetchProjects()`'s `populate` param gains `cover` (media fields need
    explicit populating in Strapi's REST API, unlike plain scalar fields).
- **`src/pages/ProjectPage.tsx`**:
  - `MediaItem` becomes a discriminated union: `{ type: "image"; src:
    string } | { type: "video"; src: string } | { type: "youtube"; videoId:
    string }`.
  - New helper `parseYoutubeId(url: string): string | null` — handles
    `watch?v=`, `youtu.be/`, and `/embed/` URL shapes via regex. Returns
    `null` on anything unparseable.
  - `withMedia()`: builds `hero` by switching on `p.heroMediaType`:
    `"youtube"` → parse `p.heroYoutubeUrl`; a `null` parse falls back to
    today's placeholder-image object (decision 7). `"video"`/`"image"` →
    unchanged existing logic (`p.heroMedia`-based).
  - `thumb` (next-project teaser): apply the decision-6 fallback chain
    (`p.cover` → `p.heroMedia` if `heroMediaType === "image"` →
    placeholder), replacing today's mime-check-only logic.
  - `ProjectMedia`: add a third branch — `type === "youtube"` renders
    `<iframe className="project-video-media" src={
    \`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&playsinline=1\`
    } allow="autoplay" />`. `playlist={videoId}` is the documented trick
    that makes a *single* video loop via the embed player. No changes to
    `ProjectVideoPinned`/`ProjectVideoAmbient`/`ProjectVideo` — they already
    just pass `media` through.
- **`src/pages/WorkPage.tsx`**:
  - `gridThumbUrl(p)`: apply the decision-6 fallback chain (`p.cover` →
    `p.heroMedia` if `p.heroMediaType === "image"` → placeholder),
    replacing today's mime-check-only logic.

## Error handling

- Unparseable/empty `heroYoutubeUrl` when `heroMediaType === "youtube"` →
  placeholder image, no error UI (decision 7).
- Empty `cover` → falls back per decision 6, not a blank thumbnail.
- Fetch failure at the `fetchProjects()` level is unchanged — already
  fails silent to `[]`, same as every other Strapi-backed list on the site.

## Testing / verification

- `npx tsc --noEmit` clean in `000_sito` after every file change.
- Live-verify each of the three `heroMediaType` values on one real test
  project (temporary set-then-revert script against the document service,
  same approach used to verify `bodyDescription`'s independence earlier):
  confirm the hero renders correctly for all three (image, video, YouTube
  iframe with autoplay/loop/mute), and that the desktop scroll-pin still
  holds for all three.
- Live-verify the grid-thumbnail fallback chain: a project with `cover`
  set shows it; a project without `cover` but with an image `heroMedia`
  falls back to that; a project with neither shows the placeholder.
- Confirm backfilled `heroMediaType` values via a live `curl` against the
  real Strapi API (never assume — this dev database has drifted from
  `seed.ts` before), matching each project's actual current `heroMedia`
  mime type.
