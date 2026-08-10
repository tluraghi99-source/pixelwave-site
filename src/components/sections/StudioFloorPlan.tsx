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
// Traced at the sketch's own proportions (roughly 1.4:1, not the ~2:1 this
// used to be) — that aspect ratio is what actually reads as "the shape",
// more than any single wall or divider.
const OUTLINE = "M60,460 L60,60 L201,60 L615,174 L615,460 Z"
// Where the Stairs nook starts — same x on both floors since a stairwell has
// to line up between them — and the diagonal's y-value there, used to anchor
// the divider and treads against the sloped wall instead of a plain vertical.
const NOOK_X = 540
const NOOK_TOP_Y = 153

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
    <svg viewBox="0 0 700 520" className="floor-plan__svg">
      <path d={OUTLINE} className="floor-section__outline" />
      <line x1="263" y1="60" x2="263" y2="460" className="floor-section__divider" />
      <line x1={NOOK_X} y1={NOOK_TOP_Y} x2={NOOK_X} y2="460" className="floor-section__divider" />
      {/* A small structural nook in the corner, hatched in the original sketch */}
      <path d="M60,155 L170,155 L60,215 Z" className="floor-section__hatch" />
      {/* Meeting Room — a round table */}
      <rect x="125" y="300" width="110" height="110" rx="28" className="floor-section__detail" />
      {/* Open Space — the dominant zone: a long table, plus the small opening near the roofline */}
      <rect x="366" y="137" width="125" height="40" className="floor-section__detail" />
      <rect x="366" y="249" width="125" height="170" className="floor-section__detail floor-section__detail--accent" />
      {/* Stairs, tucked into the cut corner */}
      <Treads x1={577} y1={440} x2={577} y2={200} count={6} />
      <text x="161" y="480" textAnchor="middle" className="floor-section__zone-label">Meeting Room</text>
      <text x="402" y="480" textAnchor="middle" className="floor-section__zone-label">Open Space</text>
      <text x="577" y="480" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
    </svg>
  )
}

function LowerFloorSVG() {
  return (
    <svg viewBox="0 0 700 520" className="floor-plan__svg">
      <path d={OUTLINE} className="floor-section__outline" />
      <line x1={NOOK_X} y1={NOOK_TOP_Y} x2={NOOK_X} y2="460" className="floor-section__divider" />
      {/* Limbo Set and Chill Area share one open room — no wall between them,
          just two furniture groupings, matching the sketch. */}
      <rect x="76" y="104" width="34" height="152" className="floor-section__detail" />
      {/* Chill Area — a low sofa with two ottomans */}
      <rect x="176" y="120" width="265" height="60" rx="14" className="floor-section__detail floor-section__detail--accent" />
      <circle cx="160" cy="150" r="24" className="floor-section__detail floor-section__detail--accent" />
      <circle cx="460" cy="150" r="24" className="floor-section__detail floor-section__detail--accent" />
      {/* Limbo Set — a curved corner bench */}
      <path d="M100,440 L100,350 Q100,300 160,300 L340,300" className="floor-section__detail" />
      {/* Stairs, in the same corner nook as the ground floor above */}
      <Treads x1={577} y1={440} x2={577} y2={200} count={6} />
      <text x="150" y="480" textAnchor="middle" className="floor-section__zone-label">Limbo Set</text>
      <text x="308" y="105" textAnchor="middle" className="floor-section__zone-label">Chill Area</text>
      <text x="577" y="480" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
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
