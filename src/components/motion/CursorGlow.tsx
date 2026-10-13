import { useEffect, useRef, useState } from "react"

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
  /** Phones and tablets only (no hover and below the desktop breakpoint):
   *  besides the cursor glow that desktop gets, two soft glows move by
   *  themselves and a finger on the screen lights the grid like a mouse
   *  would. Never on desktop. Off by default — only the homepage hero
   *  turns it on. */
  ambient?: boolean
}

const CELL = 26
const RADIUS = 190
/** How long after the cursor stops moving the glow takes to fully fade back
 *  to the plain baseline grid — the glow only ever appears while the mouse
 *  is actively in motion, not as a static highlight sitting at rest. */
const IDLE_FADE_MS = 450

/** Devices that can't hover (phones, tablets) never produce the mouse
 *  movement that lights the grid, so — where `ambient` is set — two soft
 *  glows move by themselves along slow waves: the same effect, driven by
 *  the page instead of a pointer. A finger moving over the screen takes
 *  over like a mouse would. */
/** Same boundary the rest of the site uses for "mobile/tablet" (everything
 *  below the lg breakpoint) — the automatic glow is for phones and tablets,
 *  never for a desktop, even one whose input can't hover. */
const MOBILE_QUERY = "(max-width: 1023px)"

const GHOST_COUNT = 2
const GHOST_RADIUS = 150

/** Each glow rides a gentle wave: a slow horizontal sweep back and forth,
 *  with a faster, smaller vertical undulation on top — a continuous curve
 *  rather than hops between points. Phases and speeds are randomized per
 *  load so the two never line up. */
interface Ghost {
  x: number
  y: number
  /** Radians/second of the horizontal sweep and the vertical undulation. */
  sweepRate: number
  waveRate: number
  sweepPhase: number
  wavePhase: number
  /** Vertical center, as a fraction of the height. */
  row: number
}

/** Ambient background layer — a faint dot grid, optionally glowing the
 *  site's accent orange near the cursor. Purely decorative (aria-hidden, no
 *  pointer events of its own) and static under prefers-reduced-motion (or
 *  whenever glow={false}) — a single frame is drawn and the animation loop
 *  never starts. */
export function CursorGlow({ className, variant = "dark", glow = true, ambient = false }: CursorGlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isMobileWidth, setIsMobileWidth] = useState(() => window.matchMedia(MOBILE_QUERY).matches)

  useEffect(() => {
    if (!ambient) return
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobileWidth(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [ambient])

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
    const canHover = window.matchMedia("(hover: hover)").matches
    const wander = trackCursor && !canHover && ambient && isMobileWidth
    const ghosts: Ghost[] = []

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
          let t = Math.max(0, 1 - dist / RADIUS) * activeFactor
          for (const g of ghosts) {
            const gd = Math.hypot(cx - g.x, cy - g.y)
            t = Math.max(t, Math.max(0, 1 - gd / GHOST_RADIUS))
          }
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
    function handleTouch(e: TouchEvent) {
      const touch = e.touches[0]
      if (!touch) return
      const rect = canvas!.getBoundingClientRect()
      mouse.x = touch.clientX - rect.left
      mouse.y = touch.clientY - rect.top
      lastMoveTime = performance.now()
    }
    function stepGhosts() {
      const now = performance.now()
      const w = canvas!.width
      const h = canvas!.height
      if (w === 0 || h === 0) return
      if (ghosts.length === 0) {
        for (let n = 0; n < GHOST_COUNT; n++) {
          ghosts.push({
            x: 0,
            y: 0,
            sweepRate: 0.34 + Math.random() * 0.14,
            waveRate: 0.9 + Math.random() * 0.4,
            sweepPhase: Math.random() * Math.PI * 2,
            wavePhase: Math.random() * Math.PI * 2,
            // One glow rides the upper half, the other the lower, so they
            // read as two waves and not a clump.
            row: n === 0 ? 0.32 : 0.68,
          })
        }
      }
      const t = now / 1000
      for (const g of ghosts) {
        g.x = w * (0.5 + 0.42 * Math.sin(t * g.sweepRate + g.sweepPhase))
        g.y = h * (g.row + 0.1 * Math.sin(t * g.waveRate + g.wavePhase) + 0.03 * Math.sin(t * g.waveRate * 2.3 + g.sweepPhase))
      }
    }
    function handleLeave() {
      mouse.x = -9999
      mouse.y = -9999
      lastMoveTime = -Infinity
    }

    resize()
    let running = false
    const loop = () => {
      if (wander) stepGhosts()
      draw()
      raf = requestAnimationFrame(loop)
    }
    function start() {
      if (running) return
      running = true
      loop()
    }
    function stop() {
      running = false
      cancelAnimationFrame(raf)
    }
    // The wandering glows would otherwise repaint 60 times a second on a
    // phone for a canvas nobody is looking at: only run while it's on screen.
    let visibility: IntersectionObserver | undefined
    if (trackCursor) {
      if (wander) {
        visibility = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) start()
          else stop()
        })
        visibility.observe(canvas)
      } else {
        start()
      }
      window.addEventListener("mousemove", handleMove)
      document.documentElement.addEventListener("mouseleave", handleLeave)
      if (wander) {
        window.addEventListener("touchstart", handleTouch, { passive: true })
        window.addEventListener("touchmove", handleTouch, { passive: true })
      }
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
      stop()
      visibility?.disconnect()
      observer.disconnect()
      window.removeEventListener("mousemove", handleMove)
      document.documentElement.removeEventListener("mouseleave", handleLeave)
      window.removeEventListener("touchstart", handleTouch)
      window.removeEventListener("touchmove", handleTouch)
    }
  }, [variant, glow, ambient, isMobileWidth])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
