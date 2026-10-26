import { useEffect } from "react"

/** Adds a schema.org JSON-LD block (structured data for search engines) to
 *  <head> while the calling page is mounted, and removes it afterwards. Pass
 *  `null` while the data isn't ready. The site-wide Organization/WebSite
 *  block lives in index.html instead, so crawlers that don't run JS see it. */
export function useJsonLd(data: object | null) {
  const json = data ? JSON.stringify(data) : null
  useEffect(() => {
    if (!json) return
    const script = document.createElement("script")
    script.type = "application/ld+json"
    script.textContent = json
    document.head.appendChild(script)
    return () => script.remove()
  }, [json])
}
