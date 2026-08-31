import { StudioIntro } from "@/components/sections/StudioIntro"
import { StudioTeam } from "@/components/sections/StudioTeam"
import { StudioGallery } from "@/components/sections/StudioGallery"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  return (
    <>
      <main className="studio-page" data-theme="dark">
        <StudioIntro />
        <StudioTeam />
        <StudioGallery />
      </main>
      <Footer />
    </>
  )
}
