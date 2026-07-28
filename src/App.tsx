import { Route, Routes } from "react-router-dom"
import { ScrollProgress } from "@/components/ScrollProgress"
import { ScrollToTop } from "@/components/ScrollToTop"
import { CustomCursor } from "@/components/motion/CustomCursor"
import { Header } from "@/components/sections/Header"
import { HomePage } from "@/pages/HomePage"
import { WorkPage } from "@/pages/WorkPage"
import { ProjectPage } from "@/pages/ProjectPage"
import { StudioPage } from "@/pages/StudioPage"
import { ContactPage } from "@/pages/ContactPage"

function App() {
  return (
    <>
      <ScrollToTop />
      <CustomCursor />
      <ScrollProgress />
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/work" element={<WorkPage />} />
        <Route path="/work/:slug" element={<ProjectPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </>
  )
}

export default App
