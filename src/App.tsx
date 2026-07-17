import { Route, Routes } from "react-router-dom"
import { ScrollProgress } from "@/components/ScrollProgress"
import { ScrollToTop } from "@/components/ScrollToTop"
import { CustomCursor } from "@/components/motion/CustomCursor"
import { Header } from "@/components/sections/Header"
import { HomePage } from "@/pages/HomePage"
import { WorkPage } from "@/pages/WorkPage"
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
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </>
  )
}

export default App
