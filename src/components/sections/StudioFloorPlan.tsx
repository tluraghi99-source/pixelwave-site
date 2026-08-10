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

// Traced directly off the studio's own vector floor plan (floor.svg), not
// redrawn from a photo of the sketch — every coordinate below is that file's,
// just translated so each floor's own top-left corner sits at (0,0). Both
// floors share the exact same building envelope (285.6 × up to 246.1, top
// edge a single diagonal the full width, no flat segment) since it's the
// same building, one floor stacked on the other.
const OUTLINE = "M0,246.1 L0,0 L285.6,64.8 L285.6,246.1 Z"
// The Open Space/Stairs wall, same on both floors since it's the same
// stairwell — a straight run down from the roofline, then a short jog to
// the building's right wall (matching the source file's own dogleg).
const STAIRS_WALL = "M244.6,55.4 L244.6,210.5 L285.6,210.5"
const STAIRS_LANDING = { x1: 244.6, y1: 123.1, x2: 285.6, y2: 123.1 }

/** Short stepped strokes standing in for a staircase, at the source file's
 *  own tread spacing (~7.3 apart) — count and span differ slightly per
 *  floor, matching the two files. */
function Treads({ startY, count }: { startY: number; count: number }) {
  const treads = []
  for (let i = 0; i < count; i++) {
    const y = startY + i * 7.3
    treads.push(<line key={i} x1="244.6" y1={y} x2="285.6" y2={y} className="floor-section__tread" />)
  }
  return <>{treads}</>
}

/** A ring of small chairs around a table, at the source file's own radius. */
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
    <svg viewBox="-15 -15 320 300" className="floor-plan__svg">
      <path d={OUTLINE} className="floor-section__outline" />
      <line x1="107.7" y1="24.4" x2="107.7" y2="246.1" className="floor-section__divider" />
      <path d={STAIRS_WALL} className="floor-section__divider" />
      <line {...STAIRS_LANDING} className="floor-section__divider" />
      {/* A hatched nook at the top of Meeting Room, as textured in the source */}
      <path d="M0,52.5 L107.7,76.8 L107.7,106 L0,106 Z" className="floor-section__hatch" />
      {/* Meeting Room — a round table with six chairs */}
      <rect x="36.7" y="137.8" width="34.4" height="58" rx="6.9" className="floor-section__detail" />
      <Chairs positions={[[28.9, 155.5], [28.9, 178], [78.8, 155.5], [53.8, 130.8], [53.8, 202.7], [78.8, 178]]} />
      {/* Open Space — the dominant zone: a six-part table with six chairs, plus the small tilted opening near the roofline */}
      <polygon points="216.5,48.6 212.5,66.4 150.7,52.5 154.7,34.7" className="floor-section__detail" />
      <rect x="150.7" y="90.7" width="25.4" height="42.9" className="floor-section__detail floor-section__detail--accent" />
      <rect x="176.1" y="90.7" width="25.4" height="42.9" className="floor-section__detail floor-section__detail--accent" />
      <rect x="150.7" y="133.7" width="25.4" height="42.9" className="floor-section__detail floor-section__detail--accent" />
      <rect x="176.1" y="133.7" width="25.4" height="42.9" className="floor-section__detail floor-section__detail--accent" />
      <rect x="150.7" y="176.6" width="25.4" height="42.9" className="floor-section__detail floor-section__detail--accent" />
      <rect x="176.1" y="176.6" width="25.4" height="42.9" className="floor-section__detail floor-section__detail--accent" />
      <Chairs positions={[[142.8, 112.2], [209.4, 112.2], [142.8, 155.1], [209.4, 155.1], [142.8, 198], [209.4, 198]]} />
      {/* Stairs */}
      <Treads startY={130.3} count={11} />
      <text x="54" y="266" textAnchor="middle" className="floor-section__zone-label">Meeting Room</text>
      <text x="176" y="266" textAnchor="middle" className="floor-section__zone-label">Open Space</text>
      <text x="265" y="266" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
    </svg>
  )
}

function LowerFloorSVG() {
  return (
    <svg viewBox="-15 -15 320 300" className="floor-plan__svg">
      <path d={OUTLINE} className="floor-section__outline" />
      <path d={STAIRS_WALL} className="floor-section__divider" />
      <line {...STAIRS_LANDING} className="floor-section__divider" />
      {/* Limbo Set and Chill Area share one open room — no wall between them,
          just furniture groupings, matching the source file. */}
      <rect x="0" y="28.5" width="18.1" height="63.4" className="floor-section__detail" />
      {/* Chill Area — a sofa and two rounded armchairs */}
      <polygon points="166,38 160.9,61 99,47.4 104.4,23.7" className="floor-section__detail floor-section__detail--accent" />
      <circle cx="90" cy="55" r="12" className="floor-section__detail floor-section__detail--accent" />
      <circle cx="180" cy="110" r="12" className="floor-section__detail floor-section__detail--accent" />
      <polygon points="173.7,93.8 170.4,108.5 70.9,86.5 75.6,66.1" className="floor-section__detail" />
      {/* Limbo Set — a curved corner bench and a low table */}
      <path d="M76.4,137.6 L27,137.6 Q6.8,137.6 6.8,157.8 L6.8,204.7 Q6.8,224.9 27,224.9 L98,224.9" className="floor-section__detail" />
      <rect x="0" y="116.2" width="100.2" height="13.7" className="floor-section__detail" />
      <line x1="82.3" y1="110.3" x2="150.8" y2="124.9" className="floor-section__detail" />
      <line x1="0" y1="232.3" x2="244.6" y2="232.3" className="floor-section__divider" />
      {/* A small side table near the stairs */}
      <rect x="208" y="149.6" width="29.5" height="63.4" className="floor-section__detail" />
      {/* Stairs */}
      <Treads startY={130.3} count={16} />
      <text x="100" y="266" textAnchor="middle" className="floor-section__zone-label">Limbo Set</text>
      <text x="140" y="10" textAnchor="middle" className="floor-section__zone-label">Chill Area</text>
      <text x="265" y="266" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
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
