import { useEffect, useRef } from "react"
import { useMotionValueEvent } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { useDimensions } from "@/components/hooks/use-debounced-dimensions"

interface Tile {
  el: HTMLDivElement
  threshold: number
  resolved: boolean
}

interface PixelResolveGridProps {
  /** 0–100. Any tile whose own threshold is <= this value flips to white. */
  progress: MotionValue<number>
  /** Square tile size in px. @default 24 */
  tileSize?: number
  className?: string
}

/** Full-bleed grid of square pixels, all starting black, each independently
 *  flipping to white once `progress` crosses its own randomly-assigned
 *  threshold. Tiles are plain DOM nodes mutated directly (not React state)
 *  since a full-viewport 24px grid is thousands of nodes — same approach
 *  already used by PixelTrail for a similarly-sized grid in this codebase. */
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
      // pattern to which tile resolves when.
      const threshold = Math.pow(Math.random(), 0.5) * 100
      const resolved = threshold <= current
      if (resolved) el.style.background = "var(--pw-white)"
      container.appendChild(el)
      tiles.push({ el, threshold, resolved })
    }
    tilesRef.current = tiles
  }, [cols, rows, tileSize, progress])

  useMotionValueEvent(progress, "change", (latest) => {
    for (const tile of tilesRef.current) {
      if (!tile.resolved && tile.threshold <= latest) {
        tile.resolved = true
        if (!reducedMotion) tile.el.style.transition = "background-color .35s ease"
        tile.el.style.background = "var(--pw-white)"
      }
    }
  })

  return <div ref={containerRef} className={`pixel-resolve-grid ${className ?? ""}`.trim()} />
}
