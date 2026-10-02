import { Link } from "react-router-dom"
import { usePageMeta } from "@/hooks/usePageMeta"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { Footer } from "@/components/sections/Footer"

/** Wraps a placeholder value that needs a real business decision before
 *  this page goes live — a legal name, an address, a retention period,
 *  none of which this codebase has any way to know on its own. Rendered
 *  with a visible marker (index.css) so it can't accidentally ship
 *  unnoticed, on top of being called out again in prose here. */
function TODO({ children }: { children: string }) {
  return <mark className="legal-page__todo">{children}</mark>
}

/** GDPR-driven — see the Contact and Careers forms' new consent checkbox,
 *  which links here. This is a first draft built from what the codebase
 *  actually does (the real form fields, the real processors it calls), not
 *  a generic template — but it still needs a real person (ideally a lawyer)
 *  to fill in the placeholders and sign off before publishing, the same way
 *  no other legal document on a real business gets shipped from a first
 *  draft alone. */
export function PrivacyPolicyPage() {
  usePageMeta(
    "Privacy Policy — PixelWave",
    "How PixelWave collects, uses, and protects the personal data submitted through this site."
  )

  return (
    <>
      <main className="legal-page" data-theme="dark" data-screen-label="Privacy Policy">
        <CursorGlow className="cursor-glow" variant="dark" glow={false} />
        <div className="wrap legal-page__content">
          <p className="legal-page__eyebrow">Legal</p>
          <h1 className="legal-page__title">Privacy Policy</h1>
          <p className="legal-page__updated">
            Last updated: <TODO>set this date when the draft below is finalized</TODO>
          </p>

          <p className="legal-page__notice">
            <strong>This page is a first draft, not a published policy.</strong> Every highlighted
            note below is a placeholder that needs a real answer — several need a lawyer's
            sign-off — before this should be treated as accurate or linked to as final.
          </p>

          <h2>1. Who we are</h2>
          <p>
            PixelWave is a creative studio based in{" "}
            <a href="https://maps.app.goo.gl/xNz7W3z1U6EcBg6f7" target="_blank" rel="noopener noreferrer">
              Milano, Italia
            </a>
            . For the purposes of the GDPR, PixelWave is the data controller for the personal
            data described below.
          </p>
          <p>
            <TODO>
              Registered legal entity name, registered address, and VAT/tax ID — needed here for
              the controller to be properly identified.
            </TODO>
          </p>

          <h2>2. What data we collect</h2>
          <p>We only collect what each form on this site actually asks for:</p>
          <ul>
            <li>
              <strong>Contact form</strong> (/contact) — your name, email address, the project
              type(s) you select, and the timeline you select.
            </li>
            <li>
              <strong>Careers form</strong> (/careers) — your name, surname, email address, phone
              number, the role you're applying for, and the CV file you upload.
            </li>
          </ul>
          <p>
            We don't use cookies or any analytics/tracking on this site at the time of writing.
            If that changes (for example, if analytics are added later), this page — and a
            cookie-consent banner — will be updated before that happens, not after.
          </p>

          <h2>3. Why we collect it, and on what basis</h2>
          <p>
            We use this data solely to respond to your inquiry or evaluate your application —
            nothing is used for marketing, and nothing is sold or shared with advertisers. The
            legal basis is your consent, given via the checkbox on each form, and — for the
            Careers form specifically — the steps necessary prior to entering into a contract
            with you, should your application move forward.
          </p>

          <h2>4. How long we keep it</h2>
          <p>
            <TODO>
              Retention period — e.g. "12 months after our last contact with you, unless a
              working relationship begins" — needs a real decision.
            </TODO>
          </p>

          <h2>5. Who processes it</h2>
          <p>Your data is handled by these services on our behalf:</p>
          <ul>
            <li>
              <strong>Strapi CMS</strong>, where form submissions are stored —{" "}
              <TODO>hosting provider and server location (EU or not)</TODO>.
            </li>
            <li>
              <strong>Google Workspace / Gmail</strong>, used to send us an email notification
              when a form is submitted.
            </li>
          </ul>
          <p>
            <TODO>
              Confirm whether data-processing agreements (DPAs) are in place with each of the
              above, and note here if either transfers data outside the EU.
            </TODO>
          </p>

          <h2>6. Your rights</h2>
          <p>Under the GDPR, you have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Correct it if it's inaccurate</li>
            <li>Request its deletion</li>
            <li>Restrict or object to how it's processed</li>
            <li>Receive a copy in a portable format</li>
            <li>Withdraw your consent at any time, with no effect on data already processed</li>
            <li>
              Lodge a complaint with the Garante per la protezione dei dati personali (Italy's
              supervisory authority), or your own country's equivalent
            </li>
          </ul>
          <p>
            To exercise any of these, contact us at{" "}
            <TODO>real privacy-contact email address</TODO>.
          </p>

          <h2>7. Changes to this policy</h2>
          <p>
            If this policy changes in a way that affects how your data is handled, we'll update
            the date at the top of this page.
          </p>

          <p className="legal-page__back">
            <Link to="/contact">← Back to Contact</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
