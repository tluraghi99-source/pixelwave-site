import { useState, type FormEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check } from "lucide-react"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Input } from "@/components/pw/Input"
import { Button } from "@/components/pw/Button"
import { Reveal } from "@/components/motion/Reveal"
import { EASE_WAVE } from "@/lib/motion"

export function Contact() {
  const [sent, setSent] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <section id="contact" className="sec sec--tint contact" data-screen-label="Contact">
      <div className="wrap contact__grid">
        <div>
          <Reveal>
            <SectionLabel number="04">Start a project</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 style={{ marginTop: "1.25rem" }}>
              Let's make
              <br />
              waves together.
            </h2>
          </Reveal>
        </div>
        <Reveal delay={0.15} y={20}>
          <form className="contact__form" onSubmit={handleSubmit}>
            <Input label="Name" placeholder="Jane Rivera" required disabled={sent} />
            <Input label="Email" type="email" placeholder="you@company.com" required disabled={sent} />
            <Input
              label="About the project"
              placeholder="A few lines on what you need"
              disabled={sent}
            />
            <Button variant="primary" block size="lg" type="submit">
              <AnimatePresence mode="wait" initial={false}>
                {sent ? (
                  <motion.span
                    key="sent"
                    className="contact__submitted"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE_WAVE }}
                  >
                    <Check size={18} /> Message sent
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE_WAVE }}
                  >
                    Send it our way
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </form>
        </Reveal>
      </div>
    </section>
  )
}
