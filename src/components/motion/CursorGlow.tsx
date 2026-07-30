import { useEffect, useRef } from "react"

interface CursorGlowProps {
  className?: string
}

const CELL = 26
const RADIUS = 190

/** Ambient background layer — a faint dot grid that glows the site's accent
 *  orange near the cursor. Purely decorative (aria-hidden, no pointer
 *  events of its own) and static under prefers-reduced-motion — a single
 *  frame is drawn and the animation loop never starts. */
export function CursorGlow({ className }: CursorGlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const mouse = { x: -9999, y: -9999 }
    let raf = 0
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = rect.width
      canvas!.height = rect.height
      // Resizing the canvas clears its bitmap. The RAF loop repaints the
      // next frame on the motion-enabled path, but under reduced motion
      // there is no loop — without this, any resize after mount (window
      // resize, orientation change, mobile URL-bar show/hide) leaves the
      // grid permanently blank.
      if (reduceMotion) draw()
    }

    function draw() {
      const w = canvas!.width
      const h = canvas!.height
      ctx!.clearRect(0, 0, w, h)
      const cols = Math.ceil(w / CELL)
      const rows = Math.ceil(h / CELL)
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const cx = i * CELL + CELL / 2
          const cy = j * CELL + CELL / 2
          const dx = cx - mouse.x
          const dy = cy - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const t = Math.max(0, 1 - dist / RADIUS)
          const size = 2 + t * 3
          ctx!.fillStyle =
            t > 0.02 ? `rgba(255,91,0,${(0.08 + t * 0.85).toFixed(3)})` : "rgba(255,255,255,0.06)"
          ctx!.fillRect(cx - size / 2, cy - size / 2, size, size)
        }
      }
    }

    function handleMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    function handleLeave() {
      mouse.x = -9999
      mouse.y = -9999
    }

    resize()
    if (!reduceMotion) {
      const loop = () => {
        draw()
        raf = requestAnimationFrame(loop)
      }
      loop()
      window.addEventListener("mousemove", handleMove)
      document.documentElement.addEventListener("mouseleave", handleLeave)
    }
    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMove)
      document.documentElement.removeEventListener("mouseleave", handleLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
