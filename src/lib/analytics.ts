import { ROUTES } from "@/lib/routes"
import { trackEvent } from "@/lib/consent"

/** Where on the page a clicked link sits, for the "which CTA works" report. */
function locationOf(el: Element): string {
  if (el.closest("header.nav")) return "menu"
  if (el.closest(".hero")) return "hero"
  if (el.closest(".cta-band")) return "banda_cta"
  if (el.closest(".reel")) return "carosello"
  if (el.closest("footer")) return "footer"
  if (el.closest(".contact-page")) return "pagina_contatti"
  return "altro"
}

/** One delegated listener for the whole site: contact CTAs, phone and email
 *  links. No markup changes needed in the components, and a new CTA that links
 *  to the contact page is tracked automatically. Returns a cleanup function. */
export function initClickTracking(): () => void {
  function onClick(e: MouseEvent) {
    const target = e.target
    if (!(target instanceof Element)) return
    const a = target.closest("a")
    if (!a) return
    const href = a.getAttribute("href") ?? ""
    const place = locationOf(a)

    if (href.startsWith("tel:")) return trackEvent("phone_click", { cta_location: place })
    if (href.startsWith("mailto:")) return trackEvent("email_click", { cta_location: place })

    let path = ""
    try {
      path = new URL(href, window.location.origin).pathname
    } catch {
      return
    }
    // The CTAs that lead to the two forms (not links already on those pages).
    const isContact = path === ROUTES.contact
    const isCareers = path === ROUTES.careers
    if ((isContact || isCareers) && window.location.pathname !== path) {
      trackEvent("cta_click", {
        cta_location: place,
        cta_destination: isContact ? "contatti" : "lavora_con_noi",
      })
    }
  }
  document.addEventListener("click", onClick, true)
  return () => document.removeEventListener("click", onClick, true)
}
