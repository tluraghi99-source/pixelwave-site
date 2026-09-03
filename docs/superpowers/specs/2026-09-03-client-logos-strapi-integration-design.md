# Client Logos Strapi Integration — Design

**Status:** Approved
**Sub-project 4 of the Strapi CMS integration effort** (follows Strapi CMS
Scaffold, Project Pages Strapi Integration, and Studio Team Strapi
Integration — see `docs/superpowers/specs/` and
`.superpowers/sdd/progress.md` for those).

## Goal

Move the homepage footer's client-logo marquee
(`src/components/sections/ClientLogos.tsx`) from the hardcoded
`src/data/clients.ts` to Strapi, so the client roster (logos, names, and
display order) can be managed from the Strapi admin panel instead of
requiring a code change.

## Current state

- `src/data/clients.ts` exports `CLIENTS: Client[]`, `interface Client {
  name: string; logo?: string; keepColor?: boolean }`. ~19 clients have a
  real logo file (SVG, imported from `src/assets/clients/`, sourced from
  Wikimedia Commons); ~6 have no `logo` and render as a text logotype
  instead (e.g. "Style Magazine", "Gattinoni Group").
- `client.keepColor` (true only for Inter today) opts one client out of the
  site-wide flat-black filter, because Inter's crest goes unrecognizable in
  solid black.
- `ClientLogos.tsx` renders two `<Marquee>` rows (opposite directions),
  each showing the full `CLIENTS` list once, inside `<Footer>` — no
  standalone dark section, no separate `CursorGlow` instance (Footer
  already has one).
- CSS: `.client-logos__item--logo { filter: brightness(0); }` forces flat
  black; `.client-logos__item--color { filter: none; }` is Inter's escape
  hatch.

## Decisions

1. **Content-type name:** `Client Logo` (singular, matching `Project` /
   `Team Member`'s convention), API ID `client-logo`.
2. **Every logo renders flat black, no exceptions.** `keepColor` is removed
   entirely — not defaulted to false, not kept as an unused field. This is
   a deliberate, disclosed trade-off: Inter's crest will render in solid
   black even though today's code comment explains why that's not ideal.
   Not a missed edge case — the user chose uniformity over Inter's
   individual legibility.
3. **All 25 clients migrate to Strapi**, not just the 19 with real logos.
   The 6 text-only clients become entries with an empty `logo` field, still
   rendering the existing text-logotype fallback. One single managed list,
   not a hardcoded remainder plus a Strapi-managed subset.
4. **Logo upload is automated in the seed script.** The seed script
   uploads all 19 existing SVG files from `src/assets/clients/` to Strapi
   as real media and attaches each to its entry, so the client wall looks
   identical immediately after seeding — no manual re-upload step required
   (unlike the Project/Team Member seeds, which left media fields empty
   since Picsum covered the visual gap; there's no meaningful placeholder
   for a specific brand's logo, so this sub-project seeds real media
   directly).
5. **Editor-controlled `order` field**, matching `Project`/`Team Member` —
   sortable from the admin panel, not alphabetical-only.
6. **Fail silently on fetch failure**, consistent with every other
   Strapi-backed section on the site: if Strapi is unreachable or the
   fetch errors, the footer's client-logo strip renders nothing. No
   special-cased hardcoded fallback for this section specifically.

## Content-type: `Client Logo`

| Field | Type | Notes |
|---|---|---|
| `name` | string, required | e.g. "Inter", "Style Magazine" |
| `logo` | media (single image), optional | Empty → text-logotype fallback |
| `order` | number | Editor-controlled sort position |

## Backend (`pixelwave-cms` repo, separate git history)

- `src/api/client-logo/content-types/client-logo/schema.json` +
  `controllers/services/routes/client-logo.ts`, each a one-line
  `factories.createCore*('api::client-logo.client-logo')` call — same
  pattern as `project`/`team-member`.
- Extend the existing `bootstrap({ strapi })` in `src/index.ts` to also
  grant public `find`/`findOne` on `client-logo` to the Public role — same
  mechanism already covering `Project`/`Team Member`, not a new one.
- `scripts/seed.ts`: create all 25 `Client Logo` entries with `status:
  'published'` (Draft & Publish is enabled site-wide; the public API only
  returns published entries). For the 19 with a real logo file, upload the
  SVG as Strapi media first (via Strapi's upload API/service) and attach
  the resulting media id to the entry's `logo` field before creating it.
  Transcribe `name`/`order` (roster order in `clients.ts`) from the current
  `src/data/clients.ts` array.

## Frontend (`000_sito` repo)

- **`src/lib/strapi.ts`** — append (reusing the existing
  `StrapiMedia`/`StrapiMediaRaw`/`strapiMediaUrl`, not redefining them):
  - `export interface ClientLogo { id: string; name: string; logo:
    StrapiMedia | null }`
  - `mapClientLogo(raw): ClientLogo`
  - `export async function fetchClientLogos(): Promise<ClientLogo[]>` —
    `${STRAPI_URL}/api/client-logos?populate=logo&sort=order:asc,documentId:asc&pagination[pageSize]=100`,
    fail-silent (`catch { return [] }`, non-2xx → `[]`).
- **`src/hooks/useClientLogos.ts`** (new) — exact structural copy of
  `useProjects`/`useTeamMembers`: `useState<ClientLogo[]>([])` + `useEffect`
  with a `cancelled` guard.
- **`src/components/sections/ClientLogos.tsx`**:
  - Replace the `CLIENTS` import with `const clients = useClientLogos()`.
  - `ClientMark({ client }: { client: ClientLogo })` — `client.logo` present
    → `<img className="client-logos__item client-logos__item--logo"
    src={strapiMediaUrl(client.logo)} alt={client.name} />` (no `--color`
    branch at all); absent → `<span className="client-logos__item
    client-logos__item--text">{client.name}</span>`, unchanged from today.
  - `ROW_ONE`/`ROW_TWO` now reference the fetched `clients` array instead
    of the static `CLIENTS` constant.
- **`src/index.css`** — delete the now-dead `.client-logos__item--color {
  filter: none; }` rule and update the comment above `.client-logos__item--logo`
  that explains the "a few keep their real colors" exception (no longer
  true).
- **`src/data/clients.ts`** — deleted once `ClientLogos.tsx` no longer
  imports it. Leaves `src/data/services.ts` as the only remaining file in
  `src/data/` (Services.tsx's accordion content — out of scope, not
  planned for migration in any sub-project).

## Error handling

- Fetch failure/empty response → `useClientLogos()` returns `[]` →
  `ClientLogos` renders both marquee rows empty (a blank strip in the
  footer). No loading UI, no error UI — consistent with the rest of the
  site's Strapi integrations.
- A `Client Logo` entry with no `logo` renders the text-logotype fallback,
  the same as a hardcoded client with no `logo` does today.

## Testing / verification

Same playbook as the three prior sub-projects:
- `npx tsc -b` and `npm run lint` clean at every step.
- Live `curl` checks against the real Strapi API for actual current
  values — never assume specific names/counts, since live content can
  drift (as it already has for Projects and Team Members).
- Live browser checks confirming the rendered client wall matches live
  Strapi data (count, names, which entries show a real logo vs. text).
- The marquee here does not use `RevealGroup`/`whileInView` (unlike the
  Studio Team grid or Work page grid), so the reveal-on-empty-fetch bug
  class found and fixed in sub-project 3's final review does not apply —
  worth an explicit reviewer confirmation of that fact rather than an
  assumption, since it's exactly the kind of thing a narrow per-task
  review could miss.
- Confirm `src/data/clients.ts` has zero remaining references after
  deletion (`grep -rln "data/clients" src/`).
