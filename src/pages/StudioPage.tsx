import { usePageMeta } from "@/hooks/usePageMeta"
import { StudioStats } from "@/components/sections/StudioStats"
import { StudioTeam } from "@/components/sections/StudioTeam"
import { StudioGallery } from "@/components/sections/StudioGallery"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  usePageMeta(
    "Studio — PixellWave",
    "Meet the PixellWave team and take a look inside the studio where every project comes together."
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
