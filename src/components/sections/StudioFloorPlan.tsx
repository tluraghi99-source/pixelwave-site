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

// Both floors share the same real footprint traced from the studio's own
// floor plan sketch: a top-down outline with one corner cut at a shallow
// angle (the building's actual angled wall), not an invented isometric
// layout. Bespoke per floor (not data-driven) since the two shapes only
// differ in their internal zones/details, not worth a generic layout system
// for just two illustrations.
const OUTLINE = "M60,280 L60,40 L260,40 L580,170 L580,280 Z"
// Where the cut-corner nook (Stairs, on both floors) starts — the diagonal's
// y-value at this x, used to anchor the divider and the treads/chill detail
// against the sloped wall instead of a plain vertical.
const NOOK_X = 430
const NOOK_TOP_Y = 109

/** Short stepped strokes standing in for a staircase, climbing from
 *  (x1,y1) to (x2,y2) — used in the cut-corner nook on both floors. */
function Treads({ x1, y1, x2, y2, count = 5 }: { x1: number; y1: number; x2: number; y2: number; count?: number }) {
  const treads = []
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const cx = x1 + (x2 - x1) * t
    const cy = y1 + (y2 - y1) * t
    treads.push(<line key={i} x1={cx - 20} y1={cy} x2={cx + 20} y2={cy} className="floor-section__tread" />)
  }
  return <>{treads}</>
}

function GroundFloorSVG() {
  return (
    <svg viewBox="20 0 640 320" className="floor-plan__svg">
      <path d={OUTLINE} className="floor-section__outline" />
      <line x1="190" y1="40" x2="190" y2="280" className="floor-section__divider" />
      <line x1={NOOK_X} y1={NOOK_TOP_Y} x2={NOOK_X} y2="280" className="floor-section__divider" />
      {/* Meeting Room — a doorway opening */}
      <rect x="105" y="150" width="50" height="90" className="floor-section__detail" />
      {/* Open Space — the dominant zone, a tall opening reading as its own volume */}
      <rect x="275" y="80" width="70" height="170" className="floor-section__detail floor-section__detail--accent" />
      {/* Stairs, tucked into the cut corner */}
      <Treads x1={450} y1={262} x2={560} y2={180} />
      <text x="125" y="300" textAnchor="middle" className="floor-section__zone-label">Meeting Room</text>
      <text x="310" y="300" textAnchor="middle" className="floor-section__zone-label">Open Space</text>
      <text x="505" y="300" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
    </svg>
  )
}

function LowerFloorSVG() {
  return (
    <svg viewBox="20 0 640 320" className="floor-plan__svg">
      <path d={OUTLINE} className="floor-section__outline" />
      <line x1={NOOK_X} y1={NOOK_TOP_Y} x2={NOOK_X} y2="280" className="floor-section__divider" />
      {/* Limbo Set — a shooting-set stand-in: a bench and two low seats */}
      <rect x="110" y="90" width="160" height="14" className="floor-section__detail" />
      <circle cx="220" cy="180" r="16" className="floor-section__detail" />
      <circle cx="300" cy="170" r="14" className="floor-section__detail" />
      {/* Chill Area — a small nook right at the cut corner */}
      <rect x="455" y="75" width="90" height="45" className="floor-section__detail floor-section__detail--accent" />
      {/* Stairs, below the Chill Area in the same corner */}
      <Treads x1={450} y1={262} x2={555} y2={195} count={4} />
      <text x="190" y="300" textAnchor="middle" className="floor-section__zone-label">Limbo Set</text>
      <text x="500" y="65" textAnchor="middle" className="floor-section__zone-label">Chill Area</text>
      <text x="505" y="300" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
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
            <span className="floor-plan__label">Floor Below</span>
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
            <span className="floor-plan__label">Floor Below</span>
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
