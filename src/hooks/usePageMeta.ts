import { useEffect } from "react"

/** Keeps document.title, the description <meta>, and the canonical <link>
 *  in sync with whichever page is mounted — this is what lets each page
 *  show its own accurate title/snippet in Google search results (Google's
 *  crawler runs JS and picks this up).
 *
 *  This does NOT change what a shared link looks like on social/chat apps
 *  (Facebook, WhatsApp, Slack, iMessage, ...) — those link-preview
 *  crawlers fetch the raw HTML and never run this site's JS, so they only
 *  ever see index.html's own static Open Graph tags, the same for every
 *  URL on the site. Fixing that would need server-side rendering or a
 *  prerendering step, which this project doesn't have. */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute("content", description)
    }
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute("href", `${window.location.origin}${window.location.pathname}`)
  }, [title, description])
}
