import { useEffect, useRef } from "react"
import { useMotionValueEvent } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { useDimensions } from "@/components/hooks/use-debounced-dimensions"

type Stage = "pending" | "colored" | "dissolved"

interface Tile {
  el: HTMLDivElement
  colorThreshold: number
  dissolveThreshold: number
  stage: Stage
}

interface PixelResolveGridProps {
  /** 0–100. Each tile turns solid orange once progress crosses its own
   *  colorThreshold, then fades to fully transparent once progress crosses
   *  its own later dissolveThreshold — revealing whatever real content sits
   *  behind the grid, not just a matching solid color. */
  progress: MotionValue<number>
  /** Square tile size in px. @default 24 */
  tileSize?: number
  className?: string
}

/** Full-bleed grid of square pixels, all starting black. Each tile
 *  independently turns accent orange, then later dissolves to fully
 *  transparent, at its own randomly-assigned pair of thresholds as
 *  `progress` climbs — a two-stage "fill in, then reveal" resolve rather
 *  than a single flip. Tiles are plain DOM nodes mutated directly (not React
 *  state) since a full-viewport 24px grid is thousands of nodes — same
 *  approach already used by PixelTrail for a similarly-sized grid in this
 *  codebase. */
export function PixelResolveGrid({ progress, tileSize = 24, className }: PixelResolveGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dimensions = useDimensions(containerRef)
  const tilesRef = useRef<Tile[]>([])
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const cols = Math.ceil((dimensions.width || 0) / tileSize)
  const rows = Math.ceil((dimensions.height || 0) / tileSize)

  useEffect(() => {
    const container = containerRef.current
    if (!container || cols === 0 || rows === 0) return
    container.innerHTML = ""
    container.style.gridTemplateColumns = `repeat(${cols}, ${tileSize}px)`
    container.style.gridTemplateRows = `repeat(${rows}, ${tileSize}px)`
    const tiles: Tile[] = []
    const count = cols * rows
    const current = progress.get()
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div")
      el.className = "pixel-resolve-grid__tile"
      // Square-root of a uniform sample — low thresholds are sparse (slow
      // start), thresholds bunch up near 100 (rapid finish), no spatial
      // pattern to which tile resolves when. dissolveThreshold is always
      // later than colorThreshold (a further, independent random pick
      // within the remaining budget up to 100), so every tile spends real
      // time as solid orange before it dissolves.
      const colorThreshold = Math.pow(Math.random(), 0.5) * 100
      const dissolveThreshold = colorThreshold + Math.random() * (100 - colorThreshold)
      let stage: Stage = "pending"
      if (dissolveThreshold <= current) {
        stage = "dissolved"
        el.style.background = "transparent"
      } else if (colorThreshold <= current) {
        stage = "colored"
        el.style.background = "var(--pw-orange)"
      }
      container.appendChild(el)
      tiles.push({ el, colorThreshold, dissolveThreshold, stage })
    }
    tilesRef.current = tiles
  }, [cols, rows, tileSize, progress])

  useMotionValueEvent(progress, "change", (latest) => {
    for (const tile of tilesRef.current) {
      if (tile.stage === "pending" && tile.colorThreshold <= latest) {
        tile.stage = "colored"
        if (!reducedMotion) tile.el.style.transition = "background-color .35s ease"
        tile.el.style.background = "var(--pw-orange)"
      }
      if (tile.stage === "colored" && tile.dissolveThreshold <= latest) {
        tile.stage = "dissolved"
        if (!reducedMotion) tile.el.style.transition = "background-color .35s ease"
        tile.el.style.background = "transparent"
      }
    }
  })

  return <div ref={containerRef} className={`pixel-resolve-grid ${className ?? ""}`.trim()} />
}
