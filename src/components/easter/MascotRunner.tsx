import { useCallback, useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import mascotSrc from "@/assets/mascot.svg"

/** Easter egg: an endless runner starring the studio's mascot, in the spirit
 *  of Chrome's offline dinosaur. Opened from the hero logo (see Hero.tsx) and
 *  loaded lazily, so none of this ships to visitors who never find it.
 *
 *  The mascot is a single static drawing, not a sprite sheet, so its running
 *  is faked with a squash-and-stretch bob. Obstacles are drawn from simple
 *  shapes — film-set gear — in the brand's white and orange.
 *
 *  Difficulty ramps with distance rather than starting hard: the first stretch
 *  is single obstacles you jump, then groups of two or three arrive, then a
 *  microphone boom swings down from above that can't be jumped at all — you
 *  have to duck. Everything is tuned so a well-timed player is never given a
 *  gap that is physically impossible. */

const BEST_KEY = "pw-runner-best"
const WHITE = "#f9f8f7"
const ORANGE = "#FF5B00"

// All sizes below are in "units" (u) = stage height / 380, so the game plays
// the same on a phone and on a big monitor.
const BASE_H = 380
const GRAVITY = 2600
const JUMP_V = 880
/** Holding duck in mid-air multiplies gravity — a fast fall, like the dino. */
const FAST_FALL = 3.2
const START_SPEED = 420
const MAX_SPEED = 1100
const ACCEL = 15
/** Metres shown per unit of distance. */
const UNITS_PER_METRE = 40

// Hitbox heights as a fraction of the mascot's drawn size.
const STAND_TOP = 0.82
const DUCK_TOP = 0.46
/** The boom's lowest point above the ground, in u. Standing, the mascot's
 *  head (0.82 x 72 = 59u) hits it; ducked (0.46 x 72 = 33u) it fits under. */
const BOOM_CLEARANCE = 40
const BOOM_W = 26

type GroundKind = "ciak" | "tripod" | "cable" | "light"
type ObstacleKind = GroundKind | "boom"

interface Obstacle {
  kind: ObstacleKind
  x: number
  w: number
  h: number
}

const GROUND_SIZES: Record<GroundKind, { w: number; h: number }> = {
  ciak: { w: 46, h: 40 },
  tripod: { w: 42, h: 72 },
  cable: { w: 58, h: 20 },
  light: { w: 32, h: 86 },
}
const GROUND_KINDS = Object.keys(GROUND_SIZES) as GroundKind[]
/** mascot.svg's viewBox is 424.66 x 438.78. */
const MASCOT_RATIO = 438.78 / 424.66

type Phase = "ready" | "running" | "over"

interface MascotRunnerProps {
  onClose: () => void
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function writeBest(value: number) {
  try {
    localStorage.setItem(BEST_KEY, String(value))
  } catch {
    // Private mode / blocked storage — the record just won't persist.
  }
}

/** How far (in u) the mascot travels while its jump is above an obstacle of
 *  height h — i.e. the horizontal room a single jump has to clear it. */
function clearWindow(speed: number, h: number): number {
  const disc = JUMP_V * JUMP_V - 2 * GRAVITY * h * 0.92
  return disc <= 0 ? 0 : speed * ((2 * Math.sqrt(disc)) / GRAVITY)
}

export default function MascotRunner({ onClose }: MascotRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const [phase, setPhase] = useState<Phase>("ready")
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(readBest)

  // Everything the loop mutates lives in one ref: re-rendering React 60 times
  // a second for physics would be wasted work.
  const game = useRef({
    phase: "ready" as Phase,
    overAt: 0,
    distance: 0,
    speed: START_SPEED,
    y: 0, // height above the ground, in u
    vy: 0,
    onGround: true,
    ducking: false,
    landSquash: 0,
    runClock: 0,
    obstacles: [] as Obstacle[],
    nextGap: 0,
    shown: 0,
    bestShown: readBest(),
  })

  const startRun = useCallback(() => {
    const g = game.current
    g.phase = "running"
    g.distance = 0
    g.speed = START_SPEED
    g.y = 0
    g.vy = 0
    g.onGround = true
    g.landSquash = 0
    g.obstacles = []
    g.nextGap = 520
    g.shown = 0
    setScore(0)
    setPhase("running")
  }, [])

  const jump = useCallback(() => {
    const g = game.current
    if (g.phase === "ready") {
      startRun()
      return
    }
    if (g.phase === "over") {
      // A short grace period so the keypress that killed you can't instantly
      // restart the run.
      if (performance.now() - g.overAt > 400) startRun()
      return
    }
    if (g.onGround) {
      g.vy = JUMP_V
      g.onGround = false
    }
  }, [startRun])

  // Keyboard: Space / ↑ / W jump, ↓ / S duck, Esc closes. Space and the arrows
  // are also page-scroll keys, so they're swallowed while the game is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault()
        if (!e.repeat) jump()
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault()
        game.current.ducking = true
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") game.current.ducking = false
    }
    function release() {
      game.current.ducking = false
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", release)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", release)
    }
  }, [jump, onClose])

  // Freeze the page behind the overlay, and put focus inside the dialog.
  useEffect(() => {
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    closeRef.current?.focus()
    return () => {
      document.documentElement.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // The SVG is rasterised once into a bitmap and the bitmap is what gets
    // drawn (and squashed) every frame — re-rendering the vector at a new
    // scale 60 times a second is far slower than scaling pixels.
    let sprite: HTMLCanvasElement | null = null
    const mascot = new Image()
    mascot.onload = () => {
      const sw = 320
      const sh = Math.round(sw * MASCOT_RATIO)
      const off = document.createElement("canvas")
      off.width = sw
      off.height = sh
      off.getContext("2d")?.drawImage(mascot, 0, 0, sw, sh)
      sprite = off
    }
    mascot.src = mascotSrc

    let w = 0
    let h = 0
    let u = 1
    function resize() {
      if (!stage || !canvas || !ctx) return
      const rect = stage.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = rect.width
      h = rect.height
      u = h / BASE_H
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(stage)

    const GROUND = 0.78 // ground line, as a fraction of the stage height
    const MASCOT = 72 // mascot drawing size, in u

    function metresNow() {
      return game.current.distance / (UNITS_PER_METRE * u)
    }

    function spawnIfNeeded() {
      const g = game.current
      const last = g.obstacles[g.obstacles.length - 1]
      const edge = last ? last.x + last.w : -Infinity
      if (w - edge < g.nextGap * u) return

      const m = metresNow()
      const x0 = w + 40 * u

      if (m >= 80 && Math.random() < 0.22) {
        g.obstacles.push({ kind: "boom", x: x0, w: BOOM_W * u, h: 0 })
      } else {
        // Groups arrive with distance. A group is only allowed if one jump
        // can actually clear all of it at the current speed (with margin) —
        // otherwise it is shrunk until it can.
        let count = 1
        if (m >= 40 && Math.random() < 0.4) count = 2
        if (m >= 150 && count === 2 && Math.random() < 0.4) count = 3
        for (;;) {
          const picks = Array.from(
            { length: count },
            () => GROUND_KINDS[Math.floor(Math.random() * GROUND_KINDS.length)]
          )
          const spacing = 8 + Math.random() * 22
          const total = picks.reduce((a, k) => a + GROUND_SIZES[k].w, 0) + spacing * (count - 1)
          const tallest = Math.max(...picks.map((k) => GROUND_SIZES[k].h))
          // 44 ≈ the mascot's own hitbox width (0.56 x 72) plus a little.
          if (count === 1 || total + 44 <= 0.6 * clearWindow(g.speed, tallest)) {
            let cursor = x0
            for (const k of picks) {
              const size = GROUND_SIZES[k]
              g.obstacles.push({ kind: k, x: cursor, w: size.w * u, h: size.h * u })
              cursor += (size.w + spacing) * u
            }
            break
          }
          count--
        }
      }

      // The gap scales with speed so a jump (a fixed ~0.68 s in the air) always
      // has room to land before the next obstacle — and tightens as you go.
      const airDistance = g.speed * 0.68
      const factorMin = Math.max(0.95, 1.15 - m / 1200)
      const factorRange = Math.max(0.45, 0.9 - m / 1500)
      g.nextGap = airDistance * (factorMin + Math.random() * factorRange) + 40
    }

    function update(dt: number) {
      const g = game.current
      if (g.phase !== "running") return

      g.speed = Math.min(MAX_SPEED, g.speed + ACCEL * dt)
      g.distance += g.speed * dt
      g.runClock += dt * (g.speed / 360)

      if (!g.onGround) {
        g.vy -= GRAVITY * (g.ducking ? FAST_FALL : 1) * dt
        g.y += g.vy * dt
        if (g.y <= 0) {
          g.y = 0
          g.vy = 0
          g.onGround = true
          g.landSquash = 0.12
        }
      }
      if (g.landSquash > 0) g.landSquash = Math.max(0, g.landSquash - dt)

      for (const o of g.obstacles) o.x -= g.speed * u * dt
      while (g.obstacles.length && g.obstacles[0].x + g.obstacles[0].w < -20) g.obstacles.shift()
      spawnIfNeeded()

      // Forgiving hitboxes: the mascot's silhouette has air around it, and a
      // death that looks like a near miss feels unfair.
      const mx = w * 0.14
      const mSize = MASCOT * u
      const crouched = g.ducking && g.onGround
      const hit = {
        l: mx + mSize * 0.22,
        r: mx + mSize * 0.78,
        bottom: g.y * u + mSize * 0.05,
        top: g.y * u + mSize * (crouched ? DUCK_TOP : STAND_TOP),
      }
      for (const o of g.obstacles) {
        const inset = o.kind === "boom" ? 0.2 : 0.12
        const oL = o.x + o.w * inset
        const oR = o.x + o.w * (1 - inset)
        if (hit.r <= oL || hit.l >= oR) continue
        const collides =
          o.kind === "boom" ? hit.top > BOOM_CLEARANCE * u : hit.bottom < o.h * 0.92
        if (collides) {
          g.phase = "over"
          g.overAt = performance.now()
          const metres = Math.floor(metresNow())
          if (metres > g.bestShown) {
            g.bestShown = metres
            writeBest(metres)
            setBest(metres)
          }
          setScore(metres)
          setPhase("over")
          break
        }
      }

      const metres = Math.floor(metresNow())
      if (metres !== g.shown) {
        g.shown = metres
        setScore(metres)
      }
    }

    function drawObstacle(o: Obstacle, groundY: number) {
      if (!ctx) return
      const x = o.x
      ctx.lineCap = "square"
      ctx.lineJoin = "miter"

      if (o.kind === "boom") {
        // Microphone boom hanging from above: a pole down from the top edge
        // ending in a furry windscreen, low enough to hit a standing mascot.
        const cx = x + o.w / 2
        const bottom = groundY - BOOM_CLEARANCE * u
        ctx.strokeStyle = WHITE
        ctx.lineWidth = Math.max(2, 4 * u)
        ctx.beginPath()
        ctx.moveTo(cx, 0)
        ctx.lineTo(cx, bottom - 26 * u)
        ctx.stroke()
        ctx.fillStyle = ORANGE
        ctx.fillRect(x, bottom - 28 * u, o.w, 28 * u)
        ctx.fillStyle = "#000"
        for (let i = 1; i <= 3; i++) ctx.fillRect(x + 3 * u, bottom - 28 * u + i * 6.5 * u, o.w - 6 * u, 1.5 * u)
        return
      }

      const top = groundY - o.h
      if (o.kind === "ciak") {
        // Clapperboard: striped clapper on a slate.
        const clapH = o.h * 0.3
        ctx.fillStyle = WHITE
        ctx.fillRect(x, top + clapH + 2 * u, o.w, o.h - clapH - 2 * u)
        ctx.fillStyle = "#000"
        ctx.fillRect(x + 4 * u, top + clapH + 8 * u, o.w - 8 * u, 2 * u)
        ctx.fillRect(x + 4 * u, top + clapH + 15 * u, o.w * 0.5, 2 * u)
        const stripes = 4
        const sw = o.w / stripes
        for (let i = 0; i < stripes; i++) {
          ctx.fillStyle = i % 2 === 0 ? ORANGE : WHITE
          ctx.fillRect(x + i * sw, top, sw, clapH)
        }
      } else if (o.kind === "tripod") {
        // Camera tripod: a head on three splayed legs.
        ctx.strokeStyle = WHITE
        ctx.lineWidth = Math.max(2, 4 * u)
        const cx = x + o.w / 2
        const apexY = top + 14 * u
        ctx.beginPath()
        ctx.moveTo(cx, apexY)
        ctx.lineTo(x, groundY)
        ctx.moveTo(cx, apexY)
        ctx.lineTo(x + o.w, groundY)
        ctx.moveTo(cx, apexY)
        ctx.lineTo(cx, groundY)
        ctx.stroke()
        ctx.fillStyle = ORANGE
        ctx.fillRect(cx - 14 * u, top, 28 * u, 16 * u)
      } else if (o.kind === "cable") {
        // A cable looping over the floor, with a plug at one end.
        ctx.strokeStyle = ORANGE
        ctx.lineWidth = Math.max(3, 6 * u)
        ctx.beginPath()
        ctx.moveTo(x, groundY - 1)
        ctx.bezierCurveTo(x + o.w * 0.1, top - 6 * u, x + o.w * 0.7, top - 6 * u, x + o.w * 0.78, groundY - 1)
        ctx.stroke()
        ctx.fillStyle = WHITE
        ctx.fillRect(x + o.w * 0.78, groundY - 12 * u, o.w * 0.22, 12 * u)
      } else {
        // Light stand: a pole carrying a lamp head.
        ctx.strokeStyle = WHITE
        ctx.lineWidth = Math.max(2, 4 * u)
        const cx = x + o.w / 2
        ctx.beginPath()
        ctx.moveTo(cx, top + 20 * u)
        ctx.lineTo(cx, groundY)
        ctx.moveTo(cx - 12 * u, groundY)
        ctx.lineTo(cx + 12 * u, groundY)
        ctx.stroke()
        ctx.fillStyle = WHITE
        ctx.fillRect(x, top, o.w, 22 * u)
        ctx.fillStyle = ORANGE
        ctx.fillRect(x + 4 * u, top + 4 * u, o.w - 8 * u, 14 * u)
      }
    }

    function draw(now: number) {
      if (!ctx) return
      const g = game.current
      ctx.clearRect(0, 0, w, h)
      const groundY = h * GROUND

      // Faint dot grid drifting slowly — the same one the site uses as its
      // background, so the game feels like part of the page.
      ctx.fillStyle = "rgba(255,255,255,0.09)"
      const step = 40 * u
      const off = (g.distance * u * 0.25) % step
      for (let x = -off; x < w; x += step) {
        for (let y = step * 0.5; y < groundY - 10; y += step) {
          ctx.fillRect(x, y, 2, 2)
        }
      }

      // Ground line, plus scrolling flecks for a sense of speed.
      ctx.fillStyle = WHITE
      ctx.fillRect(0, groundY, w, 2)
      const fleck = 90 * u
      const foff = (g.distance * u) % fleck
      ctx.fillStyle = "rgba(255,255,255,0.4)"
      for (let x = -foff; x < w; x += fleck) {
        ctx.fillRect(x + 20 * u, groundY + 12 * u, 14 * u, 2)
        ctx.fillRect(x + 62 * u, groundY + 26 * u, 6 * u, 2)
      }

      for (const o of g.obstacles) drawObstacle(o, groundY)

      // Mascot: squash and stretch around its feet.
      const size = MASCOT * u
      const mx = w * 0.14
      let sx = 1
      let sy = 1
      let rot = 0
      if (g.phase === "over") {
        rot = 0.35
      } else if (!g.onGround) {
        const t = Math.max(-1, Math.min(1, g.vy / JUMP_V))
        sy = 1 + 0.1 * Math.abs(t)
        sx = 1 - 0.07 * Math.abs(t)
        rot = -0.12 * t
      } else if (g.landSquash > 0) {
        const k = g.landSquash / 0.12
        sy = 1 - 0.18 * k
        sx = 1 + 0.14 * k
      } else if (g.phase === "running" && g.ducking) {
        // Crouched flat to slide under the boom.
        sy = 0.5
        sx = 1.22
      } else if (g.phase === "running") {
        const bob = Math.sin(g.runClock * 16)
        sy = 1 + 0.045 * bob
        sx = 1 - 0.03 * bob
        rot = 0.04 * Math.sin(g.runClock * 8)
      } else {
        // Idle breathing on the title screen.
        sy = 1 + 0.02 * Math.sin(now / 380)
      }
      const feetY = groundY - g.y * u
      if (sprite) {
        const dw = size
        const dh = size * MASCOT_RATIO
        ctx.save()
        ctx.translate(mx + dw / 2, feetY)
        ctx.rotate(rot)
        ctx.scale(sx, sy)
        ctx.drawImage(sprite, -dw / 2, -dh, dw, dh)
        ctx.restore()
      }
    }

    let raf = 0
    let last = performance.now()
    function frame(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      update(dt)
      draw(now)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  const pad = (n: number) => String(n).padStart(3, "0")

  return (
    <div
      className="runner"
      role="dialog"
      aria-modal="true"
      aria-label="Mini gioco: la mascotte di PixelWave corre sul set"
    >
      <button ref={closeRef} type="button" className="runner__close" onClick={onClose} aria-label="Chiudi il gioco">
        <X size={20} />
      </button>

      <div
        ref={stageRef}
        className="runner__stage"
        onPointerDown={(e) => {
          // Taps anywhere on the stage play; the close button is outside it.
          e.preventDefault()
          jump()
        }}
      >
        <canvas ref={canvasRef} className="runner__canvas" aria-hidden="true" />

        <div className="runner__hud" aria-live="off">
          <span>Record {pad(best)} m</span>
          <span className="runner__score">{pad(score)} m</span>
        </div>

        {phase === "ready" && (
          <div className="runner__msg">
            <p className="runner__title">Silenzio, si gira.</p>
            <p className="runner__hint">
              Spazio o ↑ per saltare, ↓ per abbassarti · oppure tocca per saltare. Salta i cavi e i ciak,
              abbassati sotto il microfono.
            </p>
          </div>
        )}
        {phase === "over" && (
          <div className="runner__msg">
            <p className="runner__title">Stop, taglia!</p>
            <p className="runner__hint">
              Hai girato {score} m · premi spazio o tocca per rigirare
            </p>
          </div>
        )}

        {/* Touch has no arrow keys, so ducking gets its own hold-to-crouch
            button (shown on touch screens only — see index.css). */}
        <button
          type="button"
          className="runner__duck"
          aria-label="Abbassati"
          onPointerDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            game.current.ducking = true
          }}
          onPointerUp={() => {
            game.current.ducking = false
          }}
          onPointerLeave={() => {
            game.current.ducking = false
          }}
          onPointerCancel={() => {
            game.current.ducking = false
          }}
        >
          Abbassati ↓
        </button>
      </div>

      <p className="runner__foot">Esc per uscire</p>
    </div>
  )
}
