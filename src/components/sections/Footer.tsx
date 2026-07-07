import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { FitText } from "@/components/motion/FitText"

const SOCIALS = [
  { label: "Instagram", href: "#" },
  { label: "Tiktok", href: "#" },
  { label: "LinkedIn", href: "#" },
]

export function Footer() {
  return (
    <footer data-screen-label="Footer">
      <div className="wrap foot__row">
        <Reveal className="foot__addr">
          <span>Milano, Italia</span>
        </Reveal>

        <RevealGroup className="foot__social" stagger={0.06}>
          {SOCIALS.map((s) => (
            <RevealItem key={s.label}>
              <a className="foot__social-link" href={s.href}>
                {s.label}
              </a>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal className="foot__cta-wrap" delay={0.1}>
          <a className="foot__cta" href="#contact">
            Let's chat
          </a>
        </Reveal>
      </div>

      <FitText
        text="YourVisionOurWave"
        className="foot__giant"
        textClassName="foot__giant-text"
        aria-hidden="true"
      />
    </footer>
  )
}
