import { lazy, Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import { ScrollProgress } from "@/components/ScrollProgress"
import { ScrollToTop } from "@/components/ScrollToTop"
import { CustomCursor } from "@/components/motion/CustomCursor"
import { Header } from "@/components/sections/Header"
import { HomePage } from "@/pages/HomePage"

// Route-level code splitting: each of these ships as its own chunk, fetched
// on first visit, instead of all five pages' code (and everything they
// import) living in one bundle every visitor downloads just to see the
// homepage. HomePage itself stays a normal, eager import above — lazy-
// loading the route almost everyone lands on first would add a network
// round-trip (fetch the main bundle, discover the dynamic import, fetch the
// chunk) to every first visit's largest-contentful-paint, which measured out
// as a real regression (LCP roughly tripled) when tried. Named (not
// default) exports, so each loader unwraps the one export React.lazy
// needs — no change to the page files themselves.
const WorkPage = lazy(() => import("@/pages/WorkPage").then((m) => ({ default: m.WorkPage })))
const ProjectPage = lazy(() => import("@/pages/ProjectPage").then((m) => ({ default: m.ProjectPage })))
const StudioPage = lazy(() => import("@/pages/StudioPage").then((m) => ({ default: m.StudioPage })))
const ContactPage = lazy(() => import("@/pages/ContactPage").then((m) => ({ default: m.ContactPage })))
const CareersPage = lazy(() => import("@/pages/CareersPage").then((m) => ({ default: m.CareersPage })))

function App() {
  return (
    <>
      <ScrollToTop />
      <CustomCursor />
      <ScrollProgress />
      <Header />
      {/* fallback={null}: a route chunk not yet fetched renders nothing for
          that brief gap, rather than introducing a spinner/skeleton that
          wasn't part of the design — same visual result as a slow load
          today, just possible on first visit to each route instead of
          only on the very first page load. */}
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/work" element={<WorkPage />} />
          <Route path="/work/:slug" element={<ProjectPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/careers" element={<CareersPage />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
