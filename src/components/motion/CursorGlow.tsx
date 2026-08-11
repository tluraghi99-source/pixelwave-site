import { useEffect, useRef } from "react"

interface CursorGlowProps {
  className?: string
  /** Baseline (non-brightened) dot color — "dark" (default) is a faint
   *  white, for use on dark-background sections; "light" is an
   *  equivalent-weight faint black, for light-background sections. The
   *  cursor-brightened dots stay the same brand orange in both variants. */
  variant?: "dark" | "light"
  /** Whether this instance tracks the cursor at all. Default true, matching
   *  the original (Contact-page) behavior. When false, skips all
   *  mousemove/mouseleave listeners and the requestAnimationFrame loop —
   *  just draws the static baseline grid once, redrawn only on resize. Used
   *  for sections that want the ambient dot texture without an interactive
   *  cursor highlight (everywhere except each page's hero-equivalent). */
  glow?: boolean
}

const CELL = 26
const RADIUS = 190
/** How long after the cursor stops moving the glow takes to fully fade back
 *  to the plain baseline grid — the glow only ever appears while the mouse
 *  is actively in motion, not as a static highlight sitting at rest. */
const IDLE_FADE_MS = 450

/** Ambient background layer — a faint dot grid, optionally glowing the
 *  site's accent orange near the cursor. Purely decorative (aria-hidden, no
 *  pointer events of its own) and static under prefers-reduced-motion (or
 *  whenever glow={false}) — a single frame is drawn and the animation loop
 *  never starts. */
export function CursorGlow({ className, variant = "dark", glow = true }: CursorGlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const mouse = { x: -9999, y: -9999 }
    // Never set on mount, only by real movement — starts at -Infinity so the
    // very first frame (before any mousemove) computes as fully idle rather
    // than a stale "just moved" glow.
    let lastMoveTime = -Infinity
    let raf = 0
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const baseline = variant === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"
    // Skipping cursor tracking entirely (glow={false}) is functionally the
    // same static-single-draw path as prefers-reduced-motion — both just
    // never start the loop below.
    const trackCursor = glow && !reduceMotion

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = rect.width
      canvas!.height = rect.height
      // Resizing the canvas clears its bitmap. The RAF loop repaints the
      // next frame on the cursor-tracking path, but there is no loop when
      // trackCursor is false — without this, any resize after mount (window
      // resize, orientation change, mobile URL-bar show/hide) leaves the
      // grid permanently blank.
      if (!trackCursor) draw()
    }

    function draw() {
      const w = canvas!.width
      const h = canvas!.height
      ctx!.clearRect(0, 0, w, h)
      // Full strength the instant the cursor moves, fading linearly back to
      // 0 (plain baseline dots, regardless of distance to the last known
      // position) once it's been idle for IDLE_FADE_MS — the glow reads as
      // something the motion itself produces, not a fixed spotlight.
      const idleFor = performance.now() - lastMoveTime
      const activeFactor = Math.max(0, 1 - idleFor / IDLE_FADE_MS)
      const cols = Math.ceil(w / CELL)
      const rows = Math.ceil(h / CELL)
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const cx = i * CELL + CELL / 2
          const cy = j * CELL + CELL / 2
          const dx = cx - mouse.x
          const dy = cy - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const t = Math.max(0, 1 - dist / RADIUS) * activeFactor
          const size = 2 + t * 3
          ctx!.fillStyle = t > 0.02 ? `rgba(255,91,0,${(0.08 + t * 0.85).toFixed(3)})` : baseline
          ctx!.fillRect(cx - size / 2, cy - size / 2, size, size)
        }
      }
    }

    function handleMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      lastMoveTime = performance.now()
    }
    function handleLeave() {
      mouse.x = -9999
      mouse.y = -9999
      lastMoveTime = -Infinity
    }

    resize()
    if (trackCursor) {
      const loop = () => {
        draw()
        raf = requestAnimationFrame(loop)
      }
      loop()
      window.addEventListener("mousemove", handleMove)
      document.documentElement.addEventListener("mouseleave", handleLeave)
    }
    // A window "resize" event alone misses cases where the canvas's own
    // rendered size changes without the window itself resizing — a fixed
    // 100svh host settling after the preloader, a mobile URL bar
    // collapsing, any parent layout shift. When that happens the bitmap
    // (canvas.width/height, used for the dot grid's own coordinate math)
    // goes stale while the CSS box (canvas.getBoundingClientRect(), used
    // for the real cursor position) keeps tracking the true size — the two
    // drift out of sync, and the glow only lines up with the cursor in
    // whatever region the stale bitmap still covers. ResizeObserver watches
    // the canvas's actual box directly, so it catches all of those cases.
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener("mousemove", handleMove)
      document.documentElement.removeEventListener("mouseleave", handleLeave)
    }
  }, [variant, glow])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
