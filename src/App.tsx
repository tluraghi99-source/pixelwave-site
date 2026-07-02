import { useState } from "react"
import { Preloader } from "@/components/Preloader"
import { ScrollProgress } from "@/components/ScrollProgress"
import { Header } from "@/components/sections/Header"
import { Hero } from "@/components/sections/Hero"
import { TickerStrip } from "@/components/sections/TickerStrip"
import { Work } from "@/components/sections/Work"
import { Studio } from "@/components/sections/Studio"
import { Services } from "@/components/sections/Services"
import { Contact } from "@/components/sections/Contact"
import { Footer } from "@/components/sections/Footer"

function App() {
  const [introDone, setIntroDone] = useState(false)

  return (
    <>
      <Preloader onReveal={() => setIntroDone(true)} />
      <ScrollProgress />
      <Header />
      <div id="top" />
      <Hero introDone={introDone} />
      <div className="page-content">
        <main>
          <TickerStrip />
          <Work />
          <Studio />
          <Services />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  )
}

export default App
