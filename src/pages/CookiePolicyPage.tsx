import { Link } from "react-router-dom"
import { usePageMeta } from "@/hooks/usePageMeta"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { Footer } from "@/components/sections/Footer"
import { consentEnabled, openCookiePreferences } from "@/lib/consent"

/** Same placeholder marker as the Privacy Policy — see its TODO. */
function TODO({ children }: { children: string }) {
  return <mark className="legal-page__todo">{children}</mark>
}

export function CookiePolicyPage() {
  usePageMeta(
    "Cookie Policy — PixelWave",
    "Which cookies PixelWave uses, what they are for, and how to change your choice."
  )

  return (
    <>
      <main className="legal-page" data-theme="dark" data-screen-label="Cookie Policy">
        <CursorGlow className="cursor-glow" variant="dark" glow={false} />
        <div className="wrap legal-page__content">
          <p className="legal-page__eyebrow">Legal</p>
          <h1 className="legal-page__title">Cookie Policy</h1>
          <p className="legal-page__updated">
            Last updated: <TODO>set this date when the page below is finalized</TODO>
          </p>

          <p className="legal-page__notice">
            <strong>This page is a first draft.</strong> The list of cookies below must match the tags
            actually configured in Google Tag Manager — check it before publishing, and have it
            reviewed together with the Privacy Policy.
          </p>

          <h2>1. What cookies are</h2>
          <p>
            Cookies are small files a website stores in your browser. Some are needed for a site to
            work; others measure how it is used or show advertising.
          </p>

          <h2>2. What we use</h2>
          <p>
            <strong>Necessary.</strong> The site sets no cookies of its own. It remembers, for the
            length of your visit only, that you have already seen the opening animation (in your
            browser's session storage), and it stores your cookie choice below in your browser. Neither
            tracks you, and neither needs consent.
          </p>
          <p>
            <strong>Statistics and marketing.</strong> These are used <em>only if you accept them</em>.
            Until then, nothing is requested from Google or Meta. They are loaded through Google Tag
            Manager:
          </p>
          <ul>
            <li>
              <strong>Google Analytics</strong> (statistics) — <code>_ga</code> and <code>_ga_*</code>{" "}
              (up to 2 years), <code>_gid</code> (24 hours). Used to count visits and see which pages
              are viewed.
            </li>
            <li>
              <strong>Google Ads</strong> (marketing) — <code>_gcl_*</code> (up to 90 days). Used to
              measure the results of advertising.
            </li>
            <li>
              <strong>Meta pixel</strong> (marketing) — <code>_fbp</code> (up to 90 days). Used to
              measure advertising on Facebook and Instagram.
            </li>
          </ul>
          <p>
            <TODO>
              Keep only the tools actually set up in the Tag Manager container, and confirm the
              durations above against each provider's current documentation.
            </TODO>
          </p>

          <h2>3. Your choice</h2>
          <p>
            When you first visit, a banner lets you accept all, reject all, or choose by category.
            Rejecting is as easy as accepting, and the site works the same either way. We ask again
            after about six months.
          </p>
          {consentEnabled && (
            <p>
              <button type="button" className="legal-page__link-button" onClick={openCookiePreferences}>
                Change your cookie preferences
              </button>
            </p>
          )}
          <p>
            You can also delete cookies from your browser's settings at any time. If you withdraw consent
            after accepting, the page reloads and the cookies above are removed.
          </p>

          <h2>4. Who receives the data</h2>
          <p>
            When you accept, the data collected is processed by Google (Analytics and Ads) and, for the
            pixel, Meta, which may transfer it outside the European Union.{" "}
            <TODO>
              Confirm the data-processing terms accepted with Google and Meta and the transfer
              safeguards they rely on.
            </TODO>
          </p>
          <p>
            For how we handle the data you send us through our forms, see the{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
