import { useState } from "react"
import { usePageMeta } from "@/hooks/usePageMeta"
import { Preloader } from "@/components/Preloader"
import { Hero } from "@/components/sections/Hero"
import { TickerStrip } from "@/components/sections/TickerStrip"
import { WorkReel } from "@/components/sections/WorkReel"
import { Services } from "@/components/sections/Services"
import { Footer } from "@/components/sections/Footer"

export function HomePage() {
  usePageMeta(
    "PixelWave — Your Vision, Our Wave",
    "PixelWave è uno studio creativo per video, foto, branding, web design, social ed eventi: dall’idea alla consegna finale."
  )
  const [introDone, setIntroDone] = useState(false)

  return (
    <>
      <Preloader onReveal={() => setIntroDone(true)} />
      <div id="top" />
      <Hero introDone={introDone} />
      <div className="page-content">
        <main>
          <WorkReel ctaHeadline="Hai una wave in mente?" />
          <TickerStrip />
          <Services />
        </main>
        <Footer />
      </div>
    </>
  )
}
