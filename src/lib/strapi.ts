const CONFIGURED_STRAPI_URL: string = import.meta.env.VITE_STRAPI_URL ?? "http://localhost:1337"

/** A "localhost" Strapi URL only works on the machine running it — opened
 *  from a phone on the LAN (http://<mac-ip>:5173), "localhost" is the phone
 *  itself. When the page was loaded from any other hostname, point at that
 *  same host instead (Strapi listens on 0.0.0.0). */
function resolveStrapiUrl(url: string): string {
  if (typeof window === "undefined") return url
  const target = new URL(url)
  const isLoopback = target.hostname === "localhost" || target.hostname === "127.0.0.1"
  const pageIsLoopback = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  if (isLoopback && !pageIsLoopback) target.hostname = window.location.hostname
  return target.origin
}

export const STRAPI_URL = resolveStrapiUrl(CONFIGURED_STRAPI_URL)

export interface StrapiMedia {
  url: string
  mime: string
}

export interface ProjectTag {
  label: string
  highlighted: boolean
}

export interface Project {
  id: string
  slug: string
  title: string
  desc: string
  /** Longer body-section text — a separate field from `desc` (the hero
   *  teaser) so the two sections don't just repeat the same line twice. */
  bodyDesc: string
  client: string
  year: number
  tags: ProjectTag[]
  heroMedia: StrapiMedia | null
  /** Dedicated thumbnail image — separate from heroMedia, always a plain
   *  still image. Used for grid/preview cards; see ProjectPage.tsx and
   *  WorkPage.tsx's shared cover -> heroMedia (if image) -> placeholder
   *  fallback chain. */
  cover: StrapiMedia | null
  /** Single source of truth for how heroMedia/heroYoutubeUrl should be
   *  interpreted — not re-derived from heroMedia's mime type, since a
   *  "youtube" project has no heroMedia upload at all. */
  heroMediaType: "image" | "video" | "youtube"
  /** Only meaningful when heroMediaType === "youtube". A plain pasted
   *  YouTube URL (watch/share/embed — any normal format), parsed into a
   *  video id on the frontend (see ProjectPage.tsx's parseYoutubeId). */
  heroYoutubeUrl: string | null
  galleryImages: StrapiMedia[]
  /** Names of this project's assigned Work Categories — the fixed
   *  Video/Photo/Branding/Web Design/Social/Events taxonomy (see
   *  fetchWorkCategories) that drives the /work page's Category filter.
   *  Separate from `tags` above, which are just display badges. */
  workCategories: string[]
}

/** cover -> heroMedia (only when heroMediaType is "image") -> the caller's
 *  own placeholder. Every project-thumbnail call site (ProjectPage.tsx's
 *  thumb, WorkPage.tsx's grid card, Work.tsx's homepage carousel) shares
 *  this exact chain — pulled into one place after the three drifted out
 *  of sync with each other once (Work.tsx was missed when this fallback
 *  chain was first introduced elsewhere). */
export function projectThumbUrl(p: Project, placeholder: string): string {
  if (p.cover) return p.cover.url
  if (p.heroMediaType === "image" && p.heroMedia) return p.heroMedia.url
  return placeholder
}

/** Strapi returns relative URLs for locally-uploaded media (e.g.
 *  "/uploads/foo.jpg") — an already-absolute URL passes through unchanged. */
export function strapiMediaUrl(url: string): string {
  return url.startsWith("http") ? url : `${STRAPI_URL}${url}`
}

interface StrapiTagRaw {
  label: string
  highlighted: boolean
}
interface StrapiMediaRaw {
  url: string
  mime: string
}
interface StrapiProjectRaw {
  documentId: string
  slug: string
  title: string
  description: string
  bodyDescription: string
  client: string
  year: number
  tags: StrapiTagRaw[]
  heroMedia: StrapiMediaRaw | null
  cover: StrapiMediaRaw | null
  heroMediaType: "image" | "video" | "youtube" | null
  heroMediaYoutubeUrl: string | null
  galleryImages: StrapiMediaRaw[]
  workCategories: { name: string }[]
}

function mapProject(raw: StrapiProjectRaw): Project {
  return {
    id: raw.documentId,
    slug: raw.slug,
    title: raw.title,
    desc: raw.description,
    bodyDesc: raw.bodyDescription,
    client: raw.client,
    year: raw.year,
    tags: raw.tags.map((t) => ({ label: t.label, highlighted: t.highlighted })),
    heroMedia: raw.heroMedia
      ? { url: strapiMediaUrl(raw.heroMedia.url), mime: raw.heroMedia.mime }
      : null,
    cover: raw.cover ? { url: strapiMediaUrl(raw.cover.url), mime: raw.cover.mime } : null,
    // Defensive default for an unbackfilled environment (a fresh prod DB,
    // a restored dump, any project created outside this codebase's own
    // backfill) — reproduces Task 1's backfill rule exactly, so a project
    // with a null heroMediaType and a video heroMedia still renders as a
    // video instead of silently becoming a broken <img src="…mp4">.
    heroMediaType: raw.heroMediaType ?? (raw.heroMedia?.mime.startsWith("video/") ? "video" : "image"),
    heroYoutubeUrl: raw.heroMediaYoutubeUrl,
    galleryImages: raw.galleryImages.map((m) => ({ url: strapiMediaUrl(m.url), mime: m.mime })),
    workCategories: raw.workCategories.map((c) => c.name),
  }
}

/** Fetches all published projects. No editorial ordering — callers (see
 *  WorkPage.tsx, Work.tsx) shuffle for display, so the fetch itself just
 *  needs a stable order to sort from. Resolves to `[]` on any network/parse
 *  failure — callers render an empty state rather than an error message. */
export async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/projects?populate=tags,heroMedia,cover,galleryImages,workCategories&sort=documentId:asc&pagination[pageSize]=100`
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.data as StrapiProjectRaw[]).map(mapProject)
  } catch {
    return []
  }
}

export interface TeamMember {
  id: string
  order: number
  name: string
  role: string
  photo: StrapiMedia | null
  photoHover: StrapiMedia | null
}

interface StrapiTeamMemberRaw {
  documentId: string
  name: string
  role: string
  order: number
  photo: StrapiMediaRaw | null
  photoHover: StrapiMediaRaw | null
}

function mapTeamMember(raw: StrapiTeamMemberRaw): TeamMember {
  return {
    id: raw.documentId,
    order: raw.order,
    name: raw.name,
    role: raw.role,
    photo: raw.photo ? { url: strapiMediaUrl(raw.photo.url), mime: raw.photo.mime } : null,
    photoHover: raw.photoHover
      ? { url: strapiMediaUrl(raw.photoHover.url), mime: raw.photoHover.mime }
      : null,
  }
}

/** Fetches all published team members, sorted by their editorial `order`.
 *  Resolves to `[]` on any network/parse failure — callers render an
 *  empty state rather than an error message. */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/team-members?populate=photo,photoHover&sort=order:asc,documentId:asc&pagination[pageSize]=100`
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.data as StrapiTeamMemberRaw[]).map(mapTeamMember)
  } catch {
    return []
  }
}

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

export interface WorkCategory {
  id: string
  name: string
}

interface StrapiWorkCategoryRaw {
  documentId: string
  name: string
}

function mapWorkCategory(raw: StrapiWorkCategoryRaw): WorkCategory {
  return { id: raw.documentId, name: raw.name }
}

/** Fetches the fixed Work Category taxonomy, sorted by its editorial
 *  `order` — the full set, independent of which (if any) projects
 *  currently have one assigned, so the /work page's Category filter always
 *  shows the complete list rather than only categories already in use.
 *  Resolves to `[]` on any network/parse failure — callers render an
 *  empty state rather than an error message. */
export async function fetchWorkCategories(): Promise<WorkCategory[]> {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/work-categories?sort=order:asc,documentId:asc&pagination[pageSize]=100`
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.data as StrapiWorkCategoryRaw[]).map(mapWorkCategory)
  } catch {
    return []
  }
}

export interface ContactSubmissionPayload {
  name: string
  email: string
  projectTypes: string[]
  timeline: string | null
}

/** Posts a /contact form submission — Strapi saves it (api::contact-
 *  submission) and emails a notification (see pixelwave-cms's
 *  src/index.ts bootstrap) independently of each other, so a slow/failed
 *  email never affects this call. Resolves to false on any network/server
 *  failure — the caller keeps the user on the current step rather than
 *  claiming success it can't back up. */
export async function submitContact(payload: ContactSubmissionPayload): Promise<boolean> {
  try {
    const res = await fetch(`${STRAPI_URL}/api/contact-submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload }),
    })
    return res.ok
  } catch {
    return false
  }
}

export interface CareersApplicationPayload {
  name: string
  surname: string
  email: string
  phone: string
  role: string
  cv: File
}

/** Posts a /careers application, including the CV file — a plain JSON
 *  body can't carry a File, so this is multipart/form-data instead (fetch
 *  sets the correct Content-Type + boundary on its own when the body is a
 *  FormData, so it's deliberately not set explicitly here). See
 *  pixelwave-cms's careers-application controller for why the file field
 *  is a bare "cv" name, matched against the FormData key below. Resolves
 *  to false on any network/server failure (missing fields, no CV, etc.). */
export async function submitCareersApplication(payload: CareersApplicationPayload): Promise<boolean> {
  try {
    const formData = new FormData()
    formData.append(
      "data",
      JSON.stringify({
        name: payload.name,
        surname: payload.surname,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
      })
    )
    formData.append("cv", payload.cv)
    const res = await fetch(`${STRAPI_URL}/api/careers-applications`, {
      method: "POST",
      body: formData,
    })
    return res.ok
  } catch {
    return false
  }
}
