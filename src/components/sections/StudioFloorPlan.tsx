import { useRef } from "react"
import { cubicBezier, motion, useScroll, useTransform } from "framer-motion"
import { EASE_WAVE } from "@/lib/motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { Reveal } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"

// How long each floor stays fully visible before/after the crossfade, and how
// long the crossfade itself takes, in the same vh-budget style as
// WorkReel.tsx's pin constants.
const FLOOR_HOLD_VH = 60
const CROSSFADE_VH = 80
const PIN_HEIGHT_VH = FLOOR_HOLD_VH * 2 + CROSSFADE_VH + 100
const PIN_SCROLL_VH = PIN_HEIGHT_VH / 100 - 1

const CROSSFADE_START_FRACTION = FLOOR_HOLD_VH / 100 / PIN_SCROLL_VH
const CROSSFADE_END_FRACTION = (FLOOR_HOLD_VH + CROSSFADE_VH) / 100 / PIN_SCROLL_VH

const FADE_EASE = cubicBezier(...EASE_WAVE)

/** Clamped 0→1 local progress of v within [start, end]. */
function clampedProgress(v: number, start: number, end: number) {
  if (end <= start) return v >= end ? 1 : 0
  return Math.min(1, Math.max(0, (v - start) / (end - start)))
}

// Traced off the studio's own vector floor plans. The building outline is
// portrait, not landscape (200.3 wide × up to 360.5 tall, confirmed against
// floor.svg — the earlier landscape version was wrong), shared by both
// floors since it's the same building, one floor stacked on the other. The
// stairs wall and landing differ per floor (the notch sits low on Ground,
// high on Underground), so those stay separate rather than shared. Interior
// layout (room proportions, furniture) carries over from the landscape
// version, scaled onto this corrected outline rather than re-derived from
// scratch, since only the outline itself changed.
const OUTLINE = "M0,360.5 L0,0 L200.3,94.9 L200.3,360.5 Z"

/** Short stepped strokes standing in for a staircase, at the source file's
 *  own tread spacing — count and span differ per floor. */
function Treads({ startY, count }: { startY: number; count: number }) {
  const treads = []
  for (let i = 0; i < count; i++) {
    const y = startY + i * 10.7
    treads.push(<line key={i} x1="171.6" y1={y} x2="200.3" y2={y} className="floor-section__tread" />)
  }
  return <>{treads}</>
}

/** A ring of small chairs around a table. */
function Chairs({ positions }: { positions: [number, number][] }) {
  return (
    <>
      {positions.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="4" className="floor-section__detail" />
      ))}
    </>
  )
}

function GroundFloorSVG() {
  return (
    <svg viewBox="-15 -15 230 420" className="floor-plan__svg">
      <path d={OUTLINE} className="floor-section__outline" />
      <line x1="75.5" y1="35.7" x2="75.5" y2="360.5" className="floor-section__divider" />
      <path d="M171.6,81.1 L171.6,308.2 L200.3,308.2" className="floor-section__divider" />
      <line x1="171.6" y1="154.2" x2="200.3" y2="154.2" className="floor-section__divider" />
      {/* A window mullion at the edge of Open Space, as in the source */}
      <line x1="49.2" y1="24.3" x2="49.2" y2="99.5" className="floor-section__detail" />
      {/* A hatched nook at the top of Meeting Room, as textured in the source */}
      <path d="M0,76.8 L75.5,112.3 L75.5,155.3 L0,155.3 Z" className="floor-section__hatch" />
      {/* Meeting Room — a round table with six chairs */}
      <rect x="25.7" y="201.7" width="24.1" height="85" rx="7" className="floor-section__detail" />
      <Chairs positions={[[20.3, 227.8], [20.3, 260.7], [55.2, 227.8], [37.7, 191.6], [37.7, 296.9], [55.2, 260.7]]} />
      {/* Open Space — the dominant zone: a six-part table with six chairs, plus the two tilted openings near the roofline */}
      <polygon points="117.1,56.4 114.6,79.8 75.5,61.5 78,37.9" className="floor-section__detail" />
      <polygon points="160.2,76 157.7,99.5 118.5,81 121.1,57.6" className="floor-section__detail" />
      <rect x="105.6" y="144.4" width="17.8" height="62.8" className="floor-section__detail floor-section__detail--accent" />
      <rect x="105.6" y="207.3" width="17.8" height="62.8" className="floor-section__detail floor-section__detail--accent" />
      <rect x="105.6" y="270.1" width="17.8" height="62.8" className="floor-section__detail floor-section__detail--accent" />
      <rect x="123.5" y="144.4" width="17.8" height="62.8" className="floor-section__detail floor-section__detail--accent" />
      <rect x="123.5" y="207.3" width="17.8" height="62.8" className="floor-section__detail floor-section__detail--accent" />
      <rect x="123.5" y="270.1" width="17.8" height="62.8" className="floor-section__detail floor-section__detail--accent" />
      <Chairs positions={[[100.2, 175.8], [146.9, 175.8], [100.2, 238.8], [146.9, 238.8], [100.2, 301.6], [146.9, 301.6]]} />
      {/* Stairs */}
      <Treads startY={159.5} count={14} />
      <text x="37.9" y="389.6" textAnchor="middle" className="floor-section__zone-label">Meeting Room</text>
      <text x="123.5" y="389.6" textAnchor="middle" className="floor-section__zone-label">Open Space</text>
      <text x="185.9" y="389.6" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
    </svg>
  )
}

function LowerFloorSVG() {
  return (
    <svg viewBox="-15 -15 230 420" className="floor-plan__svg">
      <path d={OUTLINE} className="floor-section__outline" />
      <path d="M171.6,359.7 L171.6,180.2 L200.3,180.2" className="floor-section__divider" />
      <line x1="171.6" y1="184.1" x2="171.6" y2="141.3" className="floor-section__divider" />
      {/* Limbo Set and Chill Area share one open room — no wall between them,
          just furniture groupings, matching the source file. */}
      <rect x="0" y="41.7" width="12.7" height="92.9" className="floor-section__detail" />
      {/* Chill Area — a sectional sofa with two end pieces, and two round
          armchairs, up near the roofline */}
      <rect x="65.6" y="41.6" width="74.8" height="124.5" className="floor-section__detail floor-section__detail--accent" />
      <rect x="71.9" y="45" width="16.3" height="31.8" className="floor-section__detail floor-section__detail--accent" />
      <rect x="131.4" y="72.4" width="13.6" height="30.3" className="floor-section__detail floor-section__detail--accent" />
      <circle cx="66.3" cy="98" r="16" className="floor-section__detail floor-section__detail--accent" />
      <circle cx="145.6" cy="121.4" r="16" className="floor-section__detail floor-section__detail--accent" />
      {/* Limbo Set — a curved corner bench and a low table */}
      <path d="M80,201.5 L18.9,201.5 Q4.8,201.5 4.8,231.1 L4.8,300 Q4.8,329.6 18.9,329.6 L80,329.6 Z" className="floor-section__detail" />
      <rect x="0" y="170.1" width="70.3" height="20.2" className="floor-section__detail" />
      <line x1="0" y1="340.3" x2="171.6" y2="340.3" className="floor-section__divider" />
      {/* A small side table near the stairs */}
      <rect x="150.9" y="219.1" width="20.7" height="92.9" className="floor-section__detail" />
      {/* Stairs */}
      <Treads startY={190.9} count={16} />
      <text x="70.1" y="389.6" textAnchor="middle" className="floor-section__zone-label">Limbo Set</text>
      <text x="98.2" y="14.6" textAnchor="middle" className="floor-section__zone-label">Chill Area</text>
      <text x="185.9" y="389.6" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
    </svg>
  )
}

/** Desktop: pinned, same shape as WorkReel — scroll crosses through a hold on
 *  Floor 1, a crossfade, then a hold on Floor 2, before the section releases. */
function StudioFloorPinned() {
  const pinRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] })

  const floor1Opacity = useTransform(scrollYProgress, (v) =>
    1 - FADE_EASE(clampedProgress(v, CROSSFADE_START_FRACTION, CROSSFADE_END_FRACTION))
  )
  const floor2Opacity = useTransform(scrollYProgress, (v) =>
    FADE_EASE(clampedProgress(v, CROSSFADE_START_FRACTION, CROSSFADE_END_FRACTION))
  )

  return (
    <section
      id="floor-plan"
      className="floor-pin"
      data-theme="dark"
      data-screen-label="Studio Floor Plan"
      ref={pinRef}
    >
      <div className="floor-pin__inner">
        <div className="grain-overlay" aria-hidden="true" />
        <CursorGlow className="cursor-glow" variant="dark" glow={false} />
        <div className="wrap floor-plan">
          <motion.div className="floor-plan__layer" style={{ opacity: floor1Opacity }}>
            <span className="floor-plan__label">Ground Floor</span>
            <GroundFloorSVG />
          </motion.div>
          <motion.div className="floor-plan__layer" style={{ opacity: floor2Opacity }}>
            <span className="floor-plan__label">Underground Floor</span>
            <LowerFloorSVG />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/** Mobile/tablet: no pin — the two floors render as plain stacked blocks,
 *  each fading in once as it scrolls into view, same fallback shape WorkReel
 *  and Services already use for their own pinned desktop sections. */
function StudioFloorAmbient() {
  return (
    <section className="studio-floor-ambient" data-theme="dark" data-screen-label="Studio Floor Plan">
      <div className="grain-overlay" aria-hidden="true" />
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
        <Reveal>
          <div className="floor-plan__layer floor-plan__layer--ambient">
            <span className="floor-plan__label">Ground Floor</span>
            <GroundFloorSVG />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="floor-plan__layer floor-plan__layer--ambient">
            <span className="floor-plan__label">Underground Floor</span>
            <LowerFloorSVG />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function StudioFloorPlan() {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  return isDesktop ? <StudioFloorPinned /> : <StudioFloorAmbient />
}
