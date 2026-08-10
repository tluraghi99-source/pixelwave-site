import { Reveal } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"

// One continuous sentence, not four separately-revealed lines — matches the
// reference's single wrapping paragraph rather than a stepped scroll reveal.
const INTRO_TEXT =
  "We're fourteen people working out of two floors — no open-plan pretending, no ping-pong table. Just a place built for the work."

/** No more scroll-scrub: a single trigger-once fade/rise, same as every
 *  other ambient section on the site. This sits at the very top of the page
 *  with no runway above it, so it's already in view at mount and just
 *  fades straight in. */
export function StudioIntro() {
  return (
    <section className="studio-intro" data-theme="dark" data-screen-label="Studio Intro">
      <CursorGlow className="cursor-glow" variant="dark" glow />
      <div className="studio-intro__hero" aria-hidden="true" />
      <Reveal className="wrap">
        <p className="studio-intro__line">
          <mark className="studio-intro__mark">{INTRO_TEXT}</mark>
        </p>
      </Reveal>
    </section>
  )
}
