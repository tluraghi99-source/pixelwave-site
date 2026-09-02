# Strapi CMS Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a new, separate Strapi CMS project with `Project` and `Team Member` content-types, public read-only API access, and seed data matching this site's current `src/data/work.ts`/`src/data/team.ts` — ready for the frontend integration work that follows as separate sub-projects.

**Architecture:** A brand-new Strapi TypeScript project, scaffolded as a sibling directory to this site with its own independent git history — no code in this repository (`000_sito`) changes as part of this plan. Content-types are defined as code (schema/controller/service/route files) rather than clicked together in Strapi's admin UI, and public read permissions are granted via a `bootstrap()` lifecycle function rather than the admin UI's Roles screen — both choices avoid needing an authenticated admin session (creating that account, and logging into it, are manual steps for the human, documented at the end of this plan, not something an agentic worker should do itself). Seeding uses Strapi's programmatic/internal API directly (no HTTP round-trip, no API token needed).

**Tech Stack:** Strapi (latest, TypeScript template), Node.js, SQLite (Strapi's local-dev default — no separate database server). This plan targets a **different directory** than this site's repository: `/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms` (a sibling of `000_sito` under `00_pixel`). Every command below must run from that directory once it exists — quote the full path, it contains spaces.

## Global Constraints

- The new project is a fully separate git repository — never run `git add`/`git commit` for it from inside `000_sito`, and never let `000_sito`'s own git operations pick up files from the sibling directory.
- Content scope is "everything" for both content-types (title/description/client/year/tags for Project; name/role for Team Member — not just images), per the approved spec.
- Public role gets read-only access (`find`/`findOne`) to both content-types — no write access from outside the admin panel, ever.
- Media fields (`heroMedia`, `galleryImages`, `photo`, `photoHover`) are left **empty** by the seed script — do not carry over the Picsum placeholder URLs from this site's current data files as if they were real content.
- **Do not create the Strapi admin account, and do not log into the Strapi admin UI, at any point in this plan** — that is a manual step for the human (Task 5 documents exactly what to do). Every task's own verification must work by reading server logs, curling the public REST API, or running scripts — never by driving the browser-based admin panel as an authenticated user.
- This plan's exact CLI flags, file paths, and programmatic API calls are written from best current knowledge, but Strapi's tooling changes between versions and this plan was written without live access to its current docs. **Every task that assumes a specific flag, file path, or API name includes an explicit step to verify it against the actually-installed version before proceeding** — treat the verification step's real output as authoritative over this plan's prose whenever they disagree, and adjust the following steps accordingly (documenting what changed in that task's own notes, not silently).

---

### Task 1: Scaffold the Strapi project and initialize its own git repo

**Files:**
- Create: the entire `/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms/` directory tree (via the `create-strapi-app` CLI, not hand-written)

**Interfaces:**
- Produces: a runnable local Strapi instance at `http://localhost:1337`, and the directory itself, which every later task in this plan works inside.

- [ ] **Step 1: Confirm the parent directory and check nothing already exists there**

Run:
```bash
ls -la "/Volumes/ups tl/02 pixelwave/00_pixel/"
```
Expected: shows `000_sito` (this site) and confirms no `pixelwave-cms` directory already exists. If one does exist, stop and ask the human how to proceed rather than overwriting it.

- [ ] **Step 2: Check the actual current `create-strapi-app` CLI flags**

Run:
```bash
npx create-strapi-app@latest --help
```
Expected: a help listing of flags. Read it for the current equivalents of "use TypeScript," "don't start the dev server automatically afterward," and "skip the example/quickstart data seed" (names may differ from `--typescript`/`--no-run`/`--skip-cloud` — use whatever the real `--help` output shows). Note the exact flags you'll use in this task's own report before proceeding — this plan's Step 3 command is a best-effort guess, not gospel.

- [ ] **Step 3: Scaffold the project**

Run (adjusting flags per Step 2's actual `--help` output if they differ from this):
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/"
npx create-strapi-app@latest pixelwave-cms --typescript --no-run --skip-cloud
```
Expected: the command completes without error and creates `/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms/` containing at least `package.json`, `src/`, `config/`, `tsconfig.json`. If the command's interactive prompts can't be fully suppressed by flags, answer: TypeScript (yes), default/quickstart database (SQLite), skip Strapi Cloud login prompt if offered, skip example seed data if offered.

- [ ] **Step 4: Explore the actual scaffolded structure**

Run:
```bash
find "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms/src" -maxdepth 3 -type d
cat "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms/package.json"
```
Expected: shows the real `src/` layout (likely `src/api/`, `src/components/`, `src/extensions/`, `src/admin/`) and the Strapi version actually installed (check the `@strapi/strapi` dependency version — later tasks that guess at API names should sanity-check against this exact version's docs/changelog if something doesn't work as expected). Record the installed version in this task's report — later tasks reference it.

- [ ] **Step 5: Verify the dev server starts cleanly**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
npm run develop &
sleep 15
curl -sI http://localhost:1337/admin
kill %1
```
Expected: the `curl` returns an HTTP response (`200` or a redirect — anything but connection-refused) proving the server actually came up on port 1337. Do **not** open the admin URL in a browser or attempt to log in/register — this step only checks the port is listening.

- [ ] **Step 6: Initialize this new project's own git repo**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
git init
git add -A
git commit -m "Scaffold Strapi CMS project (TypeScript template)"
```
Expected: a fresh repo, one commit, `git log --oneline` in this directory shows exactly that one commit. Confirm you are NOT inside `000_sito`'s git repo: `git -C "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms" rev-parse --show-toplevel` must print the `pixelwave-cms` path, not `000_sito`.

- [ ] **Step 7: Report**

No further "commit" step in `000_sito` — this task's commit already happened inside `pixelwave-cms` in Step 6. Report the installed Strapi version, the actual `create-strapi-app` flags used, and confirmation of Step 6's repo-isolation check.

---

### Task 2: Define the Project and Team Member content-types as code

**Files (all inside `/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms/`):**
- Create: `src/api/project/content-types/project/schema.json`
- Create: `src/api/project/controllers/project.ts`
- Create: `src/api/project/services/project.ts`
- Create: `src/api/project/routes/project.ts`
- Create: `src/api/team-member/content-types/team-member/schema.json`
- Create: `src/api/team-member/controllers/team-member.ts`
- Create: `src/api/team-member/services/team-member.ts`
- Create: `src/api/team-member/routes/team-member.ts`
- Create: `src/components/project/tag.json`

**Interfaces:**
- Consumes: the exact `src/` layout confirmed in Task 1 Step 4 — if the real paths differ from the ones listed above (e.g. a `content-types`/`controllers`/`services`/`routes` naming or nesting difference in the installed version), use the real paths instead and note the difference in this task's report.
- Produces: two REST-exposed collection types, `api::project.project` and `api::team-member.team-member`, and a reusable component `project.tag` — these exact UIDs are what Task 3's bootstrap code and Task 4's seed script reference.

- [ ] **Step 1: Check for a generator that can scaffold the boilerplate**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
npx strapi generate --help
```
Expected: shows whether a `content-type` (or similarly named) generator exists for the installed version. If it does and supports non-interactive flags for field definitions, prefer it over hand-writing the files below — it produces the same result with less chance of a hand-typed structural mistake. If it's interactive-only or doesn't support this exact field set, fall back to hand-writing the files in the remaining steps.

- [ ] **Step 2: Create the `project.tag` component**

Create `src/components/project/tag.json`:
```json
{
  "collectionName": "components_project_tags",
  "info": {
    "displayName": "Tag",
    "icon": "tag"
  },
  "options": {},
  "attributes": {
    "label": {
      "type": "string",
      "required": true
    },
    "highlighted": {
      "type": "boolean",
      "default": false
    }
  }
}
```

- [ ] **Step 3: Create the `Project` content-type schema**

Create `src/api/project/content-types/project/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "projects",
  "info": {
    "singularName": "project",
    "pluralName": "projects",
    "displayName": "Project"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "title": {
      "type": "string",
      "required": true
    },
    "slug": {
      "type": "uid",
      "targetField": "title",
      "required": true
    },
    "description": {
      "type": "text"
    },
    "client": {
      "type": "string"
    },
    "year": {
      "type": "integer"
    },
    "order": {
      "type": "integer"
    },
    "tags": {
      "type": "component",
      "repeatable": true,
      "component": "project.tag"
    },
    "heroMedia": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images", "videos"]
    },
    "galleryImages": {
      "type": "media",
      "multiple": true,
      "allowedTypes": ["images"]
    }
  }
}
```

- [ ] **Step 4: Create the `Project` API's controller, service, and routes**

Create `src/api/project/controllers/project.ts`:
```ts
import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::project.project')
```

Create `src/api/project/services/project.ts`:
```ts
import { factories } from '@strapi/strapi'

export default factories.createCoreService('api::project.project')
```

Create `src/api/project/routes/project.ts`:
```ts
import { factories } from '@strapi/strapi'

export default factories.createCoreRouter('api::project.project')
```

- [ ] **Step 5: Create the `Team Member` content-type schema**

Create `src/api/team-member/content-types/team-member/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "team_members",
  "info": {
    "singularName": "team-member",
    "pluralName": "team-members",
    "displayName": "Team Member"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "role": {
      "type": "string"
    },
    "order": {
      "type": "integer"
    },
    "photo": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    },
    "photoHover": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    }
  }
}
```

- [ ] **Step 6: Create the `Team Member` API's controller, service, and routes**

Create `src/api/team-member/controllers/team-member.ts`:
```ts
import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::team-member.team-member')
```

Create `src/api/team-member/services/team-member.ts`:
```ts
import { factories } from '@strapi/strapi'

export default factories.createCoreService('api::team-member.team-member')
```

Create `src/api/team-member/routes/team-member.ts`:
```ts
import { factories } from '@strapi/strapi'

export default factories.createCoreRouter('api::team-member.team-member')
```

- [ ] **Step 7: Verify the content-types load without schema errors**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
npm run develop > /tmp/strapi-dev.log 2>&1 &
sleep 20
grep -i "error" /tmp/strapi-dev.log
curl -s http://localhost:1337/api/projects
curl -s http://localhost:1337/api/team-members
kill %1
```
Expected: `grep -i "error"` prints nothing (or nothing beyond expected startup noise — read whatever it prints carefully before treating it as pass/fail). Both `curl` calls return a `403 Forbidden` JSON body (e.g. `{"data":null,"error":{"status":403,...}}`) — that's the CORRECT and expected result at this point, since Task 3 hasn't granted public read access yet. A `403` proves the routes exist and are reachable; a `404` would mean the content-type didn't register and something in Steps 2-6 needs fixing.

- [ ] **Step 8: Commit inside pixelwave-cms**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
git add -A
git commit -m "Add Project and Team Member content-types"
```

---

### Task 3: Grant public read access via a bootstrap function

**Files (inside `pixelwave-cms/`):**
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `api::project.project` and `api::team-member.team-member` UIDs from Task 2.
- Produces: public, unauthenticated `GET /api/projects` and `GET /api/team-members` (and their `findOne` equivalents) returning `200` instead of `403`.

- [ ] **Step 1: Read the scaffolded `src/index.ts` to see the exact bootstrap function shape**

Run:
```bash
cat "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms/src/index.ts"
```
Expected: a file exporting an object with (at least) a `bootstrap({ strapi })` function, currently empty. If the actual exported shape differs from this (e.g. a different lifecycle hook name, or `register`/`destroy` also present), keep those untouched and only fill in `bootstrap`.

- [ ] **Step 2: Confirm the permissions-plugin service API for the installed version**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
find node_modules/@strapi/plugin-users-permissions -iname "*.js" | xargs grep -l "updatePermissions\|findRole\|public" 2>/dev/null | head -5
```
Expected: locates the actual service file(s) in the installed `users-permissions` plugin so you can confirm the real method names for "find the Public role" and "update its permissions" before writing code that calls them — the code in Step 3 is this plan's best-effort guess at the current v5 API shape, not a verified-correct API call. If the real method names differ, adjust Step 3's code to match what you actually find, and note the difference in this task's report.

- [ ] **Step 3: Write the bootstrap function**

In `src/index.ts`, fill in `bootstrap`:
```ts
export default {
  async bootstrap({ strapi }: { strapi: any }) {
    const publicRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } })

    if (!publicRole) return

    const actionsToEnable = [
      'api::project.project.find',
      'api::project.project.findOne',
      'api::team-member.team-member.find',
      'api::team-member.team-member.findOne',
    ]

    for (const action of actionsToEnable) {
      const existing = await strapi.query('plugin::users-permissions.permission').findOne({
        where: { action, role: publicRole.id },
      })
      if (!existing) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: { action, role: publicRole.id },
        })
      }
    }
  },
}
```
This queries the Public role and its permissions directly through Strapi's generic query layer (`strapi.query(...)`) rather than the plugin's own internal service — a more stable target across minor versions, but still verify against Step 2's findings if `plugin::users-permissions.permission`'s `action`/`role` field names turn out to differ in the installed version (read the plugin's own content-type schema, e.g. `node_modules/@strapi/plugin-users-permissions/server/content-types/permission/schema.js` or equivalent, to confirm).

- [ ] **Step 4: Verify public read access is granted**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
npm run develop > /tmp/strapi-dev.log 2>&1 &
sleep 20
curl -s http://localhost:1337/api/projects
curl -s http://localhost:1337/api/team-members
kill %1
```
Expected: both now return `200` with a body like `{"data":[],"meta":{"pagination":{...}}}` — empty arrays (no entries seeded yet), but no longer `403`. If still `403`, read `/tmp/strapi-dev.log` for bootstrap errors and fix Step 3's code before moving on — do not proceed to Task 4 with permissions still broken.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
git add -A
git commit -m "Grant public read access to Project and Team Member via bootstrap"
```

---

### Task 4: Seed Project and Team Member entries from this site's current data

**Files:**
- Create (inside `pixelwave-cms/`): `scripts/seed.ts`
- Read only (inside `000_sito/`, this site — do not modify): `src/data/work.ts`, `src/data/team.ts`

**Interfaces:**
- Consumes: `api::project.project` and `api::team-member.team-member` UIDs (Task 2), the now-working public API (Task 3, though this script uses Strapi's internal API directly, not HTTP).
- Produces: seeded rows visible via `GET /api/projects` and `GET /api/team-members`.

- [ ] **Step 1: Read this site's current data to transcribe it accurately**

Run:
```bash
cat "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito/src/data/work.ts"
cat "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito/src/data/team.ts"
```
Expected: the current `PROJECTS` and `TEAM` arrays. Transcribe their values exactly into Step 3's seed script below — if the content has changed since this plan was written, use what you actually read, not this plan's example values.

- [ ] **Step 2: Confirm the programmatic Strapi boot API for the installed version**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
find node_modules/@strapi/strapi -maxdepth 2 -iname "*.d.ts" | xargs grep -l "compile\|createStrapi\|export default" 2>/dev/null | head -5
cat node_modules/@strapi/strapi/package.json | grep '"main"\|"exports"'
```
Expected: locates how the installed `@strapi/strapi` package expects to be booted programmatically outside the `strapi start`/`strapi develop` CLI commands (the exact factory function name and whether it needs a preceding compile step). Use what you find here to fix up Step 3's script if its API guess is wrong for this version — this is exactly the kind of version-specific detail this plan cannot pin down without seeing the real install.

- [ ] **Step 3: Write the seed script**

Create `scripts/seed.ts` (adjust the boot/teardown calls per Step 2's findings if this guessed API doesn't match):
```ts
import strapi from '@strapi/strapi'

// Transcribed from 000_sito/src/data/work.ts — PROJECTS array (10 entries,
// as of this plan's writing — re-check against Step 1's actual output
// before running, in case the source has changed since). Tag tuples
// [TagVariant, string] become { label, highlighted: variant === "orange" }.
const PROJECTS = [
  {
    title: 'Northwind',
    slug: 'northwind',
    description: 'Identity and site for a renewable-energy startup.',
    client: 'Inter',
    year: 2025,
    order: 1,
    tags: [
      { label: 'Featured', highlighted: true },
      { label: 'Web', highlighted: false },
      { label: 'Brand', highlighted: false },
    ],
  },
  {
    title: 'Tidal Commerce',
    slug: 'tidal-commerce',
    description: 'A storefront that moves — fluid product reveals.',
    client: 'Red Bull',
    year: 2025,
    order: 2,
    tags: [
      { label: 'Motion', highlighted: false },
      { label: 'Dev', highlighted: false },
    ],
  },
  {
    title: 'Solstice',
    slug: 'solstice',
    description: 'Editorial platform for a culture magazine.',
    client: 'Isola del Gusto',
    year: 2024,
    order: 3,
    tags: [
      { label: 'Web', highlighted: false },
      { label: 'CMS', highlighted: false },
    ],
  },
  {
    title: 'Meridian Bank',
    slug: 'meridian-bank',
    description: 'Digital banking platform redesigned for clarity and trust.',
    client: 'Maserati',
    year: 2024,
    order: 4,
    tags: [
      { label: 'Web', highlighted: false },
      { label: 'UX', highlighted: false },
    ],
  },
  {
    title: 'Glasswing',
    slug: 'glasswing',
    description: 'Brand system and packaging for a specialty coffee roaster.',
    client: 'Inter',
    year: 2023,
    order: 5,
    tags: [
      { label: 'Featured', highlighted: true },
      { label: 'Brand', highlighted: false },
      { label: 'Packaging', highlighted: false },
    ],
  },
  {
    title: 'Nightfall Records',
    slug: 'nightfall-records',
    description: 'Motion-first site for an independent record label.',
    client: 'Red Bull',
    year: 2023,
    order: 6,
    tags: [
      { label: 'Motion', highlighted: false },
      { label: 'Web', highlighted: false },
    ],
  },
  {
    title: 'Arclight Studios',
    slug: 'arclight-studios',
    description: 'Portfolio and booking platform for a film production house.',
    client: 'Isola del Gusto',
    year: 2022,
    order: 7,
    tags: [
      { label: 'Web', highlighted: false },
      { label: 'Dev', highlighted: false },
    ],
  },
  {
    title: 'Halcyon Health',
    slug: 'halcyon-health',
    description: 'Telehealth product design and front-end build.',
    client: 'Maserati',
    year: 2022,
    order: 8,
    tags: [
      { label: 'UX', highlighted: false },
      { label: 'Dev', highlighted: false },
    ],
  },
  {
    title: 'Driftwood Market',
    slug: 'driftwood-market',
    description: 'E-commerce experience for a coastal home goods brand.',
    client: 'Inter',
    year: 2021,
    order: 9,
    tags: [
      { label: 'Featured', highlighted: true },
      { label: 'Web', highlighted: false },
      { label: 'CMS', highlighted: false },
    ],
  },
  {
    title: 'Vantage Analytics',
    slug: 'vantage-analytics',
    description: 'Data dashboard design system for an enterprise SaaS.',
    client: 'Red Bull',
    year: 2021,
    order: 10,
    tags: [
      { label: 'UX', highlighted: false },
      { label: 'Design System', highlighted: false },
    ],
  },
]

// Transcribed from 000_sito/src/data/team.ts — TEAM array (14 entries, as
// of this plan's writing — re-check against Step 1's actual output before
// running).
const TEAM_MEMBERS = [
  { name: 'Mara Lindqvist', role: 'Founder & Creative Director', order: 1 },
  { name: 'Theo Castellano', role: 'Head of Design', order: 2 },
  { name: 'Priya Nandakumar', role: 'Senior Product Designer', order: 3 },
  { name: 'Owen Fairweather', role: 'UX Designer', order: 4 },
  { name: 'Ines Duarte', role: 'Brand Designer', order: 5 },
  { name: 'Kai Sørensen', role: 'Motion Designer', order: 6 },
  { name: 'Marcus Ade', role: 'Lead Developer', order: 7 },
  { name: 'Lena Vogt', role: 'Front-end Developer', order: 8 },
  { name: 'Diego Marín', role: 'Front-end Developer', order: 9 },
  { name: 'Sasha Petrova', role: 'Backend Developer', order: 10 },
  { name: 'Noor El-Amin', role: 'Photographer', order: 11 },
  { name: 'Jonas Reyes', role: 'Video Editor', order: 12 },
  { name: 'Freya Lindgren', role: 'Project Manager', order: 13 },
  { name: 'Tomás Silveira', role: 'Studio Manager', order: 14 },
]

async function run() {
  const app = await strapi({ distDir: './dist' }).load()

  for (const project of PROJECTS) {
    await app.documents('api::project.project').create({ data: project })
  }

  for (const member of TEAM_MEMBERS) {
    await app.documents('api::team-member.team-member').create({ data: member })
  }

  console.log(`Seeded ${PROJECTS.length} projects and ${TEAM_MEMBERS.length} team members.`)
  await app.destroy()
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
```
Fill in the full `PROJECTS`/`TEAM_MEMBERS` arrays from Step 1's actual output — every entry, not just the first — before running this.

- [ ] **Step 4: Build and run the seed script**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
npm run build
npx ts-node scripts/seed.ts
```
If `ts-node` isn't installed and the project has no equivalent runner, check `package.json`'s `devDependencies` for what TypeScript-running tool the scaffold actually includes (Strapi projects sometimes ship one) and use that instead, or compile with `npx tsc scripts/seed.ts --outDir /tmp/seed-build` and run the compiled `.js` with plain `node`. Expected: prints `Seeded <N> projects and <M> team members.` where N and M match the counts from Step 1, with no errors.

- [ ] **Step 5: Verify the seeded content via the public API**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
npm run develop > /tmp/strapi-dev.log 2>&1 &
sleep 20
curl -s http://localhost:1337/api/projects | head -c 2000
echo
curl -s http://localhost:1337/api/team-members | head -c 2000
kill %1
```
Expected: both responses contain `"data":[...]` arrays with one object per seeded entry, `title`/`name` values matching what was read in Step 1, and `meta.pagination.total` equal to the counts from Step 4's printed output.

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
git add -A
git commit -m "Add seed script populated from 000_sito's current Project/Team data"
```

---

### Task 5: Write hand-off instructions for the manual steps

**Files (inside `pixelwave-cms/`):**
- Create: `HANDOFF.md`

**Interfaces:**
- Consumes: nothing from earlier tasks beyond their existence.
- Produces: a human-readable document — this task has no automated verification of its own beyond "the file exists and covers every listed point," since its content describes actions only the human can take.

- [ ] **Step 1: Write the hand-off document**

Create `HANDOFF.md`:
```markdown
# Hand-off: manual steps

This CMS is scaffolded, its content-types are defined, public read access
is on, and it's seeded with your current site's Project/Team content. A
few things need your own account/browser and can't be done by an agent:

## 1. Create your Strapi admin account

Run `npm run develop` in this directory, then open
http://localhost:1337/admin in your browser. Strapi will prompt you to
create the first admin user — use your own email and a real password.
This is the account you'll log into to edit content going forward.

## 2. Verify the seeded content

Once logged in, check Content Manager → Project and Content Manager →
Team Member — you should see entries matching your site's current
project/team roster, with empty media fields (photos/hero images/gallery
images) waiting for you to upload real photography.

## 3. Push this repo to GitHub

This project is its own git repo (separate from your site's). Create a
new, empty GitHub repository and push this one to it:

    git remote add origin <your-new-repo-url>
    git push -u origin main

## 4. Connect it to Strapi Cloud

Go to https://cloud.strapi.io, create an account (or log in), and follow
their "Deploy an existing project" flow, pointing it at the GitHub repo
from step 3. Strapi Cloud will provision hosting and a production
database for you — this replaces the local SQLite database used so far.

## 5. Note the production API URL

Once deployed, Strapi Cloud gives you a production URL (something like
`https://your-project.strapiapp.com`). That URL is what the site's
frontend integration (the next piece of this project) will be pointed at.
Keep it handy.
```

- [ ] **Step 2: Commit**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
git add -A
git commit -m "Add hand-off instructions for manual account/deploy steps"
```
