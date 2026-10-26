import { ArrowUpRight } from "lucide-react"
import { usePageMeta } from "@/hooks/usePageMeta"
import { useNoIndex } from "@/hooks/useNoIndex"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Button } from "@/components/pw/Button"
import { Reveal } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { Footer } from "@/components/sections/Footer"
import mascot from "@/assets/mascot.svg"
import { ROUTES } from "@/lib/routes"

/** No route matched. A surf/wave pun fits the brand's own voice better than
 *  a generic "page not found" — the homepage's own CTA already asks "Got a
 *  wave in mind?", so this plays the same game. The studio's own mascot
 *  (camera in hand) is the visual centerpiece, purely decorative — alt=""
 *  since it adds nothing a screen reader needs beyond the text already
 *  saying the page is missing. */
export function NotFoundPage() {
  usePageMeta("Pagina non trovata — PixelWave", "Questa pagina è stata spazzata via. Ti riportiamo a riva.")
  useNoIndex()

  return (
    <>
      <main className="not-found" data-theme="dark" data-screen-label="Not Found">
        <CursorGlow className="cursor-glow" variant="dark" glow />
        <div className="wrap not-found__content">
          <Reveal>
            <img src={mascot} alt="" className="not-found__mascot" />
          </Reveal>
          <Reveal delay={0.1}>
            <SectionLabel number="404">Pagina non trovata</SectionLabel>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="lead">Spazzata via.</p>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="secbody">
              Questa pagina non esiste, è stata spostata o è finita tra gli scarti del montaggio.
              Per fortuna c’è ancora qualcuno qui fuori a girare.
            </p>
          </Reveal>
          <Reveal delay={0.25} className="not-found__actions">
            <Button href="/" iconRight={<ArrowUpRight size={16} />}>
              Torna alla home
            </Button>
            <Button href={ROUTES.work} variant="secondary">
              Guarda i nostri lavori
            </Button>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  )
}
