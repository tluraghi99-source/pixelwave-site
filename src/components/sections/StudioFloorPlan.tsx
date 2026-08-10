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

// Both floors share the same real footprint: a room with a mono-pitch roof
// (full height on the left, sloping down to a lower eave on the right),
// traced from the studio's own hand-drawn floor plan sketch rather than an
// invented isometric layout. Bespoke per floor (not data-driven) since the
// two shapes only differ in their internal zones/details, not worth a
// generic layout system for just two illustrations.
const OUTLINE = "M60,280 L60,40 L420,40 L600,140 L600,280 Z"

/** Short stepped strokes standing in for a staircase, climbing from
 *  (x1,y1) to (x2,y2) — used under the sloped-roof zone on both floors. */
function Treads({ x1, y1, x2, y2, count = 5 }: { x1: number; y1: number; x2: number; y2: number; count?: number }) {
  const treads = []
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const cx = x1 + (x2 - x1) * t
    const cy = y1 + (y2 - y1) * t
    treads.push(<line key={i} x1={cx - 22} y1={cy} x2={cx + 22} y2={cy} className="floor-section__tread" />)
  }
  return <>{treads}</>
}

function GroundFloorSVG() {
  return (
    <svg viewBox="20 0 640 320" className="floor-plan__svg">
      <path d={OUTLINE} className="floor-section__outline" />
      <line x1="220" y1="40" x2="220" y2="280" className="floor-section__divider" />
      <line x1="420" y1="40" x2="420" y2="280" className="floor-section__divider" />
      {/* Meeting Room — a doorway opening */}
      <rect x="115" y="150" width="60" height="100" className="floor-section__detail" />
      {/* Open Space — a taller opening, reading as the room's own volume */}
      <rect x="280" y="80" width="80" height="180" className="floor-section__detail floor-section__detail--accent" />
      {/* Stairs, climbing under the sloped roof */}
      <Treads x1={440} y1={262} x2={580} y2={165} />
      <text x="140" y="300" textAnchor="middle" className="floor-section__zone-label">Meeting Room</text>
      <text x="320" y="300" textAnchor="middle" className="floor-section__zone-label">Open Space</text>
      <text x="510" y="300" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
    </svg>
  )
}

function LowerFloorSVG() {
  return (
    <svg viewBox="20 0 640 320" className="floor-plan__svg">
      <path d={OUTLINE} className="floor-section__outline" />
      <line x1="420" y1="40" x2="420" y2="280" className="floor-section__divider" />
      {/* Limbo Set — a shooting-set stand-in: a low bench and a stool */}
      <rect x="110" y="225" width="140" height="16" className="floor-section__detail" />
      <circle cx="330" cy="245" r="18" className="floor-section__detail" />
      {/* Chill Area — a small nook tucked under the eave */}
      <rect x="480" y="70" width="90" height="55" className="floor-section__detail floor-section__detail--accent" />
      {/* Stairs, climbing up to meet the Chill Area */}
      <Treads x1={440} y1={262} x2={560} y2={180} count={4} />
      <text x="180" y="300" textAnchor="middle" className="floor-section__zone-label">Limbo Set</text>
      <text x="525" y="145" textAnchor="middle" className="floor-section__zone-label">Chill Area</text>
      <text x="500" y="300" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
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
