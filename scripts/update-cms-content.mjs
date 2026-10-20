// Updates text content in the live Strapi CMS in one go: project titles,
// clients, tags, descriptions and team roles, from scripts/cms-updates.json.
//
//   node scripts/update-cms-content.mjs            # preview only — writes nothing
//   node scripts/update-cms-content.mjs --apply    # write the changes
//
// Preview needs no token (it reads the public API). --apply needs a Strapi
// API token, read from the STRAPI_TOKEN environment variable or from the file
// ~/.pixelwave-cms-token — never printed, stored in the repo or logged.
// Optional: STRAPI_URL (default https://cms.pixelwave.it).
//
// Only text fields are touched (title, client, tags' labels, description,
// bodyDescription, role) — never media, slugs, categories or publication
// state — and nothing is deleted.
import { readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const apply = process.argv.includes("--apply")
const base = (process.env.STRAPI_URL ?? "https://cms.pixelwave.it").replace(/\/+$/, "")

async function getToken() {
  if (process.env.STRAPI_TOKEN) return process.env.STRAPI_TOKEN.trim()
  try {
    return (await readFile(path.join(os.homedir(), ".pixelwave-cms-token"), "utf8")).trim()
  } catch {
    return ""
  }
}
const token = await getToken()
if (apply && !token) {
  console.error("\n✖ --apply needs a token: set STRAPI_TOKEN or save it in ~/.pixelwave-cms-token\n")
  process.exit(1)
}

async function api(url, init = {}) {
  const res = await fetch(`${base}${url}`, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(30_000),
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${url.split("?")[0]} → ${res.status} ${body?.error?.message ?? ""}`)
  return body
}

const updates = JSON.parse(await readFile(path.join(here, "cms-updates.json"), "utf8"))
const norm = (s) => String(s ?? "").trim().toLowerCase()
const clip = (s, n = 48) => (String(s).length > n ? `${String(s).slice(0, n)}…` : String(s))

console.log(`\nCMS:  ${base}`)
console.log(`Mode: ${apply ? "APPLY (writes to the live CMS)" : "preview only — add --apply to write"}\n`)

let changes = 0
let written = 0
let problems = 0

async function run(label, documentId, route, data) {
  if (Object.keys(data).length === 0) return console.log(`=  ${label}: already up to date`)
  changes++
  console.log(`→  ${label}: ${Object.entries(data).map(([k, v]) => `${k} ${k === "tags" ? "(labels)" : `"${clip(typeof v === "string" ? v : JSON.stringify(v))}"`}`).join("; ")}`)
  if (!apply) return
  try {
    await api(`/api/${route}/${documentId}`, { method: "PUT", body: JSON.stringify({ data }) })
    written++
  } catch (err) {
    problems++
    console.log(`✖  ${label}: ${err.message}`)
  }
}

// Draft status first (what an edit actually changes); a restricted token may
// not be allowed to read drafts, so fall back to the published copy.
async function list(route, extra = "") {
  const q = `pagination%5BpageSize%5D=100${extra}`
  if (token) {
    try {
      return await api(`/api/${route}?status=draft&${q}`)
    } catch {
      /* fall through to published */
    }
  }
  return api(`/api/${route}?status=published&${q}`)
}

// Projects
const projRes = await list("projects", "&populate%5Btags%5D=true")
for (const u of updates.projects) {
  const p = projRes.data.find((x) => x.slug === u.slug) ?? projRes.data.find((x) => norm(x.slug) === norm(u.slug))
  if (!p) {
    problems++
    console.log(`✖  ${u.slug}: not found in the CMS`)
    continue
  }
  const data = {}
  for (const f of ["title", "client", "description", "bodyDescription"]) {
    if (u[f] !== undefined && String(u[f]).trim() !== String(p[f] ?? "").trim()) data[f] = u[f]
  }
  const newTags = (p.tags ?? []).map((t) => ({ label: updates.tagLabels[t.label] ?? t.label, highlighted: t.highlighted }))
  if (newTags.some((t, i) => t.label !== p.tags[i].label)) data.tags = newTags
  await run(String(p.title).trim(), p.documentId, "projects", data)
}

// Team roles
const teamRes = await list("team-members")
for (const [name, role] of Object.entries(updates.teamRoles)) {
  const m = teamRes.data.find((x) => norm(x.name) === norm(name))
  if (!m) {
    problems++
    console.log(`✖  ${name}: not found in the CMS`)
    continue
  }
  await run(name, m.documentId, "team-members", String(m.role ?? "").trim() === role ? {} : { role })
}

console.log(
  `\n${apply ? `${written} record(s) updated` : `${changes} record(s) would be updated`}` +
    `${problems ? `, ${problems} problem(s)` : ""}.` +
    `${!apply && changes ? "\nRun again with --apply to write them (token required).\n" : "\n"}`
)
process.exit(problems ? 1 : 0)
