import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"
import { Input } from "@/components/pw/Input"
import { Tag } from "@/components/pw/Tag"
import { InteractiveHoverButton } from "@/components/pw/InteractiveHoverButton"
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

  return (
    <main>
      <section className="contact-page" data-theme="dark" data-screen-label="Contact">
        <div className="grain-overlay" aria-hidden="true" />
        <div className="wrap contact-page__body">
          <div className="contact-page__left">
            <nav className="contact-page__steps" aria-label="Contact form steps">
              {STEPS.map((s, i) => {
                const state = i === stepIndex ? "active" : i < stepIndex ? "done" : "upcoming"
                return (
                  <button
                    key={s.key}
                    type="button"
                    className={`contact-page__step contact-page__step--${state}`}
                    disabled={i > stepIndex || sent}
                    onClick={() => setStepIndex(i)}
                  >
                    {s.label}
                  </button>
                )
              })}
            </nav>

            <AnimatePresence mode="wait">
              <motion.div
                key={sent ? "sent" : step.key}
                className="contact-page__step-giant"
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                exit={{ clipPath: "inset(0 0 0 100%)" }}
                transition={{ duration: 0.5, ease: EASE_WAVE }}
              >
                <span className="contact-page__step-giant-num">
                  {sent ? "Sent" : `Step ${stepIndex + 1} / ${STEPS.length}`}
                </span>
                <h2 className="contact-page__step-giant-title">{sent ? "Thanks!" : step.label}</h2>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="contact-page__panel">
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE_WAVE }}
                >
                  <h2 className="contact-page__heading">
                    <Check className="contact-page__sent-icon" size={28} />
                    Thanks, {name.split(" ")[0] || "there"}!
                  </h2>
                  <p className="contact-page__lead">We'll be in touch shortly.</p>
                </motion.div>
              ) : (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE_WAVE }}
                >
                  {step.key === "detail" && (
                    <>
                      <h2 className="contact-page__heading">Leave your details</h2>
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
                    </>
                  )}

                  {step.key === "type" && (
                    <>
                      <h2 className="contact-page__heading">What are we building?</h2>
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
                    </>
                  )}

                  {step.key === "when" && (
                    <>
                      <h2 className="contact-page__heading">When are you looking to start?</h2>
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
                    </>
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
        </div>

        <h2 className="contact-page__giant" aria-hidden="true">
          Let's chat!
        </h2>
      </section>
    </main>
  )
}
