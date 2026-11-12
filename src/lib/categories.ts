import { SERVICES } from "@/data/services"

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

/** What a project holds: its categories' labels (Video, Foto, ...), in the same
 *  order as the filters and the services; any the site does not know come last. */
export function projectCategoryLabels(names: string[]): string[] {
  const order = (name: string) => {
    const i = SERVICES.findIndex((s) => categoryKey(s.name) === categoryKey(name))
    return i === -1 ? SERVICES.length : i
  }
  return [...names].sort((a, b) => order(a) - order(b)).map(categoryLabel)
}
