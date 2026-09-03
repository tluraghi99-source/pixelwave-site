# Client Logos Strapi Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage footer's hardcoded client-logo roster (`src/data/clients.ts`) with a Strapi-backed `Client Logo` content-type, so the client wall (names, logos, order) is editable from the Strapi admin panel.

**Architecture:** A new `Client Logo` content-type in the separate `pixelwave-cms` repo (schema + one-line factory controller/service/route, exactly mirroring `Project`/`Team Member`), seeded with all 27 current clients — 19 of them with their real SVG logo uploaded as Strapi media. The site (`000_sito`) gets a `fetchClientLogos()`/`useClientLogos()` pair (mirroring `fetchProjects`/`useProjects` and `fetchTeamMembers`/`useTeamMembers` exactly), and `ClientLogos.tsx` is migrated to consume it, with the `keepColor` mechanism removed entirely.

**Tech Stack:** Strapi 5.52.2 (TypeScript template, `pixelwave-cms` repo), React 19 + TypeScript + Vite (`000_sito` repo).

## Global Constraints

- Content-type name: `Client Logo` (singular, matching `Project`/`Team Member`'s Strapi naming convention). API ID `client-logo`, plural route `client-logos`.
- Every logo renders flat black — **no `keepColor` field at all**, not defaulted to `false`. This is a deliberate, disclosed trade-off (Inter's crest becomes unrecognizable in solid black; the user chose uniformity anyway).
- All 27 current clients migrate to Strapi (19 with a real logo file, 8 text-only with an empty `logo` field) — not a hardcoded remainder plus a Strapi-managed subset.
- Logo upload is automated in the seed script — the client wall must look identical immediately after seeding, no manual re-upload step.
- `order` is an editor-controlled integer field, matching `Project`/`Team Member`.
- Fail silently on fetch failure/empty response: the footer's client-logo strip renders nothing. No special-cased hardcoded fallback.
- `fetchClientLogos()` must include the `order:asc,documentId:asc` sort tie-breaker from day one (not added after the fact, per the lesson from sub-project 2).
- Reuse `StrapiMedia`/`StrapiMediaRaw`/`strapiMediaUrl` from `src/lib/strapi.ts` — do not redefine them.
- No agent may create/log into the Strapi admin UI. All verification is `curl`/script/direct-sqlite-query based.
- `src/data/clients.ts` is deleted once nothing imports it.
- Check every target file for pre-existing dirty hunks (`git diff -- <file>`) before starting each task, and again before committing — this repo has a history of unrelated uncommitted changes landing in the wrong commit.

---

### Task 1: `Client Logo` content-type + public read access (pixelwave-cms repo)

**Files:**
- Create: `pixelwave-cms/src/api/client-logo/content-types/client-logo/schema.json`
- Create: `pixelwave-cms/src/api/client-logo/controllers/client-logo.ts`
- Create: `pixelwave-cms/src/api/client-logo/services/client-logo.ts`
- Create: `pixelwave-cms/src/api/client-logo/routes/client-logo.ts`
- Modify: `pixelwave-cms/src/index.ts`

**Interfaces:**
- Produces: REST endpoint `GET /api/client-logos` (and `/api/client-logos/:id`), public read-only, returning entries shaped `{ documentId, name, order, logo: { url, mime } | null }` once populated with `?populate=logo`.

- [ ] **Step 1: Check for pre-existing dirty state**

Run: `cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms" && git status --short && git diff -- src/index.ts`
Expected: no output (clean working tree, no dirty hunk on `src/index.ts`). If `src/index.ts` has uncommitted changes, stop and report — do not proceed until resolved.

- [ ] **Step 2: Create the schema**

Create `pixelwave-cms/src/api/client-logo/content-types/client-logo/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "client_logos",
  "info": {
    "singularName": "client-logo",
    "pluralName": "client-logos",
    "displayName": "Client Logo"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "order": {
      "type": "integer"
    },
    "logo": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    }
  }
}
```

- [ ] **Step 3: Create the controller, service, and router**

Create `pixelwave-cms/src/api/client-logo/controllers/client-logo.ts`:

```typescript
import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::client-logo.client-logo')
```

Create `pixelwave-cms/src/api/client-logo/services/client-logo.ts`:

```typescript
import { factories } from '@strapi/strapi'

export default factories.createCoreService('api::client-logo.client-logo')
```

Create `pixelwave-cms/src/api/client-logo/routes/client-logo.ts`:

```typescript
import { factories } from '@strapi/strapi'

export default factories.createCoreRouter('api::client-logo.client-logo')
```

- [ ] **Step 4: Extend the bootstrap function to grant public read access**

Read the current `pixelwave-cms/src/index.ts` first — it already grants `find`/`findOne` on `Project` and `Team Member` inside one `actionsToEnable` array. Add the two new actions to that same array (do not create a second loop or a separate permissions mechanism):

```typescript
    const actionsToEnable = [
      'api::project.project.find',
      'api::project.project.findOne',
      'api::team-member.team-member.find',
      'api::team-member.team-member.findOne',
      'api::client-logo.client-logo.find',
      'api::client-logo.client-logo.findOne',
    ];
```

Everything else in `src/index.ts` (the `publicRole` lookup, the idempotent-create loop) stays unchanged.

- [ ] **Step 5: Boot Strapi and verify the endpoint is live and public**

Run (from `pixelwave-cms/`, backgrounded):
```bash
npm run develop
```
Wait for `Strapi started successfully` in the log (no compile errors — TypeScript errors in the new schema/controller/service/router files would show here).

Then verify:
```bash
curl -s --globoff "http://127.0.0.1:1337/api/client-logos"
```
Expected: `{"data":[],"meta":{"pagination":{"page":1,"pageSize":25,"pageCount":0,"total":0}}}` — a real 200 response with an empty array (not a 403 Forbidden, which would mean the permission grant didn't take), and no entries yet (seeding is Task 2).

- [ ] **Step 6: Verify idempotency and read-only scope directly against the database**

Restart the dev server once more (`Ctrl+C`, then `npm run develop` again) and re-run the same curl — it must still return 200 with the same empty-array shape (confirms the bootstrap's permission grant doesn't error or duplicate rows on a second boot).

Then confirm via direct sqlite query that exactly one permission row exists per new action, and that only `find`/`findOne` were granted (no `create`/`update`/`delete`):
```bash
sqlite3 pixelwave-cms/.tmp/data.db "SELECT action FROM up_permissions WHERE action LIKE '%client-logo%';"
```
Expected output (exactly these two rows, no others):
```
api::client-logo.client-logo.find
api::client-logo.client-logo.findOne
```

- [ ] **Step 7: Commit**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
git add src/api/client-logo/ src/index.ts
git status --short
```
Confirm the staged list shows exactly the 4 new files under `src/api/client-logo/` plus the modified `src/index.ts` — nothing else.

```bash
git commit -m "Add Client Logo content-type with public read access"
```

---

### Task 2: Seed all 27 clients, uploading the 19 real logos as media (pixelwave-cms repo)

**Files:**
- Create: `pixelwave-cms/scripts/seed-assets/clients/` (19 copied SVG files)
- Modify: `pixelwave-cms/scripts/seed.ts`

**Interfaces:**
- Consumes: `api::client-logo.client-logo` (Task 1) via `app.documents('api::client-logo.client-logo').create({ data, status: 'published' })`.
- Consumes: Strapi's upload plugin service, `strapi.plugin('upload').service('upload').upload({ data, files })`, which returns an array of uploaded file records each with a numeric `.id` — passed directly as the value of a `media` attribute (Strapi v5's document service accepts either a raw file object with `.id` or the bare id itself for a single-media field; both normalize to the same stored id).

The 19 real logo SVGs currently live only in the `000_sito` repo (`src/assets/clients/*.svg`). Rather than have this repo's seed script reach across into a sibling repo's file layout (fragile — breaks if the two repos aren't checked out side by side, and violates the "completely separate repo" decision from sub-project 1), copy the files into `pixelwave-cms`'s own `scripts/seed-assets/clients/` directory so this repo is self-contained.

- [ ] **Step 1: Check for pre-existing dirty state**

Run: `cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms" && git diff -- scripts/seed.ts`
Expected: no output.

- [ ] **Step 2: Copy the 19 logo SVGs into this repo**

```bash
mkdir -p "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms/scripts/seed-assets/clients"
cp "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito/src/assets/clients/"*.svg \
   "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms/scripts/seed-assets/clients/"
ls "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms/scripts/seed-assets/clients/" | wc -l
```
Expected: `19`.

- [ ] **Step 3: Read the current seed.ts in full before editing**

Read `pixelwave-cms/scripts/seed.ts` fresh — confirm it still matches the structure described below (the `require('@strapi/strapi')` line, the `PROJECTS`/`TEAM_MEMBERS` arrays, and the `run()` function). If the live file differs meaningfully from this plan's assumption, stop and report rather than guessing.

- [ ] **Step 4: Add the CLIENT_LOGOS data array**

Add this array to `pixelwave-cms/scripts/seed.ts`, after the existing `TEAM_MEMBERS` array (transcribed from `000_sito/src/data/clients.ts`'s `CLIENTS` array, re-checked against the live file — `logoFile` is the filename inside `scripts/seed-assets/clients/`, `null` for the 8 clients with no real logo):

```javascript
// Transcribed from 000_sito/src/data/clients.ts — CLIENTS array (27
// entries, re-checked against the live file on 2026-09-03). `order` is the
// entry's 1-based position in the source array. `logoFile` names the file
// under scripts/seed-assets/clients/ to upload for this entry, or null for
// the clients that render as a text logotype (no real logo asset exists).
const CLIENT_LOGOS = [
  { name: 'Inter', order: 1, logoFile: 'inter.svg' },
  { name: 'Adidas', order: 2, logoFile: 'adidas.svg' },
  { name: 'Red Bull', order: 3, logoFile: 'redbull.svg' },
  { name: 'Style Magazine', order: 4, logoFile: null },
  { name: '1000 Miglia', order: 5, logoFile: '1000miglia.svg' },
  { name: 'Gattinoni Group', order: 6, logoFile: null },
  { name: 'Ford', order: 7, logoFile: 'ford.svg' },
  { name: 'ABmedica', order: 8, logoFile: null },
  { name: 'Snakes Milano', order: 9, logoFile: null },
  { name: 'Quattroruote', order: 10, logoFile: 'quattroruote.svg' },
  { name: "L'Isola del Gusto", order: 11, logoFile: null },
  { name: "Men's Health", order: 12, logoFile: 'menshealth.svg' },
  { name: 'Deejay', order: 13, logoFile: 'deejay.svg' },
  { name: 'STS Communication', order: 14, logoFile: null },
  { name: 'Milano Cortina 2026', order: 15, logoFile: 'milanocortina2026.svg' },
  { name: 'Campari', order: 16, logoFile: 'campari.svg' },
  { name: 'Marelli', order: 17, logoFile: 'marelli.svg' },
  { name: 'Nike', order: 18, logoFile: 'nike.svg' },
  { name: 'BNP Paribas', order: 19, logoFile: 'bnpparibas.svg' },
  { name: 'Alfa Romeo', order: 20, logoFile: null },
  { name: 'Maserati', order: 21, logoFile: 'maserati.svg' },
  { name: 'Satispay', order: 22, logoFile: 'satispay.svg' },
  { name: 'Coca-Cola', order: 23, logoFile: 'cocacola.svg' },
  { name: 'UniCredit Bank', order: 24, logoFile: 'unicredit.svg' },
  { name: 'Generali', order: 25, logoFile: 'generali.svg' },
  { name: 'immobiliare.it', order: 26, logoFile: null },
  { name: 'Allianz', order: 27, logoFile: 'allianz.svg' },
];
```

- [ ] **Step 5: Add the upload helper and seeding loop**

Add these requires near the top of `scripts/seed.ts`, alongside the existing `require('@strapi/strapi')` line (same CommonJS-via-native-TS-runner rationale already documented in the file's header comment — keep using `require`, not `import`):

```javascript
const fs = require('fs');
const path = require('path');
```

Add this function after the `CLIENT_LOGOS` array, before `async function run()`:

```javascript
// Uploads one local SVG file through Strapi's upload plugin service and
// returns the created file record's numeric id, ready to assign directly
// to a `media` attribute (Strapi v5's document service accepts either a
// raw file object with `.id` or the bare id for a single-media field —
// confirmed against the installed 5.52.2 source,
// node_modules/@strapi/core/dist/services/document-service/internationalization.mjs's
// normalizeMediaIds: `value && typeof value === 'object' && 'id' in value
// ? value.id : value`).
async function uploadClientLogo(app, filename) {
  const filePath = path.join(__dirname, 'seed-assets', 'clients', filename);
  const { size } = fs.statSync(filePath);
  const uploadService = app.plugin('upload').service('upload');
  const [uploaded] = await uploadService.upload({
    data: {},
    files: {
      filepath: filePath,
      originalFilename: filename,
      mimetype: 'image/svg+xml',
      size,
    },
  });
  return uploaded.id;
}
```

Replace the existing `async function run() { ... }` body to add the client-logo seeding loop, right after the existing `TEAM_MEMBERS` loop and before the `console.log` line:

```javascript
async function run() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  for (const project of PROJECTS) {
    await app.documents('api::project.project').create({ data: project, status: 'published' });
  }

  for (const member of TEAM_MEMBERS) {
    await app.documents('api::team-member.team-member').create({ data: member, status: 'published' });
  }

  for (const client of CLIENT_LOGOS) {
    const logoId = client.logoFile ? await uploadClientLogo(app, client.logoFile) : undefined;
    await app.documents('api::client-logo.client-logo').create({
      data: { name: client.name, order: client.order, ...(logoId ? { logo: logoId } : {}) },
      status: 'published',
    });
  }

  console.log(
    `Seeded ${PROJECTS.length} projects, ${TEAM_MEMBERS.length} team members, and ${CLIENT_LOGOS.length} client logos.`
  );
  await app.destroy();
  process.exit(0);
}
```

Note: this script is already documented as NOT idempotent (re-running it duplicates all `PROJECTS`/`TEAM_MEMBERS` rows too) — running it again will also duplicate `CLIENT_LOGOS`. That's consistent with the file's existing behavior, not a new problem introduced here.

- [ ] **Step 6: Run the seed script**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
npm run seed
```
Expected: the console log line `Seeded 10 projects, 14 team members, and 27 client logos.` (the `PROJECTS`/`TEAM_MEMBERS` counts reflect this file's original seed arrays regardless of any live edits the user has since made in the admin panel — those two counts are not this task's concern). No errors. If the script errors on the upload step, read the error carefully before retrying — do not blindly re-run, since successful project/team-member creates in the same run would duplicate on a retry.

- [ ] **Step 7: Verify the seeded content against the live API**

```bash
curl -s --globoff "http://127.0.0.1:1337/api/client-logos?populate=logo&pagination[pageSize]=100" | python3 -m json.tool | head -60
```

Confirm:
- `meta.pagination.total` is `27` plus however many client-logo entries existed before this run (if this is the first run on a fresh local database, it should read exactly `27`).
- At least one entry with a `logoFile` (e.g. "Inter") has a non-null `logo` object containing a `url` field pointing at an uploaded file (e.g. `/uploads/inter_xxxxx.svg`).
- At least one entry with `logoFile: null` (e.g. "Style Magazine") has `logo: null`.

Then confirm the uploaded file is actually reachable:
```bash
curl -s --globoff "http://127.0.0.1:1337/api/client-logos?populate=logo&pagination[pageSize]=100" | python3 -c "
import json, sys
data = json.load(sys.stdin)['data']
inter = next(c for c in data if c['name'] == 'Inter')
print(inter['logo']['url'])
"
```
Take the printed URL and curl it directly (prefixed with `http://127.0.0.1:1337` if it's a relative path) — expect a 200 response with `Content-Type: image/svg+xml`.

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms"
git add scripts/seed.ts scripts/seed-assets/
git status --short
```
Confirm the staged list shows exactly `scripts/seed.ts` (modified) and the 19 new files under `scripts/seed-assets/clients/` — nothing else.

```bash
git commit -m "Seed 27 client logos, uploading the 19 real SVGs as media"
```

---

### Task 3: `ClientLogo` API client + hook (000_sito repo)

**Files:**
- Modify: `src/lib/strapi.ts`
- Create: `src/hooks/useClientLogos.ts`

**Interfaces:**
- Consumes: `StrapiMedia`, `StrapiMediaRaw`, `strapiMediaUrl` (already defined earlier in `src/lib/strapi.ts` — reuse, do not redefine).
- Produces: `export interface ClientLogo { id: string; name: string; logo: StrapiMedia | null }`, `export async function fetchClientLogos(): Promise<ClientLogo[]>`, `export function useClientLogos(): ClientLogo[]` — consumed by Task 4.

- [ ] **Step 1: Check for pre-existing dirty state**

Run: `cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && git diff -- src/lib/strapi.ts src/hooks/`
Expected: no output.

- [ ] **Step 2: Verify Strapi is running and the endpoint is reachable**

```bash
curl -sI http://127.0.0.1:1337/admin
```
Expected: `HTTP/1.1 200 OK`. If not running, start it: `cd "/Volumes/ups tl/02 pixelwave/00_pixel/pixelwave-cms" && npm run develop` (background it).

- [ ] **Step 3: Append `ClientLogo` to `src/lib/strapi.ts`**

Read the current file first to confirm it still ends with `fetchTeamMembers` exactly as shown below (this plan was written against that state — if it differs, re-read and adapt the append point, but do not touch anything above the append point):

```typescript
export interface ClientLogo {
  id: string
  name: string
  logo: StrapiMedia | null
}

interface StrapiClientLogoRaw {
  documentId: string
  name: string
  logo: StrapiMediaRaw | null
}

function mapClientLogo(raw: StrapiClientLogoRaw): ClientLogo {
  return {
    id: raw.documentId,
    name: raw.name,
    logo: raw.logo ? { url: strapiMediaUrl(raw.logo.url), mime: raw.logo.mime } : null,
  }
}

/** Fetches all published client logos, sorted by their editorial `order`.
 *  Resolves to `[]` on any network/parse failure — callers render an
 *  empty state rather than an error message. */
export async function fetchClientLogos(): Promise<ClientLogo[]> {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/client-logos?populate=logo&sort=order:asc,documentId:asc&pagination[pageSize]=100`
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.data as StrapiClientLogoRaw[]).map(mapClientLogo)
  } catch {
    return []
  }
}
```

Append this to the end of the file, after the existing `fetchTeamMembers` function.

- [ ] **Step 4: Create `src/hooks/useClientLogos.ts`**

```typescript
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
```

- [ ] **Step 5: Typecheck and lint**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito"
npx tsc -b
npm run lint
```
Expected: both exit 0 with no errors.

- [ ] **Step 6: Verify live against the real Strapi API**

Confirm the dev server is up (`curl -sI http://localhost:5173` should return 200; start it via the `pixellwave-dev` preview config if not). Then, using the Claude Browser tools' `javascript_tool` (or an equivalent in-page script), dynamically import the module and call the new function directly:

```javascript
const mod = await import('/src/lib/strapi.ts');
const clients = await mod.fetchClientLogos();
JSON.stringify({ count: clients.length, first: clients[0] });
```

Compare `count` against the real live total from:
```bash
curl -s --globoff "http://127.0.0.1:1337/api/client-logos?pagination[pageSize]=100" | python3 -c "import json,sys; print(json.load(sys.stdin)['meta']['pagination']['total'])"
```
The two numbers must match exactly (do not assume `27` — read whatever the live count actually is, since it may have drifted from admin-panel edits since Task 2 ran).

- [ ] **Step 7: Commit**

```bash
git add src/lib/strapi.ts src/hooks/useClientLogos.ts
git status --short
```
Confirm the staged list shows exactly these two files.

```bash
git commit -m "Add fetchClientLogos and useClientLogos hook"
```

---

### Task 4: Migrate `ClientLogos.tsx`, remove `keepColor`, delete dead files (000_sito repo)

**Files:**
- Modify: `src/components/sections/ClientLogos.tsx`
- Modify: `src/index.css`
- Delete: `src/data/clients.ts`
- Delete: `src/assets/clients/` (19 SVG files, orphaned once `clients.ts` is gone)

**Interfaces:**
- Consumes: `useClientLogos()` and `ClientLogo` from Task 3.

- [ ] **Step 1: Check for pre-existing dirty state**

Run: `cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && git diff -- src/components/sections/ClientLogos.tsx src/index.css`
Expected: no output.

- [ ] **Step 2: Confirm nothing else imports `src/assets/clients/*` besides `clients.ts`**

```bash
grep -rln "assets/clients" src/
```
Expected: only `src/data/clients.ts`. If anything else appears, stop and report — do not delete the assets folder in that case.

- [ ] **Step 3: Rewrite `ClientLogos.tsx`**

Replace the full contents of `src/components/sections/ClientLogos.tsx`:

```typescript
import { Marquee } from "@/components/motion/Marquee"
import { useClientLogos } from "@/hooks/useClientLogos"
import { strapiMediaUrl, type ClientLogo } from "@/lib/strapi"

function ClientMark({ client }: { client: ClientLogo }) {
  if (client.logo) {
    return (
      <img
        className="client-logos__item client-logos__item--logo"
        src={strapiMediaUrl(client.logo.url)}
        alt={client.name}
      />
    )
  }
  // No logo uploaded for this client yet — a text logotype stands in,
  // same posture as every item did before real logos were sourced.
  return <span className="client-logos__item client-logos__item--text">{client.name}</span>
}

// Client roster now fetched from Strapi's Client Logo content-type — see
// src/lib/strapi.ts's fetchClientLogos(). Every logo is forced to flat
// black via CSS filter (no per-client color exception; see
// .client-logos__item--logo in index.css) so the wall reads as one
// consistent mark rather than a rainbow of brand colors. A client with no
// uploaded logo falls back to a text logotype. Lives inside Footer now
// (light surface, black text), not as its own dark section — Footer's own
// CursorGlow already covers this area, so no second instance is added
// here.
//
// Unlike TickerStrip (decorative filler text, aria-hidden), this is real
// content — who the studio has worked with — so it stays in the
// accessibility tree. The sr-only heading gives screen readers context
// before the two marquee rows, whose own content is each duplicated once
// per row for the seamless-loop effect. No cross-component cache on the
// fetch (see useClientLogos) — a redundant fetch per page visit is cheap
// for a catalog this size.
export function ClientLogos() {
  const clients = useClientLogos()

  return (
    <div className="client-logos">
      <h2 className="sr-only">Clients</h2>
      <Marquee speed={110} className="client-logos__row">
        {clients.map((client) => (
          <ClientMark client={client} key={client.id} />
        ))}
      </Marquee>
      <Marquee speed={125} reverse className="client-logos__row">
        {clients.map((client) => (
          <ClientMark client={client} key={client.id} />
        ))}
      </Marquee>
    </div>
  )
}
```

- [ ] **Step 4: Clean up the dead `keepColor` CSS**

In `src/index.css`, find the `.client-logos__item--logo` rule and its preceding comment:

```css
/* Real logo files, forced flat black regardless of source color so the wall
   reads as one consistent mark (see data/clients.ts for why a few keep
   their real colors instead). */
.client-logos__item--logo {
  display: block; height: clamp(2rem, 2.9vw, 2.75rem); width: auto;
  filter: brightness(0);
}
.client-logos__item--color { filter: none; }
```

Replace it with:

```css
/* Real logo files, forced flat black regardless of source color so the
   wall reads as one consistent mark. */
.client-logos__item--logo {
  display: block; height: clamp(2rem, 2.9vw, 2.75rem); width: auto;
  filter: brightness(0);
}
```

(This deletes the now-dead `.client-logos__item--color` rule and updates the comment, which no longer applies now that every logo is forced black.)

- [ ] **Step 5: Delete the now-unused data file and assets**

```bash
rm src/data/clients.ts
rm -rf src/assets/clients/
```

- [ ] **Step 6: Typecheck and lint**

```bash
npx tsc -b
npm run lint
```
Expected: both exit 0. `tsc -b` passing confirms nothing else in the codebase still imports `@/data/clients` or the deleted asset files.

- [ ] **Step 7: Confirm zero remaining references**

```bash
grep -rln "data/clients\|assets/clients" src/
```
Expected: no output.

- [ ] **Step 8: Confirm the reveal-on-empty-fetch bug class does not apply here**

This codebase has twice found a real bug where an async-fetched grid's `RevealGroup`/`whileInView` reveal wrapper mounts empty before the fetch resolves, permanently consuming its one-shot viewport-enter trigger (fixed in the Studio Team and Work Page sub-projects). `ClientLogos.tsx`/`Marquee.tsx` use neither `RevealGroup` nor `whileInView` — confirm this explicitly rather than assuming it carried over correctly from this plan:

```bash
grep -n "RevealGroup\|whileInView\|viewport" src/components/sections/ClientLogos.tsx src/components/motion/Marquee.tsx
```
Expected: no output. This means the client wall has no scroll-triggered reveal at all — it renders (or stays empty) purely based on whether `clients.length` is nonzero, with no viewport-timing hazard.

- [ ] **Step 9: Live verification**

Confirm dev servers are up (`curl -sI http://127.0.0.1:1337/admin` and `curl -sI http://localhost:5173`, both 200; restart via `preview_start`/backgrounded `npm run develop` if not).

Using the Claude Browser tools, load `/` fresh and check:

```javascript
document.documentElement.style.scrollBehavior = 'auto';
const items = [...document.querySelectorAll('.client-logos__item')];
const logos = items.filter(el => el.tagName === 'IMG');
const texts = items.filter(el => el.tagName === 'SPAN');
JSON.stringify({
  totalItems: items.length,
  logoImgs: logos.length,
  textSpans: texts.length,
  firstLogoOpacity: logos[0] ? getComputedStyle(logos[0]).opacity : null,
  firstLogoSrc: logos[0]?.src,
});
```

Cross-check `logoImgs`/`textSpans` against the live counts from:
```bash
curl -s --globoff "http://127.0.0.1:1337/api/client-logos?populate=logo&pagination[pageSize]=100" | python3 -c "
import json, sys
data = json.load(sys.stdin)['data']
print('total', len(data), 'with_logo', sum(1 for c in data if c['logo']))
"
```
Since each of the two marquee rows renders the full client list once, `logoImgs` in the DOM should equal `2 * with_logo` and `textSpans` should equal `2 * (total - with_logo)`. `firstLogoOpacity` must be `"1"` (not `"0"`) — confirming there's no reveal-timing issue. Take a screenshot to visually confirm the wall renders correctly (logos flat black, text items readable).

- [ ] **Step 10: Commit**

```bash
git add -A src/components/sections/ClientLogos.tsx src/index.css src/data/clients.ts src/assets/clients/
git status --short
```
Confirm the staged list shows exactly: `ClientLogos.tsx` modified, `index.css` modified, `src/data/clients.ts` deleted, and the 19 files under `src/assets/clients/` deleted — nothing else.

```bash
git commit -m "Wire ClientLogos.tsx to fetch from Strapi; remove keepColor; delete src/data/clients.ts"
```
