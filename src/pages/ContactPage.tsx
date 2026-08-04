import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Input } from "@/components/pw/Input"
import { Tag } from "@/components/pw/Tag"
import { InteractiveHoverButton } from "@/components/pw/InteractiveHoverButton"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CursorHint } from "@/components/motion/CursorHint"
import { EASE_WAVE } from "@/lib/motion"

const STEPS = [
  { key: "detail", label: "Detail" },
  { key: "type", label: "Project type" },
  { key: "when", label: "When" },
] as const

const PROJECT_TYPES = ["Web Design", "Brand Identity", "Motion", "Development"]
const TIMELINES = ["ASAP", "1–3 months", "3–6 months", "Not sure yet"]

export function ContactPage() {
  const [stepIndex, setStepIndex] = useState(0)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [projectType, setProjectType] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const canAdvance =
    step.key === "detail"
      ? name.trim() !== "" && email.trim() !== ""
      : step.key === "type"
        ? projectType !== null
        : timeline !== null

  function handleNext() {
    if (!canAdvance) return
    if (isLastStep) {
      setSent(true)
      return
    }
    setStepIndex((i) => i + 1)
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1))
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
        ? { text: projectType ?? "Pick a project type", isPlaceholder: projectType === null }
        : { text: timeline ?? "Pick a timeline", isPlaceholder: timeline === null }

  const eyebrowText = sent
    ? "Sent"
    : step.key === "detail"
      ? "Tell us who you are"
      : step.key === "type"
        ? "What are we building"
        : "When are you starting"

  return (
    <main>
      <section className="contact-page" data-theme="dark" data-screen-label="Contact">
        <div className="grain-overlay" aria-hidden="true" />
        <CursorGlow className="contact-page__glow" />
        <CursorHint />

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
          <h2 className="contact-page__eyebrow">{eyebrowText}</h2>
          <div
            className={`contact-page__reactive ${reactive.isPlaceholder ? "is-placeholder" : ""}`}
            aria-hidden="true"
          >
            <span className="contact-page__reactive-text">{reactive.text}</span>
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
                        variant={projectType === t ? "orange" : "outline"}
                        onClick={() => setProjectType(t)}
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

                <InteractiveHoverButton
                  text={isLastStep ? "Send it our way" : "Next"}
                  icon={<ArrowRight size={16} />}
                  onClick={handleNext}
                  className={`contact-page__next ${canAdvance ? "" : "contact-page__next--disabled"}`}
                  aria-disabled={!canAdvance}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  )
}
