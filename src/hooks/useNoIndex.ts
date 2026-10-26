import { useEffect } from "react"

/** While `active`, tells search engines not to index the current page (a
 *  robots meta tag, removed again on unmount or when `active` turns false).
 *  For the "not found" screens: the server can't always answer 404 itself
 *  (project slugs live in the CMS), so these pages opt out of the index. */
export function useNoIndex(active = true) {
  useEffect(() => {
    if (!active) return
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex"
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [active])
}
