# Strapi CMS scaffold — design spec

**Date:** 2026-09-01
**Status:** Approved, pending implementation

## Summary

This is sub-project 1 of a 3-part effort to move project-page and Studio
team-photo content from this site's hardcoded `src/data/*.ts` files into a
Strapi CMS, so non-developers can edit that content without a code deploy.
This sub-project only stands up the CMS itself — a new, separate Strapi
project (its own repo, its own git history), with two content-types
(`Project`, `Team Member`) defined and seeded with today's text content.
No frontend code in this repository changes yet.

- **Sub-project 1 (this spec):** Strapi scaffold + content-types + seed data.
- **Sub-project 2 (next):** Wire `WorkPage.tsx`/`ProjectPage.tsx`/`Work.tsx` to fetch Projects from Strapi instead of `src/data/work.ts`.
- **Sub-project 3 (last):** Wire `StudioTeam.tsx` to fetch Team Members from Strapi instead of `src/data/team.ts`.

## Decisions from brainstorming

- **Hosting:** Strapi Cloud (managed, no server to maintain).
- **Repo structure:** a completely separate git repository from this site — decoupled deploy lifecycles, this site only ever holds an API URL (and, once sub-projects 2/3 land, a public read token if one turns out to be needed).
- **Starting point:** from scratch — no existing Strapi project/account.
- **Content scope:** "everything" for both content-types — title/description/client/year/tags for Projects, name/role for Team Members, not just their images. `src/data/work.ts` and `src/data/team.ts` are fully retired once sub-projects 2 and 3 land (not touched by this sub-project itself).

## Where it lives

A new Strapi project, TypeScript template (matching this codebase's stack),
scaffolded as a sibling folder next to this site:

```
/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms
```

Created via:

```bash
npx create-strapi-app@latest pixelwave-cms --typescript --no-run
```

(`--no-run` so the interactive setup wizard doesn't try to open a browser
mid-script; started manually afterward with `npm run develop`.) Local
development uses Strapi's default SQLite database — no separate database
server to install. `git init` + an initial commit happens in this new
folder once the scaffold completes, kept entirely separate from this
site's own git history.

**Manual steps that need your account/browser, not something I can do from
here:** creating a Strapi Cloud account, pushing `pixelwave-cms` to a new
GitHub repo, connecting that repo to a new Strapi Cloud project, and
deploying it. I'll hand you the exact sequence once the local scaffold and
content-types are working, rather than guessing at Strapi Cloud's current
UI flow sight-unseen.

## Content-Types

Both are Strapi **Collection Types**, created through the admin panel's
Content-Type Builder (`http://localhost:1337/admin` once running).

### `Project`

| Field | Type | Notes |
|---|---|---|
| `title` | Text (short) | Required |
| `slug` | UID | Attached to `title`, generates the `/work/:slug` route segment |
| `description` | Text (long) | Replaces `desc` |
| `client` | Text (short) | |
| `year` | Number (integer) | |
| `order` | Number (integer) | Explicit display order, replaces today's `idx` string ("01", "02", ...) |
| `tags` | Component (repeatable) | New component `project.tag`: `label` (Text, short) + `highlighted` (Boolean). Replaces the `[TagVariant, string]` tuples — `highlighted: true` is today's `"orange"` variant, `false` is today's `""` |
| `heroMedia` | Media (single) | Images **and** video allowed (Northwind's hero is a video; every other project's is an image) — the frontend (sub-project 2) picks `<img>` vs `<video>` from the uploaded file's mime type |
| `galleryImages` | Media (multiple) | Images only |

### `Team Member`

| Field | Type | Notes |
|---|---|---|
| `name` | Text (short) | Required |
| `role` | Text (short) | |
| `order` | Number (integer) | Explicit display order, replaces today's array-position ordering in `TEAM` |
| `photo` | Media (single) | Images only |
| `photoHover` | Media (single) | Images only — the hover-swap image `StudioTeam.tsx` already shows on `:hover` |

Per-card color-block assignment (orange/neutral/white cycling in
`StudioTeam.tsx`'s `CARD_COLORS`) stays frontend-only — it's a visual
rhythm decision, not editorial content, and isn't part of either
content-type.

## Access

Settings → Users & Permissions → Roles → **Public** → enable `find` and
`findOne` for both `Project` and `Team Member`. Read-only, no
authentication needed from the frontend — standard for public marketing
content with no login flow anywhere on this site. No role is granted
create/update/delete; all edits happen through the Strapi admin panel
itself, logged in as an actual editor.

## Seeding

Once the local Strapi instance is running with both content-types created,
a one-off Node script (`pixelwave-cms/scripts/seed.ts`, deleted or kept as
a reference after running once — not a repeated migration) reads this
site's current `PROJECTS` array (`src/data/work.ts`) and `TEAM` array
(`src/data/team.ts`) and `POST`s one Strapi entry per item to
`http://localhost:1337/api/projects` and `http://localhost:1337/api/team-members`,
using a generated Strapi API token (created via Settings → API Tokens,
"Full access", used only locally for this one-time seed and not committed
anywhere).

Tag tuples become `tags: [{ label, highlighted: variant === "orange" }, ...]`.
Media fields (`heroMedia`, `galleryImages`, `photo`, `photoHover`) are left
**empty** by the seed script — today's Picsum placeholder URLs aren't real
content worth carrying into the CMS; real photography gets uploaded by
hand through the Strapi admin once it exists.

## Out of scope (for this sub-project)

- Any change to this site's own source code — `WorkPage.tsx`,
  `ProjectPage.tsx`, `Work.tsx`, `Header.tsx`, `StudioTeam.tsx`, and
  `src/data/work.ts`/`src/data/team.ts` are all untouched until
  sub-projects 2 and 3.
- Connecting to Strapi Cloud, or any production deployment — this sub-project
  only gets a local Strapi instance running with schemas + seed data.
  Cloud connection is a manual, guided step once this works locally.
- Uploading real photography — media fields stay empty, to be filled in
  by hand later.
