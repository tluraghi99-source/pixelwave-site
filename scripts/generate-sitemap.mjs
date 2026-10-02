// Generates dist/sitemap.xml as a "postbuild" step (see package.json — npm
// runs this automatically right after `npm run build` finishes). Lists
// every fixed route plus every published project's /work/<slug>, fetched
// fresh from Strapi each build so the sitemap never drifts from real
// content as projects are added, renamed, or removed.
//
// Not committed to git and not written into public/ — public/ is copied
// into dist/ verbatim at the *start* of the build, before this runs, so
// writing straight to dist/ is what actually lands in the deployed output.
//
// SITE_URL/STRAPI_URL are overridable via env for a real deploy (e.g. a
// production Strapi URL, once one exists — see the project's earlier
// hosting discussion); both default to today's known values.
import { writeFile } from "node:fs/promises"

const SITE_URL = process.env.SITE_URL ?? "https://pixelwave.it"
const STRAPI_URL = process.env.STRAPI_URL ?? "http://localhost:1337"

const STATIC_ROUTES = ["/", "/work", "/studio", "/contact"]

/** Mirrors src/lib/strapi.ts's own fetchProjects: resolves to `[]` on any
 *  network/parse failure rather than throwing, so an unreachable Strapi at
 *  build time still produces a sitemap (just without project pages)
 *  instead of failing the whole production build. */
async function fetchProjectSlugs() {
  try {
    const res = await fetch(`${STRAPI_URL}/api/projects?fields=slug&pagination[pageSize]=100`)
    if (!res.ok) return []
    const json = await res.json()
    return json.data.map((p) => p.slug)
  } catch {
    return []
  }
}

function urlEntry(path) {
  return `  <url>\n    <loc>${SITE_URL}${path}</loc>\n  </url>`
}

async function run() {
  const slugs = await fetchProjectSlugs()
  const routes = [...STATIC_ROUTES, ...slugs.map((slug) => `/work/${slug}`)]
  const body = routes.map(urlEntry).join("\n")
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

  await writeFile("dist/sitemap.xml", xml)
  console.log(`Generated dist/sitemap.xml with ${routes.length} URLs (${slugs.length} projects).`)
}

run()
