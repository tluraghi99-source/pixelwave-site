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

const BLOCK_W = 200
const BLOCK_H = 100

interface Room {
  gridX: number
  gridY: number
  label: string
  accent?: boolean
}

/** One isometric room block: a diamond top face plus two side faces, placed
 *  on a standard 2:1 isometric grid (gridX/gridY are grid units, not pixels). */
function FloorBlock({ gridX, gridY, label, accent }: Room) {
  const x = (gridX - gridY) * (BLOCK_W / 2)
  const y = (gridX + gridY) * (BLOCK_H / 2)
  return (
    <g transform={`translate(${x}, ${y})`}>
      <polygon
        points={`0,${BLOCK_H / 2} ${BLOCK_W / 2},0 ${BLOCK_W},${BLOCK_H / 2} ${BLOCK_W / 2},${BLOCK_H}`}
        className={`floor-block__top${accent ? " floor-block__top--accent" : ""}`}
      />
      <polygon
        points={`0,${BLOCK_H / 2} ${BLOCK_W / 2},${BLOCK_H} ${BLOCK_W / 2},${BLOCK_H * 1.6} 0,${BLOCK_H * 1.1}`}
        className="floor-block__left"
      />
      <polygon
        points={`${BLOCK_W},${BLOCK_H / 2} ${BLOCK_W / 2},${BLOCK_H} ${BLOCK_W / 2},${BLOCK_H * 1.6} ${BLOCK_W},${BLOCK_H * 1.1}`}
        className="floor-block__right"
      />
      <text x={BLOCK_W / 2} y={BLOCK_H / 2 + 5} textAnchor="middle" className="floor-block__label">
        {label}
      </text>
    </g>
  )
}

const FLOOR_1_ROOMS: Room[] = [
  { gridX: 0, gridY: 0, label: "RECEPTION" },
  { gridX: 1, gridY: 0, label: "LOUNGE" },
  { gridX: 2, gridY: 0, label: "STUDIO FLOOR", accent: true },
  { gridX: 0, gridY: 1, label: "DESKS A" },
  { gridX: 1, gridY: 1, label: "MEETING ROOM" },
]

const FLOOR_2_ROOMS: Room[] = [
  { gridX: 0, gridY: 0, label: "DESKS B" },
  { gridX: 1, gridY: 0, label: "FOCUS ROOM" },
  { gridX: 2, gridY: 0, label: "ROOF TERRACE", accent: true },
  { gridX: 0, gridY: 1, label: "MEETING ROOM B" },
  { gridX: 1, gridY: 1, label: "ARCHIVE" },
]

function FloorSVG({ rooms }: { rooms: Room[] }) {
  return (
    <svg viewBox="-150 -50 550 400" className="floor-plan__svg">
      {rooms.map((r) => (
        <FloorBlock key={r.label} {...r} />
      ))}
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
            <FloorSVG rooms={FLOOR_1_ROOMS} />
          </motion.div>
          <motion.div className="floor-plan__layer" style={{ opacity: floor2Opacity }}>
            <span className="floor-plan__label">Upper Floor</span>
            <FloorSVG rooms={FLOOR_2_ROOMS} />
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
            <FloorSVG rooms={FLOOR_1_ROOMS} />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="floor-plan__layer floor-plan__layer--ambient">
            <span className="floor-plan__label">Upper Floor</span>
            <FloorSVG rooms={FLOOR_2_ROOMS} />
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
