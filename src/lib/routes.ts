/** Page addresses in one place, so a link and its route can't drift apart.
 *  Italian paths; the old English ones (/work, /contact, /careers) are
 *  redirected in App.tsx (and with a 301 in public/.htaccess). */
export const ROUTES = {
  home: "/",
  work: "/lavori",
  studio: "/studio",
  contact: "/contatti",
  careers: "/lavora-con-noi",
  privacy: "/privacy",
  cookies: "/cookies",
} as const

export function projectPath(slug: string): string {
  return `${ROUTES.work}/${slug}`
}
