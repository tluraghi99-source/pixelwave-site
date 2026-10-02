import { useState } from "react"
import { Link } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Input } from "@/components/pw/Input"
import { Tag } from "@/components/pw/Tag"
import { InteractiveHoverButton } from "@/components/pw/InteractiveHoverButton"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CursorHint } from "@/components/motion/CursorHint"
import { EASE_WAVE } from "@/lib/motion"
import { usePageMeta } from "@/hooks/usePageMeta"
import { submitContact } from "@/lib/strapi"

const STEPS = [
  { key: "detail", label: "Detail" },
  { key: "type", label: "Project type" },
  { key: "when", label: "When" },
  { key: "review", label: "Review" },
] as const

const PROJECT_TYPES = ["Web Design", "Brand Identity", "Motion", "Development"]
const TIMELINES = ["ASAP", "1–3 months", "3–6 months", "Not sure yet"]

/** Joins selected types with " + ", breaking to a new line after every third
 *  one so a long selection doesn't run into a single unwieldy line. */
function formatProjectTypes(types: string[]): string {
  const lines: string[] = []
  for (let i = 0; i < types.length; i += 3) {
    lines.push(types.slice(i, i + 3).join(" + "))
  }
  return lines.join("\n")
}

export function ContactPage() {
  usePageMeta(
    "Contact — PixelWave",
    "Start a project with PixelWave. Tell us what you need and we'll get back to you."
  )
  const [stepIndex, setStepIndex] = useState(0)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [projectTypes, setProjectTypes] = useState<string[]>([])
  const [timeline, setTimeline] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(false)

  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const canAdvance =
    step.key === "detail"
      ? name.trim() !== "" && email.trim() !== ""
      : step.key === "type"
        ? projectTypes.length > 0
        : step.key === "when"
          ? timeline !== null
          : consent

  async function handleNext() {
    if (!canAdvance || sending) return
    if (isLastStep) {
      setSending(true)
      setSendError(false)
      const ok = await submitContact({ name, email, projectTypes, timeline })
      setSending(false)
      if (ok) setSent(true)
      else setSendError(true)
      return
    }
    setStepIndex((i) => i + 1)
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  function toggleProjectType(t: string) {
    setProjectTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  // The giant FitText mirror and its small eyebrow both derive from the same
  // state the real, accessible controls below already expose — there's
  // nothing here a screen reader needs that the labeled Input/Tag controls
  // don't already say, which is why the mirror stays aria-hidden.
  const firstName = name.trim().split(" ")[0] || "there"
  const hasName = name.trim() !== ""
  const reactive = sent
    ? { text: `Thanks, ${firstName}!`, isPlaceholder: false }
    : step.key === "detail"
      ? { text: hasName ? name : "Your name", isPlaceholder: !hasName }
      : step.key === "type"
        ? { text: projectTypes.length > 0 ? formatProjectTypes(projectTypes) : "Pick a project type", isPlaceholder: projectTypes.length === 0 }
        : step.key === "when"
          ? { text: timeline ?? "Pick a timeline", isPlaceholder: timeline === null }
          : { text: "Look good?", isPlaceholder: false }

  const eyebrowText = sent
    ? "Sent"
    : step.key === "detail"
      ? "Tell us who you are"
      : step.key === "type"
        ? "What are we building"
        : step.key === "when"
          ? "When are you starting"
          : "Review your details"

  return (
    <main>
      <section className="contact-page" data-theme="dark" data-screen-label="Contact">
        <CursorGlow className="contact-page__glow" />
        <CursorHint text="Let's chat" />

        <div
          className="contact-page__progress"
          role="img"
          aria-label={sent ? "Sent" : `Step ${stepIndex + 1} of ${STEPS.length}`}
        >
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`contact-page__progress-dash ${
                sent || i < stepIndex ? "is-done" : i === stepIndex ? "is-active" : ""
              }`}
            />
          ))}
        </div>

        <div className="contact-page__content">
          <div className="contact-page__content-main">
            <h2 className="contact-page__eyebrow">{eyebrowText}</h2>
            <div
              className={`contact-page__reactive ${reactive.isPlaceholder ? "is-placeholder" : ""}`}
              aria-hidden="true"
            >
              <span className="contact-page__reactive-text">{reactive.text}</span>
            </div>
          </div>
          {/* First step only, every width (mobile reflows above the reactive
             text instead of hiding — see index.css) — quick-access info for
             anyone who'd rather not fill out the form. The values themselves
             are still placeholders until the real business email/phone are
             set, same posture as the nav menu's "Call us" — but the links
             are now real mailto:/tel:, not dead hrefs, so tap-to-call/email
             already works the moment real values replace these. */}
          {!sent && step.key === "detail" && (
            <div className="contact-page__quick-contact">
              <a className="contact-page__quick-contact-link" href="mailto:info@pixelwave.it">
                info@pixelwave.it
              </a>
              <a className="contact-page__quick-contact-link" href="tel:+10000000000">
                +1 (000) 000-0000
              </a>
            </div>
          )}
        </div>

        <div className="contact-page__strip">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                className="contact-page__sent-row"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_WAVE }}
              >
                <Check className="contact-page__sent-icon" size={20} aria-hidden="true" />
                <p className="contact-page__sent-msg">We'll be in touch shortly.</p>
              </motion.div>
            ) : (
              <motion.div
                key={step.key}
                className="contact-page__strip-row"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: EASE_WAVE }}
              >
                {stepIndex > 0 && (
                  <button type="button" className="contact-page__back" onClick={handleBack}>
                    <ArrowLeft size={14} aria-hidden="true" />
                    Back
                  </button>
                )}

                {step.key === "detail" && (
                  <div className="contact-page__fields">
                    <Input
                      label="Name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="Mail address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                )}

                {step.key === "type" && (
                  <div className="contact-page__chips">
                    {PROJECT_TYPES.map((t) => (
                      <Tag
                        key={t}
                        interactive
                        variant={projectTypes.includes(t) ? "orange" : "outline"}
                        onClick={() => toggleProjectType(t)}
                      >
                        {t}
                      </Tag>
                    ))}
                  </div>
                )}

                {step.key === "when" && (
                  <div className="contact-page__chips">
                    {TIMELINES.map((t) => (
                      <Tag
                        key={t}
                        interactive
                        variant={timeline === t ? "orange" : "outline"}
                        onClick={() => setTimeline(t)}
                      >
                        {t}
                      </Tag>
                    ))}
                  </div>
                )}

                {step.key === "review" && (
                  <div className="contact-page__recap">
                    <button type="button" className="contact-page__recap-row" onClick={() => setStepIndex(0)}>
                      <span className="contact-page__recap-label">Name &amp; email</span>
                      <span className="contact-page__recap-value">
                        {name} · {email}
                      </span>
                      <span className="contact-page__recap-edit">Edit</span>
                    </button>
                    <button type="button" className="contact-page__recap-row" onClick={() => setStepIndex(1)}>
                      <span className="contact-page__recap-label">Project type</span>
                      <span className="contact-page__recap-value">{projectTypes.join(", ")}</span>
                      <span className="contact-page__recap-edit">Edit</span>
                    </button>
                    <button type="button" className="contact-page__recap-row" onClick={() => setStepIndex(2)}>
                      <span className="contact-page__recap-label">Timeline</span>
                      <span className="contact-page__recap-value">{timeline}</span>
                      <span className="contact-page__recap-edit">Edit</span>
                    </button>
                    {/* Required, unchecked by default — GDPR consent for the
                       name/email/project details submitted above. Gates the
                       final submit via canAdvance, same as every earlier
                       step's own required field. */}
                    <label className="contact-page__consent">
                      <input
                        type="checkbox"
                        className="contact-page__consent-input"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span className="contact-page__consent-box" aria-hidden="true">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>
                        I've read and accept the{" "}
                        <Link to="/privacy" target="_blank" rel="noopener noreferrer">
                          Privacy Policy
                        </Link>
                        .
                      </span>
                    </label>
                    {sendError && (
                      <p className="contact-page__send-error">
                        Something went wrong sending that — please try again.
                      </p>
                    )}
                  </div>
                )}

                <InteractiveHoverButton
                  text={sending ? "Sending…" : isLastStep ? "Send it our way" : "Next"}
                  icon={<ArrowRight size={16} />}
                  onClick={handleNext}
                  className={`contact-page__next ${canAdvance && !sending ? "" : "contact-page__next--disabled"}`}
                  aria-disabled={!canAdvance || sending}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  )
}
