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
    "PixellWave — Your Vision, Our Wave",
    "PixellWave is a creative studio for video, photo, branding, web design, social and events — from concept to final delivery."
  )
  const [introDone, setIntroDone] = useState(false)

  return (
    <>
      <Preloader onReveal={() => setIntroDone(true)} />
      <div id="top" />
      <Hero introDone={introDone} />
      <div className="page-content">
        <main>
          <WorkReel ctaHeadline="Got a wave in mind?" />
          <TickerStrip />
          <Services />
        </main>
        <Footer />
      </div>
    </>
  )
}
