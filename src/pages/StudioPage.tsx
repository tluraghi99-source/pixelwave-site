import { StudioStats } from "@/components/sections/StudioStats"
import { StudioTeam } from "@/components/sections/StudioTeam"
import { StudioGallery } from "@/components/sections/StudioGallery"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  return (
    <>
      <main className="studio-page" data-theme="dark">
        <StudioStats />
        <StudioTeam />
        <StudioGallery />
      </main>
      <Footer />
    </>
  )
}
