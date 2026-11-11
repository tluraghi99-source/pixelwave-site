import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { motion, useScroll, useTransform } from "framer-motion"
import { ShowreelModal } from "@/components/ShowreelModal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { SectionLabel } from "@/components/pw/SectionLabel"
import type { Place } from "@/components/ui/route-globe"
import { useVisionFroms } from "@/hooks/useVisionFroms"
import type { VisionFrom as VisionFromItem } from "@/lib/strapi"

// The globe and its land map are heavy and below the fold: their own chunk.
const RouteGlobe = lazy(() => import("@/components/ui/route-globe").then((m) => ({ default: m.RouteGlobe })))

// Where the arcs start: the studio.
const HUB: Place = { id: "hub", name: "Milano", lon: 9.19, lat: 45.46 }

/** Share of the pinned scroll the globe takes to settle in the middle of the
 *  screen; the rest is a pause with it there. */
const GLOBE_SHARE = 0.8

/** "Vision from": a globe with a dot wherever the studio has shot one of these
 *  videos. Each dot carries the video's title and, under it, the place; click it
 *  and the video opens full screen, growing out of the dot. All of it comes
 *  from the CMS ("Vision from" collection) — with none published nothing
 *  changes and the children (the Services section) are just rendered.
 *
 *  It wraps the Services section: once its bottom comes up to the lower part of
 *  the screen the page stops there, as it is; the globe rises from the bottom
 *  edge, Services fades to black behind it, and the globe settles in the middle
 *  of the screen, as tall as the screen allows; then the title comes in on the
 *  left. Scroll-linked, so it goes as
 *  fast as you do, and back. Then the page goes on. */
export function VisionFrom({ children }: { children: ReactNode }) {
  const items = useVisionFroms()
  const hasItems = items.length > 0

  const wrapRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<{ item: VisionFromItem; origin: DOMRect } | null>(null)

  // The box (Services + the empty strip under it) sticks to the screen with its
  // bottom edge on the screen's bottom edge, so its CSS needs its own height.
  useEffect(() => {
    const box = boxRef.current
    if (!box || !hasItems) return
    const set = () => box.style.setProperty("--vf-box-h", `${box.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(box)
    return () => ro.disconnect()
  }, [hasItems])

  // 0 when the box gets pinned, 1 when the globe has settled.
  const { scrollY } = useScroll()
  const progress = useTransform(scrollY, () => {
    const wrap = wrapRef.current
    const box = boxRef.current
    if (!wrap || !box) return 0
    const stuckTop = parseFloat(getComputedStyle(box).top) || 0
    const length = wrap.offsetHeight - box.offsetHeight
    if (length <= 0) return 0
    const p = (stuckTop - wrap.getBoundingClientRect().top) / length
    return Math.max(0, Math.min(1, p / GLOBE_SHARE))
  })

  // Services fades to black as the globe rises, and stays usable (its rows open
  // on hover) for as long as it can be seen through the veil; the stage takes
  // the pointer only once the veil is complete.
  const VEIL_END = 0.4
  const veilOpacity = useTransform(progress, [0, VEIL_END], [0, 1])
  const stageEvents = useTransform(progress, (p) => (p >= VEIL_END ? "auto" : "none"))
  // The title comes in on the left once the globe is where it stays.
  const titleOpacity = useTransform(progress, [0.82, 1], [0, 1])
  const titleX = useTransform(progress, [0.82, 1], [-40, 0])

  const places = useMemo<Place[]>(
    () => items.map((v) => ({ id: v.id, name: v.title, note: v.location, lon: v.lon, lat: v.lat })),
    [items]
  )

  return (
    <div ref={wrapRef} className={hasItems ? "vf-wrap" : undefined} id={hasItems ? "vision-from" : undefined}>
      <div ref={boxRef} className={hasItems ? "vf-box" : undefined}>
        {children}
        {hasItems && (
          <>
            <div className="vf-gap" aria-hidden="true" />
            <motion.div className="vf-stage" style={{ pointerEvents: stageEvents }} data-screen-label="Vision from">
              <motion.div className="vf-veil" style={{ opacity: veilOpacity }} aria-hidden="true">
                <CursorGlow className="cursor-glow" variant="dark" glow={false} />
              </motion.div>
              <Suspense fallback={null}>
                <RouteGlobe
                  className="vf-globe"
                  hub={HUB}
                  places={places}
                  progress={progress}
                  onSelect={(place, origin) => {
                    const item = items.find((v) => v.id === place.id)
                    if (item) setOpen({ item, origin })
                  }}
                />
              </Suspense>
              <motion.div className="vf-intro" style={{ opacity: titleOpacity, x: titleX }}>
                <div>
                  <SectionLabel number="03">Vision from</SectionLabel>
                  <h2 className="vf-title">Vision from</h2>
                </div>
                <p className="vf-sub">Il mondo è pieno di posti che meritano di essere raccontati. Noi ci andiamo, accendiamo la camera e li guardiamo a modo nostro. Un video alla volta.</p>
              </motion.div>
            </motion.div>
          </>
        )}
      </div>
      {open &&
        createPortal(
          <ShowreelModal
            showreel={open.item.video}
            origin={open.origin}
            originShape="box"
            label={`${open.item.title}, ${open.item.location}`}
            onClose={() => setOpen(null)}
          />,
          document.body
        )}
    </div>
  )
}
