import { StudioIntro } from "@/components/sections/StudioIntro"
import { StudioTeam } from "@/components/sections/StudioTeam"
import { StudioFloorPlan } from "@/components/sections/StudioFloorPlan"
import { Footer } from "@/components/sections/Footer"

export function StudioPage() {
  return (
    <>
      <main className="studio-page" data-theme="dark">
        <StudioIntro />
        <StudioTeam />
        <StudioFloorPlan />
      </main>
      <Footer />
    </>
  )
}
