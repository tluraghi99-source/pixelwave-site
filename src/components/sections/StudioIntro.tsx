import { Reveal } from "@/components/motion/Reveal"

// Bright lines read as the primary statement; mid/dim lines are de-emphasized
// supporting copy — matches the wireframe's white-to-grey graduated look.
// Each line still fades/rises in on its own as the block scrolls into view
// (Reveal's per-element viewport trigger) — the two are independent: color
// weight is permanent, the reveal is a one-time entrance animation.
const INTRO_LINES = [
  { text: "We're fourteen people", tone: "bright" },
  { text: "working out of two floors —", tone: "bright" },
  { text: "no open-plan pretending, no ping-pong table.", tone: "mid" },
  { text: "Just a place built for the work.", tone: "dim" },
] as const

export function StudioIntro() {
  return (
    <section className="studio-intro" data-theme="dark" data-screen-label="Studio Intro">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="wrap">
        {INTRO_LINES.map((line, i) => (
          <Reveal key={line.text} delay={i * 0.08}>
            <p className={`studio-intro__line studio-intro__line--${line.tone}`}>{line.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
