import { usePageMeta } from "@/hooks/usePageMeta"
import { StudioStats } from "@/components/sections/StudioStats"
import { StudioTeam } from "@/components/sections/StudioTeam"
import { StudioGallery } from "@/components/sections/StudioGallery"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  usePageMeta(
    "Studio — PixelWave",
    "Conosci il team di PixelWave e guarda dentro lo studio dove ogni progetto prende forma."
  )
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
