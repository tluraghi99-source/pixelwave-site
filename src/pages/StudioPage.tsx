import { StudioIntro } from "@/components/sections/StudioIntro"
import { StudioTeam } from "@/components/sections/StudioTeam"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  return (
    <>
      <main className="studio-page" data-theme="dark">
        <StudioIntro />
        <StudioTeam />
      </main>
      <Footer />
    </>
  )
}
