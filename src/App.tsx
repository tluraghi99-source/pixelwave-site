import { lazy, Suspense, useEffect } from "react"
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom"
import { ScrollProgress } from "@/components/ScrollProgress"
import { ScrollToTop } from "@/components/ScrollToTop"
import { CookieConsent } from "@/components/CookieConsent"
import { CustomCursor } from "@/components/motion/CustomCursor"
import { Header } from "@/components/sections/Header"
import { HomePage } from "@/pages/HomePage"
import { ROUTES, projectPath } from "@/lib/routes"
import { initClickTracking } from "@/lib/analytics"

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
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })))
const CookiePolicyPage = lazy(() =>
  import("@/pages/CookiePolicyPage").then((m) => ({ default: m.CookiePolicyPage }))
)
const PrivacyPolicyPage = lazy(() =>
  import("@/pages/PrivacyPolicyPage").then((m) => ({ default: m.PrivacyPolicyPage }))
)

/** Old English addresses (shared or indexed before the Italian ones) land on
 *  the new page, keeping any ?query. */
function Redirect({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}
function RedirectProject() {
  const { slug = "" } = useParams()
  const { search } = useLocation()
  return <Navigate to={`${projectPath(slug)}${search}`} replace />
}

function App() {
  // Contact-CTA, phone and email click events (sent only after consent).
  useEffect(() => initClickTracking(), [])

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
          <Route path={ROUTES.work} element={<WorkPage />} />
          <Route path={`${ROUTES.work}/:slug`} element={<ProjectPage />} />
          <Route path={ROUTES.studio} element={<StudioPage />} />
          <Route path={ROUTES.contact} element={<ContactPage />} />
          <Route path={ROUTES.careers} element={<CareersPage />} />
          <Route path={ROUTES.privacy} element={<PrivacyPolicyPage />} />
          <Route path={ROUTES.cookies} element={<CookiePolicyPage />} />
          {/* Old English addresses */}
          <Route path="/work" element={<Redirect to={ROUTES.work} />} />
          <Route path="/work/:slug" element={<RedirectProject />} />
          <Route path="/contact" element={<Redirect to={ROUTES.contact} />} />
          <Route path="/careers" element={<Redirect to={ROUTES.careers} />} />
          {/* Catch-all — any URL that doesn't match one of the routes above
              (a typo, an old bookmark, a dead external link) used to render
              nothing at all: no route matched, so React Router mounted
              nothing. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <CookieConsent />
    </>
  )
}

export default App
