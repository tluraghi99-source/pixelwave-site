// Writes project description texts into the Strapi CMS in one go.
//
//   STRAPI_TOKEN=<token> node scripts/apply-project-texts.mjs            # preview only
//   STRAPI_TOKEN=<token> node scripts/apply-project-texts.mjs --apply    # write
//
// Texts come from scripts/project-texts.json (see project-texts.example.json).
// Only the two text fields are touched — never media, tags, titles or
// anything else — and only for projects listed in the file with non-empty
// text. A plain PUT updates the draft and the published version together,
// so nothing needs publishing afterwards.
//
// STRAPI_TOKEN is a Strapi API token (admin panel -> Settings -> API Tokens),
// read from the environment only: it's never printed, stored or logged.
// Optional: STRAPI_URL (default https://cms.pixelwave.it).
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const apply = args.includes("--apply")
const fileArg = args.find((a) => !a.startsWith("--"))
const file = fileArg ? path.resolve(fileArg) : path.join(here, "project-texts.json")
const base = (process.env.STRAPI_URL ?? "https://cms.pixelwave.it").replace(/\/+$/, "")
const token = process.env.STRAPI_TOKEN

const SOFT_LIMITS = { description: 220, bodyDescription: 800 }

function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

if (!token) {
  fail(
    "STRAPI_TOKEN is not set. Create an API token in the Strapi admin (Settings → API Tokens, " +
      "type Full access) and run:\n    STRAPI_TOKEN=<token> node scripts/apply-project-texts.mjs"
  )
}

async function api(pathAndQuery, init = {}) {
  const res = await fetch(`${base}${pathAndQuery}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(30_000),
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    // non-JSON body, kept as text below
  }
  if (!res.ok) {
    const detail = body?.error?.message ?? text.slice(0, 160)
    throw new Error(`${init.method ?? "GET"} ${pathAndQuery.split("?")[0]} → ${res.status} ${detail}`)
  }
  return body
}

let entries
try {
  entries = JSON.parse(await readFile(file, "utf8"))
} catch (err) {
  fail(`Cannot read ${file}: ${err.message}`)
}
if (!Array.isArray(entries)) fail(`${file} must contain a JSON array of { slug, description, bodyDescription }`)

console.log(`\nCMS:   ${base}`)
console.log(`Mode:  ${apply ? "APPLY (writes to the CMS)" : "preview only — add --apply to write"}\n`)

let projects
try {
  const res = await api("/api/projects?status=draft&pagination%5BpageSize%5D=100&fields%5B0%5D=title&fields%5B1%5D=slug&fields%5B2%5D=description&fields%5B3%5D=bodyDescription")
  projects = res.data
} catch (err) {
  fail(`Could not read the projects (is the token valid? ${err.message})`)
}

const norm = (s) => String(s ?? "").trim().toLowerCase()
let willChange = 0
let written = 0
let problems = 0

for (const entry of entries) {
  const label = entry.slug ?? entry.title ?? "(no slug)"
  const description = String(entry.description ?? "").trim()
  const bodyDescription = String(entry.bodyDescription ?? "").trim()

  if (!description && !bodyDescription) {
    console.log(`–  ${label}: no text in the file, skipped`)
    continue
  }

  const project =
    projects.find((p) => p.slug === entry.slug) ??
    projects.find((p) => norm(p.slug) === norm(entry.slug)) ??
    projects.find((p) => norm(p.title) === norm(entry.title))
  if (!project) {
    console.log(`✖  ${label}: no project with that slug/title in the CMS`)
    problems++
    continue
  }

  const data = {}
  if (description && description !== (project.description ?? "").trim()) data.description = description
  if (bodyDescription && bodyDescription !== (project.bodyDescription ?? "").trim()) data.bodyDescription = bodyDescription

  const warnings = []
  for (const [field, limit] of Object.entries(SOFT_LIMITS)) {
    if (data[field] && data[field].length > limit) warnings.push(`${field} is ${data[field].length} chars (suggested max ${limit})`)
  }
  const summary = `description ${data.description ? `${data.description.length} chars` : "unchanged"}, body ${data.bodyDescription ? `${data.bodyDescription.length} chars` : "unchanged"}`

  if (Object.keys(data).length === 0) {
    console.log(`=  ${project.title.trim()}: already up to date`)
    continue
  }
  willChange++

  if (!apply) {
    console.log(`→  ${project.title.trim()}: would update (${summary})${warnings.length ? `  ⚠ ${warnings.join("; ")}` : ""}`)
    continue
  }

  try {
    await api(`/api/projects/${project.documentId}`, { method: "PUT", body: JSON.stringify({ data }) })
    written++
    console.log(`✔  ${project.title.trim()}: updated (${summary})${warnings.length ? `  ⚠ ${warnings.join("; ")}` : ""}`)
  } catch (err) {
    problems++
    console.log(`✖  ${project.title.trim()}: ${err.message}`)
  }
}

console.log(
  `\n${apply ? `${written} project(s) updated` : `${willChange} project(s) would be updated`}` +
    `${problems ? `, ${problems} problem(s)` : ""}.` +
    `${!apply && willChange ? "\nRun again with --apply to write them." : ""}\n`
)
process.exit(problems ? 1 : 0)
