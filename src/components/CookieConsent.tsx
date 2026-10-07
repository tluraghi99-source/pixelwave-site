import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Check } from "lucide-react"
import {
  OPEN_PREFERENCES_EVENT,
  applyStoredConsent,
  consentEnabled,
  readConsent,
  saveChoices,
  type ConsentChoices,
} from "@/lib/consent"

const CATEGORIES: Array<{
  key: keyof ConsentChoices | "necessary"
  title: string
  description: string
}> = [
  {
    key: "necessary",
    title: "Necessary",
    description: "Needed for the site to work. They don't track you and can't be turned off.",
  },
  {
    key: "statistics",
    title: "Statistics",
    description: "Google Analytics, to understand how the site is used (pages visited, rough location).",
  },
  {
    key: "marketing",
    title: "Marketing",
    description: "Google Ads and the Meta pixel, to measure and show relevant advertising.",
  },
]

const NONE: ConsentChoices = { statistics: false, marketing: false }

export function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [draft, setDraft] = useState<ConsentChoices>(NONE)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!consentEnabled) return
    applyStoredConsent()
    if (!readConsent()) setOpen(true)

    function reopen() {
      setDraft(readConsent() ?? NONE)
      setCustomizing(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_PREFERENCES_EVENT, reopen)
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, reopen)
  }, [])

  useEffect(() => {
    if (open && customizing) dialogRef.current?.focus()
  }, [open, customizing])

  if (!consentEnabled || !open) return null

  function choose(choices: ConsentChoices) {
    const reloading = saveChoices(choices)
    if (!reloading) {
      setOpen(false)
      setCustomizing(false)
    }
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="cookie-banner"
      data-theme="dark"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
    >
      <p id="cookie-banner-title" className="cookie-banner__title">
        Cookies
      </p>

      {!customizing ? (
        <p className="cookie-banner__text">
          We use cookies for statistics and advertising only if you agree. You can accept all, reject
          all, or choose, and change your mind any time from the footer.{" "}
          <Link to="/cookies">Cookie Policy</Link>
        </p>
      ) : (
        <ul className="cookie-banner__list">
          {CATEGORIES.map((category) => {
            const necessary = category.key === "necessary"
            const checked = necessary ? true : draft[category.key as keyof ConsentChoices]
            return (
              <li key={category.key}>
                <label className="cookie-banner__toggle">
                  <input
                    type="checkbox"
                    className="cookie-banner__input"
                    checked={checked}
                    disabled={necessary}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [category.key]: e.target.checked }))
                    }
                  />
                  <span className="cookie-banner__box" aria-hidden="true">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>
                    <span className="cookie-banner__toggle-title">{category.title}</span>
                    <span className="cookie-banner__toggle-desc">{category.description}</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <div className="cookie-banner__actions">
        <button
          type="button"
          className="pw-btn pw-btn--secondary pw-btn--sm"
          onClick={() => choose({ statistics: true, marketing: true })}
        >
          Accept all
        </button>
        <button type="button" className="pw-btn pw-btn--secondary pw-btn--sm" onClick={() => choose(NONE)}>
          Reject all
        </button>
        {customizing ? (
          <button type="button" className="pw-btn pw-btn--secondary pw-btn--sm" onClick={() => choose(draft)}>
            Save choices
          </button>
        ) : (
          <button
            type="button"
            className="pw-btn pw-btn--secondary pw-btn--sm"
            onClick={() => {
              setDraft(readConsent() ?? NONE)
              setCustomizing(true)
            }}
          >
            Customize
          </button>
        )}
      </div>
    </div>
  )
}
