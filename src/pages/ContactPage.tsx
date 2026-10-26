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
import { SERVICES } from "@/data/services"
import { submitContact } from "@/lib/strapi"
import { trackEvent } from "@/lib/consent"

const STEPS = [
  { key: "detail", label: "Dati" },
  { key: "type", label: "Tipo di progetto" },
  { key: "when", label: "Quando" },
  { key: "review", label: "Riepilogo" },
] as const

// Same list as the homepage Services section, so the form never offers
// something the site doesn't list (or misses something it does).
const PROJECT_TYPES = SERVICES.map((service) => service.name)
const TIMELINES = ["Appena possibile", "1–3 mesi", "3–6 mesi", "Non lo so ancora"]

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
    "Contatti — PixelWave",
    "Inizia un progetto con PixelWave. Raccontaci di cosa hai bisogno e ti risponderemo."
  )
  const [stepIndex, setStepIndex] = useState(0)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
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
      const ok = await submitContact({ name, email, phone: phone.trim(), projectTypes, timeline })
      setSending(false)
      if (ok) {
        setSent(true)
        // The conversion: no personal data, only what kind of project and when.
        trackEvent("generate_lead", {
          form_name: "contatti",
          project_types: projectTypes.join(", ").slice(0, 100),
          timeline: timeline ?? "",
        })
      } else {
        setSendError(true)
        trackEvent("form_error", { form_name: "contatti" })
      }
      return
    }
    trackEvent("form_step", { form_name: "contatti", step_name: step.key })
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
  const firstName = name.trim().split(" ")[0]
  const hasName = name.trim() !== ""
  const reactive = sent
    ? { text: `Grazie${firstName ? `, ${firstName}` : ""}!`, isPlaceholder: false }
    : step.key === "detail"
      ? { text: hasName ? name : "Il tuo nome", isPlaceholder: !hasName }
      : step.key === "type"
        ? { text: projectTypes.length > 0 ? formatProjectTypes(projectTypes) : "Scegli un tipo di progetto", isPlaceholder: projectTypes.length === 0 }
        : step.key === "when"
          ? { text: timeline ?? "Scegli i tempi", isPlaceholder: timeline === null }
          : { text: "Tutto ok?", isPlaceholder: false }

  const eyebrowText = sent
    ? "Inviato"
    : step.key === "detail"
      ? "Dicci chi sei"
      : step.key === "type"
        ? "Cosa costruiamo"
        : step.key === "when"
          ? "Quando si parte"
          : "Controlla i tuoi dati"

  return (
    <main>
      <section className="contact-page" data-theme="dark" data-screen-label="Contact">
        <CursorGlow className="contact-page__glow" />
        <CursorHint text="Let's chat" />

        <div
          className="contact-page__progress"
          role="img"
          aria-label={sent ? "Inviato" : `Passo ${stepIndex + 1} di ${STEPS.length}`}
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
             anyone who'd rather not fill out the form. Real mailto: link. The
             phone number is removed until the studio's own line is confirmed
             — when it is, add a tel: link back here (href and label together). */}
          {!sent && step.key === "detail" && (
            <div className="contact-page__quick-contact">
              <a className="contact-page__quick-contact-link" href="mailto:info@pixelwave.it">
                info@pixelwave.it
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
                <p className="contact-page__sent-msg">Ti scriviamo a breve.</p>
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
                    Indietro
                  </button>
                )}

                {step.key === "detail" && (
                  <div className="contact-page__fields">
                    <Input
                      label="Nome"
                      placeholder="Il tuo nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="Indirizzo email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                      label="Telefono (facoltativo)"
                      type="tel"
                      placeholder="Telefono (facoltativo)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
                      <span className="contact-page__recap-label">Nome e contatti</span>
                      <span className="contact-page__recap-value">
                        {name} · {email}
                        {phone.trim() !== "" && ` · ${phone.trim()}`}
                      </span>
                      <span className="contact-page__recap-edit">Modifica</span>
                    </button>
                    <button type="button" className="contact-page__recap-row" onClick={() => setStepIndex(1)}>
                      <span className="contact-page__recap-label">Tipo di progetto</span>
                      <span className="contact-page__recap-value">{projectTypes.join(", ")}</span>
                      <span className="contact-page__recap-edit">Modifica</span>
                    </button>
                    <button type="button" className="contact-page__recap-row" onClick={() => setStepIndex(2)}>
                      <span className="contact-page__recap-label">Tempi</span>
                      <span className="contact-page__recap-value">{timeline}</span>
                      <span className="contact-page__recap-edit">Modifica</span>
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
                        Ho letto e accetto{" "}
                        <Link to="/privacy" target="_blank" rel="noopener noreferrer">
                          l’informativa sulla privacy
                        </Link>
                        .
                      </span>
                    </label>
                    {sendError && (
                      <p className="contact-page__send-error">
                        Qualcosa è andato storto nell’invio. Riprova.
                      </p>
                    )}
                  </div>
                )}

                <InteractiveHoverButton
                  text={sending ? "Invio in corso…" : isLastStep ? "Inviaci la richiesta" : "Avanti"}
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
