/** Cookie consent + Google Tag Manager loading.
 *
 *  Google Tag Manager is not loaded at all until the visitor has granted at
 *  least one category — before that, nothing is requested from Google. Once
 *  it loads, the choices are passed on through Google Consent Mode v2 so
 *  every tag in the container only fires for the categories accepted.
 *
 *  Without VITE_GTM_ID there is nothing to consent to: no banner, no
 *  loading (see `consentEnabled`). */

export interface ConsentChoices {
  statistics: boolean
  marketing: boolean
}

interface StoredConsent {
  v: 1
  at: number
  choices: ConsentChoices
}

const STORAGE_KEY = "pw-cookie-consent"
/** The choice is asked again after about six months. */
const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000
export const OPEN_PREFERENCES_EVENT = "pw:open-cookie-preferences"

const GTM_ID: string | undefined = import.meta.env.VITE_GTM_ID || undefined

export const consentEnabled = Boolean(GTM_ID)

declare global {
  interface Window {
    dataLayer: unknown[]
  }
}

export function readConsent(): ConsentChoices | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredConsent
    if (stored.v !== 1 || Date.now() - stored.at > MAX_AGE_MS) return null
    return { statistics: Boolean(stored.choices.statistics), marketing: Boolean(stored.choices.marketing) }
  } catch {
    return null
  }
}

function writeConsent(choices: ConsentChoices) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, at: Date.now(), choices } satisfies StoredConsent))
  } catch {
    // Storage blocked: the choice just won't be remembered next visit.
  }
}

function gtag(...args: unknown[]): void {
  void args
  window.dataLayer = window.dataLayer || []
  // Google's tag expects the `arguments` object itself, not an array.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments)
}

function consentState(choices: ConsentChoices) {
  const grant = (on: boolean) => (on ? "granted" : "denied")
  return {
    analytics_storage: grant(choices.statistics),
    ad_storage: grant(choices.marketing),
    ad_user_data: grant(choices.marketing),
    ad_personalization: grant(choices.marketing),
  }
}

let gtmLoaded = false

function loadGtm(choices: ConsentChoices) {
  if (!GTM_ID || gtmLoaded) return
  gtmLoaded = true
  window.dataLayer = window.dataLayer || []
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  })
  gtag("consent", "update", consentState(choices))
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" })
  const script = document.createElement("script")
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`
  document.head.appendChild(script)
}

/** Removes the cookies Google/Meta tags set, on this host and its parent
 *  domain — a loaded tag can't be unloaded, so withdrawing consent also
 *  reloads the page (see saveChoices). */
function clearTrackingCookies() {
  const names = document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((n) => /^(_ga|_gid|_gat|_gcl_|_fbp|_fbc)/.test(n))
  const host = location.hostname
  const parts = host.split(".")
  const domains = [host, `.${host}`]
  if (parts.length > 2) domains.push(`.${parts.slice(-2).join(".")}`)
  else domains.push(`.${host}`)
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`
    }
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }
}

/** Applies a stored choice at startup. Nothing loads unless something was
 *  granted. */
export function applyStoredConsent() {
  const choices = readConsent()
  if (choices && (choices.statistics || choices.marketing)) loadGtm(choices)
}

/** Saves a new choice and applies it. Returns true if the page is about to
 *  reload (consent was withdrawn after tags had already loaded). */
export function saveChoices(choices: ConsentChoices): boolean {
  const previous = readConsent()
  writeConsent(choices)

  const withdrew =
    gtmLoaded &&
    ((previous?.statistics && !choices.statistics) || (previous?.marketing && !choices.marketing))
  if (withdrew) {
    gtag("consent", "update", consentState(choices))
    clearTrackingCookies()
    location.reload()
    return true
  }

  if (choices.statistics || choices.marketing) {
    if (gtmLoaded) gtag("consent", "update", consentState(choices))
    else loadGtm(choices)
  }
  return false
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT))
}
