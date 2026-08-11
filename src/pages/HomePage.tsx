import { useState } from "react"
import { Preloader } from "@/components/Preloader"
import { Hero } from "@/components/sections/Hero"
import { TickerStrip } from "@/components/sections/TickerStrip"
import { WorkReel } from "@/components/sections/WorkReel"
import { Services } from "@/components/sections/Services"
import { Footer } from "@/components/sections/Footer"

export function HomePage() {
  const [introDone, setIntroDone] = useState(false)

  return (
    <>
      <Preloader onReveal={() => setIntroDone(true)} />
      <div id="top" />
      <Hero introDone={introDone} />
      <div className="page-content">
        <main>
          <WorkReel />
          <TickerStrip />
          <Services />
        </main>
        <Footer />
      </div>
    </>
  )
}
