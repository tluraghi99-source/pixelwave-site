import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/pw/Button"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Reveal } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"

interface CtaBandProps {
  /** No `number` — this is an interstitial nudge, not a numbered content
   *  section, so it doesn't compete with the page's real 01/02 sequence
   *  (Selected Work / Services). */
  label?: string
  headline: string
  buttonLabel?: string
  href?: string
}

/** Full-bleed dark banner: eyebrow, one bold headline, one button. Reusable
 *  between any two sections that need a breather with a nudge toward
 *  contact — first used on the homepage, between the work carousel and the
 *  Ticker/Services black block. */
export function CtaBand({
  label = "Let's talk",
  headline,
  buttonLabel = "Start a project",
  href = "/contact",
}: CtaBandProps) {
  return (
    <section className="sec sec--dark cta-band" data-theme="dark" data-screen-label="CTA">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap cta-band__inner">
        <div className="cta-band__copy">
          <Reveal>
            <SectionLabel>{label}</SectionLabel>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="cta-band__headline">{headline}</p>
          </Reveal>
        </div>
        <Reveal delay={0.16} className="cta-band__cta">
          <Button variant="primary" size="md" href={href} iconRight={<ArrowUpRight size={18} />}>
            {buttonLabel}
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
