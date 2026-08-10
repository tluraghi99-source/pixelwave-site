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

// The outline is traced directly off the studio's first-floor/basement
// files: portrait, 200.3 wide × 360.5 tall, roofline diagonal from (0,0) to
// (200.3,45.3). (An earlier version had that last y wrong — 94.9, derived by
// mis-scaling the old landscape file's number instead of just reading this
// one — which is what made the roofline look over-steep.) Shared by both
// floors since it's the same building, one floor stacked on the other.
//
// The table/chair/stairs furniture in those same files turned out to be
// separate reference objects on the page, not composited into the room (they
// sit ~80 units apart with inconsistent relative scale), so their absolute
// positions there aren't usable. What's below keeps each piece's own true
// proportions (uniformly scaled, never stretched on one axis only) from the
// last composited file, and places them by hand in the taller room — the
// stairs run longer, other furniture sits deeper in the added floor space.
const OUTLINE = "M0,360.5 L0,0 L200.3,45.3 L200.3,360.5 Z"

/** Short stepped strokes standing in for a staircase — count/spacing/start
 *  differ per floor since the two stairs runs aren't the same length. */
function Treads({ startY, count, step }: { startY: number; count: number; step: number }) {
  const treads = []
  for (let i = 0; i < count; i++) {
    const y = startY + i * step
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
      <line x1="75.5" y1="0" x2="75.5" y2="360.5" className="floor-section__divider" />
      <path d="M171.6,39 L171.6,320 L200.3,320" className="floor-section__divider" />
      <line x1="171.6" y1="130" x2="200.3" y2="130" className="floor-section__divider" />
      {/* A window mullion at the edge of Open Space, as in the source */}
      <line x1="49.2" y1="11.6" x2="49.2" y2="47.6" className="floor-section__detail" />
      {/* A hatched nook at the top of Meeting Room, as textured in the source */}
      <path d="M0,36.8 L75.5,53.8 L75.5,74.4 L0,74.4 Z" className="floor-section__hatch" />
      {/* Meeting Room — a round table with six chairs. Position derived from
          the source file's real relative depth in the room (its table sits
          ~59% of the way down), not guessed. */}
      <rect x="16.4" y="173.1" width="42.7" height="72" rx="4.6" className="floor-section__detail" />
      <Chairs positions={[[6.8, 195.2], [6.8, 223.1], [68.7, 195.2], [37.7, 164.5], [37.7, 253.8], [68.7, 223.1]]} />
      {/* Open Space — the dominant zone: a six-part table with six chairs at
          the same real relative depth as the Meeting Room table, plus the
          two tilted openings near the roofline */}
      <polygon points="117.1,27 114.6,38.2 75.5,29.5 78,18.2" className="floor-section__detail" />
      <polygon points="160.2,36.4 157.7,47.6 118.5,38.8 121.1,27.6" className="floor-section__detail" />
      <rect x="92" y="129.2" width="31.6" height="53.3" className="floor-section__detail floor-section__detail--accent" />
      <rect x="123.5" y="129.2" width="31.6" height="53.3" className="floor-section__detail floor-section__detail--accent" />
      <rect x="92" y="182.4" width="31.6" height="53.3" className="floor-section__detail floor-section__detail--accent" />
      <rect x="123.5" y="182.4" width="31.6" height="53.3" className="floor-section__detail floor-section__detail--accent" />
      <rect x="92" y="235.7" width="31.6" height="53.3" className="floor-section__detail floor-section__detail--accent" />
      <rect x="123.5" y="235.7" width="31.6" height="53.3" className="floor-section__detail floor-section__detail--accent" />
      <Chairs positions={[[82.2, 155.8], [164.9, 155.8], [82.2, 209.1], [164.9, 209.1], [82.2, 262.4], [164.9, 262.4]]} />
      {/* Stairs — a longer run now the building's taller */}
      <Treads startY={140} count={20} step={9} />
      <text x="37.9" y="345" textAnchor="middle" className="floor-section__zone-label">Meeting Room</text>
      <text x="123.5" y="345" textAnchor="middle" className="floor-section__zone-label">Open Space</text>
      <text x="185.9" y="345" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
    </svg>
  )
}

function LowerFloorSVG() {
  return (
    <svg viewBox="-15 -15 230 420" className="floor-plan__svg">
      <path d={OUTLINE} className="floor-section__outline" />
      <path d="M171.6,320 L171.6,86 L200.3,86" className="floor-section__divider" />
      <line x1="171.6" y1="88" x2="171.6" y2="68" className="floor-section__divider" />
      {/* Limbo Set and Chill Area share one open room — no wall between them,
          just furniture groupings, matching the source file. */}
      <rect x="0" y="20" width="12.7" height="44.5" className="floor-section__detail" />
      {/* Chill Area — a sectional sofa with two end pieces, and two round
          armchairs, up near the roofline */}
      <rect x="65.6" y="19.9" width="74.8" height="59.6" className="floor-section__detail floor-section__detail--accent" />
      <rect x="71.9" y="21.5" width="16.3" height="15.2" className="floor-section__detail floor-section__detail--accent" />
      <rect x="131.4" y="34.7" width="13.6" height="14.5" className="floor-section__detail floor-section__detail--accent" />
      <circle cx="66.3" cy="46.9" r="11.2" className="floor-section__detail floor-section__detail--accent" />
      <circle cx="145.6" cy="58.2" r="11.2" className="floor-section__detail floor-section__detail--accent" />
      {/* Limbo Set — a curved corner bench and a low table, sitting deeper in the room now there's more depth to it */}
      <path d="M80,226.5 L18.9,226.5 Q4.8,226.5 4.8,240.7 L4.8,273.7 Q4.8,287.8 18.9,287.8 L80,287.8 Z" className="floor-section__detail" />
      <rect x="0" y="211.4" width="70.3" height="9.7" className="floor-section__detail" />
      <line x1="0" y1="300" x2="171.6" y2="300" className="floor-section__divider" />
      {/* A small side table near the stairs */}
      <rect x="150.9" y="234.9" width="20.7" height="44.5" className="floor-section__detail" />
      {/* Stairs — a longer run now the building's taller */}
      <Treads startY={95} count={23} step={9.3} />
      <text x="70.1" y="345" textAnchor="middle" className="floor-section__zone-label">Limbo Set</text>
      <text x="98.2" y="7" textAnchor="middle" className="floor-section__zone-label">Chill Area</text>
      <text x="185.9" y="345" textAnchor="middle" className="floor-section__zone-label">Stairs</text>
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
