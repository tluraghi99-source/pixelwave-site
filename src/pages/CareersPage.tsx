import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Check, Upload } from "lucide-react"
import { Input } from "@/components/pw/Input"
import { InteractiveHoverButton } from "@/components/pw/InteractiveHoverButton"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CursorHint } from "@/components/motion/CursorHint"
import { EASE_WAVE } from "@/lib/motion"
import { usePageMeta } from "@/hooks/usePageMeta"
import { submitCareersApplication } from "@/lib/strapi"

// Same wizard shape as ContactPage (detail -> ... -> review -> sent), just a
// different field set for a job application instead of a project inquiry —
// see CareersPage.tsx/ContactPage.tsx's shared .contact-page* classes for
// the layout itself, kept identical on purpose.
const STEPS = [
  { key: "detail", label: "Detail" },
  { key: "role", label: "Role" },
  { key: "cv", label: "CV" },
  { key: "review", label: "Review" },
] as const

const MAX_CV_SIZE_MB = 10

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 0.1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Hidden native file input behind a styled dropzone/button, matching the
 *  rest of the wizard's bordered-field look instead of the browser's own
 *  unstyleable "Choose file" control. */
function CvUpload({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="pw-field contact-page__cv-field">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="contact-page__cv-input"
        aria-label="CV file"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button type="button" className="contact-page__cv-dropzone" onClick={() => inputRef.current?.click()}>
        <Upload size={16} aria-hidden="true" />
        <span className="contact-page__cv-dropzone-text">
          {file ? file.name : "Choose a file — PDF or Word"}
        </span>
      </button>
      {file && (
        <span className="pw-field__hint">
          {formatFileSize(file.size)}
          {" · "}
          <button type="button" className="contact-page__cv-clear" onClick={() => onChange(null)}>
            Remove
          </button>
        </span>
      )}
    </div>
  )
}

export function CareersPage() {
  usePageMeta(
    "Join Us — PixelWave",
    "Apply to join the PixelWave team. Tell us about yourself and attach your CV."
  )
  const [stepIndex, setStepIndex] = useState(0)
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("")
  const [cv, setCv] = useState<File | null>(null)
  const [cvError, setCvError] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(false)

  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const canAdvance =
    step.key === "detail"
      ? name.trim() !== "" && surname.trim() !== "" && email.trim() !== "" && phone.trim() !== ""
      : step.key === "role"
        ? role.trim() !== ""
        : step.key === "cv"
          ? cv !== null
          : consent

  async function handleNext() {
    if (!canAdvance || sending) return
    if (isLastStep) {
      if (!cv) return
      setSending(true)
      setSendError(false)
      const ok = await submitCareersApplication({ name, surname, email, phone, role, cv })
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

  function handleCvChange(file: File | null) {
    if (file && file.size > MAX_CV_SIZE_MB * 1024 * 1024) {
      setCvError(`That file is over ${MAX_CV_SIZE_MB}MB — try a smaller one.`)
      setCv(null)
      return
    }
    setCvError(null)
    setCv(file)
  }

  // The giant FitText-style mirror and its small eyebrow both derive from
  // the same state the real, accessible controls below already expose —
  // there's nothing here a screen reader needs that the labeled Input/file
  // controls don't already say, which is why the mirror stays aria-hidden.
  const firstName = name.trim() || "there"
  const hasName = name.trim() !== ""
  const reactive = sent
    ? { text: `Thanks, ${firstName}!`, isPlaceholder: false }
    : step.key === "detail"
      ? { text: hasName ? name : "Your name", isPlaceholder: !hasName }
      : step.key === "role"
        ? { text: role.trim() || "Your role", isPlaceholder: role.trim() === "" }
        : step.key === "cv"
          ? { text: cv ? cv.name : "Upload your CV", isPlaceholder: !cv }
          : { text: "Look good?", isPlaceholder: false }

  const eyebrowText = sent
    ? "Sent"
    : step.key === "detail"
      ? "Tell us who you are"
      : step.key === "role"
        ? "What do you do"
        : step.key === "cv"
          ? "Attach your CV"
          : "Review your details"

  return (
    <main>
      <section className="contact-page" data-theme="dark" data-screen-label="Careers">
        <CursorGlow className="contact-page__glow" />
        <CursorHint text="Join us" />

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
                      placeholder="First name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                      label="Surname"
                      placeholder="Last name"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="Mail address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                      label="Phone"
                      type="tel"
                      placeholder="Phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                )}

                {step.key === "role" && (
                  <div className="contact-page__fields">
                    <Input
                      label="Role"
                      placeholder="e.g. Video Editor, Designer, Developer…"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </div>
                )}

                {step.key === "cv" && (
                  <div className="contact-page__fields">
                    <CvUpload file={cv} onChange={handleCvChange} />
                    {cvError && <span className="pw-field__hint pw-field__hint--error">{cvError}</span>}
                  </div>
                )}

                {step.key === "review" && (
                  <div className="contact-page__recap">
                    <button type="button" className="contact-page__recap-row" onClick={() => setStepIndex(0)}>
                      <span className="contact-page__recap-label">Name &amp; contact</span>
                      <span className="contact-page__recap-value">
                        {name} {surname} · {email} · {phone}
                      </span>
                      <span className="contact-page__recap-edit">Edit</span>
                    </button>
                    <button type="button" className="contact-page__recap-row" onClick={() => setStepIndex(1)}>
                      <span className="contact-page__recap-label">Role</span>
                      <span className="contact-page__recap-value">{role}</span>
                      <span className="contact-page__recap-edit">Edit</span>
                    </button>
                    <button type="button" className="contact-page__recap-row" onClick={() => setStepIndex(2)}>
                      <span className="contact-page__recap-label">CV</span>
                      <span className="contact-page__recap-value">{cv?.name}</span>
                      <span className="contact-page__recap-edit">Edit</span>
                    </button>
                    {/* Required, unchecked by default — GDPR consent for the
                       personal data and CV submitted above. Gates the final
                       submit via canAdvance, same as every earlier step's
                       own required field. */}
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
