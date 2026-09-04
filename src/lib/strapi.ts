export const STRAPI_URL = import.meta.env.VITE_STRAPI_URL ?? "http://localhost:1337"

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
  idx: string
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
  galleryImages: StrapiMedia[]
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
  order: number
  tags: StrapiTagRaw[]
  heroMedia: StrapiMediaRaw | null
  galleryImages: StrapiMediaRaw[]
}

function mapProject(raw: StrapiProjectRaw): Project {
  return {
    id: raw.documentId,
    idx: String(raw.order).padStart(2, "0"),
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
    galleryImages: raw.galleryImages.map((m) => ({ url: strapiMediaUrl(m.url), mime: m.mime })),
  }
}

/** Fetches all published projects, sorted by their editorial `order`.
 *  Resolves to `[]` on any network/parse failure — callers render an
 *  empty state rather than an error message. */
export async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/projects?populate=tags,heroMedia,galleryImages&sort=order:asc,documentId:asc&pagination[pageSize]=100`
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
