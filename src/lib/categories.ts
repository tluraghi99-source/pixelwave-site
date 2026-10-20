/** Work Categories are matched by name between the CMS and the site. The CMS
 *  may still call them "Photo" / "Events" (English) or "Foto" / "Eventi"
 *  (Italian): both resolve to the same key, so renaming them in the CMS at
 *  any time never breaks the filters, the service images or the links. */
const ALIASES: Record<string, string> = { foto: "photo", eventi: "events" }

export function categoryKey(name: string): string {
  const k = name.trim().toLowerCase()
  return ALIASES[k] ?? k
}

const LABELS: Record<string, string> = { photo: "Foto", events: "Eventi" }

/** The Italian label shown to visitors for a category name from the CMS. */
export function categoryLabel(name: string): string {
  return LABELS[categoryKey(name)] ?? name
}
